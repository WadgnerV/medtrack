import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import NutritionModule from './NutritionModule'
import WellnessModule from './WellnessModule'
import FemaleHealthModule from './FemaleHealthModule'
import IntegralModule from './IntegralModule'
import ModuleChat from '../components/ModuleChat'
import MetabolicModule from './MetabolicModule'
import AestheticModule from './AestheticModule'
import FisioterapiaModule from './FisioterapiaModule'
import EnfermeriaModule from './EnfermeriaModule'
import MaleHealthModule from './MaleHealthModule'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import UserMenu from '../components/UserMenu'

const G = '#1D9E75'

export default function PatientDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState(() => localStorage.getItem('patientView') || 'inicio')

  useEffect(() => { localStorage.setItem('patientView', view) }, [view])
  const [patient, setPatient] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [goals, setGoals] = useState([])
  const [tasks, setTasks] = useState([])
  const [waterLog, setWaterLog] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [aestheticProcedures, setAestheticProcedures] = useState([])
  const [msgs, setMsgs] = useState([])
  const [clinicalNotes, setClinicalNotes] = useState([])
  const [nextAppt, setNextAppt] = useState(null)
  const [nextAppts, setNextAppts] = useState([])
  const [showDrawer, setShowDrawer] = useState(false)
  const [showProMenu, setShowProMenu] = useState(false)
  const [careModules, setCareModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [chatMsg, setChatMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [showMeasForm, setShowMeasForm] = useState(false)
  const [measForm, setMeasForm] = useState({ date: new Date().toISOString().split('T')[0], weight:'', fat:'', muscle:'', visceral:'' })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
        loadAestheticProcedures(data.id),
        loadNextAppt(data.id),
        loadMsgs(data.id),
        loadCareModules(data.id),
      ])
    }
  }

  async function loadCareModules(pid) {
    const { data } = await supabase.from('patient_care_modules')
      .select('*, professional:assigned_professional_id(id, first_name, last_name, specialty, sex, medical_code)')
      .eq('patient_id', pid)
      .eq('is_active', true)
    setCareModules(data || [])
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

  async function loadAestheticProcedures(pid) {
    const { data } = await supabase.from('aesthetic_procedures')
      .select('*, doctor:created_by(first_name, last_name, sex)')
      .eq('patient_id', pid)
      .order('procedure_date', { ascending: false }).limit(6)
    setAestheticProcedures(data || [])
  }

  async function loadTreatments(pid) {
    const { data } = await supabase.from('treatments')
      .select('*, doctor:created_by(first_name, last_name, sex)')
      .eq('patient_id', pid)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setTreatments(data || [])
  }

  async function loadNextAppt(pid) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('appointments')
      .select('*, doctor:doctor_id(first_name, last_name, sex, specialty)')
      .eq('patient_id', pid)
      .eq('status', 'scheduled')
      .gte('appointment_date', today)
      .order('appointment_date')
      .order('appointment_time')
      .limit(1)
      .single()
    setNextAppt(data || null)

    // Cargar próxima cita por módulo (una por tipo)
    const { data: allAppts } = await supabase.from('appointments')
      .select('*, doctor:doctor_id(first_name, last_name, sex, specialty)')
      .eq('patient_id', pid)
      .eq('status', 'scheduled')
      .gte('appointment_date', today)
      .order('appointment_date')
      .order('appointment_time')
    // Una cita por visit_type (módulo)
    const seen = new Set()
    const byModule = (allAppts || []).filter(a => {
      const key = a.visit_type || 'general'
      if (seen.has(key)) return false
      seen.add(key); return true
    })
    setNextAppts(byModule)
  }

  async function loadMsgs(pid) {
    const id = pid || patient?.id
    if (!id) return
    const { data } = await supabase.from('messages')
      .select('*, sender:sender_id(first_name, last_name, role)')
      .eq('patient_id', id)
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

      {/* Sidebar desktop */}
      {!isMobile && <div style={{ width:210, minWidth:210, background:'#fff', borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 14px 12px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>+</div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', letterSpacing:'0.03em' }}>MEDTRACK</div>
            <div style={{ fontSize:9, color:'#999' }}>by Glow Clinic</div>
          </div>
        </div>

        {(() => {
          const MODULE_LABELS = {
            integral:     'Atención médica integral',
            metabolica:   'Atención médica metabólica',
            estetica:     'Atención médica estética',
            fisioterapia: 'Atención de fisioterapia',
            enfermeria:   'Atención de enfermería',
          }
          const MODULE_COLORS = {
            integral:     '#1a5c8a',
            metabolica:   '#0F6E56',
            estetica:     '#8e44ad',
            fisioterapia: '#e67e22',
            enfermeria:   '#c0392b',
          }
          const MODULE_ORDER = ['integral','metabolica','estetica','fisioterapia','enfermeria']
          const hasModules = careModules.length > 0
          const sortedModules = hasModules ? [...careModules].sort((a,b) => MODULE_ORDER.indexOf(a.module_type) - MODULE_ORDER.indexOf(b.module_type)) : []
          const items = [
            { label:'Inicio', key:'inicio' },
            ...sortedModules.map(m => ({
              label: MODULE_LABELS[m.module_type] || m.module_type,
              key: 'modulo_' + m.module_type,
              color: MODULE_COLORS[m.module_type],
              module: m,
            })),
            { label:'Chat con mi médico', key:'chat' },
          ]
          return items.map(item => (
            <div key={item.key} onClick={() => setView(item.key)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', cursor:'pointer', fontSize:13, borderLeft: view === item.key ? `2px solid ${item.color || G}` : '2px solid transparent', background: item.color ? (view === item.key ? item.color + '30' : item.color + '12') : view === item.key ? '#E1F5EE' : 'transparent', color: view === item.key ? '#1a1a1a' : '#444', fontWeight: view === item.key ? 600 : 400, borderRadius: item.color ? '0 8px 8px 0' : 0, marginRight: item.color ? 8 : 0 }}>
              {item.label}
            </div>
          ))
        })()}

        {/* Items PRO */}
        {profile?.plan === 'pro' && [
          { label:'Nutrición', key:'nutricion', pro: true },
          { label:'Bienestar', key:'bienestar', pro: true },
          ...(patient?.sex === 'female' ? [{ label:'Salud femenina', key:'saludfem', pro: true }] : []),
          ...(patient?.sex === 'male' ? [{ label:'Salud masculina', key:'saludmasc', pro: true }] : []),
        ].map(item => (
          <div key={item.key} onClick={() => setView(item.key)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', cursor:'pointer', fontSize:13, borderLeft: view === item.key ? `2px solid ${G}` : '2px solid transparent', background: view === item.key ? '#E1F5EE' : 'transparent', color: view === item.key ? G : '#666', fontWeight: view === item.key ? 500 : 400 }}>
            {item.label}
            <span style={{ fontSize:10, color:'#c8960c', marginLeft:'auto' }}>★</span>
          </div>
        ))}

        {/* Botón PRO */}
        <div onClick={() => setView('pro')}
          style={{ margin:'12px 10px', padding:'9px 14px', borderRadius:10, cursor:'pointer', background: view === 'pro' ? '#0F6E56' : 'linear-gradient(135deg, #0F6E56, #1D9E75)', color:'#fff', fontSize:13, fontWeight:600, textAlign:'center', boxShadow:'0 2px 8px rgba(15,110,86,0.3)' }}>
          {profile?.plan === 'pro' ? '⭐ Mi Plan PRO' : '⚡ Activar PRO — $4.99/mes'}
        </div>

        <UserMenu />
      </div>}

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {/* Header móvil fijo */}
        {isMobile ? (
          <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
            <button onClick={() => setShowDrawer(true)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#555', padding:'2px 6px', lineHeight:1 }}>☰</button>
            <div style={{ fontSize:15, fontWeight:700, color:'#1a1a1a', letterSpacing:'-0.3px' }}>MedTrack</div>
            <UserMenu />
          </div>
        ) : (
          <div style={{ padding:'12px 18px', borderBottom:'0.5px solid #eee', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>
                {(() => {
                  const MODULE_LABELS = {
                    modulo_integral:     'Atención médica integral',
                    modulo_metabolica:   'Atención médica metabólica',
                    modulo_estetica:     'Atención médica estética',
                    modulo_fisioterapia: 'Atención de fisioterapia',
                    modulo_enfermeria:   'Atención de enfermería',
                  }
                  const base = { inicio:'Inicio', chat:'Chat con mi médico', pro: profile?.plan === 'pro' ? 'Mi Plan PRO' : 'Activar PRO', nutricion:'Nutrición', bienestar:'Bienestar', saludfem:'Salud femenina', saludmasc:'Salud masculina' }
                  return { ...base, ...MODULE_LABELS }[view] || view
                })()}
              </div>
              <div style={{ fontSize:14, color:'#999', marginTop:1 }}>Glow Clinic</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {view === 'progreso' && (
                <button style={s.btnPrimary} onClick={() => setShowMeasForm(true)}>+ Registrar medicion</button>
              )}
            </div>
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '12px 12px 80px' : '16px 18px' }}>

          {view === 'inicio' && (
            <div>
              {/* Citas próximas por módulo */}
              {(() => {
                const MODULE_COLORS = {
                  integral:     '#1a5c8a',
                  metabolica:   '#0F6E56',
                  estetica:     '#8e44ad',
                  fisioterapia: '#e67e22',
                  enfermeria:   '#c0392b',
                }
                const MODULE_LABELS = {
                  integral:     'Medicina integral',
                  metabolica:   'Medicina metabólica',
                  estetica:     'Medicina estética',
                  fisioterapia: 'Fisioterapia',
                  enfermeria:   'Enfermería',
                }
                // Mapear visit_type a module_type
                function getModuleFromVisit(visitType) {
                  if (!visitType) return null
                  const v = visitType.toLowerCase()
                  if (v.includes('integral') || v.includes('general') || v.includes('seguimiento') || v.includes('consulta')) return 'integral'
                  if (v.includes('metab')) return 'metabolica'
                  if (v.includes('estet') || v.includes('estét')) return 'estetica'
                  if (v.includes('fisio')) return 'fisioterapia'
                  if (v.includes('enferm')) return 'enfermeria'
                  return null
                }
                if (nextAppts.length === 0) return (
                  <div onClick={() => window.open('https://wa.me/50660464569?text=Hola,%20quisiera%20agendar%20una%20cita%20en%20Glow%20Clinic', '_blank')}
                    style={{ background:'#f8f8f8', borderRadius:12, padding:'14px 16px', marginBottom:12, cursor:'pointer', border:'0.5px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>Sin cita agendada</div>
                      <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Tocá para contactarnos por WhatsApp</div>
                    </div>
                    <span style={{ fontSize:20 }}>💬</span>
                  </div>
                )
                return (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#555', marginBottom:8 }}>Próximas citas</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {nextAppts.map((appt, i) => {
                        const moduleType = getModuleFromVisit(appt.visit_type)
                        const color = MODULE_COLORS[moduleType] || G
                        const modLabel = MODULE_LABELS[moduleType] || appt.visit_type
                        const docTitle = appt.doctor?.sex === 'female' ? 'Dra.' : 'Dr.'
                        return (
                          <div key={i} style={{ background: color+'12', border:`1.5px solid ${color}30`, borderLeft:`4px solid ${color}`, borderRadius:12, padding:'12px 14px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                              <div style={{ fontSize:12, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.04em' }}>{modLabel}</div>
                              <div style={{ fontSize:11, color:'#888' }}>{new Date(appt.appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { weekday:'short', day:'numeric', month:'short' })}</div>
                            </div>
                            <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:2 }}>
                              {appt.appointment_time?.substring(0,5)} hrs
                            </div>
                            {appt.doctor && (
                              <div style={{ fontSize:12, color:'#666' }}>{docTitle} {appt.doctor.first_name} {appt.doctor.last_name}{appt.doctor.specialty ? ` · ${appt.doctor.specialty}` : ''}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Profesionales asignados */}
              {careModules.length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#555', marginBottom:10 }}>Mis profesionales</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {(() => {
                      const MODULE_COLORS = { integral:'#1a5c8a', metabolica:'#0F6E56', estetica:'#8e44ad', fisioterapia:'#e67e22', enfermeria:'#c0392b' }
                      const MODULE_LABELS = { integral:'Medicina integral', metabolica:'Medicina metabólica', estetica:'Medicina estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }
                      const MODULE_ORDER = ['integral','metabolica','estetica','fisioterapia','enfermeria']
                      return [...careModules].sort((a,b) => MODULE_ORDER.indexOf(a.module_type) - MODULE_ORDER.indexOf(b.module_type)).map(mod => {
                        const color = MODULE_COLORS[mod.module_type] || G
                        return (
                          <div key={mod.module_type} style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
                            <div style={{ fontSize:12, color:'#888', minWidth:130 }}>{MODULE_LABELS[mod.module_type]}</div>
                            {mod.professional ? (
                              <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>
                                {mod.professional.sex === 'female' ? 'Dra.' : 'Dr.'} {mod.professional.first_name} {mod.professional.last_name}
                              </div>
                            ) : (
                              <div style={{ fontSize:11, color:'#bbb' }}>Sin asignar</div>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}

              {(() => {
                const lastMsg = msgs.filter(m=>m.sender_id!==patient?.profile_id)[0]
                return lastMsg ? (
                  <div onClick={()=>setView('chat')} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12, cursor:'pointer' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#555', marginBottom:8 }}>Último mensaje</div>
                    <div style={{ fontSize:13, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lastMsg.content}</div>
                    <div style={{ fontSize:11, color:'#999', marginTop:4 }}>{new Date(lastMsg.created_at).toLocaleDateString('es-CR')}</div>
                  </div>
                ) : null
              })()}
              {/* Tareas pendientes */}
              {tasks.filter(t=>!t.is_completed && t.status === 'pending').length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#555', marginBottom:10 }}>Mis tareas pendientes</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {tasks.filter(t=>t.status === 'pending').slice(0,4).map(t => (
                      <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background:G, flexShrink:0 }} />
                        <div style={{ fontSize:13, color:'#333' }}>{t.title || t.description || 'Tarea'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tratamientos activos + procedimientos estéticos */}
              {(treatments.length > 0 || aestheticProcedures.length > 0) && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#555', marginBottom:10 }}>Tratamientos activos</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {(() => {
                      // Solo el tratamiento más reciente por nombre
                      const seen = new Set()
                      const unique = treatments.filter(t => {
                        const key = (t.name || '').toLowerCase().trim()
                        if (seen.has(key)) return false
                        seen.add(key); return true
                      })
                      return unique.slice(0,6)
                    })().map(t => (
                      <div key={t.id} style={{ background:'#f8f8f8', borderRadius:8, padding:'8px 10px', flexBasis:'calc(33.33% - 6px)', minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#1a1a1a', marginBottom:2 }}>{t.name || 'Tratamiento'}</div>
                        {t.dosage && <div style={{ fontSize:10, color:'#555', marginBottom:2 }}>{t.dosage}</div>}
                        {t.created_at && <div style={{ fontSize:10, color:'#888' }}>{new Date(t.created_at).toLocaleDateString('es-CR',{day:'numeric',month:'short',year:'numeric'})}</div>}
                        <div style={{ fontSize:10, color:'#0F6E56', marginTop:2 }}>Médico</div>
                        {t.doctor && <div style={{ fontSize:10, color:'#666' }}>{t.doctor.sex==='female'?'Dra.':'Dr.'} {t.doctor.first_name} {t.doctor.last_name}</div>}
                      </div>
                    ))}
                    {aestheticProcedures.slice(0,6).map(p => (
                      <div key={p.id} style={{ background:'#f0e8f8', borderRadius:8, padding:'8px 10px', flexBasis:'calc(33.33% - 6px)', minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#1a1a1a', marginBottom:3 }}>{p.procedure_name}</div>
                        {p.procedure_date && <div style={{ fontSize:10, color:'#888' }}>{new Date(p.procedure_date+'T12:00:00').toLocaleDateString('es-CR',{day:'numeric',month:'short',year:'numeric'})}</div>}
                        <div style={{ fontSize:10, color:'#8e44ad', marginTop:1 }}>Estética</div>
                        {p.doctor && <div style={{ fontSize:10, color:'#666' }}>{p.doctor.sex==='female'?'Dra.':'Dr.'} {p.doctor.first_name} {p.doctor.last_name}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'progreso' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                {measurements.length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:8 }}>Peso (kg)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...measurements].reverse().map(m=>({ fecha: new Date(m.measured_at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), peso: m.weight_kg }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                        <Line type="monotone" dataKey="peso" stroke="#0F6E56" strokeWidth={2} dot={{ r:2, fill:'#0F6E56' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {measurements.filter(m=>m.body_fat_pct).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:8 }}>% Grasa corporal</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...measurements].reverse().map(m=>({ fecha: new Date(m.measured_at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), grasa: m.body_fat_pct }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>v+'%'} />
                        <Line type="monotone" dataKey="grasa" stroke="#1D9E75" strokeWidth={2} dot={{ r:2, fill:'#1D9E75' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {measurements.filter(m=>m.muscle_mass_kg).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:8 }}>Masa muscular (kg)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...measurements].reverse().map(m=>({ fecha: new Date(m.measured_at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), muscular: m.muscle_mass_kg }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>v+' kg'} />
                        <Line type="monotone" dataKey="muscular" stroke="#2a8a70" strokeWidth={2} dot={{ r:2, fill:'#2a8a70' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {measurements.filter(m=>m.visceral_fat_pts).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:8 }}>Grasa visceral (pts)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...measurements].reverse().map(m=>({ fecha: new Date(m.measured_at).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), visceral: m.visceral_fat_pts }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>v+' pts'} />
                        <Line type="monotone" dataKey="visceral" stroke="#3a9a80" strokeWidth={2} dot={{ r:2, fill:'#3a9a80' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {clinicalNotes.filter(n=>n.glucose).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:8 }}>Glicemia (mg/dL)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.glucose).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), glicemia: n.glucose }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>v+' mg/dL'} />
                        <Line type="monotone" dataKey="glicemia" stroke="#0a7a5a" strokeWidth={2} dot={{ r:2, fill:'#0a7a5a' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:12 }}>Historial completo</div>
                {clinicalNotes.length === 0 && measurements.length === 0
                  ? <div style={{ fontSize:14, color:'#bbb', textAlign:'center', padding:16 }}>Sin registros aún</div>
                  : [...clinicalNotes.map(n=>({...n, tipo:'clinico', fecha:n.note_date})), ...measurements.map(m=>({...m, tipo:'medicion', fecha:m.measured_at}))]
                      .sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))
                      .map((r,i) => (
                        <div key={i} style={{ borderBottom:'0.5px solid #f5f5f5', paddingBottom:12, marginBottom:12 }}>
                          <div style={{ fontSize:14, color:'#999', fontWeight:500, marginBottom:6 }}>
                            {r.tipo==='clinico'?'Signos clínicos':'Medición'} · {new Date(r.fecha).toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                            {r.tipo==='clinico' && <>
                              {r.pas && r.pad && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:14, color:'#999' }}>Presión</div><div style={{ fontSize:14, fontWeight:600 }}>{r.pas}/{r.pad} mmHg</div></div>}
                              {r.glucose && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:14, color:'#999' }}>Glicemia</div><div style={{ fontSize:14, fontWeight:600 }}>{r.glucose} mg/dL</div></div>}
                              {r.heart_rate && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:14, color:'#999' }}>FC</div><div style={{ fontSize:14, fontWeight:600 }}>{r.heart_rate} lpm</div></div>}
                              {r.spo2 && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:14, color:'#999' }}>SpO₂</div><div style={{ fontSize:14, fontWeight:600 }}>{r.spo2}%</div></div>}
                            </>}
                            {r.tipo==='medicion' && <>
                              {r.weight_kg && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:14, color:'#999' }}>Peso</div><div style={{ fontSize:14, fontWeight:600 }}>{r.weight_kg} kg</div></div>}
                              {r.body_fat_pct && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:14, color:'#999' }}>% Grasa</div><div style={{ fontSize:14, fontWeight:600 }}>{r.body_fat_pct}%</div></div>}
                              {r.muscle_mass_kg && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:14, color:'#999' }}>Músculo</div><div style={{ fontSize:14, fontWeight:600 }}>{r.muscle_mass_kg} kg</div></div>}
                              {r.visceral_fat_pts && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:14, color:'#999' }}>Visceral</div><div style={{ fontSize:14, fontWeight:600 }}>{r.visceral_fat_pts} pts</div></div>}
                            </>}
                          </div>
                        </div>
                      ))
                }
              </div>
            </div>
          )}

          {view === 'tareas' && (
            <div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Mis tareas de esta semana</div>
                {tasks.map(t => (
                  <div key={t.id} onClick={() => toggleTask(t)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'0.5px solid #f5f5f5', cursor:'pointer' }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', border: '1.5px solid ' + (t.is_completed ? G : '#ddd'), background: t.is_completed ? G : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff', flexShrink:0, transition:'all 0.2s' }}>
                      {t.is_completed ? 'v' : ''}
                    </div>
                    <span style={{ fontSize:14, flex:1, color: t.is_completed ? '#bbb' : '#1a1a1a', textDecoration: t.is_completed ? 'line-through' : 'none' }}>{t.description}</span>
                    {t.category && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.category}</span>}
                  </div>
                ))}
                {tasks.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Tu medico no ha asignado tareas aun</div>}
              </div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:2 }}>Hidratacion de hoy</div>
                <div style={{ fontSize:12, color:'#aaa', marginBottom:14 }}>Meta: {goalMl} mL {latest?.weight_kg ? `· ${latest.weight_kg} kg × 35 mL` : '· sin peso registrado'}</div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(48px, 1fr))', gap:10, marginBottom:16 }}>
                  {Array.from({ length: glassesGoal }).map((_, i) => (
                    <div key={i} onClick={async () => {
                      const newCount = i + 1
                      if (newCount === glassesCount) return
                      const today = new Date().toISOString().split('T')[0]
                      const goalMlVal = latest?.weight_kg ? Math.round(latest.weight_kg * 35) : 2000
                      if (waterLog?.id) {
                        await supabase.from('water_logs').update({ glasses_count: newCount }).eq('id', waterLog.id)
                      } else {
                        await supabase.from('water_logs').insert({ patient_id: patient.id, log_date: today, glasses_count: newCount, goal_ml: goalMlVal })
                      }
                      await loadWater(patient.id)
                    }}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer', userSelect:'none' }}>
                      <div style={{
                        width:44, height:44, borderRadius:12,
                        background: i < glassesCount ? G : '#f0f0f0',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:22, transition:'all 0.15s',
                        boxShadow: i < glassesCount ? '0 2px 6px rgba(15,110,86,0.2)' : 'none'
                      }}>💧</div>
                      <div style={{ fontSize:10, color: i < glassesCount ? G : '#ccc', marginTop:3, fontWeight:500 }}>250</div>
                    </div>
                  ))}
                </div>

                <div style={{ background:'#f5f5f5', borderRadius:8, height:8, marginBottom:12, overflow:'hidden' }}>
                  <div style={{ height:'100%', width: waterPct + '%', background:G, borderRadius:8, transition:'width 0.4s' }} />
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ flex:1, background:'#E1F5EE', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:G }}>{glassesCount * 250} mL</div>
                    <div style={{ fontSize:11, color:'#0F6E56', marginTop:1 }}>consumidos</div>
                  </div>
                  <div style={{ flex:1, background: waterPct >= 100 ? '#E1F5EE' : '#FFF3E0', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:700, color: waterPct >= 100 ? G : '#E07B00' }}>
                      {waterPct >= 100 ? '✓ Listo' : `${Math.max(0, goalMl - glassesCount * 250)} mL`}
                    </div>
                    <div style={{ fontSize:11, color: waterPct >= 100 ? '#0F6E56' : '#E07B00', marginTop:1 }}>
                      {waterPct >= 100 ? 'meta cumplida' : 'restantes'}
                    </div>
                  </div>
                  <div style={{ flex:1, background:'#f8f8f8', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:'#666' }}>{waterPct}%</div>
                    <div style={{ fontSize:11, color:'#999', marginTop:1 }}>{glassesCount}/{glassesGoal} vasos</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'tratamientos' && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Historial de tratamientos</div>
              {treatments.map(t => (
                <div key={t.id} style={{ padding:'12px 0', borderBottom:'0.5px solid #f0f0f0' }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', marginBottom:6 }}>{t.product_name}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
                    {t.appointment_date && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.appointment_date}</span>}
                    {t.dose && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#E6F1FB', color:'#185FA5' }}>{t.dose}</span>}
                    {t.zone && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#FAEEDA', color:'#854F0B' }}>{t.zone}</span>}
                    {t.session_label && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.session_label}</span>}
                  </div>
                  {t.notes && <div style={{ fontSize:14, color:'#666', lineHeight:1.6 }}>{t.notes}</div>}
                </div>
              ))}
              {treatments.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:30 }}>Sin tratamientos registrados aun</div>}
            </div>
          )}

          {view === 'chat' && (
            <ModuleChat
              patient={patient}
              careModules={careModules}
              profile={profile}
              senderRole="patient"
            />
          )}

          {/* Vista Nutrición PRO */}
          {view === 'nutricion' && profile?.plan === 'pro' && (
            <NutritionModule patient={patient} profile={profile} />
          )}

          {/* Vista Bienestar PRO */}
          {view === 'bienestar' && profile?.plan === 'pro' && (
            <WellnessModule patient={patient} profile={profile} />
          )}

          {/* Vistas módulos de atención */}
          {view.startsWith('modulo_') && (() => {
            const moduleType = view.replace('modulo_', '')
            const mod = careModules.find(m => m.module_type === moduleType)
            const MODULE_COLORS = {
              integral:     '#1a5c8a',
              metabolica:   '#0F6E56',
              estetica:     '#8e44ad',
              fisioterapia: '#e67e22',
              enfermeria:   '#c0392b',
            }
            const color = MODULE_COLORS[moduleType] || G
            return (
              <div>
                {/* Header del módulo */}
                {mod?.professional && (
                  <div style={{ background: color, borderRadius:12, padding:'14px 16px', color:'#fff', marginBottom:12 }}>
                    <div style={{ fontSize:11, opacity:0.8, marginBottom:2 }}>Profesional asignado</div>
                    <div style={{ fontSize:15, fontWeight:700 }}>
                      {mod.professional.sex === 'female' ? 'Dra.' : 'Dr.'} {mod.professional.first_name} {mod.professional.last_name}
                    </div>
                    {mod.professional.specialty && <div style={{ fontSize:12, opacity:0.85 }}>{mod.professional.specialty}</div>}
                    {mod.professional.medical_code && <div style={{ fontSize:11, opacity:0.7 }}>Cód. {mod.professional.medical_code}</div>}
                  </div>
                )}
                {!mod?.professional && (
                  <div style={{ background:'#f8f8f8', border:'1px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12, fontSize:13, color:'#888' }}>
                    Aún no ha sido asignado un profesional para esta categoría.
                  </div>
                )}
                {moduleType === 'integral' && <IntegralModule patient={patient} careModule={mod} canEdit={false} />}
                {moduleType === 'metabolica' && <MetabolicModule patient={patient} careModule={mod} canEdit={false} canEditMeasurements={true} />}
                {moduleType === 'estetica' && <AestheticModule patient={patient} careModule={mod} canEdit={false} />}
                {moduleType === 'fisioterapia' && <FisioterapiaModule patient={patient} careModule={mod} canEdit={false} />}
                {moduleType === 'enfermeria' && <EnfermeriaModule patient={patient} careModule={mod} canEdit={false} />}
              </div>
            )
          })()}

          {/* Vista Salud Femenina PRO */}
          {view === 'saludfem' && profile?.plan === 'pro' && patient?.sex === 'female' && (
            <FemaleHealthModule patient={patient} profile={profile} />
          )}

          {/* Vista Salud Masculina PRO */}
          {view === 'saludmasc' && profile?.plan === 'pro' && patient?.sex === 'male' && (
            <MaleHealthModule patient={patient} profile={profile} />
          )}

          {/* Vista PRO */}
          {view === 'pro' && (
            <div>
              {profile?.plan === 'pro' ? (
                <div>
                  <div style={{ background:'linear-gradient(135deg, #0F6E56, #1D9E75)', borderRadius:16, padding:24, color:'#fff', marginBottom:16, textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:700, marginBottom:4, letterSpacing:'0.05em' }}>PLAN PRO ACTIVO</div>
                    <div style={{ fontSize:13, opacity:0.9 }}>Tenés acceso a todas las funcionalidades avanzadas</div>
                  <button onClick={() => window.open('https://app.lemonsqueezy.com/my-orders', '_blank')}
                    style={{ marginTop:12, padding:'7px 16px', background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.4)', borderRadius:8, cursor:'pointer', fontSize:12, color:'#fff', fontWeight:500 }}>
                    Gestionar o cancelar suscripción
                  </button>
                  </div>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                    <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Funcionalidades PRO disponibles</div>
                    {(() => {
                      const base = [
                        { label:'Nutrición', desc:'Contador de calorías, macros y consejos con IA' },
                        { label:'Bienestar', desc:'Seguimiento de sueño, estrés y actividad física' },
                      ]
                      const female = [
                        { label:'Control menstrual', desc:'Seguimiento de ciclo, síntomas y predicciones' },
                        { label:'Embarazo y posparto', desc:'Seguimiento semana a semana del embarazo' },
                        { label:'Anticonceptivo ideal', desc:'Cuestionario personalizado con recomendación de IA' },
                      ]
                      const male = [
                        { label:'Salud masculina', desc:'Optimización hormonal, salud prostática y rendimiento físico' },
                      ]
                      const sex = patient?.sex || ''
                      const items = sex === 'female' ? [...base, ...female] : sex === 'male' ? [...base, ...male] : [...base, ...female, ...male]
                      return items.map((f,i) => (
                        <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'0.5px solid #f5f5f5', alignItems:'center' }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:G, flexShrink:0 }} />
                          <div>
                            <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{f.label}</div>
                            <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{f.desc}</div>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background:'linear-gradient(135deg, #0F6E56, #1D9E75)', borderRadius:16, padding:24, color:'#fff', marginBottom:16, textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:700, marginBottom:4, letterSpacing:'0.05em' }}>PLAN PRO</div>
                    <div style={{ fontSize:13, opacity:0.9, marginBottom:16 }}>Desbloqueá funcionalidades avanzadas por solo $4.99/mes</div>
                    <button onClick={async () => {
                      try {
                        const res = await fetch('https://mdcqdigxbmfajlmaxrta.supabase.co/functions/v1/create-checkout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await (await import('../lib/supabase')).supabase.auth.getSession()).data.session?.access_token}` },
                          body: JSON.stringify({ email: profile.email, userId: profile.id })
                        })
                        const data = await res.json()
                        if (data.url) window.open(data.url, '_blank')
                      } catch(e) { alert('Error al crear el link de pago') }
                    }}
                      style={{ background:'#fff', color:'#0F6E56', border:'none', borderRadius:10, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                      Suscribirme por $4.99/mes →
                    </button>
                  </div>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                    <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>¿Qué incluye el PRO?</div>
                    {(() => {
                      const base = [
                        'Contador de calorías y macros diarios',
                        'Nutrición personalizada con IA',
                        'Bienestar — sueño, estrés y actividad física',
                      ]
                      const female = [
                        'Control menstrual con predicciones',
                        'Modo embarazo y posparto semana a semana',
                        'Anticonceptivo ideal con IA',
                      ]
                      const male = [
                        'Salud masculina y optimización hormonal',
                      ]
                      const sex = patient?.sex || ''
                      const items = sex === 'female' ? [...base, ...female] : sex === 'male' ? [...base, ...male] : [...base, ...female, ...male]
                      return items.map((label,i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:G, flexShrink:0 }} />
                          <span style={{ fontSize:13, color:'#1a1a1a' }}>{label}</span>
                          <div style={{ marginLeft:'auto', width:18, height:18, borderRadius:'50%', background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <span style={{ color:G, fontSize:11, fontWeight:700 }}>✓</span>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                  <div style={{ background:'#f8f8f8', borderRadius:12, padding:'12px 16px', fontSize:12, color:'#888', textAlign:'center' }}>
                    Podés cancelar en cualquier momento desde tu cuenta de Lemon Squeezy
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Bottom nav móvil */}
      {/* Drawer móvil */}
      {isMobile && showDrawer && (
        <>
          {/* Overlay */}
          <div onClick={() => setShowDrawer(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 }} />
          {/* Panel */}
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'75vw', maxWidth:280, background:'#fff', zIndex:201, display:'flex', flexDirection:'column', overflowY:'auto' }}>
            {/* Header del drawer */}
            <div style={{ padding:'16px 14px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#1a1a1a' }}>MedTrack</div>
              <button onClick={() => setShowDrawer(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
            </div>
            {/* Items del menú */}
            <div style={{ flex:1, padding:'8px 0' }}>
              {(() => {
                const MODULE_COLORS = { integral:'#1a5c8a', metabolica:'#0F6E56', estetica:'#8e44ad', fisioterapia:'#e67e22', enfermeria:'#c0392b' }
                const MODULE_LABELS = { integral:'Atención médica integral', metabolica:'Atención médica metabólica', estetica:'Atención médica estética', fisioterapia:'Atención de fisioterapia', enfermeria:'Atención de enfermería' }
                const MODULE_ORDER = ['integral','metabolica','estetica','fisioterapia','enfermeria']
                const sortedMods = [...careModules].sort((a,b) => MODULE_ORDER.indexOf(a.module_type) - MODULE_ORDER.indexOf(b.module_type))

                const sections = [
                  { label:'Inicio', key:'inicio' },
                  ...sortedMods.map(m => ({ label: MODULE_LABELS[m.module_type], key:'modulo_'+m.module_type, color: MODULE_COLORS[m.module_type] })),
                  { label:'Chat con mi médico', key:'chat' },
                ]

                const proItems = profile?.plan === 'pro' ? [
                  { label:'Nutrición', key:'nutricion' },
                  { label:'Bienestar', key:'bienestar' },
                  ...(patient?.sex === 'female' ? [{ label:'Salud femenina', key:'saludfem' }] : []),
                  ...(patient?.sex === 'male' ? [{ label:'Salud masculina', key:'saludmasc' }] : []),
                ] : []

                return (
                  <>
                    {sections.map(item => (
                      <div key={item.key} onClick={() => { setView(item.key); setShowDrawer(false) }}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', cursor:'pointer', background: view === item.key ? (item.color ? item.color+'15' : '#E1F5EE') : 'transparent', borderLeft: view === item.key ? `3px solid ${item.color || G}` : '3px solid transparent', color: view === item.key ? (item.color || G) : '#444', fontWeight: view === item.key ? 600 : 400, fontSize:14 }}>
                        {item.color && <div style={{ width:8, height:8, borderRadius:'50%', background:item.color, flexShrink:0 }} />}
                        {item.label}
                      </div>
                    ))}
                    {proItems.length > 0 && (
                      <>
                        <div style={{ padding:'8px 16px 4px', fontSize:11, color:'#c8960c', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:8 }}>⭐ Plan PRO</div>
                        {proItems.map(item => (
                          <div key={item.key} onClick={() => { setView(item.key); setShowDrawer(false) }}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', cursor:'pointer', background: view === item.key ? '#FFF8E1' : 'transparent', borderLeft: view === item.key ? `3px solid #c8960c` : '3px solid transparent', color: view === item.key ? '#c8960c' : '#444', fontWeight: view === item.key ? 600 : 400, fontSize:14 }}>
                            {item.label}
                          </div>
                        ))}
                      </>
                    )}
                    {profile?.plan !== 'pro' && (
                      <div onClick={() => { setView('pro'); setShowDrawer(false) }}
                        style={{ margin:'12px 12px 0', padding:'10px 14px', borderRadius:10, background:'linear-gradient(135deg, #0F6E56, #1D9E75)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'center' }}>
                        ⚡ Activar Plan PRO
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  btnPrimary: { background:'#1D9E75', color:'#fff', border:'none', fontSize:14, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' },
  btnCancel:  { background:'none', border:'1px solid #e0e0e0', fontSize:14, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  fieldLabel: { display:'block', fontSize:14, color:'#666', marginBottom:4, fontWeight:500 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a' },
}
