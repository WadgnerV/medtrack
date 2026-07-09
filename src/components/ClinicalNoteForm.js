import { useState, useEffect } from 'react'
import PrescriptionForm from './PrescriptionForm'
import MedicalImagingForm from './MedicalImagingForm'
import LabStudiesForm from './LabStudiesForm'
import { supabase } from '../lib/supabase'
import AntecedentsSection from './AntecedentsSection'
import PrintNotesModal from './PrintNotesModal'

const BLUE = '#1a3a5c'

const CONSULTATION_TYPES = [
  { value: 'integral',     label: 'Consulta médica integral' },
  { value: 'metabolica',   label: 'Consulta metabólica' },
  { value: 'estetica',     label: 'Consulta estética' },
  { value: 'regenerativa', label: 'Consulta regenerativa' },
  { value: 'obstetrica',   label: 'Consulta obstétrica' },
  { value: 'pediatrica',   label: 'Consulta pediátrica' },
  { value: 'geriatrica',   label: 'Consulta geriátrica' },
  { value: 'psicologia',   label: 'Psicología' },
  { value: 'fisioterapia', label: 'Terapia física' },
  { value: 'nutricion',    label: 'Nutrición' },
]

const CONSULTATION_TYPE_COLORS = {
  integral:      '#F59E0B',
  metabolica:    '#F97316',
  estetica:      '#A855F7',
  regenerativa:  '#3B82F6',
  obstetrica:    '#EC4899',
  pediatrica:    '#22C55E',
  geriatrica:    '#6B7280',
  psicologia:    '#92400E',
  fisioterapia:  '#EF4444',
  nutricion:     '#F97316',
}

const PLAN_OPTIONS = [
  'Cita control asignada',
  'Consultar en caso de ser necesario',
  'Exámenes de control',
  'Exámenes de extensión',
  'Explicación de efectos adversos',
  'Explicación de factores de riesgo',
  'Paciente con complicaciones graves',
  'Paciente con complicaciones leves',
  'Paciente con complicaciones moderadas',
  'Paciente de alta',
  'Paciente derivado a otro servicio',
  'Signos de alarma',
]

function buildNoteText(form) {
  const lines = []
  if (form.motivo.trim()) lines.push(`Motivo de consulta:\n${form.motivo.trim()}`)
  if (form.padecimiento.trim()) lines.push(`Padecimiento actual:\n${form.padecimiento.trim()}`)
  if (form.examen.trim()) lines.push(`Examen físico:\n${form.examen.trim()}`)
  if (form.procedimiento.trim()) lines.push(`Notas de procedimiento:\n${form.procedimiento.trim()}`)
  if (form.tratamiento.trim()) lines.push(`Tratamiento:\n${form.tratamiento.trim()}`)
  if (form.imagenes.trim()) lines.push(`Imágenes médicas solicitadas:\n${form.imagenes.trim()}`)
  if (form.laboratorios.trim()) lines.push(`Estudios de laboratorio solicitados:\n${form.laboratorios.trim()}`)
  const plan = [...form.planOpciones]
  if (form.planOtroChecked && form.planOtro.trim()) plan.push(`Otro: ${form.planOtro.trim()}`)
  if (plan.length > 0) lines.push(`Plan de seguimiento:\n${plan.map(p => `• ${p}`).join('\n')}`)
  return lines.join('\n\n')
}

const emptyForm = {
  motivo: '', padecimiento: '', examen: '', procedimiento: '', tratamiento: '',
  imagenes: '', laboratorios: '',
  planOpciones: [], planOtroChecked: false, planOtro: '',
  note_date: new Date().toISOString().split('T')[0],
  consultation_type: '',
}

function parseNoteText(text) {
  const form = { ...emptyForm, planOpciones: [] }
  if (!text) return form
  const sections = text.split('\n\n')
  sections.forEach(s => {
    if (s.startsWith('Motivo de consulta:\n')) form.motivo = s.replace('Motivo de consulta:\n', '')
    else if (s.startsWith('Padecimiento actual:\n')) form.padecimiento = s.replace('Padecimiento actual:\n', '')
    else if (s.startsWith('Examen físico:\n')) form.examen = s.replace('Examen físico:\n', '')
    else if (s.startsWith('Notas de procedimiento:\n')) form.procedimiento = s.replace('Notas de procedimiento:\n', '')
    else if (s.startsWith('Tratamiento:\n')) form.tratamiento = s.replace('Tratamiento:\n', '')
    else if (s.startsWith('Imágenes médicas solicitadas:\n')) form.imagenes = s.replace('Imágenes médicas solicitadas:\n', '')
    else if (s.startsWith('Estudios de laboratorio solicitados:\n')) form.laboratorios = s.replace('Estudios de laboratorio solicitados:\n', '')
    else if (s.startsWith('Plan de seguimiento:\n')) {
      const items = s.replace('Plan de seguimiento:\n', '').split('\n').map(l => l.replace('• ', ''))
      items.forEach(item => {
        if (item.startsWith('Otro: ')) { form.planOtroChecked = true; form.planOtro = item.replace('Otro: ', '') }
        else if (PLAN_OPTIONS.includes(item)) form.planOpciones.push(item)
      })
    }
  })
  return form
}

