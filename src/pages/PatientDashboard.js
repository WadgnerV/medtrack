import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import UserMenu from '../components/UserMenu'

const G = '#1D9E75'

export default function PatientDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('inicio')
  const [patient, setPatient] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [goals, setGoals] = useState([])
  const [tasks, setTasks] = useState([])
  const [waterLog, setWaterLog] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [msgs, setMsgs] = useState([])
  const [clinicalNotes, setClinicalNotes] = useState([])
  const [nextAppt, setNextAppt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chatMsg, setChatMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [showMeasForm, setShowMeasForm] = useState(false)
  const [measForm, setMeasForm] = useState({ date: new Date().toISOString().split('T')[0], weight:'', fat:'', muscle:'', visceral:'' })

  useEffect(() => { if (profile?.id) loadAll() }, [profile])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadPatient(), loadMsgs()])
    setLoading(false)
  }

  async function loadPatient() {
    const { data } = await supabase.from('patients')
      .select('*')
      .eq('profile_id', profile.id)
      .single()
    if (data) {
      setPatient(data)
    if (data?.assigned_doctor_id) {
      const { data: docData } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('id', data.assigned_doctor_id).single()
      setPatient(prev => ({ ...prev, doctor: docData }))
      console.log("DOCTOR DATA:", docData)
    }
      await Promise.all([
        loadMeasurements(data.id),
        loadGoals(data.id),
        loadTasks(data.id),
        loadWater(data.id),
        loadTreatments(data.id),
        loadNextAppt(data.id),
      ])
    }
  }

  async function loadMeasurements(pid) {
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', pid).order('measured_at', { ascending: false })
    const { data: cnData } = await supabase.from('clinical_notes').select('*').eq('patient_id', pid).order('note_date', { ascending: false })
    setClinicalNotes(cnData || [])
    setMeasurements(data || [])
  }

  async function loadGoals(pid) {
    const { data } = await supabase.from('goals').select('*').eq('patient_id', pid).eq('is_active', true)
    setGoals(data || [])
  }

  async function loadTasks(pid) {
    const { data } = await supabase.from('tasks').select('*').eq('patient_id', pid).order('created_at', { ascending: false })
    setTasks(data || [])
  }

  async function loadWater(pid) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('water_logs').select('*').eq('patient_id', pid).eq('log_date', today).single()
    setWaterLog(data || { glasses_count: 0, goal_ml: patient?.weight_kg ? Math.round(patient.weight_kg * 35) : 2000 })
  }

  async function loadTreatments(pid) {
    const { data } = await supabase.from('treatments').select('*').eq('patient_id', pid).order('appointment_date', { ascending: false })
    setTreatments(data || [])
  }

  async function loadNextAppt(pid) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('appointments')
      .select('*, doctor:doctor_id(first_name, last_name)')
      .eq('patient_id', pid)
      .eq('status', 'scheduled')
      .gte('appointment_date', today)
      .order('appointment_date')
      .order('appointment_time')
      .limit(1)
      .single()
    setNextAppt(data || null)
  }

  async function loadMsgs() {
    if (!patient?.id) return
    const { data } = await supabase.from('messages')
      .select('*, sender:sender_id(first_name, last_name, role)')
      .eq('patient_id', patient.id)
      .order('created_at')
    setMsgs(data || [])
  }

  async function toggleTask(task) {
    const now = task.is_completed ? null : new Date().toISOString()
    await supabase.from('tasks').update({ is_completed: !task.is_completed, completed_at: now }).eq('id', task.id)
    await loadTasks(patient.id)
  }

  async function addWater() {
    if (!patient?.id) return
    const today = new Date().toISOString().split('T')[0]
    const goalMl = measurements[0]?.weight_kg ? Math.round(measurements[0].weight_kg * 35) : 2000
    const newCount = (waterLog?.glasses_count || 0) + 1
    if (waterLog?.id) {
      await supabase.from('water_logs').update({ glasses_count: newCount }).eq('id', waterLog.id)
    } else {
      await supabase.from('water_logs').insert({ patient_id: patient.id, log_date: today, glasses_count: 1, goal_ml: goalMl })
    }
    await loadWater(patient.id)
  }

  async function removeWater() {
    if (!waterLog?.id || waterLog.glasses_count === 0) return
    await supabase.from('water_logs').update({ glasses_count: waterLog.glasses_count - 1 }).eq('id', waterLog.id)
    await loadWater(patient.id)
  }

  async function saveMeasurement() {
    setSaving(true)
    await supabase.from('measurements').insert({
      patient_id: patient.id, recorded_by: profile.id,
      measured_at: measForm.date,
      weight_kg: measForm.weight || null,
      body_fat_pct: measForm.fat || null,
      muscle_mass_kg: measForm.muscle || null,
      visceral_fat_pts: measForm.visceral || null
    })
    await loadMeasurements(patient.id)
    setShowMeasForm(false)
    setMeasForm({ date: new Date().toISOString().split('T')[0], weight:'', fat:'', muscle:'', visceral:'' })
    setSaving(false)
  }

  async function sendMessage() {
    if (!chatMsg.trim() || !patient?.id) return
    await supabase.from('messages').insert({
      patient_id: patient.id, sender_id: profile.id,
      content: chatMsg.trim(), sender_role: 'patient', is_read: false
    })
    setChatMsg('')
    await loadMsgs()
  }

  function goalProgress(g) {
    const latest = measurements[0]
    if (!latest || !g.initial_value || !g.target_value) return 0
    const fieldMap = { peso: 'weight_kg', grasa: 'body_fat_pct', muscular: 'muscle_mass_kg', visceral: 'visceral_fat_pts' }
    const key = Object.keys(fieldMap).find(k => g.name.toLowerCase().includes(k))
    const current = key ? latest[fieldMap[key]] : g.initial_value
    if (!current) return 0
    const total = Math.abs(g.initial_value - g.target_value)
    const done = Math.abs(g.initial_value - current)
    return Math.min(100, Math.round(done / total * 100))
  }

  const latest = measurements[0] || null
  const goalMl = latest?.weight_kg ? Math.round(latest.weight_kg * 35) : 2000
  const glassesGoal = Math.ceil(goalMl / 250)
  const glassesCount = waterLog?.glasses_count || 0
  const waterPct = Math.min(100, Math.round(glassesCount / glassesGoal * 100))

  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

  function formatDate(d) {
    if (!d) return ''
    const date = new Date(d + 'T12:00:00')
    return date.getDate() + ' de ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear()
  }

  function initials(fn, ln) { return ((fn||'')[0]||'') + ((ln||'')[0]||'') }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:G, fontFamily:'system-ui' }}>Cargando MedTrack...</div>

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'system-ui,-apple-system,sans-serif', background:'#f5f5f5' }}>

      {showMeasForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:40 }}
          onClick={e => { if (e.target === e.currentTarget) setShowMeasForm(false) }}>
          <div style={{ width:'100%', maxWidth:480, background:'#fff', borderRadius:'16px 16px 0 0', padding:24 }}>
            <div style={{ width:36, height:4, borderRadius:2, background:'#e0e0e0', margin:'0 auto 20px' }} />
            <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Registrar mis mediciones</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={s.fieldLabel}>Fecha</label>
                <input type="date" value={measForm.date} onChange={e => setMeasForm(p => ({ ...p, date:e.target.value }))} style={s.fieldInput} />
              </div>
              <div><label style={s.fieldLabel}>Peso (kg)</label><input type="number" value={measForm.weight} onChange={e => setMeasForm(p => ({ ...p, weight:e.target.value }))} placeholder="64.2" style={s.fieldInput} /></div>
              <div><label style={s.fieldLabel}>% Grasa</label><input type="number" value={measForm.fat} onChange={e => setMeasForm(p => ({ ...p, fat:e.target.value }))} placeholder="29.1" style={s.fieldInput} /></div>
              <div><label style={s.fieldLabel}>Masa muscular (kg)</label><input type="number" value={measForm.muscle} onChange={e => setMeasForm(p => ({ ...p, muscle:e.target.value }))} placeholder="42.3" style={s.fieldInput} /></div>
              <div><label style={s.fieldLabel}>Grasa visceral (pts)</label><input type="number" value={measForm.visceral} onChange={e => setMeasForm(p => ({ ...p, visceral:e.target.value }))} placeholder="8" style={s.fieldInput} /></div>
            </div>
            <button style={{ ...s.btnPrimary, width:'100%', justifyContent:'center', padding:11, fontSize:14, opacity:saving?0.7:1 }} disabled={saving} onClick={saveMeasurement}>
              {saving ? 'Guardando...' : 'Guardar mediciones'}
            </button>
          </div>
        </div>
      )}

      <div style={{ width:210, minWidth:210, background:'#fff', borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 14px 12px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>+</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', letterSpacing:'0.03em' }}>MEDTRACK</div>
            <div style={{ fontSize:9, color:'#999' }}>by Glow Clinic</div>
          </div>
        </div>

        {[
          { label:'Inicio', key:'inicio' },
          { label:'Mi progreso', key:'progreso' },
          { label:'Mis tareas', key:'tareas' },
          { label:'Tratamientos', key:'tratamientos' },
          { label:'Chat con mi medico', key:'chat' },
        ].map(item => (
          <div key={item.key} onClick={() => setView(item.key)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', cursor:'pointer', fontSize:13, borderLeft: view === item.key ? ('2px solid ' + G) : '2px solid transparent', background: view === item.key ? '#E1F5EE' : 'transparent', color: view === item.key ? '#0F6E56' : '#666', fontWeight: view === item.key ? 500 : 400 }}>
            {item.label}
          </div>
        ))}

        <UserMenu />
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <div style={{ padding:'12px 18px', borderBottom:'0.5px solid #eee', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>
              {{ inicio:'Inicio', progreso:'Mi progreso', tareas:'Mis tareas', tratamientos:'Mis tratamientos', chat:'Chat con mi medico' }[view]}
            </div>
            <div style={{ fontSize:11, color:'#999', marginTop:1 }}>Glow Clinic</div>
          </div>
          {view === 'progreso' && (
            <button style={s.btnPrimary} onClick={() => setShowMeasForm(true)}>+ Registrar medicion</button>
          )}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>

          {view === 'inicio' && (
            <div>
              {nextAppt ? (
                <div style={{ background:'#0F6E56', borderRadius:12, padding:'14px 16px', marginBottom:12, color:'#fff' }}>
                  <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>Próxima cita</div>
                  <div style={{ fontSize:16, fontWeight:600, marginBottom:2 }}>{new Date(nextAppt.appointment_date).toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long' })}</div>
                  <div style={{ fontSize:13, opacity:0.9 }}>{nextAppt.appointment_time?.substring(0,5)} hrs · {nextAppt.visit_type}</div>
                  {nextAppt.doctor && <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>Dr. {nextAppt.doctor.first_name} {nextAppt.doctor.last_name}</div>}
                </div>
              ) : (
                <div onClick={() => window.open('https://wa.me/50660464569?text=Hola,%20quisiera%20agendar%20una%20cita%20en%20Glow%20Clinic', '_blank')}
                  style={{ background:'#f8f8f8', borderRadius:12, padding:'14px 16px', marginBottom:12, cursor:'pointer', border:'0.5px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>Sin cita agendada</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Toca para contactarnos por WhatsApp</div>
                  </div>
                  <span style={{ fontSize:20 }}>💬</span>
                </div>
              )}
              {(() => {
                const lastNote = clinicalNotes[0] || null
                const lastMeas = measurements[0] || null
                const signos = [
                  { label:'Presión arterial', value: lastNote?.pas && lastNote?.pad ? lastNote.pas+'/'+lastNote.pad+' mmHg' : null },
                  { label:'Glicemia', value: lastNote?.glucose ? lastNote.glucose+' mg/dL' : null },
                  { label:'Frec. cardíaca', value: lastNote?.heart_rate ? lastNote.heart_rate+' lpm' : null },
                  { label:'SpO₂', value: lastNote?.spo2 ? lastNote.spo2+'%' : null },
                  { label:'Peso', value: lastMeas?.weight_kg ? lastMeas.weight_kg+' kg' : null },
                  { label:'% Grasa', value: lastMeas?.body_fat_pct ? lastMeas.body_fat_pct+'%' : null },
                  { label:'Masa muscular', value: lastMeas?.muscle_mass_kg ? lastMeas.muscle_mass_kg+' kg' : null },
                  { label:'Grasa visceral', value: lastMeas?.visceral_fat_pts ? lastMeas.visceral_fat_pts+' pts' : null },
                ].filter(s => s.value !== null)
                const fecha = lastNote?.note_date || lastMeas?.measured_at
                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>Últimos signos clínicos</div>
                      {fecha && <div style={{ fontSize:10, color:'#999' }}>{new Date(fecha).toLocaleDateString('es-CR')}</div>}
                    </div>
                    {signos.length === 0
                      ? <div style={{ fontSize:12, color:'#bbb', textAlign:'center', padding:12 }}>Sin registros clínicos aún</div>
                      : <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          {signos.map((s,i) => (
                            <div key={i} style={{ background:'#f9f9f9', borderRadius:8, padding:'10px 12px' }}>
                              <div style={{ fontSize:10, color:'#999', marginBottom:3 }}>{s.label}</div>
                              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>{s.value}</div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                )
              })()}
              {(() => {
                const lastMsg = msgs.filter(m=>m.sender_id!==patient?.profile_id)[0]
                return lastMsg ? (
                  <div onClick={()=>setView('chat')} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12, cursor:'pointer' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:8 }}>Último mensaje de mi médico</div>
                    <div style={{ fontSize:12, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lastMsg.content}</div>
                    <div style={{ fontSize:10, color:'#999', marginTop:4 }}>{new Date(lastMsg.created_at).toLocaleDateString('es-CR')}</div>
                  </div>
                ) : null
              })()}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>Mis tareas pendientes</div>
                  <button onClick={()=>setView('tareas')} style={{ fontSize:11, color:'#0F6E56', background:'#E1F5EE', border:'none', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontWeight:600 }}>Ver todas</button>
                </div>
                {tasks.filter(t=>!t.is_completed).length === 0
                  ? <div style={{ fontSize:12, color:'#bbb', textAlign:'center', padding:8 }}>Sin tareas pendientes</div>
                  : tasks.filter(t=>!t.is_completed).slice(0,3).map(t => (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'#0F6E56', flexShrink:0 }} />
                      <div style={{ fontSize:12, color:'#333', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description||'Tarea'}</div>
                    </div>
                  ))
                }
              </div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>Tratamientos activos</div>
                  <button onClick={()=>setView('tratamientos')} style={{ fontSize:11, color:'#1a5c8a', background:'#e5f0fb', border:'none', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontWeight:600 }}>Ver todos</button>
                </div>
                {treatments.filter(t=>t.is_active).length === 0
                  ? <div style={{ fontSize:12, color:'#bbb', textAlign:'center', padding:8 }}>Sin tratamientos activos</div>
                  : treatments.filter(t=>t.is_active).slice(0,3).map(t => (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'#1a5c8a', flexShrink:0 }} />
                      <div style={{ fontSize:12, color:'#333', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.product_name||'Tratamiento'}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {view === 'progreso' && (
            <div>
              {measurements.length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:12 }}>Evolución del peso (kg)</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={[...measurements].reverse().map(m=>({ fecha: new Date(m.measured_at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), peso: m.weight_kg }))} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                      <YAxis tick={{ fontSize:10, fill:'#999' }} />
                      <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                      <Line type="monotone" dataKey="peso" stroke="#0F6E56" strokeWidth={2} dot={{ r:3, fill:'#0F6E56' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {measurements.filter(m=>m.body_fat_pct).length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:12 }}>Evolución % grasa corporal</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={[...measurements].reverse().map(m=>({ fecha: new Date(m.measured_at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), grasa: m.body_fat_pct }))} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                      <YAxis tick={{ fontSize:10, fill:'#999' }} />
                      <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>v+'%'} />
                      <Line type="monotone" dataKey="grasa" stroke="#1D9E75" strokeWidth={2} dot={{ r:3, fill:'#1D9E75' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {measurements.filter(m=>m.muscle_mass_kg).length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:12 }}>Evolución masa muscular (kg)</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={[...measurements].reverse().filter(m=>m.muscle_mass_kg).map(m=>({ fecha: new Date(m.measured_at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), muscular: m.muscle_mass_kg }))} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                      <YAxis tick={{ fontSize:10, fill:'#999' }} />
                      <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>v+' kg'} />
                      <Line type="monotone" dataKey="muscular" stroke="#0a5c40" strokeWidth={2} dot={{ r:3, fill:'#0a5c40' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {measurements.filter(m=>m.visceral_fat_pts).length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:12 }}>Evolución grasa visceral (pts)</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={[...measurements].reverse().filter(m=>m.visceral_fat_pts).map(m=>({ fecha: new Date(m.measured_at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), visceral: m.visceral_fat_pts }))} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                      <YAxis tick={{ fontSize:10, fill:'#999' }} />
                      <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>v+' pts'} />
                      <Line type="monotone" dataKey="visceral" stroke="#2d8a6e" strokeWidth={2} dot={{ r:3, fill:'#2d8a6e' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {clinicalNotes.filter(n=>n.pas).length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:12 }}>Evolución de presión arterial</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={[...clinicalNotes].reverse().filter(n=>n.pas).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), sistolica: n.pas, diastolica: n.pad }))} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                      <YAxis tick={{ fontSize:10, fill:'#999' }} />
                      <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={(v,n)=>[v+' mmHg', n==='sistolica'?'Sistólica':'Diastólica']} />
                      <Line type="monotone" dataKey="sistolica" stroke="#0F6E56" strokeWidth={2} dot={{ r:3, fill:'#0F6E56' }} />
                      <Line type="monotone" dataKey="diastolica" stroke="#57c4a0" strokeWidth={2} strokeDasharray="4 2" dot={{ r:3, fill:'#57c4a0' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {clinicalNotes.filter(n=>n.glucose).length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:12 }}>Evolución de glicemia</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={[...clinicalNotes].reverse().filter(n=>n.glucose).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), glicemia: n.glucose }))} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                      <YAxis tick={{ fontSize:10, fill:'#999' }} />
                      <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>v+' mg/dL'} />
                      <Line type="monotone" dataKey="glicemia" stroke="#0a7a5a" strokeWidth={2} dot={{ r:3, fill:'#0a7a5a' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {clinicalNotes.length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:12 }}>Historial de signos clínicos</div>
                  {clinicalNotes.map((n,i) => (
                    <div key={i} style={{ borderBottom:'0.5px solid #f5f5f5', paddingBottom:12, marginBottom:12 }}>
                      <div style={{ fontSize:11, color:'#999', fontWeight:500, marginBottom:6 }}>
                        {new Date(n.note_date).toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                        {n.pas && n.pad && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:10, color:'#999' }}>Presión arterial</div><div style={{ fontSize:13, fontWeight:600 }}>{n.pas}/{n.pad} mmHg</div></div>}
                        {n.glucose && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:10, color:'#999' }}>Glicemia</div><div style={{ fontSize:13, fontWeight:600 }}>{n.glucose} mg/dL</div></div>}
                        {n.heart_rate && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:10, color:'#999' }}>Frec. cardíaca</div><div style={{ fontSize:13, fontWeight:600 }}>{n.heart_rate} lpm</div></div>}
                        {n.spo2 && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:10, color:'#999' }}>SpO₂</div><div style={{ fontSize:13, fontWeight:600 }}>{n.spo2}%</div></div>}
                        {n.o2flow && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:10, color:'#999' }}>O₂ flow</div><div style={{ fontSize:13, fontWeight:600 }}>{n.o2flow} L/min</div></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'tareas' && (
            <div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Mis tareas de esta semana</div>
                {tasks.map(t => (
                  <div key={t.id} onClick={() => toggleTask(t)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'0.5px solid #f5f5f5', cursor:'pointer' }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', border: '1.5px solid ' + (t.is_completed ? G : '#ddd'), background: t.is_completed ? G : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#fff', flexShrink:0, transition:'all 0.2s' }}>
                      {t.is_completed ? 'v' : ''}
                    </div>
                    <span style={{ fontSize:13, flex:1, color: t.is_completed ? '#bbb' : '#1a1a1a', textDecoration: t.is_completed ? 'line-through' : 'none' }}>{t.description}</span>
                    {t.category && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.category}</span>}
                  </div>
                ))}
                {tasks.length === 0 && <div style={{ fontSize:12, color:'#999', textAlign:'center', padding:20 }}>Tu medico no ha asignado tareas aun</div>}
              </div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Hidratacion de hoy</div>
                <div style={{ fontSize:11, color:'#888', marginBottom:10 }}>{glassesCount} de {glassesGoal} vasos completados</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                  {Array.from({ length: glassesGoal }).map((_, i) => (
                    <span key={i}
                      onClick={() => i < glassesCount ? removeWater() : addWater()}
                      style={{ fontSize:26, opacity: i < glassesCount ? 1 : 0.2, cursor:'pointer', transition:'all 0.15s', userSelect:'none' }}
                      title={i < glassesCount ? 'Quitar vaso' : 'Agregar vaso'}>
                      💧
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'tratamientos' && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Historial de tratamientos</div>
              {treatments.map(t => (
                <div key={t.id} style={{ padding:'12px 0', borderBottom:'0.5px solid #f0f0f0' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:6 }}>{t.product_name}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                    {t.appointment_date && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.appointment_date}</span>}
                    {t.dose && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#E6F1FB', color:'#185FA5' }}>{t.dose}</span>}
                    {t.zone && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#FAEEDA', color:'#854F0B' }}>{t.zone}</span>}
                    {t.session_label && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.session_label}</span>}
                  </div>
                  {t.notes && <div style={{ fontSize:12, color:'#666', lineHeight:1.6 }}>{t.notes}</div>}
                </div>
              ))}
              {treatments.length === 0 && <div style={{ fontSize:12, color:'#999', textAlign:'center', padding:30 }}>Sin tratamientos registrados aun</div>}
            </div>
          )}

          {view === 'chat' && (
            <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 130px)', background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 14px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', gap:10 }}>
                {patient?.doctor && (
                  <>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500 }}>
                      {initials(patient.doctor.first_name, patient.doctor.last_name)}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>Dr. {patient.doctor.first_name} {patient.doctor.last_name}</div>
                      <div style={{ fontSize:11, color:'#999' }}>Tu medico asignado</div>
                    </div>
                  </>
                )}
                {!patient?.doctor && <div style={{ fontSize:13, color:'#999' }}>Sin medico asignado aun</div>}
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:8 }}>
                {msgs.map(m => (
                  <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: m.sender_role === 'patient' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth:'78%', padding:'9px 12px', borderRadius:12, fontSize:13, lineHeight:1.5, background: m.sender_role === 'patient' ? G : '#f0f0f0', color: m.sender_role === 'patient' ? '#fff' : '#1a1a1a', borderBottomRightRadius: m.sender_role === 'patient' ? 3 : 12, borderBottomLeftRadius: m.sender_role === 'doctor' ? 3 : 12 }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize:10, color:'#bbb', marginTop:2 }}>{new Date(m.created_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' })}</div>
                  </div>
                ))}
                {msgs.length === 0 && (
                  <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'#bbb' }}>
                    <span style={{ fontSize:32 }}>💬</span>
                    <div style={{ fontSize:13 }}>Inicia una conversacion con tu medico</div>
                  </div>
                )}
              </div>
              <div style={{ padding:'10px 14px', borderTop:'0.5px solid #eee', display:'flex', gap:8 }}>
                <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Escribe un mensaje..."
                  style={{ flex:1, padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                <button onClick={sendMessage} style={{ width:36, height:36, borderRadius:'50%', background:G, border:'none', cursor:'pointer', color:'#fff', fontSize:16 }}>{'>'}</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const s = {
  btnPrimary: { background:'#1D9E75', color:'#fff', border:'none', fontSize:12, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' },
  btnCancel:  { background:'none', border:'1px solid #e0e0e0', fontSize:12, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  fieldLabel: { display:'block', fontSize:11, color:'#666', marginBottom:4, fontWeight:500 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a' },
}
