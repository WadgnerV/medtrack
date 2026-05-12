import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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
      .select('*, doctor:assigned_doctor_id(id, first_name, last_name, email)')
      .eq('profile_id', profile.id)
      .single()
    if (data) {
      setPatient(data)
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

        <div style={{ marginTop:'auto', padding:'10px 14px', borderTop:'0.5px solid #eee', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500 }}>
            {initials(profile?.first_name, profile?.last_name)}
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{ fontSize:10, color:'#999' }}>Paciente</div>
          </div>
          <button style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#ccc' }} onClick={async () => { await signOut(); navigate('/login') }}>x</button>
        </div>
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
                <div style={{ background: G, borderRadius:12, padding:'14px 16px', marginBottom:14, color:'#fff' }}>
                  <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>Proxima cita</div>
                  <div style={{ fontSize:15, fontWeight:500 }}>{formatDate(nextAppt.appointment_date)}</div>
                  <div style={{ fontSize:13, opacity:0.9, marginTop:2 }}>{nextAppt.appointment_time?.substring(0,5)} hrs · {nextAppt.visit_type}</div>
                  {nextAppt.doctor && <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>Dr. {nextAppt.doctor.first_name} {nextAppt.doctor.last_name}</div>}
                </div>
              ) : (
                <div onClick={() => window.open('https://wa.me/50660464569?text=Hola,%20quisiera%20agendar%20una%20cita%20en%20Glow%20Clinic', '_blank')}
                  style={{ background:'#f8f8f8', borderRadius:12, padding:'14px 16px', marginBottom:14, cursor:'pointer', border:'0.5px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>Sin cita agendada</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Toca para contactarnos por WhatsApp</div>
                  </div>
                  <span style={{ fontSize:20 }}>💬</span>
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                {[
                  { l:'Peso actual', v: latest?.weight_kg, u:'kg' },
                  { l:'% Grasa', v: latest?.body_fat_pct, u:'%' },
                  { l:'Masa muscular', v: latest?.muscle_mass_kg, u:'kg' },
                  { l:'Grasa visceral', v: latest?.visceral_fat_pts, u:'pts' },
                ].map((m,i) => (
                  <div key={i} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:20, fontWeight:500, color:'#1a1a1a' }}>{m.v || '--'} <span style={{ fontSize:11, color:'#999', fontWeight:400 }}>{m.v ? m.u : ''}</span></div>
                  </div>
                ))}
              </div>

              {goals.length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Mis objetivos</div>
                  {goals.map(g => {
                    const pct = goalProgress(g)
                    return (
                      <div key={g.id} style={{ marginBottom:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                          <span style={{ color:'#444' }}>{g.name}</span>
                          <span style={{ fontWeight:500, color:'#1a1a1a' }}>{g.initial_value} → {g.target_value}</span>
                        </div>
                        <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                          <div style={{ height:'100%', background:G, borderRadius:3, width: pct + '%', transition:'width 0.5s' }} />
                        </div>
                        <div style={{ fontSize:10, color:'#999', marginTop:2, textAlign:'right' }}>{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>Hidratacion de hoy</div>
                <div style={{ fontSize:11, color:'#888', marginBottom:12 }}>{glassesCount} de {glassesGoal} vasos · {goalMl} ml meta</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
                  {Array.from({ length: glassesGoal }).map((_, i) => (
                    <span key={i}
                      onClick={() => i < glassesCount ? removeWater() : addWater()}
                      style={{ fontSize:26, opacity: i < glassesCount ? 1 : 0.2, cursor:'pointer', transition:'all 0.15s', userSelect:'none' }}
                      title={i < glassesCount ? 'Quitar vaso' : 'Agregar vaso'}>
                      💧
                    </span>
                  ))}
                </div>
                <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                  <div style={{ height:'100%', background:'#185FA5', borderRadius:3, width: waterPct + '%', transition:'width 0.3s' }} />
                </div>
              </div>
            </div>
          )}

          {view === 'progreso' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                {[
                  { l:'Peso', v: latest?.weight_kg, u:'kg' },
                  { l:'% Grasa', v: latest?.body_fat_pct, u:'%' },
                  { l:'Masa muscular', v: latest?.muscle_mass_kg, u:'kg' },
                  { l:'Grasa visceral', v: latest?.visceral_fat_pts, u:'pts' },
                ].map((m,i) => (
                  <div key={i} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:20, fontWeight:500, color:'#1a1a1a' }}>{m.v || '--'} <span style={{ fontSize:11, color:'#999', fontWeight:400 }}>{m.v ? m.u : ''}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Historial de mediciones</div>
                <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr', gap:8, padding:'6px 0', borderBottom:'0.5px solid #f0f0f0', fontSize:10, fontWeight:500, color:'#999', textTransform:'uppercase' }}>
                  <span>Fecha</span><span>Peso</span><span>% Grasa</span><span>Muscular</span><span>Visceral</span>
                </div>
                {measurements.map(m => (
                  <div key={m.id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr', gap:8, padding:'8px 0', borderBottom:'0.5px solid #f5f5f5', fontSize:12 }}>
                    <span style={{ color:'#888' }}>{m.measured_at}</span>
                    <span style={{ color:'#1a1a1a' }}>{m.weight_kg ? m.weight_kg + ' kg' : '--'}</span>
                    <span style={{ color:'#1a1a1a' }}>{m.body_fat_pct ? m.body_fat_pct + '%' : '--'}</span>
                    <span style={{ color:'#1a1a1a' }}>{m.muscle_mass_kg ? m.muscle_mass_kg + ' kg' : '--'}</span>
                    <span style={{ color:'#1a1a1a' }}>{m.visceral_fat_pts ? m.visceral_fat_pts + ' pts' : '--'}</span>
                  </div>
                ))}
                {measurements.length === 0 && <div style={{ fontSize:12, color:'#999', textAlign:'center', padding:20 }}>Sin mediciones registradas aun</div>}
              </div>
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
