import { useState, useEffect } from 'react'
import ClinicalNoteForm from '../components/ClinicalNoteForm'
import { TAREAS_PREDEFINIDAS, TRATAMIENTOS_PREDEFINIDOS } from '../components/ListasPredefinidas'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLOR = '#0F6E56'

export default function MetabolicModule({ patient, careModule, canEdit, canEditMeasurements, profile }) {
  const [measurements, setMeasurements] = useState([])
  const [treatments, setTreatments] = useState([])
  const [tasks, setTasks] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [tab, setTab] = useState(canEdit ? 'notas' : 'composicion')
  const [notes, setNotes] = useState([])
  const [noteForm, setNoteForm] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showTratForm, setShowTratForm] = useState(false)
  const [tratSeleccionado, setTratSeleccionado] = useState('')
  const [tratOtra, setTratOtra] = useState('')
  const [tratDosage, setTratDosage] = useState('')
  const [tratDescription, setTratDescription] = useState('')
  const [savingTrat, setSavingTrat] = useState(false)
  const [showDiagForm, setShowDiagForm] = useState(false)
  const [diagSearch, setDiagSearch] = useState('')
  const [diagResults, setDiagResults] = useState([])
  const [showTareaForm, setShowTareaForm] = useState(false)
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState([])
  const [tareaOtra, setTareaOtra] = useState('')
  const [tareaOtraChecked, setTareaOtraChecked] = useState(false)
  const [savingTarea, setSavingTarea] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ weight_kg:'', body_fat_pct:'', muscle_mass_kg:'', visceral_fat_pts:'', measured_at: new Date().toISOString().split('T')[0] })

  useEffect(() => { localStorage.setItem('metabolicTab', tab) }, [tab])
  useEffect(() => { if (patient?.id) { loadMeasurements(); loadTreatments(); loadTasks(); loadDiagnoses(); loadNotes() } }, [patient])

  async function loadNotes() {
    const { data } = await supabase.from('clinical_notes')
      .select('*, author:recorded_by(first_name, last_name)')
      .eq('patient_id', patient.id)
      .eq('module_type', 'metabolica')
      .order('note_date', { ascending: false })
    setNotes(data || [])
  }

  async function saveNote() {
    if (!noteForm.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clinical_notes').insert({
      patient_id: patient.id,
      module_type: 'metabolica',
      note_text: noteForm.trim(),
      note_date: new Date().toISOString().split('T')[0],
      recorded_by: user.id,
    })
    setNoteForm('')
    await loadNotes()
    setSavingNote(false)
  }

  async function loadMeasurements() {
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', patient.id).order('measured_at', { ascending: false })
    setMeasurements(data || [])
  }

  async function loadTreatments() {
    const { data } = await supabase.from('treatments').select('*').eq('patient_id', patient.id).eq('status', 'active').order('created_at', { ascending: false })
    setTreatments(data || [])
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false })
    setTasks(data || [])
  }

  async function searchCie10(q) {
    if (!q || q.length < 2) { setDiagResults([]); return }
    const { data } = await supabase.from('cie10').select('code, description')
      .or(`description.ilike.%${q}%,code.ilike.%${q}%`).limit(8)
    setDiagResults(data || [])
  }

  async function saveTratamiento() {
    const name = tratSeleccionado === 'otra' ? tratOtra.trim() : tratSeleccionado
    if (!name) return
    setSavingTrat(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('treatments').insert({ patient_id: patient.id, name, description: tratDescription, dosage: tratDosage, status:'active', created_by: user.id })
    setTratSeleccionado(''); setTratOtra(''); setTratDosage(''); setTratDescription('')
    setShowTratForm(false); setSavingTrat(false)
    await loadTreatments()
  }

  async function deleteMeasurement(id) {
    await supabase.from('measurements').delete().eq('id', id)
    setMeasurements(p => p.filter(m => m.id !== id))
  }

  async function saveEditMeasurement() {
    setSaving(true)
    await supabase.from('measurements').update({
      weight_kg: form.weight_kg || null, body_fat_pct: form.body_fat_pct || null,
      muscle_mass_kg: form.muscle_mass_kg || null, visceral_fat_pts: form.visceral_fat_pts || null,
      measured_at: form.measured_at || new Date().toISOString().split('T')[0]
    }).eq('id', editingMeasurement)
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', patient?.id).order('measured_at', { ascending: false })
    setMeasurements(data || [])
    setEditingMeasurement(null); setShowForm(false)
    setForm({ weight_kg:'', body_fat_pct:'', muscle_mass_kg:'', visceral_fat_pts:'', measured_at: new Date().toISOString().split('T')[0] })
    setSaving(false)
  }

  async function deleteTratamiento(id) {
    await supabase.from('treatments').update({ status:'inactive' }).eq('id', id)
    await loadTreatments()
  }

  async function addDiagnosis(item) {
    await supabase.from('patient_diagnoses').insert({
      patient_id: patient.id, cie10_code: item.code, cie10_description: item.description,
      diagnosis_date: new Date().toISOString().split('T')[0], is_active: true,
    })
    setDiagSearch(''); setDiagResults([]); setShowDiagForm(false)
    await loadDiagnoses()
  }

  async function deleteDiagnosis(id) {
    await supabase.from('patient_diagnoses').update({ is_active: false }).eq('id', id)
    await loadDiagnoses()
  }

  async function saveTarea() {
    const toSave = [...tareasSeleccionadas]
    if (tareaOtraChecked && tareaOtra.trim()) toSave.push(tareaOtra.trim())
    if (toSave.length === 0) return
    setSavingTarea(true)
    await Promise.all(toSave.map(title =>
      supabase.from('tasks').insert({ patient_id: patient.id, title, is_completed: false })
    ))
    setTareasSeleccionadas([]); setTareaOtra(''); setTareaOtraChecked(false)
    setShowTareaForm(false); setSavingTarea(false)
    await loadTasks()
  }

  async function deleteTarea(id) {
    await supabase.from('tasks').update({ is_completed: true }).eq('id', id)
    await loadTasks()
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses').select('*').eq('patient_id', patient.id).eq('is_active', true).order('diagnosis_date', { ascending: false })
    setDiagnoses(data || [])
  }

  async function saveMeasurement() {
    if (!form.weight_kg && !form.body_fat_pct && !form.muscle_mass_kg && !form.visceral_fat_pts) return
    setSaving(true)
    await supabase.from('measurements').insert({
      patient_id: patient.id,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
      muscle_mass_kg: form.muscle_mass_kg ? parseFloat(form.muscle_mass_kg) : null,
      visceral_fat_pts: form.visceral_fat_pts ? parseFloat(form.visceral_fat_pts) : null,
      measured_at: form.measured_at || new Date().toISOString().split('T')[0],
    })
    await loadMeasurements()
    setForm({ weight_kg:'', body_fat_pct:'', muscle_mass_kg:'', visceral_fat_pts:'', measured_at: new Date().toISOString().split('T')[0] })
    setSaving(false); setSaved(true); setShowForm(false)
    setTimeout(() => setSaved(false), 3000)
  }

  function calcDelta(data, key) {
    const sorted = [...data].filter(m => m[key]).sort((a,b) => new Date(a.measured_at) - new Date(b.measured_at))
    if (sorted.length < 2) return null
    const first = sorted[0][key]
    const last = sorted[sorted.length - 1][key]
    return +(last - first).toFixed(1)
  }

  function DeltaBadge({ delta, unit }) {
    if (delta === null) return null
    const color = delta < 0 ? '#0F6E56' : delta > 0 ? '#D85A30' : '#888'
    const sign = delta > 0 ? '+' : ''
    return <span style={{ fontSize:11, fontWeight:500, color, background: delta < 0 ? '#E1F5EE' : delta > 0 ? '#FAECE7' : '#f0f0f0', padding:'2px 7px', borderRadius:20 }}>Δ {sign}{delta} {unit}</span>
  }

  function calcIMC() {
    if (!measurements.length || !patient?.height_cm) return null
    const last = measurements[0]
    if (!last?.weight_kg) return null
    const h = patient.height_cm / 100
    return (last.weight_kg / (h * h)).toFixed(1)
  }

  const imc = calcIMC()
  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  const TABS = [
    ...(canEdit ? [{ key:'notas', label:'Notas clínicas' }] : []),
    { key:'composicion', label:'Composición corporal' },
    { key:'diagnosticos', label:'Diagnósticos' },
    { key:'tareas', label:'Tareas' },
  ]

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? COLOR : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'notas' && (
        <ClinicalNoteForm patientId={patient?.id} moduleType='metabolica' color='#0F6E56' patient={patient} profile={profile} />
      )}

      {tab === 'composicion' && (
        <div>
          {/* Botón registrar medición */}
          {(canEdit || canEditMeasurements) && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
              <button onClick={() => setShowForm(!showForm)}
                style={{ padding:'7px 14px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                + Registrar medición
              </button>
            </div>
          )}

          {showForm && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12, maxWidth:480 }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>{editingMeasurement ? 'Editar medición' : 'Nueva medición'}</div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>Fecha de medición</label>
                <input type="date" style={inp} value={form.measured_at} onChange={e => setForm(p => ({ ...p, measured_at: e.target.value }))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>Peso (kg)</label>
                  <input type="number" step="0.1" style={inp} value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} placeholder="72.5" />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>% Grasa corporal</label>
                  <input type="number" step="0.1" style={inp} value={form.body_fat_pct} onChange={e => setForm(p => ({ ...p, body_fat_pct: e.target.value }))} placeholder="23.4" />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>Masa muscular (kg)</label>
                  <input type="number" step="0.1" style={inp} value={form.muscle_mass_kg} onChange={e => setForm(p => ({ ...p, muscle_mass_kg: e.target.value }))} placeholder="18.3" />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>Grasa visceral (pts)</label>
                  <input type="number" step="0.5" style={inp} value={form.visceral_fat_pts} onChange={e => setForm(p => ({ ...p, visceral_fat_pts: e.target.value }))} placeholder="14" />
                </div>
              </div>
              {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:COLOR }}>✓ Medición guardada</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ padding:'7px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                  Cancelar
                </button>
                <button onClick={editingMeasurement ? saveEditMeasurement : saveMeasurement} disabled={saving}
                  style={{ flex:1, padding:'7px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* IMC actual */}
          {imc && (
            <div style={{ background: COLOR, borderRadius:12, padding:'12px 16px', color:'#fff', marginBottom:12 }}>
              <div style={{ fontSize:11, opacity:0.8 }}>IMC actual</div>
              <div style={{ fontSize:22, fontWeight:700 }}>{imc}</div>
              <div style={{ fontSize:12, opacity:0.85 }}>
                {imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : 'Obesidad'}
              </div>
            </div>
          )}

          {measurements.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>Sin mediciones registradas aún.</div>
          ) : (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                {measurements.filter(m=>m.weight_kg).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}><div style={{ fontSize:13, fontWeight:600 }}>Peso (kg)</div><DeltaBadge delta={calcDelta(measurements, 'weight_kg')} unit='kg' /></div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...measurements].sort((a,b) => new Date(a.measured_at) - new Date(b.measured_at)).map(m=>({ fecha: new Date(m.measured_at + 'T12:00:00').toLocaleDateString('es-CR',{day:'numeric',month:'short'}), peso: m.weight_kg }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+' kg','Peso']} />
                        <Line type="monotone" dataKey="peso" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {measurements.filter(m=>m.body_fat_pct).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}><div style={{ fontSize:13, fontWeight:600 }}>% Grasa corporal</div><DeltaBadge delta={calcDelta(measurements, 'body_fat_pct')} unit='%' /></div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...measurements].sort((a,b) => new Date(a.measured_at) - new Date(b.measured_at)).map(m=>({ fecha: new Date(m.measured_at + 'T12:00:00').toLocaleDateString('es-CR',{day:'numeric',month:'short'}), grasa: m.body_fat_pct }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+'%','Grasa']} />
                        <Line type="monotone" dataKey="grasa" stroke="#1D9E75" strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {measurements.filter(m=>m.muscle_mass_kg).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}><div style={{ fontSize:13, fontWeight:600 }}>Masa muscular (kg)</div><DeltaBadge delta={calcDelta(measurements, 'muscle_mass_kg')} unit='kg' /></div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...measurements].sort((a,b) => new Date(a.measured_at) - new Date(b.measured_at)).map(m=>({ fecha: new Date(m.measured_at + 'T12:00:00').toLocaleDateString('es-CR',{day:'numeric',month:'short'}), muscular: m.muscle_mass_kg }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+' kg','Músculo']} />
                        <Line type="monotone" dataKey="muscular" stroke="#2a8a70" strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {measurements.filter(m=>m.visceral_fat_pts).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}><div style={{ fontSize:13, fontWeight:600 }}>Grasa visceral (pts)</div><DeltaBadge delta={calcDelta(measurements, 'visceral_fat_pts')} unit='pts' /></div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...measurements].sort((a,b) => new Date(a.measured_at) - new Date(b.measured_at)).map(m=>({ fecha: new Date(m.measured_at + 'T12:00:00').toLocaleDateString('es-CR',{day:'numeric',month:'short'}), visceral: m.visceral_fat_pts }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+' pts','Visceral']} />
                        <Line type="monotone" dataKey="visceral" stroke="#3a9a80" strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Historial */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Historial de mediciones</div>
                {measurements.slice(0,10).map((m, i) => (
                  <div key={i} style={{ borderBottom:'0.5px solid #f5f5f5', paddingBottom:10, marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div style={{ fontSize:12, color:'#999' }}>
                        {new Date(m.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                      </div>
                      {(canEdit || canEditMeasurements) && <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => { setEditingMeasurement(m.id); setForm({ weight_kg: m.weight_kg||'', body_fat_pct: m.body_fat_pct||'', muscle_mass_kg: m.muscle_mass_kg||'', visceral_fat_pts: m.visceral_fat_pts||'', measured_at: m.measured_at?.substring(0,10) }); setShowForm(true) }}
                          style={{ background:'none', border:'1px solid #ddd', borderRadius:6, padding:'2px 7px', fontSize:12, cursor:'pointer', color:'#555' }}>✎</button>
                        <button onClick={() => deleteMeasurement(m.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#D85A30', padding:'2px 6px' }}>×</button>
                      </div>}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {m.weight_kg && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Peso</div><div style={{ fontSize:13, fontWeight:600 }}>{m.weight_kg} kg</div></div>}
                      {m.body_fat_pct && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>% Grasa</div><div style={{ fontSize:13, fontWeight:600 }}>{m.body_fat_pct}%</div></div>}
                      {m.muscle_mass_kg && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Músculo</div><div style={{ fontSize:13, fontWeight:600 }}>{m.muscle_mass_kg} kg</div></div>}
                      {m.visceral_fat_pts && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Visceral</div><div style={{ fontSize:13, fontWeight:600 }}>{m.visceral_fat_pts} pts</div></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'diagnosticos' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Diagnósticos activos</div>
            {canEdit && <button onClick={() => setShowDiagForm(!showDiagForm)} style={{ padding:'5px 12px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12 }}>+ Agregar</button>}
          </div>
          {canEdit && showDiagForm && (
            <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px', marginBottom:12 }}>
              <input placeholder="Buscar código o nombre CIE-10..." value={diagSearch}
                onChange={e => { setDiagSearch(e.target.value); searchCie10(e.target.value) }}
                style={{ width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', boxSizing:'border-box', marginBottom:6 }} />
              {diagResults.map(r => (
                <div key={r.code} onClick={() => addDiagnosis(r)}
                  style={{ padding:'7px 10px', cursor:'pointer', borderRadius:8, fontSize:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}
                  onMouseEnter={e => e.currentTarget.style.background='#E1F5EE'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <span>{r.description}</span>
                  <span style={{ color:COLOR, fontWeight:500, marginLeft:8 }}>{r.code}</span>
                </div>
              ))}
            </div>
          )}
          {diagnoses.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin diagnósticos registrados.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {diagnoses.map(d => (
                <div key={d.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px', position:'relative' }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a', marginBottom:4 }}>{d.cie10_description}</div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:COLOR, fontWeight:500 }}>{d.cie10_code}</span>
                  {d.diagnosis_date && <div style={{ fontSize:10, color:'#aaa', marginTop:4 }}>{new Date(d.diagnosis_date).toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })}</div>}
                  {canEdit && <button onClick={() => deleteDiagnosis(d.id)} style={{ position:'absolute', top:6, right:6, background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#ccc' }}>×</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tareas' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Tareas pendientes</div>
            {canEdit && <button onClick={() => setShowTareaForm(!showTareaForm)} style={{ padding:'5px 12px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12 }}>+ Agregar</button>}
          </div>
          {canEdit && showTareaForm && (
            <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px', marginBottom:12 }}>
              <div style={{ fontSize:12, color:'#666', marginBottom:8 }}>Seleccioná una o varias tareas:</div>
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10, maxHeight:220, overflowY:'auto' }}>
                {TAREAS_PREDEFINIDAS.map(t => (
                  <div key={t} onClick={() => setTareasSeleccionadas(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t])}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, cursor:'pointer', background: tareasSeleccionadas.includes(t) ? COLOR+'12' : '#fff', border: tareasSeleccionadas.includes(t) ? `1px solid ${COLOR}` : '1px solid transparent' }}>
                    <div style={{ width:15, height:15, borderRadius:3, border: tareasSeleccionadas.includes(t) ? `2px solid ${COLOR}` : '2px solid #ccc', background: tareasSeleccionadas.includes(t) ? COLOR : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {tareasSeleccionadas.includes(t) && <span style={{ color:'#fff', fontSize:9, fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:12 }}>{t}</span>
                  </div>
                ))}
                <div onClick={() => setTareaOtraChecked(p => !p)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, cursor:'pointer', background: tareaOtraChecked ? COLOR+'12' : '#fff', border: tareaOtraChecked ? `1px solid ${COLOR}` : '1px solid transparent' }}>
                  <div style={{ width:15, height:15, borderRadius:3, border: tareaOtraChecked ? `2px solid ${COLOR}` : '2px solid #ccc', background: tareaOtraChecked ? COLOR : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {tareaOtraChecked && <span style={{ color:'#fff', fontSize:9, fontWeight:700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:12 }}>Otra tarea</span>
                </div>
                {tareaOtraChecked && (
                  <input placeholder="Describí la tarea..." value={tareaOtra} onChange={e => setTareaOtra(e.target.value)}
                    style={{ padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', marginTop:2 }} />
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { setShowTareaForm(false); setTareasSeleccionadas([]); setTareaOtra(''); setTareaOtraChecked(false) }}
                  style={{ padding:'6px 12px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>Cancelar</button>
                <button onClick={saveTarea} disabled={savingTarea}
                  style={{ flex:1, padding:'6px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>
                  {savingTarea ? 'Guardando...' : `Asignar ${tareasSeleccionadas.length + (tareaOtraChecked && tareaOtra ? 1 : 0)} tarea(s)`}
                </button>
              </div>
            </div>
          )}
          {tasks.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin tareas pendientes.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {tasks.map(t => (
                <div key={t.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px', position:'relative' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:2 }}>{t.title}</div>
                  {t.description && <div style={{ fontSize:12, color:'#888' }}>{t.description}</div>}
                  {t.due_date && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Vence: {new Date(t.due_date).toLocaleDateString('es-CR', { day:'numeric', month:'long' })}</div>}
                  {canEdit && <button onClick={() => deleteTarea(t.id)} style={{ position:'absolute', top:6, right:6, background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#ccc' }}>×</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
