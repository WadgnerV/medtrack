import { useState, useEffect } from 'react'
import PrescriptionForm from './PrescriptionForm'
import MedicalImagingForm from './MedicalImagingForm'
import LabStudiesForm from './LabStudiesForm'
import { supabase } from '../lib/supabase'
import AntecedentsSection from './AntecedentsSection'
import PrintNotesModal from './PrintNotesModal'

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
  note_date: new Date().toISOString().split('T')[0]
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

function CollapsibleNote({ n, color, onEdit, onDelete, patient }) {
  const [expanded, setExpanded] = useState(false)
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
    const itemsHtml = lines.map(l => `<div style="margin-bottom:8px;font-size:14pt;">${l}</div>`).join('')
    const authorName = n.author ? `${n.author.prefix ? n.author.prefix + ' ' : ''}${n.author.first_name} ${n.author.last_name}` : 'Médico'
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titles[type]}</title>
    <style>body{font-family:Arial,sans-serif;margin:20mm;color:#222;font-size:13pt;} .doc-title{font-size:22pt;font-weight:900;color:#1a3a5c;text-align:center;text-transform:uppercase;letter-spacing:0.08em;border-bottom:3px solid #1a3a5c;padding-bottom:10px;margin-bottom:20px;} .sub{font-size:12pt;color:#666;margin-bottom:16px;} .divider{border:none;border-top:1px solid #e2e8f0;margin:16px 0;} .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:8px;} .col-label{font-size:10pt;color:#888;margin-bottom:2px;} .col-value{font-size:12pt;color:#222;font-weight:500;border-bottom:1px solid #e2e8f0;padding-bottom:3px;} .section{font-size:13pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1a3a5c;padding-bottom:4px;margin:20px 0 12px;} .sign{margin-top:48px;text-align:center;} .sign-line{border-top:1px solid #1a3a5c;width:260px;margin:0 auto 6px;} .sign-name{font-size:13pt;font-weight:700;color:#1a3a5c;} .footer{margin-top:32px;font-size:10pt;color:#aaa;font-style:italic;border-top:1px solid #eee;padding-top:8px;}</style>
    </head><body>
    <div class="doc-title">${titles[type]}</div>
    <div class="sub">Fecha: ${new Date(n.note_date + 'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
    <hr class="divider">
    <div class="section">Datos del paciente</div>
    <div class="two-col">
      <div><div class="col-label">Nombre completo</div><div class="col-value">${patient?.profile?.last_name||''} ${patient?.profile?.first_name||''}</div></div>
      <div><div class="col-label">Identificación</div><div class="col-value">${patient?.id_number||'—'}</div></div>
    </div>
    <hr class="divider">
    <div class="section">${titles[type]}</div>
    <div class="two-col">
      <div><div class="col-label">Prescrito por</div><div class="col-value">${authorName}</div></div>
    </div>
    <hr class="divider">
    <div style="margin-top:16px;">${itemsHtml}</div>
    <div class="sign"><div class="sign-line"></div><div class="sign-name">${authorName}</div><div style="font-size:10pt;color:#888;">Firma y sello</div></div>
    <div class="footer">Documento generado por MedTrack.</div>
    </body></html>`
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close() }, 500)
  }
  return (
    <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, marginBottom:8, overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', cursor:'pointer' }} onClick={() => setExpanded(x => !x)}>
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
          {count > 0 && <span style={{ fontSize:11, background:G, color:'#fff', borderRadius:20, padding:'1px 7px', fontWeight:500 }}>{count}</span>}
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
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showPrint, setShowPrint] = useState(false)
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

  useEffect(() => { if (patientId) load() }, [patientId])
  useEffect(() => { if (profile?.clinic_id && moduleType) loadTemplates() }, [profile?.clinic_id, moduleType])

  async function load() {
    const [{ data: notesData }, { data: antData }, { data: cs }, { data: measData }, { data: signosData }, { data: treatData }, { data: diagData }] = await Promise.all([
      supabase.from('clinical_notes').select('*, author:recorded_by(first_name, last_name, prefix)').eq('patient_id', patientId).eq('module_type', moduleType).order('note_date', { ascending: false }),
      supabase.from('patient_antecedents').select('*').eq('patient_id', patientId),
      supabase.from('clinic_settings').select('*').limit(1).single(),
      supabase.from('measurements').select('*').eq('patient_id', patientId).order('measured_at', { ascending: false }),
      supabase.from('clinical_notes').select('*').eq('patient_id', patientId).eq('module_type', moduleType).not('pas', 'is', null).order('note_date', { ascending: false }),
      supabase.from('treatments').select('*').eq('patient_id', patientId).eq('status', 'active').order('appointment_date', { ascending: false }),
      supabase.from('patient_diagnoses').select('*').eq('patient_id', patientId).eq('is_active', true).order('diagnosis_date', { ascending: false }),
    ])
    setNotes(notesData || [])
    setAntecedents(antData || [])
    setApnpData((antData||[]).find(a=>a.type==='apnp')?.apnp_data || null)
    setAgoData((antData||[]).find(a=>a.type==='ago')?.ago_data || null)
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
                <div style="font-size:9pt;font-weight:700;color:#085041;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1.5px solid #1D9E75;padding-bottom:4px;margin-bottom:8px;">${cat}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;">
                  ${exams.map(e => `<div style="display:flex;align-items:center;gap:6px;font-size:10pt;"><span style="color:#1D9E75;font-size:14pt;line-height:1;">·</span>${e}</div>`).join('')}
                </div>
              </div>`).join('')
          }
          return cleanLines.map((l, i) => `<div style="display:flex;gap:10px;margin-bottom:10px;font-size:11pt;">
            <span style="color:#1D9E75;font-weight:700;">${i+1}.</span><span>${l}</span>
          </div>`).join('')
        })()

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titles[type]}</title>
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
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  async function loadTemplates() {
    if (!moduleType || !profile?.clinic_id) return
    const { data } = await supabase.from('exam_templates')
      .select('*, creator:created_by(first_name, last_name, prefix)')
      .eq('clinic_id', profile.clinic_id)
      .eq('module_type', moduleType)
      .order('created_at', { ascending: false })
    setTemplates(data || [])
  }

  async function saveTemplate() {
    if (!newTemplate.title.trim() || !newTemplate.content.trim()) return
    setSavingTemplate(true)
    await supabase.from('exam_templates').insert({
      clinic_id: profile.clinic_id,
      module_type: moduleType,
      title: newTemplate.title.trim(),
      content: newTemplate.content.trim(),
      created_by: profile.id,
    })
    await loadTemplates()
    setNewTemplate({ title:'', content:'' })
    setShowNewTemplate(false)
    setSavingTemplate(false)
  }

  async function deleteTemplate(id) {
    if (!window.confirm('¿Eliminar esta plantilla?')) return
    await supabase.from('exam_templates').delete().eq('id', id)
    await loadTemplates()
  }

  async function save() {
    const text = buildNoteText(form)
    if (!text.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      patient_id: patientId, module_type: moduleType,
      note_text: text, note_date: form.note_date || new Date().toISOString().split('T')[0],
      recorded_by: user.id,
    }
    if (editingId) await supabase.from('clinical_notes').update(payload).eq('id', editingId)
    else await supabase.from('clinical_notes').insert(payload)
    setForm(emptyForm); setEditingId(null); setShowForm(false)
    await load(); setSaving(false)
  }

  async function deleteNote(id) {
    if (!window.confirm('¿Estás seguro que querés eliminar esta nota? Esta acción no se puede deshacer.')) return
    await supabase.from('clinical_notes').delete().eq('id', id)
    await load()
  }

  function startEdit(note) {
    setForm(parseNoteText(note.note_text))
    setEditingId(note.id); setShowForm(true)
  }

  function togglePlan(opt) {
    setForm(p => ({
      ...p,
      planOpciones: p.planOpciones.includes(opt)
        ? p.planOpciones.filter(x => x !== opt)
        : [...p.planOpciones, opt]
    }))
  }

  return (
    <div>
      {/* Sección antecedentes */}
      {patient && <AntecedentsSection patient={patient} profile={profile} canEdit={!!profile} compact={true} />}

      {/* Botón nueva nota */}
      {showPrint && (
        <PrintNotesModal
          notes={notes}
          patient={patient}
          profile={profile}
          moduleType={moduleType}
          antecedents={antecedents}
          apnpData={apnpData}
          agoData={agoData}
          clinicSettings={clinicSettings}
          measurements={measurements}
          signosVitales={signosVitales}
          treatments={treatments}
          diagnoses={diagnoses}
          onClose={() => setShowPrint(false)}
        />
      )}
      {!showForm && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          {notes.length > 0 && (
            <button onClick={() => setShowPrint(true)} style={{ background:'#f0f4f8', color:'#1a3a5c', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}><i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Imprimir notas</button>
          )}
          <button onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null) }}
            style={{ padding:'7px 16px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
            + Nueva nota
          </button>
        </div>
      )}

      {/* Formulario en columna */}
      {showForm && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{editingId ? 'Editar nota clínica' : 'Nueva nota clínica'}</div>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa', lineHeight:1 }}>×</button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Fecha */}
            <div>
              <label style={label}>Fecha de la nota</label>
              <input type="date" style={inp1} value={form.note_date} onChange={e => setForm(p => ({ ...p, note_date: e.target.value }))} />
            </div>

            {/* Motivo */}
            <div>
              <label style={label}>Motivo de consulta</label>
              <input type="text" style={inp1} value={form.motivo}
                onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))}
                placeholder="Ej: Dolor de cabeza, control rutinario..." />
            </div>

            {/* Padecimiento */}
            <div>
              <label style={label}>Padecimiento actual</label>
              <textarea style={inpM} value={form.padecimiento}
                onChange={e => setForm(p => ({ ...p, padecimiento: e.target.value }))}
                placeholder="Descripción del padecimiento actual..." />
            </div>

            {/* Examen físico */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <label style={{ ...label, marginBottom:0 }}>Examen físico</label>
                <button type="button" onClick={() => setShowTemplates(p => !p)}
                  style={{ padding:'3px 10px', fontSize:11, border:`1px solid ${color}`, borderRadius:6, background: showTemplates ? color : '#fff', color: showTemplates ? '#fff' : color, cursor:'pointer' }}>
                  📋 Plantillas
                </button>
              </div>
              {showTemplates && (
                <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:10, marginBottom:8, maxWidth:420 }}>
                  {templates.length === 0 && !showNewTemplate && (
                    <div style={{ fontSize:12, color:'#999', textAlign:'center', padding:'8px 0' }}>No hay plantillas para este módulo</div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom: showNewTemplate ? 8 : 0 }}>
                    {templates.map(t => (
                      <div key={t.id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div style={{ flex:1, cursor:'pointer' }} onClick={() => { setForm(p => ({ ...p, examen: p.examen ? p.examen + '\n\n' + t.content : t.content })); setShowTemplates(false) }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'#1a1a1a' }}>{t.title}</div>
                          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
                            {t.creator?.prefix ? t.creator.prefix + ' ' : ''}{t.creator?.first_name} {t.creator?.last_name}
                          </div>
                        </div>
                        {t.created_by === profile?.id && (
                          <button onClick={() => deleteTemplate(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:13, flexShrink:0 }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {showNewTemplate ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <input value={newTemplate.title} onChange={e => setNewTemplate(p=>({...p, title:e.target.value}))}
                        placeholder="Título de la plantilla..." style={{ padding:'6px 8px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:6, outline:'none' }} />
                      <textarea value={newTemplate.content} onChange={e => setNewTemplate(p=>({...p, content:e.target.value}))}
                        placeholder="Contenido del examen físico..." rows={4}
                        style={{ padding:'6px 8px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:6, outline:'none', resize:'vertical', fontFamily:'inherit' }} />
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setShowNewTemplate(false)} style={{ padding:'5px 10px', fontSize:11, border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', cursor:'pointer', color:'#666' }}>Cancelar</button>
                        <button onClick={saveTemplate} disabled={savingTemplate || !newTemplate.title || !newTemplate.content}
                          style={{ padding:'5px 10px', fontSize:11, border:'none', borderRadius:6, background:color, color:'#fff', cursor:'pointer', opacity: savingTemplate || !newTemplate.title || !newTemplate.content ? 0.5 : 1 }}>
                          {savingTemplate ? 'Guardando...' : 'Guardar plantilla'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowNewTemplate(true)}
                      style={{ marginTop:6, width:'100%', padding:'5px', fontSize:11, border:`1px dashed ${color}`, borderRadius:6, background:'transparent', color:color, cursor:'pointer' }}>
                      + Nueva plantilla
                    </button>
                  )}
                </div>
              )}
              <textarea style={inpM} value={form.examen}
                onChange={e => setForm(p => ({ ...p, examen: e.target.value }))}
                placeholder="Hallazgos del examen físico..." />
            </div>

            {/* Procedimiento */}
            <div>
              <label style={label}>Notas de procedimiento</label>
              <textarea style={inpM} value={form.procedimiento}
                onChange={e => setForm(p => ({ ...p, procedimiento: e.target.value }))}
                placeholder="Procedimiento realizado..." />
            </div>

            {/* Tratamiento */}
            <div>
              <label style={label}>Tratamiento</label>
              <PrescriptionForm
                value={form.tratamiento}
                onChange={val => setForm(p => ({ ...p, tratamiento: val }))}
                color={color}
              />
            </div>

            {/* Imágenes médicas */}
            <CollapsibleSection label="Imágenes médicas solicitadas" count={form.imagenes ? form.imagenes.split('\n').filter(l => l.trim()).length : 0} color={color}>
              <MedicalImagingForm
                value={form.imagenes}
                onChange={val => setForm(p => ({ ...p, imagenes: val }))}
                color={color}
              />
            </CollapsibleSection>

            {/* Laboratorios */}
            <CollapsibleSection label="Estudios de laboratorio solicitados" count={form.laboratorios ? form.laboratorios.split('\n').filter(l => l.trim()).length : 0} color={color}>
              <LabStudiesForm
                value={form.laboratorios}
                onChange={val => setForm(p => ({ ...p, laboratorios: val }))}
                color={color}
              />
            </CollapsibleSection>

            {/* Plan de seguimiento */}
            <div>
              <label style={label}>Plan de seguimiento</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                {PLAN_OPTIONS.map(opt => (
                  <div key={opt} onClick={() => togglePlan(opt)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, cursor:'pointer', background: form.planOpciones.includes(opt) ? G+'12' : '#f8f8f8', border: form.planOpciones.includes(opt) ? `1px solid ${G}` : '1px solid transparent' }}>
                    <div style={{ width:15, height:15, borderRadius:3, border: form.planOpciones.includes(opt) ? `2px solid ${G}` : '2px solid #ccc', background: form.planOpciones.includes(opt) ? G : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {form.planOpciones.includes(opt) && <span style={{ color:'#fff', fontSize:9, fontWeight:700, lineHeight:1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:12, color:'#333' }}>{opt}</span>
                  </div>
                ))}
                <div onClick={() => setForm(p => ({ ...p, planOtroChecked: !p.planOtroChecked }))}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, cursor:'pointer', background: form.planOtroChecked ? G+'12' : '#f8f8f8', border: form.planOtroChecked ? `1px solid ${G}` : '1px solid transparent' }}>
                  <div style={{ width:15, height:15, borderRadius:3, border: form.planOtroChecked ? `2px solid ${G}` : '2px solid #ccc', background: form.planOtroChecked ? G : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {form.planOtroChecked && <span style={{ color:'#fff', fontSize:9, fontWeight:700, lineHeight:1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:12, color:'#333' }}>Otra</span>
                </div>
              </div>
              {form.planOtroChecked && (
                <input type="text" style={{ ...inp1, marginTop:6 }} value={form.planOtro}
                  onChange={e => setForm(p => ({ ...p, planOtro: e.target.value }))}
                  placeholder="Especificá la acción adicional..." />
              )}
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ padding:'8px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
              Cancelar
            </button>
            {form.tratamiento?.trim() && (
              <button onClick={() => printDoc('receta')}
                style={{ padding:'8px 14px', border:'1px solid #1a3a5c', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', background:'#fff', display:'inline-flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Receta
              </button>
            )}
            {form.imagenes?.trim() && (
              <button onClick={() => printDoc('imagenes')}
                style={{ padding:'8px 14px', border:'1px solid #1a3a5c', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', background:'#fff', display:'inline-flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Imágenes
              </button>
            )}
            {form.laboratorios?.trim() && (
              <button onClick={() => printDoc('laboratorios')}
                style={{ padding:'8px 14px', border:'1px solid #1a3a5c', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', background:'#fff', display:'inline-flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Laboratorios
              </button>
            )}
            <button onClick={save} disabled={saving}
              style={{ flex:1, padding:'8px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar nota' : 'Guardar nota'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de notas */}
      {!loaded ? (
        <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Sin notas clínicas registradas.</div>
      ) : notes.map(n => <CollapsibleNote key={n.id} n={n} color={G} onEdit={startEdit} onDelete={deleteNote} patient={patient} />)}
    </div>
  )
}
