import { useState, useEffect } from 'react'
import ClinicalNoteForm from '../components/ClinicalNoteForm'
import { TAREAS_PREDEFINIDAS, TRATAMIENTOS_PREDEFINIDOS } from '../components/ListasPredefinidas'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLOR = '#1a5c8a'

export default function IntegralModule({ patient, careModule, canEdit, profile }) {
  const [clinicalNotes, setClinicalNotes] = useState([])
  const [treatments, setTreatments] = useState([])
  const [tasks, setTasks] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [tab, setTab] = useState(canEdit ? 'notas' : 'signos')
  const [notes, setNotes] = useState([])
  const [noteForm, setNoteForm] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showSignosForm, setShowSignosForm] = useState(false)
  const [editingSigno, setEditingSigno] = useState(null)
  const [signosForm, setSignosForm] = useState({ pas:'', pad:'', glucose:'', heart_rate:'', spo2:'', weight_kg:'', note_date: new Date().toISOString().split('T')[0] })
  const [savingSignos, setSavingSignos] = useState(false)
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

  useEffect(() => { localStorage.setItem('integralTab', tab) }, [tab])
  useEffect(() => { if (patient?.id) { loadClinicalNotes(); loadTreatments(); loadTasks(); loadDiagnoses(); loadNotes() } }, [patient])

  async function loadNotes() {
    const { data } = await supabase.from('clinical_notes')
      .select('*, author:recorded_by(first_name, last_name)')
      .eq('patient_id', patient.id)
      .eq('module_type', 'integral')
      .order('note_date', { ascending: false })
    setNotes(data || [])
  }

  async function saveNote() {
    if (!noteForm.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clinical_notes').insert({
      patient_id: patient.id,
      module_type: 'integral',
      note_text: noteForm.trim(),
      note_date: new Date().toISOString().split('T')[0],
      recorded_by: user.id,
    })
    setNoteForm('')
    await loadNotes()
    setSavingNote(false)
  }

  async function loadClinicalNotes() {
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', patient.id).order('note_date', { ascending: false })
    setClinicalNotes(data || [])
  }

  async function loadTreatments() {
    const { data } = await supabase.from('treatments').select('*').eq('patient_id', patient.id).eq('status', 'active').order('created_at', { ascending: false })
    setTreatments(data || [])
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('patient_id', patient.id).eq('status', 'pending').order('due_date', { ascending: true })
    setTasks(data || [])
  }

  async function searchCie10(q) {
    if (!q || q.length < 2) { setDiagResults([]); return }
    const { data } = await supabase.from('cie10').select('code, description')
      .or(`description.ilike.%${q}%,code.ilike.%${q}%`).limit(8)
    setDiagResults(data || [])
  }

  async function saveSignos() {
    const f = signosForm
    if (!f.pas && !f.glucose && !f.heart_rate && !f.spo2) return
    setSavingSignos(true)
    await supabase.from('clinical_notes').insert({
      patient_id: patient.id, note_date: f.note_date,
      pas: f.pas ? parseInt(f.pas) : null, pad: f.pad ? parseInt(f.pad) : null,
      glucose: f.glucose ? parseFloat(f.glucose) : null,
      heart_rate: f.heart_rate ? parseInt(f.heart_rate) : null,
      spo2: f.spo2 ? parseFloat(f.spo2) : null,
      weight_kg: f.weight_kg ? parseFloat(f.weight_kg) : null,
    })
    setSignosForm({ pas:'', pad:'', glucose:'', heart_rate:'', spo2:'', weight_kg:'', note_date: new Date().toISOString().split('T')[0] })
    setShowSignosForm(false); setSavingSignos(false)
    await loadClinicalNotes()
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

  async function deleteSigno(id) {
    await supabase.from('clinical_notes').delete().eq('id', id)
    setClinicalNotes(p => p.filter(n => n.id !== id))
  }

  async function saveEditSigno() {
    setSavingSignos(true)
    await supabase.from('clinical_notes').update({
      pas: signosForm.pas || null, pad: signosForm.pad || null,
      glucose: signosForm.glucose || null, heart_rate: signosForm.heart_rate || null,
      spo2: signosForm.spo2 || null, weight_kg: signosForm.weight_kg || null,
      note_date: signosForm.note_date
    }).eq('id', editingSigno)
    const { data } = await supabase.from('clinical_notes').select('*').eq('module_id', careModule?.id).order('note_date', { ascending: false })
    setClinicalNotes(data || [])
    setEditingSigno(null); setShowSignosForm(false)
    setSignosForm({ pas:'', pad:'', glucose:'', heart_rate:'', spo2:'', weight_kg:'', note_date: new Date().toISOString().split('T')[0] })
    setSavingSignos(false)
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
      supabase.from('tasks').insert({ patient_id: patient.id, title, status:'pending' })
    ))
    setTareasSeleccionadas([]); setTareaOtra(''); setTareaOtraChecked(false)
    setShowTareaForm(false); setSavingTarea(false)
    await loadTasks()
  }

  async function deleteTarea(id) {
    await supabase.from('tasks').update({ status:'done' }).eq('id', id)
    await loadTasks()
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses').select('*').eq('patient_id', patient.id).eq('is_active', true).order('diagnosis_date', { ascending: false })
    setDiagnoses(data || [])
  }

  const TABS = [
    ...(canEdit ? [{ key:'notas', label:'Notas clínicas' }] : []),
    { key:'signos', label:'Signos clínicos' },
    { key:'tratamientos', label:'Tratamientos' },
    { key:'diagnosticos', label:'Diagnósticos' },
    { key:'tareas', label:'Tareas' },
  ]

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? COLOR : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Notas clínicas */}
      {tab === 'notas' && (
        <ClinicalNoteForm patientId={patient?.id} moduleType='integral' color='#1a5c8a' patient={patient} profile={profile} />
      )}

      {/* Signos clínicos */}
      {tab === 'signos' && (
        <div>
          {canEdit && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
              <button onClick={() => setShowSignosForm(!showSignosForm)}
                style={{ padding:'7px 16px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                + Registrar signos
              </button>
            </div>
          )}
          {canEdit && showSignosForm && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12, maxWidth:480 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>{editingSigno ? 'Editar registro de signos' : 'Nuevo registro de signos'}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                {[['pas','PAS (mmHg)'],['pad','PAD (mmHg)'],['glucose','Glicemia (mg/dL)'],['heart_rate','Frec. cardíaca (lpm)'],['spo2','SpO₂ (%)'],['weight_kg','Peso (kg)']].map(([k,lbl]) => (
                  <div key={k}>
                    <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>{lbl}</div>
                    <input type="number" step="0.1" value={signosForm[k]}
                      onChange={e => setSignosForm(p => ({ ...p, [k]: e.target.value }))}
                      style={{ width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>Fecha</div>
                  <input type="date" value={signosForm.note_date}
                    onChange={e => setSignosForm(p => ({ ...p, note_date: e.target.value }))}
                    style={{ width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowSignosForm(false)} style={{ padding:'7px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
                <button onClick={editingSigno ? saveEditSigno : saveSignos} disabled={savingSignos} style={{ flex:1, padding:'7px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                  {savingSignos ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
          {clinicalNotes.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>Sin registros de signos clínicos aún.</div>
          ) : (
            <div>
              {/* Gráficos */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                {clinicalNotes.filter(n => n.pas && n.pad).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Presión arterial (mmHg)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.pas).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), sistolica: n.pas, diastolica: n.pad }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={(v,n) => [v + ' mmHg', n === 'sistolica' ? 'Sistólica' : 'Diastólica']} />
                        <Line type="monotone" dataKey="sistolica" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                        <Line type="monotone" dataKey="diastolica" stroke="#5b8ab8" strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {clinicalNotes.filter(n=>n.glucose).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Glicemia (mg/dL)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.glucose).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), glicemia: n.glucose }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+' mg/dL','Glicemia']} />
                        <Line type="monotone" dataKey="glicemia" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {clinicalNotes.filter(n=>n.heart_rate).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Frecuencia cardíaca (lpm)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.heart_rate).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), fc: n.heart_rate }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+' lpm','FC']} />
                        <Line type="monotone" dataKey="fc" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {clinicalNotes.filter(n=>n.spo2).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Saturación de oxígeno (%)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.spo2).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), spo2: n.spo2 }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} domain={[90, 100]} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+'%','SpO₂']} />
                        <Line type="monotone" dataKey="spo2" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Historial */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Historial de signos clínicos</div>
                {clinicalNotes.map((n, i) => (
                  <div key={i} style={{ borderBottom:'0.5px solid #f5f5f5', paddingBottom:10, marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div style={{ fontSize:12, color:'#999' }}>
                        {new Date(n.note_date).toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                      </div>
                      {canEdit && <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => { setEditingSigno(n.id); setSignosForm({ pas: n.pas||'', pad: n.pad||'', glucose: n.glucose||'', heart_rate: n.heart_rate||'', spo2: n.spo2||'', weight_kg: n.weight_kg||'', note_date: n.note_date }); setShowSignosForm(true) }}
                          style={{ background:'none', border:'1px solid #ddd', borderRadius:6, padding:'2px 7px', fontSize:12, cursor:'pointer', color:'#555' }}>✎</button>
                        <button onClick={() => deleteSigno(n.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#D85A30', padding:'2px 6px' }}>×</button>
                      </div>}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {n.pas && n.pad && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Presión arterial</div><div style={{ fontSize:13, fontWeight:600 }}>{n.pas}/{n.pad} mmHg</div></div>}
                      {n.glucose && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Glicemia</div><div style={{ fontSize:13, fontWeight:600 }}>{n.glucose} mg/dL</div></div>}
                      {n.heart_rate && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Frec. cardíaca</div><div style={{ fontSize:13, fontWeight:600 }}>{n.heart_rate} lpm</div></div>}
                      {n.spo2 && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>SpO₂</div><div style={{ fontSize:13, fontWeight:600 }}>{n.spo2}%</div></div>}
                      {n.weight_kg && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Peso</div><div style={{ fontSize:13, fontWeight:600 }}>{n.weight_kg} kg</div></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tratamientos */}
      {tab === 'tratamientos' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Tratamientos activos</div>
            {canEdit && <button onClick={() => setShowTratForm(!showTratForm)} style={{ padding:'5px 12px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12 }}>+ Agregar</button>}
          </div>
          {canEdit && showTratForm && (
            <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px', marginBottom:12, maxWidth:480 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
                <select value={tratSeleccionado} onChange={e => setTratSeleccionado(e.target.value)}
                  style={{ padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', background:'#fff', fontFamily:'inherit' }}>
                  <option value="">Seleccioná un tratamiento...</option>
                  {TRATAMIENTOS_PREDEFINIDOS.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="otra">+ Otro tratamiento</option>
                </select>
                {tratSeleccionado === 'otra' && (
                  <input placeholder="Nombre del tratamiento *" value={tratOtra} onChange={e => setTratOtra(e.target.value)}
                    style={{ padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <input placeholder="Descripción (opcional)" value={tratDescription} onChange={e => setTratDescription(e.target.value)}
                    style={{ flex:1, padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                  <input placeholder="Dosis" value={tratDosage} onChange={e => setTratDosage(e.target.value)}
                    style={{ width:100, padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowTratForm(false)} style={{ padding:'6px 12px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>Cancelar</button>
                <button onClick={saveTratamiento} disabled={savingTrat} style={{ padding:'6px 16px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>{savingTrat ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          )}
          {treatments.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin tratamientos activos.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {treatments.map(t => (
                <div key={t.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px', position:'relative' }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a', marginBottom:2 }}>{t.name}</div>
                  {t.description && <div style={{ fontSize:11, color:'#888' }}>{t.description}</div>}
                  {t.dosage && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Dosis: {t.dosage}</div>}
                  {canEdit && <button onClick={() => deleteTratamiento(t.id)} style={{ position:'absolute', top:6, right:6, background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#ccc' }}>×</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diagnósticos */}
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

      {/* Tareas */}
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
