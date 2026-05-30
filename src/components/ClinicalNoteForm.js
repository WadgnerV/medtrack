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
  planOpciones: [], planOtroChecked: false, planOtro: ''
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

export default function ClinicalNoteForm({ patientId, moduleType, color, patient, profile }) {
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

  function printDoc(type) {
    const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
    const age = dob => {
      if (!dob) return null
      const d = new Date(dob), n = new Date()
      return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
    }
    const titles = { receta: 'Prescripción médica', imagenes: 'Solicitud de imágenes médicas', laboratorios: 'Solicitud de estudios de laboratorio' }
    const content_map = { receta: form.tratamiento, imagenes: form.imagenes, laboratorios: form.laboratorios }
    const body = content_map[type] || ''
    const lines = body.split('\n').filter(Boolean)
    const itemsHtml = lines.map(l => `<div style="margin-bottom:8px;font-size:14pt;">${l}</div>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titles[type]}</title>
    <style>body{font-family:Arial,sans-serif;margin:20mm;color:#222;} h1{font-size:18pt;color:#1a3a5c;margin:0 0 4px;} .sub{font-size:11pt;color:#666;margin-bottom:16px;} .section{font-size:12pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #1a3a5c;padding-bottom:4px;margin:16px 0 10px;} .field{display:flex;gap:8px;margin-bottom:4px;} .label{font-size:10pt;color:#888;width:140px;flex-shrink:0;} .value{font-size:11pt;color:#222;} .sign{margin-top:48px;text-align:center;} .sign-line{border-top:1px solid #1a3a5c;width:260px;margin:0 auto 6px;} .sign-name{font-size:12pt;font-weight:700;color:#1a3a5c;} .footer{margin-top:32px;font-size:9pt;color:#aaa;font-style:italic;border-top:1px solid #eee;padding-top:8px;}</style>
    </head><body>
    <h1>${clinicSettings?.clinic_name || 'Clínica'}</h1>
    <div class="sub">Fecha: ${new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
    <div class="section">Datos del paciente</div>
    <div class="field"><span class="label">Nombre:</span><span class="value">${patient?.profile?.last_name||''} ${patient?.profile?.first_name||''}</span></div>
    <div class="field"><span class="label">Identificación:</span><span class="value">${patient?.id_number||'—'}</span></div>
    <div class="field"><span class="label">Fecha de nacimiento:</span><span class="value">${patient?.birth_date ? fmtDate(patient.birth_date) : '—'}${patient?.birth_date ? ' (' + age(patient.birth_date) + ' años)' : ''}</span></div>
    <div class="section">${titles[type]}</div>
    <div class="field"><span class="label">Prescrito por:</span><span class="value">${profile?.prefix ? profile.prefix + ' ' : ''}${profile?.first_name||''} ${profile?.last_name||''}</span></div>
    <div style="margin-top:12px;">${itemsHtml}</div>
    <div class="sign"><div class="sign-line"></div><div class="sign-name">${profile?.prefix ? profile.prefix + ' ' : ''}${profile?.first_name||''} ${profile?.last_name||''}</div><div style="font-size:10pt;color:#888;">Firma y sello</div></div>
    <div class="footer">Documento generado por MedTrack. Información confidencial de uso médico exclusivo.</div>
    </body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  async function save() {
    const text = buildNoteText(form)
    if (!text.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      patient_id: patientId, module_type: moduleType,
      note_text: text, note_date: new Date().toISOString().split('T')[0],
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
            <button onClick={() => setShowPrint(true)} style={{ background:'#f0f4f8', color:'#1a3a5c', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:500, cursor:'pointer' }}>🖨 Imprimir notas</button>
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
            <div style={{ fontSize:14, fontWeight:600 }}>{editingId ? 'Editar nota clínica' : 'Nueva nota clínica'}</div>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa', lineHeight:1 }}>×</button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
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
              <label style={label}>Examen físico</label>
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
            <div>
              <label style={label}>Imágenes médicas solicitadas</label>
              <MedicalImagingForm
                value={form.imagenes}
                onChange={val => setForm(p => ({ ...p, imagenes: val }))}
                color={color}
              />
            </div>

            {/* Laboratorios */}
            <div>
              <label style={label}>Estudios de laboratorio solicitados</label>
              <LabStudiesForm
                value={form.laboratorios}
                onChange={val => setForm(p => ({ ...p, laboratorios: val }))}
                color={color}
              />
            </div>

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

          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ padding:'8px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
              Cancelar
            </button>
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
      ) : notes.map(n => (
        <div key={n.id} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color: G }}>
                {n.author ? `${n.author.first_name} ${n.author.last_name}` : 'Médico'}
              </div>
              <div style={{ fontSize:11, color:'#aaa' }}>
                {new Date(n.note_date).toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => startEdit(n)}
                style={{ padding:'4px 12px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>
                Editar
              </button>
              <button onClick={() => deleteNote(n.id)}
                style={{ padding:'4px 12px', border:'1px solid #D85A30', borderRadius:8, cursor:'pointer', fontSize:12, color:'#D85A30', background:'#fff' }}>
                Eliminar
              </button>
            </div>
          </div>
          <div style={{ fontSize:11, color:'#444', lineHeight:1.7, whiteSpace:'pre-wrap', background:'#f8f8f8', borderRadius:8, padding:'10px 12px' }}>
            {n.note_text}
          </div>
        </div>
      ))}
    </div>
  )
}
