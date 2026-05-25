import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ClinicalNoteForm from '../components/ClinicalNoteForm'
import { EJERCICIOS_PREDEFINIDOS, GRUPOS_EJERCICIOS } from '../components/EjerciciosPredefinidos'

const COLOR = '#e67e22'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

export default function FisioterapiaModule({ patient, careModule, canEdit, profile }) {
  const [tab, setTab] = useState(canEdit ? 'notas' : 'ejercicios')
  const [exercises, setExercises] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [showExForm, setShowExForm] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [exForm, setExForm] = useState({ sets:'', reps:'', duration_seconds:'', notes:'' })
  const [savingEx, setSavingEx] = useState(false)
  const [showDiagForm, setShowDiagForm] = useState(false)
  const [diagSearch, setDiagSearch] = useState('')
  const [diagResults, setDiagResults] = useState([])
  const [filterGroup, setFilterGroup] = useState('Todos')
  const [playingVideo, setPlayingVideo] = useState(null)

  useEffect(() => { if (patient?.id) { loadExercises(); loadDiagnoses() } }, [patient])

  async function loadExercises() {
    const { data } = await supabase.from('prescribed_exercises')
      .select('*').eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
    setExercises(data || [])
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses')
      .select('*').eq('patient_id', patient.id).eq('is_active', true)
    setDiagnoses(data || [])
  }

  async function searchCie10(q) {
    if (!q || q.length < 2) { setDiagResults([]); return }
    const { data } = await supabase.from('cie10').select('code, description')
      .or(`description.ilike.%${q}%,code.ilike.%${q}%`).limit(8)
    setDiagResults(data || [])
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

  async function saveExercise() {
    if (!selectedExercise) return
    setSavingEx(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('prescribed_exercises').insert({
      patient_id: patient.id,
      exercise_name: selectedExercise.name,
      description: selectedExercise.description,
      video_url: selectedExercise.video_url,
      sets: exForm.sets ? parseInt(exForm.sets) : null,
      reps: exForm.reps ? parseInt(exForm.reps) : null,
      duration_seconds: exForm.duration_seconds ? parseInt(exForm.duration_seconds) : null,
      notes: exForm.notes,
      created_by: user.id,
    })
    setSelectedExercise(null); setExForm({ sets:'', reps:'', duration_seconds:'', notes:'' })
    setShowExForm(false); setSavingEx(false)
    await loadExercises()
  }

  async function toggleCompleted(ex) {
    await supabase.from('prescribed_exercises').update({
      is_completed: !ex.is_completed,
      completed_date: !ex.is_completed ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', ex.id)
    await loadExercises()
  }

  async function deleteExercise(id) {
    await supabase.from('prescribed_exercises').delete().eq('id', id)
    await loadExercises()
  }

  const TABS = [
    ...(canEdit ? [{ key:'notas', label:'Notas clínicas' }] : []),
    { key:'ejercicios', label:'Ejercicios prescritos' },
    { key:'diagnosticos', label:'Diagnósticos' },
  ]

  const filteredLib = filterGroup === 'Todos'
    ? EJERCICIOS_PREDEFINIDOS
    : EJERCICIOS_PREDEFINIDOS.filter(e => e.group === filterGroup)

  const inp = { padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', width:'100%' }

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
        <ClinicalNoteForm patientId={patient?.id} moduleType="fisioterapia" color={COLOR} patient={patient} profile={profile} />
      )}

      {tab === 'ejercicios' && (
        <div>
          {canEdit && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
              <button onClick={() => setShowExForm(!showExForm)}
                style={{ padding:'7px 16px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                + Prescribir ejercicio
              </button>
            </div>
          )}

          {canEdit && showExForm && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Prescribir ejercicio</div>

              {/* Filtro por grupo */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                {['Todos', ...GRUPOS_EJERCICIOS].map(g => (
                  <button key={g} onClick={() => setFilterGroup(g)}
                    style={{ padding:'4px 10px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, background: filterGroup === g ? COLOR : '#f0f0f0', color: filterGroup === g ? '#fff' : '#666' }}>
                    {g}
                  </button>
                ))}
              </div>

              {/* Lista de ejercicios */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12, maxHeight:300, overflowY:'auto' }}>
                {filteredLib.map(ex => (
                  <div key={ex.name} onClick={() => setSelectedExercise(selectedExercise?.name === ex.name ? null : ex)}
                    style={{ padding:'10px 12px', borderRadius:10, cursor:'pointer', border: selectedExercise?.name === ex.name ? `2px solid ${COLOR}` : '1px solid #eee', background: selectedExercise?.name === ex.name ? COLOR+'10' : '#f8f8f8' }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:2 }}>{ex.name}</div>
                    <div style={{ fontSize:11, color:'#888' }}>{ex.group}</div>
                  </div>
                ))}
              </div>

              {selectedExercise && (
                <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:COLOR, marginBottom:8 }}>{selectedExercise.name}</div>
                  <div style={{ fontSize:12, color:'#666', marginBottom:10 }}>{selectedExercise.description}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>Series</div>
                      <input type="number" style={inp} value={exForm.sets} onChange={e => setExForm(p=>({...p,sets:e.target.value}))} placeholder="3" />
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>Repeticiones</div>
                      <input type="number" style={inp} value={exForm.reps} onChange={e => setExForm(p=>({...p,reps:e.target.value}))} placeholder="10" />
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>Duración (seg)</div>
                      <input type="number" style={inp} value={exForm.duration_seconds} onChange={e => setExForm(p=>({...p,duration_seconds:e.target.value}))} placeholder="30" />
                    </div>
                  </div>
                  <input style={inp} value={exForm.notes} onChange={e => setExForm(p=>({...p,notes:e.target.value}))} placeholder="Notas adicionales..." />
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { setShowExForm(false); setSelectedExercise(null) }}
                  style={{ padding:'7px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
                <button onClick={saveExercise} disabled={savingEx || !selectedExercise}
                  style={{ flex:1, padding:'7px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, opacity: !selectedExercise ? 0.5 : 1 }}>
                  {savingEx ? 'Guardando...' : 'Prescribir'}
                </button>
              </div>
            </div>
          )}

          {exercises.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>
              {canEdit ? 'No hay ejercicios prescritos aún.' : 'Tu fisioterapeuta aún no ha prescrito ejercicios.'}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {exercises.map(ex => {
                const ytId = getYouTubeId(ex.video_url)
                const isPlaying = playingVideo === ex.id
                return (
                  <div key={ex.id} style={{ background:'#fff', border: ex.is_completed ? `1.5px solid #0F6E56` : '0.5px solid #eee', borderRadius:12, padding:'14px 16px', opacity: ex.is_completed ? 0.8 : 1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <div style={{ fontSize:14, fontWeight:600, color: ex.is_completed ? '#0F6E56' : '#1a1a1a', textDecoration: ex.is_completed ? 'line-through' : 'none' }}>
                            {ex.exercise_name}
                          </div>
                          {ex.is_completed && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56', fontWeight:600 }}>Completado ✓</span>}
                        </div>
                        {ex.description && <div style={{ fontSize:12, color:'#888', marginBottom:6 }}>{ex.description}</div>}
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                          {ex.sets && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>{ex.sets} series</span>}
                          {ex.reps && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>{ex.reps} reps</span>}
                          {ex.duration_seconds && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>{ex.duration_seconds} seg</span>}
                        </div>
                        {ex.notes && <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>{ex.notes}</div>}
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0, marginLeft:8 }}>
                        {ytId && (
                          <button onClick={() => setPlayingVideo(isPlaying ? null : ex.id)}
                            style={{ padding:'5px 10px', background: isPlaying ? '#e0e0e0' : COLOR+'20', color: isPlaying ? '#666' : COLOR, border:`1px solid ${isPlaying ? '#e0e0e0' : COLOR}`, borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:500 }}>
                            {isPlaying ? 'Cerrar' : '▶ Ver demo'}
                          </button>
                        )}
                        <button onClick={() => toggleCompleted(ex)}
                          style={{ padding:'5px 10px', background: ex.is_completed ? '#E1F5EE' : '#f0f0f0', color: ex.is_completed ? '#0F6E56' : '#666', border:'none', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:500 }}>
                          {ex.is_completed ? '✓ Hecho' : 'Marcar hecho'}
                        </button>
                        {canEdit && (
                          <button onClick={() => deleteExercise(ex.id)}
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#ccc' }}>×</button>
                        )}
                      </div>
                    </div>
                    {isPlaying && ytId && (
                      <div style={{ marginTop:10, borderRadius:10, overflow:'hidden', aspectRatio:'16/9' }}>
                        <iframe
                          width="100%" height="100%"
                          src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                          title={ex.exercise_name}
                          frameBorder="0"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          style={{ display:'block', border:'none', width:'100%', minHeight:200 }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
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
                style={{ ...inp, marginBottom:6 }} />
              {diagResults.map(r => (
                <div key={r.code} onClick={() => addDiagnosis(r)}
                  style={{ padding:'7px 10px', cursor:'pointer', borderRadius:8, fontSize:12, display:'flex', justifyContent:'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f0e8d8'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <span>{r.description}</span>
                  <span style={{ color:COLOR, fontWeight:500 }}>{r.code}</span>
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
                  <div style={{ fontSize:12, fontWeight:500, marginBottom:4 }}>{d.cie10_description}</div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#fde8d0', color:COLOR, fontWeight:500 }}>{d.cie10_code}</span>
                  {canEdit && <button onClick={() => deleteDiagnosis(d.id)} style={{ position:'absolute', top:6, right:6, background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#ccc' }}>×</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
