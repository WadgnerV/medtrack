import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
  const plan = [...form.planOpciones]
  if (form.planOtroChecked && form.planOtro.trim()) plan.push(`Otro: ${form.planOtro.trim()}`)
  if (plan.length > 0) lines.push(`Plan de seguimiento:\n${plan.map(p => `• ${p}`).join('\n')}`)
  return lines.join('\n\n')
}

const emptyForm = {
  motivo: '', padecimiento: '', examen: '', procedimiento: '',
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

export default function ClinicalNoteForm({ patientId, moduleType, color }) {
  const [notes, setNotes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const G = color || '#0F6E56'
  const inp1 = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const inpM = { ...inp1, height:90, resize:'vertical' }
  const label = { fontSize:12, fontWeight:600, color:'#555', marginBottom:4, display:'block' }

  useEffect(() => { if (patientId) load() }, [patientId])

  async function load() {
    const { data } = await supabase.from('clinical_notes')
      .select('*, author:recorded_by(first_name, last_name)')
      .eq('patient_id', patientId)
      .eq('module_type', moduleType)
      .order('note_date', { ascending: false })
    setNotes(data || [])
    setLoaded(true)
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
      {/* Botón nueva nota */}
      {!showForm && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
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
            <button onClick={() => startEdit(n)}
              style={{ padding:'4px 12px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>
              Editar
            </button>
          </div>
          <div style={{ fontSize:11, color:'#444', lineHeight:1.7, whiteSpace:'pre-wrap', background:'#f8f8f8', borderRadius:8, padding:'10px 12px' }}>
            {n.note_text}
          </div>
        </div>
      ))}
    </div>
  )
}
