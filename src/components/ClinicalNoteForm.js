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
        'Ultrasonido': ['US ','Eco ','Ecografía ','Ultrasonido '],
        'Tomografía': ['TC ','TAC ','Tomografía '],
        'Resonancia magnética': ['RM ','RMN ','Resonancia '],
        'Mamografía': ['Mamografía'],
        'Densitometría': ['Densitometría'],
        'Medicina nuclear': ['Gammagrafía','PET','SPECT'],
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
    const authorCode = n.author?.medical_code ? ` — ${n.author.medical_code}` : ''
    const pName = `${patient?.profile?.last_name||''} ${patient?.profile?.first_name||''}`.trim()
    const cName = clinicSettings?.clinic_name || 'MedTrack'
    const cAddr = [clinicSettings?.address, clinicSettings?.district, clinicSettings?.canton, clinicSettings?.province].filter(Boolean).join(', ')

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
        <div style="font-size:9pt;color:#888;text-align:right">Fecha: ${new Date(n.note_date + 'T12:00:00').toLocaleDateString('es-CR', {day:'2-digit',month:'long',year:'numeric'})}</div>
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
        <div class="sign-sub">Médico solicitante · ${new Date(n.note_date + 'T12:00:00').toLocaleDateString('es-CR', {day:'2-digit',month:'long',year:'numeric'})}</div>
      </div></div>
      <div class="footer">${cName} · Documento generado automáticamente por MedTrack</div>
    </body></html>` : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titles[type]}</title>
    <style>body{font-family:Arial,sans-serif;margin:20mm;color:#222;font-size:13pt;} .doc-title{font-size:22pt;font-weight:900;color:#1a3a5c;text-align:center;text-transform:uppercase;letter-spacing:0.08em;.doc-title{font-size:22pt;font-weight:900;color:#1a3a5c;text-align:center;text-transform:uppercase;letter-spacing:0.08em;border-bottom:3px solid #1a3a5c;padding-bottom:10px;margin-bottom:20px;} .sub{font-size:12pt;color:#666;margin-bottom:16px;} .divider{border:none;border-top:1px solid #e2e8f0;margin:16px 0;} .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:8px;} .col-label{font-size:10pt;color:#888;margin-bottom:2px;} .col-value{font-size:12pt;color:#222;font-weight:500;border-bottom:1px solid #e2e8f0;padding-bottom:3px;} .section{font-size:13pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1a3a5c;padding-bottom:4px;margin:20px 0 12px;} .sign{margin-top:48px;text-align:center;} .sign-line{border-top:1px solid #1a3a5c;width:260px;margin:0 auto 6px;} .sign-name{font-size:13pt;font-weight:700;color:#1a3a5c;} .footer{margin-top:32px;font-size:10pt;color:#aaa;font-style:italic;border-top:1px solid #eee;padding-top:8px;}</style>
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
      <div><div class="col-label">Prescrito por</div><div class="col-value">${authorName}${authorCode}</div></div>
    </div>
    <hr class="divider">
    <div style="margin-top:16px;">${itemsHtml}</div>
    <div class="sign"><div class="sign-line"></div><div class="sign-name">${authorName}${authorCode}</div><div style="font-size:10pt;color:#888;">Firma y sello</div></div>
    <div class="footer">Documento generado por MedTrack.</div>
    </body></html>`