function CollapsibleNote({ n, color, onEdit, onDelete, patient, forceExpanded=false }) {
  const [expanded, setExpanded] = useState(forceExpanded)
  const [notaInsumos, setNotaInsumos] = useState([])

  useEffect(() => {
    if (!expanded) return
    supabase.from('clinical_note_supplies')
      .select('*, item:item_id(name, unit)')
      .eq('note_id', n.id)
      .then(({ data }) => setNotaInsumos(data || []))
  }, [expanded, n.id])
  const dName = n.author ? `${n.author.prefix ? n.author.prefix + ' ' : ''}${n.author.first_name} ${n.author.last_name}` : 'Médico'
  const fecha = new Date(n.note_date).toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const createdAt = n.created_at ? new Date(n.created_at) : new Date(n.note_date)
  const canEdit = (Date.now() - createdAt.getTime()) < 24 * 60 * 60 * 1000
  const parsed = parseNoteText(n.note_text || '')
  function printFromNote(type) {
    const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
    const age = dob => { if (!dob) return null; const d = new Date(dob), nw = new Date(); return nw.getFullYear() - d.getFullYear() - (nw < new Date(nw.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0) }
    const titles = { receta: 'RECETA MÉDICA', imagenes: 'SOLICITUD DE IMÁGENES MÉDICAS', laboratorios: 'SOLICITUD DE EXÁMENES DE LABORATORIO' }
    const content_map = { receta: parsed.tratamiento, imagenes: parsed.imagenes, laboratorios: parsed.laboratorios }
    const body = content_map[type] || ''
    const lines = body.split('\n').filter(Boolean)

    // Para laboratorios, agrupar por categoría
    let itemsHtml = ''
    if (type === 'laboratorios') {
      const LAB_CATS = {
        'Hematología': ['Hemograma completo','Velocidad de sedimentación','Frotis de sangre periférica','Reticulocitos','Tiempo de protrombina','INR','Tiempo parcial de tromboplastina'],
        'Química sanguínea': ['Glucosa en ayunas','Glucosa postprandial','HbA1c','Creatinina','BUN','Ácido úrico','Colesterol total','HDL','LDL','Triglicéridos','ALT','AST','Bilirrubinas totales','Fosfatasa alcalina','GGT','Proteínas totales','Albúmina','LDH','CPK'],
        'Hormonales': ['FSH','LH','Estradiol','Progesterona','Testosterona total','Testosterona libre','Prolactina','DHEA-S','Cortisol matutino','Insulina en ayunas','Péptido C','IGF-1'],
        'Tiroides': ['TSH','T3 libre','T4 libre','T3 total','T4 total','Anti-TPO','Anti-tiroglobulina','Tiroglobulina'],
        'Electrolitos': ['Sodio','Potasio','Cloro','Calcio','Fósforo','Magnesio','Bicarbonato'],
        'Orina': ['Uroanálisis completo','Urocultivo','Proteínas en orina 24h','Creatinina en orina','Microalbuminuria'],
        'Heces': ['Examen general de heces','Coprocultivo','Parásitos en heces','Sangre oculta en heces','Calprotectina fecal','H. pylori en heces'],
        'Embarazo': ['Beta HCG cuantitativa','Beta HCG cualitativa','Prueba de tolerancia a la glucosa'],
        'Inmunología': ['ANA','Anti-DNA','Factor reumatoide','Anti-CCP','Complemento C3','Complemento C4','ANCA','Inmunoglobulinas IgG/IgA/IgM'],
        'Reumático': ['PCR ultrasensible','VSG','Ácido úrico','HLA-B27'],
        'Marcadores tumorales': ['PSA','CEA','CA 125','CA 19-9','AFP','CA 15-3','Beta-2 microglobulina'],
        'Hepatitis': ['HBsAg','Anti-HBs','Anti-HBc total','Anti-VHC','Anti-VHA IgM'],
        'Bacteriología': ['Hemocultivo','Cultivo de secreción','VDRL','FTA-ABS','VIH','HTLV'],
        'Osteoporosis': ['Calcio sérico','Vitamina D 25-OH','PTH','Marcadores de remodelado óseo'],
        'Vitaminas': ['Vitamina D','Complejo B','Vitamina B12','Vitamina A','Vitamina E'],
        'Anemia': ['Recuento de reticulocitos','Hierro sérico','Ferritina sérica','Transferrina','Ácido fólico','Vitamina B12'],
      }
      const grouped = {}
      lines.forEach(exam => {
        let found = false
        for (const [cat, list] of Object.entries(LAB_CATS)) {
          if (list.some(e => e.toLowerCase() === exam.toLowerCase())) {
            if (!grouped[cat]) grouped[cat] = []
            grouped[cat].push(exam); found = true; break
          }
        }
        if (!found) { if (!grouped['Otros']) grouped['Otros'] = []; grouped['Otros'].push(exam) }
      })
      itemsHtml = Object.entries(grouped).map(([cat, items]) => `
        <div style="margin-bottom:14px;">
          <div style="font-size:10pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:6px;">${cat}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px 16px;">
            ${items.map(e => `<div style="font-size:10pt;padding:2px 0;">${e}</div>`).join('')}
          </div>
        </div>`).join('')
    } else if (type === 'imagenes') {
      const IMG_PREFIXES = {
        'Radiografías': ['Rx '],
        'Ultrasonidos': ['US '],
        'Tomografías': ['TC '],
        'Resonancias': ['RM '],
        'Mamografías': ['Mamografía '],
        'Densitometrías': ['DEXA '],
        'Estudios nucleares': ['NM '],
      }
      const cleanLines = lines.map(l => l.replace(/^•\s*/, '').trim()).filter(Boolean)
      const grouped = {}
      cleanLines.forEach(line => {
        let found = false
        for (const [cat, prefixes] of Object.entries(IMG_PREFIXES)) {
          if (prefixes.some(p => line.startsWith(p))) {
            if (!grouped[cat]) grouped[cat] = []
            const dashIdx = line.indexOf(' — ')
            const nombre = dashIdx !== -1 ? line.substring(line.indexOf(' ') + 1, dashIdx) : line.substring(line.indexOf(' ') + 1)
            const incidencias = dashIdx !== -1 ? line.substring(dashIdx + 3) : ''
            grouped[cat].push({ nombre, incidencias }); found = true; break
          }
        }
        if (!found) { if (!grouped['Otros']) grouped['Otros'] = []; grouped['Otros'].push({ nombre: line, incidencias: '' }) }
      })
      itemsHtml = Object.entries(grouped).map(([cat, items]) => `
        <div style="margin-bottom:16px;">
          <div style="font-size:10pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:8px;">${cat}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;">
            ${items.map(i => `<div style="font-size:10pt;padding:3px 0;border-bottom:0.5px solid #f0f0f0;">
              <span style="font-weight:500;">${i.nombre}</span>
              ${i.incidencias ? `<span style="color:#888;font-size:9pt;"> — ${i.incidencias}</span>` : ''}
            </div>`).join('')}
          </div>
        </div>`).join('')
    } else {
      itemsHtml = lines.map(l => `<div style="margin-bottom:8px;font-size:14pt;">${l}</div>`).join('')
    }
    const authorName = n.author ? `${n.author.prefix ? n.author.prefix + ' ' : ''}${n.author.first_name} ${n.author.last_name}` : 'Médico'
    const authorCode = n.author?.medical_code ? ` — ${n.author.medical_code}` : ''
    const pName = `${patient?.profile?.last_name||''} ${patient?.profile?.first_name||''}`.trim()
    const cName = clinicSettings?.clinic_name || 'MedTrack'
    const cAddr = [clinicSettings?.address, clinicSettings?.district, clinicSettings?.canton, clinicSettings?.province].filter(Boolean).join(', ')
    const noteDate = new Date(n.note_date + 'T12:00:00').toLocaleDateString('es-CR', {day:'2-digit',month:'long',year:'numeric'})

    const html = (type === 'laboratorios' || type === 'imagenes') ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:20mm;font-size:11pt;color:#222;line-height:1.5}
      .header{border-bottom:2px solid #1a3a5c;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}
      .clinic-name{font-size:18pt;font-weight:700;color:#1a3a5c}.clinic-addr{font-size:9pt;color:#888;margin-top:3px}
      .doc-title{font-size:14pt;font-weight:700;color:#1a3a5c;text-align:center;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1a3a5c;padding-bottom:8px;margin:0 0 16px}
      .patient-box{background:#f8f8f8;border:1px solid #e0e0e0;border-radius:6px;padding:12px 16px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .patient-label{color:#888;font-size:9pt}.patient-field{font-size:10pt}
      .sign{margin-top:50px;display:flex;justify-content:center}.sign-box{text-align:center}
      .sign-line{border-top:1px solid #333;width:220px;margin:0 auto 6px}
      .sign-name{font-size:11pt;font-weight:700;color:#1a3a5c}.sign-sub{font-size:9pt;color:#888}
      .footer{margin-top:30px;border-top:1px solid #eee;padding-top:8px;font-size:9pt;color:#aaa;text-align:center}
    </style></head><body>
      <div class="header">
        <div><div class="clinic-name">${cName}</div><div class="clinic-addr">${cAddr}</div></div>
        <div style="font-size:9pt;color:#888;text-align:right">Fecha: ${noteDate}</div>
      </div>
      <div class="doc-title">${titles[type]}</div>
      <div class="patient-box">
        <div><div class="patient-label">Paciente</div><div class="patient-field">${pName}</div></div>
        <div><div class="patient-label">Identificación</div><div class="patient-field">${patient?.id_number||'—'}</div></div>
        <div><div class="patient-label">Fecha de nacimiento</div><div class="patient-field">${patient?.birth_date ? new Date(patient.birth_date+'T12:00:00').toLocaleDateString('es-CR') : '—'}</div></div>
        <div><div class="patient-label">Médico solicitante</div><div class="patient-field">${authorName}${authorCode}</div></div>
      </div>
      ${itemsHtml}
      <div class="sign"><div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-name">${authorName}${authorCode}</div>
        <div class="sign-sub">Médico solicitante · ${noteDate}</div>
      </div></div>
      <div class="footer">${cName} · Documento generado automáticamente por MedTrack</div>
    </body></html>` : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titles[type]}</title>
    <style>body{font-family:Arial,sans-serif;margin:20mm;color:#222;font-size:13pt;} .doc-title{font-size:22pt;font-weight:900;color:#1a3a5c;text-align:center;text-transform:uppercase;letter-spacing:0.08em;border-bottom:3px solid #1a3a5c;padding-bottom:10px;margin-bottom:20px;} .sub{font-size:12pt;color:#666;margin-bottom:16px;} .divider{border:none;border-top:1px solid #e2e8f0;margin:16px 0;} .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:8px;} .col-label{font-size:10pt;color:#888;margin-bottom:2px;} .col-value{font-size:12pt;color:#222;font-weight:500;border-bottom:1px solid #e2e8f0;padding-bottom:3px;} .section{font-size:13pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1a3a5c;padding-bottom:4px;margin:20px 0 12px;} .sign{margin-top:48px;text-align:center;} .sign-line{border-top:1px solid #1a3a5c;width:260px;margin:0 auto 6px;} .sign-name{font-size:13pt;font-weight:700;color:#1a3a5c;} .footer{margin-top:32px;font-size:10pt;color:#aaa;font-style:italic;border-top:1px solid #eee;padding-top:8px;}</style>
    </head><body>
    <div class="doc-title">${titles[type]}</div>
    <div class="sub">Fecha: ${noteDate}</div>
    <hr class="divider">
    <div class="section">Datos del paciente</div>
    <div class="two-col">
      <div><div class="col-label">Nombre completo</div><div class="col-value">${patient?.profile?.last_name||''} ${patient?.profile?.first_name||''}</div></div>
      <div><div class="col-label">Identificación</div><div class="col-value">${patient?.id_number||'—'}</div></div>
    </div>
    <hr class="divider">
    <div class="section">${titles[type]}</div>
    <div class="two-col">
      <div><div class="col-label">Prescrito por</div><div class="col-value">${authorName}${authorCode}</div></div>
    </div>
    <hr class="divider">
    <div style="margin-top:16px;">${itemsHtml}</div>
    <div class="sign"><div class="sign-line"></div><div class="sign-name">${authorName}${authorCode}</div><div style="font-size:10pt;color:#888;">Firma y sello</div></div>
    <div class="footer">Documento generado por MedTrack.</div>
    </body></html>`
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close() }, 500)
  }
  return (
    <div style={{ background:'#fff', border: forceExpanded ? 'none' : '0.5px solid #eee', borderRadius: forceExpanded ? 0 : 12, marginBottom: forceExpanded ? 0 : 8, overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', cursor: forceExpanded ? 'default' : 'pointer' }} onClick={() => !forceExpanded && setExpanded(x => !x)}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color: color }}>{dName}</div>
          <div style={{ fontSize:11, color:'#aaa' }}>{fecha}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {canEdit && <button onClick={e => { e.stopPropagation(); onEdit(n) }}
            style={{ padding:'3px 10px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>
            Editar
          </button>}
          {canEdit && <button onClick={e => { e.stopPropagation(); onDelete(n.id) }}
            style={{ padding:'3px 10px', border:'1px solid #D85A30', borderRadius:8, cursor:'pointer', fontSize:12, color:'#D85A30', background:'#fff' }}>
            Eliminar
          </button>}
          {!canEdit && <span style={{ fontSize:11, color:'#bbb', fontStyle:'italic' }}>Bloqueada</span>}
          <span style={{ fontSize:12, color:'#bbb', marginLeft:2 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ background:'#f8f8f8', borderRadius:'0 0 12px 12px', borderTop:'0.5px solid #eee' }}>
          <div style={{ fontSize:12, color:'#444', lineHeight:1.7, whiteSpace:'pre-wrap', padding:'10px 14px' }}>
            {n.note_text}
          </div>
          {(parsed.tratamiento || parsed.imagenes || parsed.laboratorios) && (
            <div style={{ display:'flex', gap:8, padding:'8px 14px 12px', flexWrap:'wrap' }}>
              {parsed.tratamiento && <button onClick={() => printFromNote('receta')} style={{ padding:'4px 12px', border:'1px solid #1a3a5c', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', background:'#fff', display:'inline-flex', alignItems:'center', gap:4 }}><i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Receta</button>}
              {parsed.imagenes && <button onClick={() => printFromNote('imagenes')} style={{ padding:'4px 12px', border:'1px solid #1a3a5c', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', background:'#fff', display:'inline-flex', alignItems:'center', gap:4 }}><i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Imágenes</button>}
              {parsed.laboratorios && <button onClick={() => printFromNote('laboratorios')} style={{ padding:'4px 12px', border:'1px solid #1a3a5c', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', background:'#fff', display:'inline-flex', alignItems:'center', gap:4 }}><i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Laboratorios</button>}
            </div>
          )}
          {notaInsumos.length > 0 && (
            <div style={{ padding:'8px 14px 12px', borderTop:'0.5px solid #eee' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Procedimiento — insumos utilizados</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {notaInsumos.map(ins => (
                  <div key={ins.id} style={{ fontSize:12, color:'#555', display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#bbb', flexShrink:0, display:'inline-block' }}></span>
                    {ins.item?.name} — {ins.cantidad} {ins.item?.unit}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ label, count, color, children }) {
  const [open, setOpen] = useState(false)
  const G = color || '#0F6E56'
  return (
    <div style={{ marginBottom:4 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:8, background:'#f8f8f8', cursor:'pointer', border:'0.5px solid #eee' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, fontWeight:500, color:'#555' }}>{label}</span>
          {count > 0 && <span style={{ fontSize:11, background:'var(--clinic-primary, #0F6E56)', color:'#fff', borderRadius:20, padding:'1px 7px', fontWeight:500 }}>{count}</span>}
        </div>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize:14, color:'#999' }} aria-hidden="true"></i>
      </div>
      {open && <div style={{ marginTop:6 }}>{children}</div>}
    </div>
  )
}

export default function ClinicalNoteForm({ patientId, moduleType, color, patient, profile }) {
  const [templates, setTemplates] = useState([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ title:'', content:'' })
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [notes, setNotes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [hizoProcedimiento, setHizoProcedimiento] = useState(null)
  const [insumosUsados, setInsumosUsados] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [insumoSearch, setInsumoSearch] = useState('')
  const [lastConsultType, setLastConsultType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showPrint, setShowPrint] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [signosVitales, setSignosVitales] = useState([])
  const [treatments, setTreatments] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [antecedents, setAntecedents] = useState([])
  const [apnpData, setApnpData] = useState(null)
  const [agoData, setAgoData] = useState(null)
  const [clinicSettings, setClinicSettings] = useState(null)

  const G = color || '#0F6E56'
  const inp1 = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const inpM = { ...inp1, height:90, resize:'vertical' }
  const label = { fontSize:12, fontWeight:600, color:'#555', marginBottom:4, display:'block' }

  useEffect(() => { if (patientId) { load(); loadInventoryItems() } }, [patientId])
  useEffect(() => { if (profile?.clinic_id && moduleType) loadTemplates() }, [profile?.clinic_id, moduleType])

  async function loadInventoryItems() {
    const { data } = await supabase.from('inventory_items').select('id, name, sku, unit, quantity, min_quantity, category').eq('clinic_id', profile.clinic_id).order('name')
    setInventoryItems(data || [])
  }

  async function load() {
    // Cargar tipo de consulta de la preconsulta dentro de las últimas 2 horas
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data: pc } = await supabase.from('preconsult_records')
      .select('consultation_type')
      .eq('patient_id', patient?.profile?.id || patient?.profile_id || patientId)
      .gte('recorded_at', twoHoursAgo)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLastConsultType(pc?.consultation_type || '')
    const [{ data: notesData }, { data: antData }, { data: cs }, { data: measData }, { data: signosData }, { data: treatData }, { data: diagData }] = await Promise.all([
      supabase.from('clinical_notes').select('*, author:recorded_by(first_name, last_name, prefix)').eq('patient_id', patientId).eq('module_type', moduleType).order('note_date', { ascending: false }),
      supabase.from('patient_antecedentes').select('*').eq('patient_id', patient?.profile?.id || patient?.profile_id || patientId).maybeSingle(),
      supabase.from('clinic_settings').select('*').limit(1).single(),
      supabase.from('measurements').select('*').eq('patient_id', patientId).order('measured_at', { ascending: false }),
      supabase.from('clinical_notes').select('*').eq('patient_id', patientId).eq('module_type', moduleType).not('pas', 'is', null).order('note_date', { ascending: false }),
      supabase.from('treatments').select('*').eq('patient_id', patientId).eq('status', 'active').order('appointment_date', { ascending: false }),
      supabase.from('patient_diagnoses').select('*').eq('patient_id', patientId).eq('is_active', true).order('diagnosis_date', { ascending: false }),
    ])
    setNotes(notesData || [])
    setAntecedents(antData ? [antData] : [])
    setApnpData(antData || null)
    setAgoData(antData || null)
    setClinicSettings(cs || null)
    setMeasurements(measData || [])
    setSignosVitales(signosData || [])
    setTreatments(treatData || [])
    setDiagnoses(diagData || [])
    setLoaded(true)
  }

  const LAB_CATEGORIES = {
    'Hematología': ['Hemograma completo','Velocidad de sedimentación','Frotis de sangre periférica','Reticulocitos','Tiempo de protrombina','INR','Tiempo parcial de tromboplastina'],
    'Química sanguínea': ['Glucosa en ayunas','Glucosa postprandial','HbA1c','Creatinina','BUN','Ácido úrico','Colesterol total','HDL','LDL','Triglicéridos','ALT','AST','Bilirrubinas totales','Fosfatasa alcalina','GGT','Proteínas totales','Albúmina','LDH','CPK'],
    'Hormonales': ['FSH','LH','Estradiol','Progesterona','Testosterona total','Testosterona libre','Prolactina','DHEA-S','Cortisol matutino','Insulina en ayunas','Péptido C','IGF-1'],
    'Tiroides': ['TSH','T3 libre','T4 libre','T3 total','T4 total','Anti-TPO','Anti-tiroglobulina','Tiroglobulina'],
    'Electrolitos': ['Sodio','Potasio','Cloro','Calcio','Fósforo','Magnesio','Bicarbonato'],
    'Orina': ['Uroanálisis completo','Urocultivo','Proteínas en orina 24h','Creatinina en orina','Microalbuminuria'],
    'Heces': ['Examen general de heces','Coprocultivo','Parásitos en heces','Sangre oculta en heces','Calprotectina fecal','H. pylori en heces'],
    'Embarazo': ['Beta HCG cuantitativa','Beta HCG cualitativa','Prueba de tolerancia a la glucosa'],
    'Inmunología': ['ANA','Anti-DNA','Factor reumatoide','Anti-CCP','Complemento C3','Complemento C4','ANCA','Inmunoglobulinas IgG/IgA/IgM'],
    'Reumático': ['PCR ultrasensible','VSG','Ácido úrico','HLA-B27'],
    'Marcadores tumorales': ['PSA','CEA','CA 125','CA 19-9','AFP','CA 15-3','Beta-2 microglobulina'],
    'Hepatitis': ['HBsAg','Anti-HBs','Anti-HBc total','Anti-VHC','Anti-VHA IgM'],
    'Bacteriología': ['Hemocultivo','Cultivo de secreción','VDRL','FTA-ABS','VIH','HTLV'],
    'Osteoporosis': ['Calcio sérico','Vitamina D 25-OH','PTH','Marcadores de remodelado óseo'],
    'Vitaminas': ['Vitamina D','Complejo B','Vitamina B12','Vitamina A','Vitamina E'],
    'Anemia': ['Recuento de reticulocitos','Hierro sérico','Ferritina sérica','Transferrina','Ácido fólico','Vitamina B12'],
  }

  function getLabCategory(examName) {
    for (const [cat, exams] of Object.entries(LAB_CATEGORIES)) {
      if (exams.some(e => e.toLowerCase() === examName.toLowerCase())) return cat
    }
    return 'Otros'
  }


  function getLabCategory(examName) {
    for (const [cat, exams] of Object.entries(LAB_CATEGORIES)) {
      if (exams.some(e => e.toLowerCase() === examName.toLowerCase())) return cat
    }
    return 'Otros'
  }

  async function printDoc(type) {
    const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
    const age = dob => {
      if (!dob) return null
      const d = new Date(dob), n = new Date()
      return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
    }

    // Consecutivo
    let consecutive = ''
    if (type === 'receta' && profile?.clinic_id) {
      const { data: consData } = await supabase.rpc('get_next_prescription_number', { p_clinic_id: profile.clinic_id })
      if (consData) consecutive = consData
    }

    const titles = { receta: 'Receta médica', imagenes: 'Solicitud de imágenes médicas', laboratorios: 'Solicitud de exámenes de laboratorio' }
    const content_map = { receta: form.tratamiento, imagenes: form.imagenes, laboratorios: form.laboratorios }
    const body = content_map[type] || ''
    const lines = body.split('\n').filter(Boolean)
    const doctorName = `${profile?.prefix ? profile.prefix + ' ' : ''}${profile?.first_name||''} ${profile?.last_name||''}`
    const doctorCode = profile?.medical_code ? ` — ${profile.medical_code}` : ''
    const clinicName = clinicSettings?.clinic_name || 'Clínica'
    const clinicAddress = [clinicSettings?.address, clinicSettings?.canton, clinicSettings?.province].filter(Boolean).join(', ')
    const clinicPhone = clinicSettings?.phone || ''
    const pName = `${patient?.profile?.last_name||''} ${patient?.profile?.first_name||''}`.trim()

    const FORMS_LIST = ['comprimido','cápsula','tableta','jarabe','suspensión','crema','gel','parche','supositorio','ampolla','colirio','spray','inhalador','solución','pomada','sérum','loción','sobre','tabletas','cápsulas']
    const itemsHtml = type === 'receta'
      ? lines.map((l, i) => {
          const clean = l.replace(/^•\s*/, '').trim()
          const words = clean.split(' ')
          let splitIdx = words.length
          for (let j = 1; j < words.length; j++) {
            if (FORMS_LIST.some(f => words[j].toLowerCase().startsWith(f.toLowerCase())) || /^\d/.test(words[j])) {
              splitIdx = j; break
            }
          }
          const nombre = words.slice(0, splitIdx).join(' ')
          const indicaciones = words.slice(splitIdx).join(' ')
          return `<div style="display:flex;gap:12px;margin-bottom:16px;">
            <div style="width:20px;height:20px;background:#1D9E75;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10pt;font-weight:700;flex-shrink:0;margin-top:2px;">${i+1}</div>
            <div>
              <div style="font-size:12pt;font-weight:700;color:#1a1a1a;">${nombre}</div>
              ${indicaciones ? `<div style="font-size:10pt;color:#444;margin-top:3px;">${indicaciones}</div>` : ''}
            </div>
          </div>`
        }).join('')
      : (() => {
          const cleanLines = lines.map(l => l.replace(/^•\s*/, '').trim()).filter(Boolean)
          if (type === 'laboratorios') {
            const grouped = {}
            cleanLines.forEach(l => {
              const cat = Object.entries(LAB_CATEGORIES).find(([,exams]) => exams.some(e => e.toLowerCase() === l.toLowerCase()))?.[0] || 'Otros'
              if (!grouped[cat]) grouped[cat] = []
              grouped[cat].push(l)
            })
            return Object.entries(grouped).map(([cat, exams]) => `
              <div style="margin-bottom:14px;">
                <div style="font-size:10pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:6px;">${cat}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px 16px;">
                  ${exams.map(e => `<div style="font-size:10pt;padding:2px 0;">${e}</div>`).join('')}
                </div>
              </div>`).join('')
          }
          if (type === 'imagenes') {
            const IMG_PREFIXES = {
              'Radiografías': ['Rx '],
              'Ultrasonido': ['US ','Eco ','Ecografía ','Ultrasonido '],
              'Tomografía': ['TC ','TAC ','Tomografía '],
              'Resonancia magnética': ['RM ','RMN ','Resonancia '],
              'Mamografía': ['Mamografía'],
              'Densitometría': ['Densitometría'],
              'Medicina nuclear': ['Gammagrafía','PET','SPECT'],
            }
            const grouped = {}
            cleanLines.forEach(line => {
              let found = false
              for (const [cat, prefixes] of Object.entries(IMG_PREFIXES)) {
                if (prefixes.some(p => line.startsWith(p))) {
                  if (!grouped[cat]) grouped[cat] = []
                  const dashIdx = line.indexOf(' — ')
                  const nombre = dashIdx !== -1 ? line.substring(line.indexOf(' ') + 1, dashIdx) : line.substring(line.indexOf(' ') + 1)
                  const incidencias = dashIdx !== -1 ? line.substring(dashIdx + 3) : ''
                  grouped[cat].push({ nombre, incidencias }); found = true; break
                }
              }
              if (!found) { if (!grouped['Otros']) grouped['Otros'] = []; grouped['Otros'].push({ nombre: line, incidencias: '' }) }
            })
            return Object.entries(grouped).map(([cat, items]) => `
              <div style="margin-bottom:16px;">
                <div style="font-size:10pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:8px;">${cat}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;">
                  ${items.map(i => `<div style="font-size:10pt;padding:3px 0;border-bottom:0.5px solid #f0f0f0;">
                    <span style="font-weight:500;">${i.nombre}</span>
                    ${i.incidencias ? `<span style="color:#888;font-size:9pt;"> — ${i.incidencias}</span>` : ''}
                  </div>`).join('')}
                </div>
              </div>`).join('')
          }
          return cleanLines.map((l, i) => `<div style="display:flex;gap:10px;margin-bottom:10px;font-size:11pt;">
            <span style="color:#1D9E75;font-weight:700;">${i+1}.</span><span>${l}</span>
          </div>`).join('')
        })()

    const html = (type === 'laboratorios' || type === 'imagenes') ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:20mm;font-size:11pt;color:#222;line-height:1.5}
      .header{border-bottom:2px solid #1a3a5c;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}
      .clinic-name{font-size:18pt;font-weight:700;color:#1a3a5c}.clinic-addr{font-size:9pt;color:#888;margin-top:3px}
      .doc-title{font-size:14pt;font-weight:700;color:#1a3a5c;text-align:center;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1a3a5c;padding-bottom:8px;margin:0 0 16px}
      .patient-box{background:#f8f8f8;border:1px solid #e0e0e0;border-radius:6px;padding:12px 16px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .patient-label{color:#888;font-size:9pt}.patient-field{font-size:10pt}
      .sign{margin-top:50px;display:flex;justify-content:center}.sign-box{text-align:center}
      .sign-line{border-top:1px solid #333;width:220px;margin:0 auto 6px}
      .sign-name{font-size:11pt;font-weight:700;color:#1a3a5c}.sign-sub{font-size:9pt;color:#888}
      .footer{margin-top:30px;border-top:1px solid #eee;padding-top:8px;font-size:9pt;color:#aaa;text-align:center}
    </style></head><body>
      <div class="header">
        <div><div class="clinic-name">${clinicName}</div><div class="clinic-addr">${clinicAddress}</div></div>
        <div style="font-size:9pt;color:#888;text-align:right">Fecha: ${new Date(form.date||new Date()).toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
      </div>
      <div class="doc-title">${titles[type]}</div>
      <div class="patient-box">
        <div><div class="patient-label">Paciente</div><div class="patient-field">${pName}</div></div>
        <div><div class="patient-label">Identificación</div><div class="patient-field">${patient?.id_number||'—'}</div></div>
        <div><div class="patient-label">Fecha de nacimiento</div><div class="patient-field">${patient?.birth_date ? new Date(patient.birth_date+'T12:00:00').toLocaleDateString('es-CR') : '—'}</div></div>
        <div><div class="patient-label">Médico solicitante</div><div class="patient-field">${doctorName}${doctorCode}</div></div>
      </div>
      ${itemsHtml}
      <div class="sign"><div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-name">${doctorName}${doctorCode}</div>
        <div class="sign-sub">Médico solicitante · ${new Date(form.date||new Date()).toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
      </div></div>
      <div class="footer">${clinicName} · Documento generado automáticamente por MedTrack</div>
    </body></html>` : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titles[type]}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; background: white; }
      .page { max-width: 720px; margin: 0 auto; padding: 0; }
      .header { text-align: center; padding: 24px 40px 16px; border-bottom: 3px solid #1D9E75; }
      .clinic-name { font-size: 22pt; font-weight: 700; color: #085041; }
      .clinic-sub { font-size: 10pt; color: #888; margin-top: 3px; }
      .consecutive { font-size: 9pt; color: #1D9E75; font-weight: 600; letter-spacing: 0.06em; margin-top: 6px; }
      .doctor-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 40px; background: #f8fffe; border-bottom: 0.5px solid #eee; }
      .doctor-name { font-size: 11pt; font-weight: 700; color: #085041; }
      .doctor-detail { font-size: 9pt; color: #888; margin-top: 1px; }
      .body { padding: 20px 40px 28px; }
      .patient-box { background: #E1F5EE; border: 1px solid #9FE1CB; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
      .field-label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
      .field-value { font-size: 11pt; font-weight: 500; color: #1a1a1a; margin-top: 1px; }
      .section-title { font-size: 9pt; color: #1D9E75; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; margin-bottom: 14px; padding-bottom: 5px; border-bottom: 1.5px solid #E1F5EE; }
      .divider { border: none; border-top: 1px solid #f0f0f0; margin: 16px 0; }
      .sig-area { display: flex; justify-content: flex-end; margin-top: 36px; }
      .sig-box { text-align: center; width: 200px; }
      .sig-space { height: 40px; }
      .sig-line { border-top: 1px solid #1D9E75; padding-top: 8px; }
      .sig-name { font-size: 10pt; font-weight: 700; color: #085041; }
      .sig-detail { font-size: 8pt; color: #888; margin-top: 2px; }
      .footer { background: #1D9E75; border-top: 2px solid #085041; padding: 10px 40px; display: flex; justify-content: space-between; align-items: center; }
      .footer-clinic { font-size: 10pt; font-weight: 700; color: white; }
      .footer-sub { font-size: 8pt; color: rgba(255,255,255,0.8); }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head><body>
    <div class="page">
      <div class="header">
        <div class="clinic-name">${clinicName}</div>
        <div class="clinic-sub">${clinicAddress}${clinicPhone ? ' · ' + clinicPhone : ''}</div>
        ${consecutive ? `<div class="consecutive" style="text-align:right">N° Consecutivo: ${consecutive}</div>` : ''}
      </div>
      <div class="doctor-bar">
        <div>
          <div class="doctor-name">${doctorName}</div>
          <div class="doctor-detail">${profile?.specialty || ''}</div>
        </div>
        <div style="text-align:right">
          ${profile?.medical_code ? `<div class="doctor-detail">Cédula Prof. ${profile.medical_code}</div>` : ''}
          <div class="doctor-detail">${new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
        </div>
      </div>
      <div class="body">
        <div class="patient-box">
          <div><div class="field-label">Paciente</div><div class="field-value">${pName}</div></div>
          <div><div class="field-label">Identificación</div><div class="field-value">${patient?.id_number||'—'}</div></div>
          <div><div class="field-label">Fecha de nacimiento</div><div class="field-value">${patient?.birth_date ? fmtDate(patient.birth_date) : '—'}</div></div>
          <div><div class="field-label">Edad</div><div class="field-value">${patient?.birth_date ? age(patient.birth_date) + ' años' : '—'}</div></div>
        </div>
        <div class="section-title">${titles[type]}</div>
        ${itemsHtml}
        <div class="divider"></div>
        <div class="sig-area">
          <div class="sig-box">
            <div class="sig-space"></div>
            <div class="sig-line">
              <div class="sig-name">${doctorName}</div>
              ${profile?.medical_code ? `<div class="sig-detail">Cédula Prof. ${profile.medical_code}</div>` : ''}
              <div class="sig-detail">Firma y sello</div>
            </div>
          </div>
        </div>
      </div>
      <div class="footer">
        <div>
          <div class="footer-clinic">${clinicName}.</div>
          <div class="footer-sub">${clinicAddress}</div>
        </div>
        <div class="footer-sub">Documento generado por MedTrack</div>
      </div>
    </div>
    </body></html>`
    const w = window.open('', '_blank')
