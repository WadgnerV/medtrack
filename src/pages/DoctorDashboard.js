import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import IntegralModule from './IntegralModule'
import ModuleChat from '../components/ModuleChat'
import MetabolicModule from './MetabolicModule'
import AestheticModule from './AestheticModule'
import FisioterapiaModule from './FisioterapiaModule'
import EnfermeriaModule from './EnfermeriaModule'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import UserMenu from '../components/UserMenu'

const G = '#1D9E75'
const SP = ' '

export default function DoctorDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('dashboard')
  const [patients, setPatients] = useState([])
  const [appts, setAppts] = useState([])
  const [msgs, setMsgs] = useState([])
  const [library, setLibrary] = useState([])
  const [perms, setPerms] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selPatient, setSelPatient] = useState(null)
  const [patientCareModules, setPatientCareModules] = useState([])
  const [patientTab, setPatientTab] = useState('progreso')
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [saving, setSaving] = useState(false)
  const [activeChat, setActiveChat] = useState(null)
  const [chatMsg, setChatMsg] = useState('')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [selDate, setSelDate] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [measurements, setMeasurements] = useState([])
  const [goals, setGoals] = useState([])
  const [tasks, setTasks] = useState([])
  const [treatments, setTreatments] = useState([])
  const [notes, setNotes] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [allDiagnoses, setAllDiagnoses] = useState([])
  const [searchPac, setSearchPac] = useState('')
  const [cie10Search, setCie10Search] = useState('')
  const [cie10Results, setCie10Results] = useState([])

  useEffect(() => { if (profile?.id) loadAll() }, [profile])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadPatients(), loadAppts(), loadMsgs(), loadLibrary(), loadPerms(), loadAllDiagnoses()])
    setLoading(false)
  }

  async function loadPatients() {
    // Pacientes asignados por assigned_doctor_id O por módulo de atención
    const [byDoctor, byModule] = await Promise.all([
      supabase.from('patients')
        .select('id, status, specialty_type, birth_date, sex, province, height_cm, profile:profile_id(id, first_name, last_name, email)')
        .eq('assigned_doctor_id', profile.id),
      supabase.from('patient_care_modules')
        .select('patient:patient_id(id, status, specialty_type, birth_date, sex, province, height_cm, profile:profile_id(id, first_name, last_name, email))')
        .eq('assigned_professional_id', profile.id)
        .eq('is_active', true)
    ])
    const fromDoctor = byDoctor.data || []
    const fromModule = (byModule.data || []).map(m => m.patient).filter(Boolean)
    // Combinar sin duplicados
    const allIds = new Set(fromDoctor.map(p => p.id))
    const combined = [...fromDoctor, ...fromModule.filter(p => !allIds.has(p.id))]
    setPatients(combined)
  }

  async function loadAppts() {
    const { data } = await supabase.from('appointments')
      .select('*, patient:patient_id(id, profile:profile_id(first_name, last_name))')
      .eq('doctor_id', profile.id)
      .order('appointment_date').order('appointment_time')
    setAppts(data || [])
  }

  async function loadMsgs() {
    const { data: patientData } = await supabase.from('patients')
      .select('id')
      .eq('assigned_doctor_id', profile.id)
    const patientIds = (patientData || []).map(p => p.id)
    if (patientIds.length === 0) { setMsgs([]); return }
    const { data } = await supabase.from('messages')
      .select('*, patient:patient_id(id, profile:profile_id(first_name, last_name)), sender:sender_id(first_name, last_name)')
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false })
    setMsgs(data || [])
  }

  async function loadLibrary() {
    const { data } = await supabase.from('library_items').select('*').order('name')
    setLibrary(data || [])
  }

  async function loadPerms() {
    const { data } = await supabase.from('doctor_permissions').select('*').eq('doctor_id', profile.id).single()
    setPerms(data)
  }

  async function loadPatientData(patientId) {
    const [m, g, t, tr, n] = await Promise.all([
      supabase.from('measurements').select('*').eq('patient_id', patientId).order('measured_at', { ascending: false }),
      supabase.from('goals').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('tasks').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('treatments').select('*').eq('patient_id', patientId).order('appointment_date', { ascending: false }),
      supabase.from('clinical_notes').select('*').eq('patient_id', patientId).order('note_date', { ascending: false }),
    ])
    setMeasurements(m.data || [])
    setGoals(g.data || [])
    setTasks(t.data || [])
    setTreatments(tr.data || [])
    setNotes(n.data || [])
    await loadDiagnoses(patientId)
  }

  async function loadPatientCareModules(patientId) {
    const { data } = await supabase.from('patient_care_modules')
      .select('*, professional:assigned_professional_id(id, first_name, last_name)')
      .eq('patient_id', patientId)
      .eq('is_active', true)
    const myModules = (data || []).filter(m => m.assigned_professional_id === profile.id)
    setPatientCareModules(myModules)
    // Establecer primera pestaña según módulos asignados
    if (myModules.length > 0) {
      setPatientTab('modulo_' + myModules[0].module_type)
    } else {
      setPatientTab('progreso')
    }
  }

  function openPatient(p) {
    setSelPatient(p)
    setPatientTab('progreso')
    setView('perfil')
    loadPatientData(p.id)
    loadPatientCareModules(p.id)
  }

  function pName(p) { return ((p.profile?.first_name || '') + SP + (p.profile?.last_name || '')).trim() }
  function initials(name) { return name.split(SP).map(n => n[0] || '').join('').substring(0,2).toUpperCase() }
  function age(dob) { if (!dob) return '--'; return Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25)) }

  const MONTHS    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DAYS      = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
  const DAYS_FULL = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado']
  const pendingCount = msgs.filter(m => !m.is_read && m.sender_role === 'patient').length

  async function handleSignOut() { await signOut(); navigate('/login') }

  async function saveMeasurement(form) {
    setSaving(true)
    await supabase.from('measurements').insert({
      patient_id: selPatient.id, recorded_by: profile.id,
      measured_at: form.date, weight_kg: form.weight || null,
      body_fat_pct: form.fat || null, muscle_mass_kg: form.muscle || null,
      visceral_fat_pts: form.visceral || null
    })
    await loadPatientData(selPatient.id)
    setModal(null); setSaving(false)
  }

  async function saveGoal(form) {
    setSaving(true)
    await supabase.from('goals').insert({
      patient_id: selPatient.id, created_by: profile.id,
      name: form.name, initial_value: form.initial || null,
      target_value: form.target || null, deadline: form.deadline || null
    })
    await loadPatientData(selPatient.id)
    setModal(null); setSaving(false)
  }

  async function deleteGoal(id) {
    await supabase.from('goals').update({ is_active: false }).eq('id', id)
    await loadPatientData(selPatient.id)
  }

  async function assignTasks(selectedTasks) {
    setSaving(true)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const inserts = selectedTasks.map(desc => ({
      patient_id: selPatient.id, assigned_by: profile.id,
      description: desc, week_start: weekStart.toISOString().split('T')[0]
    }))
    await supabase.from('tasks').insert(inserts)
    await loadPatientData(selPatient.id)
    setModal(null); setSaving(false)
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    await loadPatientData(selPatient.id)
  }

  async function saveTreatment(form) {
    setSaving(true)
    await supabase.from('treatments').insert({
      patient_id: selPatient.id, registered_by: profile.id,
      product_name: form.product, dose: form.dose || null,
      zone: form.zone || null, session_label: form.session || null,
      appointment_date: form.date || null, notes: form.notes || null
    })
    await loadPatientData(selPatient.id)
    setModal(null); setSaving(false)
  }

  async function debugPatients() {
  }

  async function loadAllDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses').select('cie10_code, cie10_description, patient_id').eq('is_active', true)
    setAllDiagnoses(data || [])
  }

  async function loadDiagnoses(patientId) {
    const { data } = await supabase.from('patient_diagnoses').select('*').eq('patient_id', patientId).eq('is_active', true).order('diagnosis_date', { ascending: false })
    setDiagnoses(data || [])
  }

  async function searchCie10(term) {
    if (!term || term.length < 2) { setCie10Results([]); return }
    const { data } = await supabase.from('cie10').select('code, description').or(`code.ilike.%${term}%,description.ilike.%${term}%`).limit(10)
    setCie10Results(data || [])
  }

  async function addDiagnosis(code, description) {
    await supabase.from('patient_diagnoses').insert({
      patient_id: selPatient.id, cie10_code: code, cie10_description: description,
      diagnosed_by: profile?.id, diagnosis_date: new Date().toISOString().split('T')[0]
    })
    await loadDiagnoses(selPatient.id)
    setCie10Search(''); setCie10Results([])
  }

  async function deleteDiagnosis(id) {
    await supabase.from('patient_diagnoses').update({ is_active: false }).eq('id', id)
    await loadDiagnoses(selPatient.id)
  }

  async function deleteNote(id) {
    await supabase.from('clinical_notes').delete().eq('id', id)
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false })
    setNotes(data || [])
  }

  async function editNote(id, form) {
    setSaving(true)
    await supabase.from('clinical_notes').update({
      note_date: form.date, visit_type: form.visitType, content: form.content,
      pas: form.pas || null, pad: form.pad || null, pam: form.pam || null,
      spo2: form.spo2 || null, o2_device: form.o2device || 'aa',
      o2_flow: form.o2flow || null, glucose: form.glucose || null,
      heart_rate: form.hr || null
    }).eq('id', id)
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false })
    setNotes(data || [])
    setModal(null); setSaving(false)
  }

  async function saveNote(form) {
    setSaving(true)
    await supabase.from('clinical_notes').insert({
      patient_id: selPatient.id, author_id: profile.id,
      note_date: form.date, visit_type: form.visitType, content: form.content,
      pas: form.pas || null, pad: form.pad || null, pam: form.pam || null,
      spo2: form.spo2 || null, o2_device: form.o2device || 'aa',
      o2_flow: form.o2flow || null, glucose: form.glucose || null,
      heart_rate: form.hr || null
    })
    await loadPatientData(selPatient.id)
    setModal(null); setSaving(false)
  }

  async function saveAppt(form) {
    setSaving(true)
    const payload = {
      patient_id: form.patientId, doctor_id: profile.id,
      appointment_date: form.date, appointment_time: form.time,
      visit_type: form.visitType, duration_min: parseInt(form.duration),
      notes: form.notes, status: 'scheduled', created_by: profile.id
    }
    if (form.id) await supabase.from('appointments').update(payload).eq('id', form.id)
    else await supabase.from('appointments').insert(payload)
    await loadAppts(); setModal(null); setSaving(false)
  }

  async function cancelAppt(id) {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    await loadAppts(); setModal(null)
  }

  async function openChat(c) {
    setActiveChat(c)
    const unreadIds = c.msgs.filter(m => !m.is_read && m.sender_role === 'patient').map(m => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
      await loadMsgs()
    }
  }

  async function sendMessage() {
    if (!chatMsg.trim() || !activeChat) return
    await supabase.from('messages').insert({
      patient_id: activeChat.patientId, sender_id: profile.id,
      content: chatMsg.trim(), sender_role: 'doctor', is_read: false
    })
    setChatMsg(''); await loadMsgs()
  }

  function apptsByDate(dateStr) {
    return appts.filter(a => a.appointment_date === dateStr && a.status !== 'cancelled')
      .sort((a,b) => a.appointment_time.localeCompare(b.appointment_time))
  }

  function renderCalendar() {
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0')
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate()
    const daysInPrev = new Date(calYear, calMonth, 0).getDate()
    const cells = []
    for (let i = firstDay-1; i >= 0; i--) cells.push({ day: daysInPrev-i, current: false, dateStr: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0')
      cells.push({ day: d, current: true, dateStr, isToday: dateStr === todayStr, isSelected: dateStr === selDate })
    }
    const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
    for (let i = 1; i <= rem; i++) cells.push({ day: i, current: false, dateStr: null })
    return cells
  }

  function pendingChats() {
    const byPatient = {}
    msgs.forEach(m => {
      const pid = m.patient_id
      if (!byPatient[pid]) byPatient[pid] = { patientId: pid, name: pName(m.patient || {}), msgs: [] }
      byPatient[pid].msgs.push(m)
    })
    return Object.values(byPatient)
  }

  const latestMeasurement = measurements[0] || null

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:G, fontFamily:'system-ui' }}>Cargando MedTrack...</div>

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'system-ui,-apple-system,sans-serif', background:'#f5f5f5', overflowX:'hidden', maxWidth:'100vw' }}>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ width:420, background:'#fff', borderRadius:16, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>

            {modal === 'new-measurement' && (
              <MeasurementForm saving={saving} onSave={saveMeasurement} onClose={() => setModal(null)} />
            )}
            {modal === 'new-goal' && (
              <GoalForm saving={saving} onSave={saveGoal} onClose={() => setModal(null)} />
            )}
            {modal === 'assign-tasks' && (
              <TaskPickerForm library={library.filter(l => l.type === 'task')} saving={saving} onSave={assignTasks} onClose={() => setModal(null)} />
            )}
            {modal === 'new-treatment' && (
              <TreatmentForm library={library.filter(l => l.type === 'treatment')} saving={saving} onSave={saveTreatment} onClose={() => setModal(null)} />
            )}
            {modal === 'new-note' && (
              <NoteForm saving={saving} onSave={saveNote} onClose={() => setModal(null)} />
            )}
            {modal === 'edit-note' && (
              <NoteForm saving={saving} note={modalData.note} onSave={form => editNote(modalData.note.id, form)} onClose={() => setModal(null)} />
            )}
            {(modal === 'new-appt' || modal === 'edit-appt') && (
              <ApptForm appt={modalData.appt} patients={patients} saving={saving} defaultDate={selDate}
                onSave={saveAppt} onClose={() => setModal(null)} />
            )}
            {modal === 'confirm-cancel' && (
              <>
                <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Cancelar cita</div>
                <p style={{ fontSize:14, color:'#666', marginBottom:18, lineHeight:1.6 }}>Esta accion no se puede deshacer.</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={s.btnCancel} onClick={() => setModal(null)}>No, mantener</button>
                  <button style={{ flex:1, padding:8, fontSize:14, fontWeight:500, background:'#D85A30', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}
                    onClick={() => cancelAppt(modalData.apptId)}>Si, cancelar cita</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!isMobile && <div style={{ width:210, minWidth:210, background:'#fff', borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column', overflowY:'auto' }}>
        <div style={{ padding:'16px 14px 12px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>+</div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', letterSpacing:'0.03em' }}>MEDTRACK</div>
            <div style={{ fontSize:9, color:'#999' }}>by Glow Clinic</div>
          </div>
        </div>

        {[
          { section:'Principal', items:[{ label:'Dashboard', key:'dashboard' }, { label:'Mis pacientes', key:'pacientes', badge:patients.length }] },
          { section:'Clinica', items:[{ label:'Calendario', key:'calendario', badge:appts.filter(a => a.status === 'scheduled').length }, ] },
        ].map(group => (
          <div key={group.section}>
            <div style={{ fontSize:14, fontWeight:500, color:'#bbb', letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 14px 4px' }}>{group.section}</div>
            {group.items.map(item => (
              <div key={item.key} onClick={() => { setView(item.key); setSelPatient(null); if(isMobile) setMobileMenuOpen(false) }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', cursor:'pointer', fontSize:14, borderLeft: (view === item.key || (item.key === 'pacientes' && view === 'perfil')) ? ('2px solid ' + G) : '2px solid transparent', background: (view === item.key || (item.key === 'pacientes' && view === 'perfil')) ? '#E1F5EE' : 'transparent', color: (view === item.key || (item.key === 'pacientes' && view === 'perfil')) ? '#0F6E56' : '#666', fontWeight: (view === item.key || (item.key === 'pacientes' && view === 'perfil')) ? 500 : 400 }}>
                {item.label}
                {item.badge > 0 && <span style={{ marginLeft:'auto', fontSize:14, background: item.badgeRed ? '#D85A30' : G, color:'#fff', borderRadius:10, padding:'1px 6px', fontWeight:500 }}>{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}

        <UserMenu />
      </div>}

      {/* Drawer móvil doctor */}
      {isMobile && showDrawer && (
        <>
          <div onClick={() => setShowDrawer(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 }} />
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'75vw', maxWidth:280, background:'#fff', zIndex:201, display:'flex', flexDirection:'column', overflowY:'auto' }}>
            <div style={{ padding:'16px 14px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#1a1a1a' }}>MedTrack</div>
              <button onClick={() => setShowDrawer(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
            </div>
            <div style={{ flex:1, padding:'8px 0' }}>
              {[
                { label:'Dashboard', key:'dashboard', icon:'📊' },
                { label:'Mis pacientes', key:'pacientes', icon:'👥' },
                { label:'Calendario', key:'calendario', icon:'📅' },
              ].map(item => (
                <div key={item.key} onClick={() => { setView(item.key); setSelPatient(null); setShowDrawer(false) }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', cursor:'pointer', background: view === item.key ? '#E1F5EE' : 'transparent', borderLeft: view === item.key ? `3px solid ${G}` : '3px solid transparent', color: view === item.key ? G : '#444', fontWeight: view === item.key ? 600 : 400, fontSize:14 }}>
                  <span>{item.icon}</span>{item.label}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {isMobile ? (
          <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
            <button onClick={() => setShowDrawer(true)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#555', padding:'2px 6px', lineHeight:1 }}>☰</button>
            <div style={{ fontSize:15, fontWeight:700, color:'#1a1a1a' }}>MedTrack</div>
            <UserMenu />
          </div>
        ) : (
          <div style={{ padding:'12px 18px', borderBottom:'0.5px solid #eee', background:'#fff', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>
                {view === 'perfil' && selPatient ? (
                  <span>
                    <button style={{ background:'none', border:'none', cursor:'pointer', color:'#999', fontSize:14, marginRight:6 }}
                      onClick={() => { setView('pacientes'); setSelPatient(null) }}>{'<'} Mis pacientes</button>
                    {pName(selPatient)}
                  </span>
                ) : { dashboard:'Dashboard', pacientes:'Mis pacientes', calendario:'Calendario' }[view]}
              </div>
              <div style={{ fontSize:14, color:'#999', marginTop:1 }}>Glow Clinic</div>
            </div>
            {view === 'pacientes' && <div style={{ fontSize:14, color:'#666' }}>{patients.length} pacientes asignados</div>}
            {view === 'perfil' && <button style={s.btnPrimary} onClick={() => setModal('new-measurement')}>+ Registrar medicion</button>}
            {view === 'calendario' && <button style={s.btnPrimary} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Nueva cita</button>}
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding: isMobile ? '12px 12px 16px' : '16px 18px' }}>

          {view === 'dashboard' && (
        <div>
          {/* ── 4 KPIs ── */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:'Pacientes asignados', value: patients.length, sub: patients.filter(p=>p.status==='active').length+' activos', icon:'👥', color:'#0F6E56', bg:'#E1F5EE' },
              { label:'Citas esta semana', value: (() => {
                  const now = new Date();
                  const mon = new Date(now); mon.setDate(now.getDate()-now.getDay()+1);
                  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
                  const monStr = mon.toISOString().substring(0,10);
                  const sunStr = sun.toISOString().substring(0,10);
                  return appts.filter(a=>a.appointment_date>=monStr&&a.appointment_date<=sunStr).length;
                })(), sub:'esta semana', icon:'📅', color:'#7a4000', bg:'#fff3e0' },
              { label:'Citas este mes', value: appts.filter(a=>a.appointment_date?.startsWith(new Date().toISOString().substring(0,7))).length, sub:'este mes', icon:'🗓️', color:'#1a5c8a', bg:'#e5f0fb' },
              { label:'Chats pendientes', value: msgs.filter(m=>!m.is_read&&m.sender_role==='patient').length, sub:'sin responder', icon:'💬', color: msgs.filter(m=>!m.is_read&&m.sender_role==='patient').length>0?'#c0392b':'#0F6E56', bg: msgs.filter(m=>!m.is_read&&m.sender_role==='patient').length>0?'#fdecea':'#E1F5EE' },
            ].map((k,i) => (
              <div key={i} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:14, color:'#999', fontWeight:500 }}>{k.label}</span>
                  <span style={{ fontSize:18, background:k.bg, borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>{k.icon}</span>
                </div>
                <div style={{ fontSize:30, fontWeight:600, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:14, color:'#aaa', marginTop:4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Gráfica + Lista pacientes ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

            {/* Citas por mes */}
            {(() => {
              const data = [];
              for(let i=5;i>=0;i--){
                const d = new Date(); d.setMonth(d.getMonth()-i);
                const key = d.toISOString().substring(0,7);
                const label = d.toLocaleString('es',{month:'short'});
                data.push({ mes: label, citas: appts.filter(a=>a.appointment_date?.startsWith(key)).length });
              }
              return (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#1a1a1a' }}>📈 Mis citas por mes</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize:14, fill:'#999' }} />
                      <YAxis tick={{ fontSize:14, fill:'#999' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize:14, borderRadius:8, border:'0.5px solid #eee' }} />
                      <Line type="monotone" dataKey="citas" stroke="#0F6E56" strokeWidth={2.5} dot={{ r:4, fill:'#0F6E56' }} activeDot={{ r:6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* Lista compacta pacientes */}
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>👥 Mis pacientes</div>
                <button onClick={()=>setView('pacientes')} style={{ fontSize:14, color:'#0F6E56', background:'#E1F5EE', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:600 }}>Ver todos</button>
              </div>
              {patients.length===0 && <div style={{ fontSize:14, color:'#bbb', textAlign:'center', padding:20 }}>Sin pacientes asignados</div>}
              {patients.slice(0,6).map(p => {
                const initials = (p.first_name?.[0]||'')+(p.last_name?.[0]||'');
                const citasPac = appts.filter(a=>a.patient_id===p.id).length;
                return (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize:14, color:'#999' }}>{p.specialty_type||'Sin tipo de consulta'}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                      <span style={{ fontSize:14, fontWeight:500, padding:'2px 7px', borderRadius:99,
                        background: p.status==='active'?'#E1F5EE':'#f5f5f5',
                        color: p.status==='active'?'#0F6E56':'#999' }}>
                        {p.status==='active'?'activo':'inactivo'}
                      </span>
                      <span style={{ fontSize:14, color:'#bbb' }}>{citasPac} cita{citasPac!==1?'s':''}</span>
                    </div>
                  </div>
                );
              })}
              {patients.length>6 && <div style={{ fontSize:14, color:'#999', textAlign:'center', marginTop:8 }}>+{patients.length-6} más</div>}
            </div>
          </div>
        </div>
      )}

      {view === 'pacientes' && (
        <div>
          {/* Buscador */}
          <div style={{ padding:'10px 12px', marginBottom:12, position:'relative', display:'flex', alignItems:'center', background:'#fff', border:'0.5px solid #eee', borderRadius:12 }}>
            <span style={{ position:'absolute', left:24, fontSize:14, color:'#bbb', pointerEvents:'none' }}>🔍</span>
            <input type="text" placeholder="Buscar por nombre o email..." value={searchPac} onChange={e=>setSearchPac(e.target.value)}
              style={{ width:'100%', padding:'8px 12px 8px 34px', border:'0.5px solid #eee', borderRadius:8, fontSize:14, outline:'none', background:'#f9f9f9', boxSizing:'border-box' }} />
          </div>
          {isMobile ? (
            /* Móvil: cards */
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {patients.filter(p => {
                const q = searchPac.toLowerCase()
                if(!q) return true
                const nombre = ((p.profile?.first_name||'')+' '+(p.profile?.last_name||'')).toLowerCase()
                const email = (p.profile?.email||'').toLowerCase()
                return nombre.includes(q)||email.includes(q)
              }).map(p => (
                <div key={p.id} onClick={() => openPatient(p)}
                  style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:600, flexShrink:0 }}>{initials(pName(p))}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>{pName(p)}</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:1 }}>{p.profile?.email}</div>
                    <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>{age(p.birth_date)} años · {p.specialty_type || '--'}</div>
                  </div>
                  <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:500, flexShrink:0, background: p.status==='active' ? '#E1F5EE' : '#FAEEDA', color: p.status==='active' ? '#0F6E56' : '#854F0B' }}>
                    {p.status==='active' ? 'activo' : 'pendiente'}
                  </span>
                </div>
              ))}
              {patients.length === 0 && <div style={{ padding:40, textAlign:'center', fontSize:14, color:'#999' }}>No tienes pacientes asignados aun</div>}
            </div>
          ) : (
            /* Desktop: tabla */
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
          
              <div style={{ display:'flex', padding:'9px 14px', background:'#f8f8f8', fontSize:14, fontWeight:500, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                <div style={{ flex:'0 0 35%' }}>Paciente</div>
                <div style={{ flex:'0 0 10%' }}>Edad</div>
                <div style={{ flex:'0 0 22%' }}>Tipo de consulta</div>
                <div style={{ flex:'0 0 22%', fontSize:14, fontWeight:500, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>Diagnóstico</div>
                <div style={{ flex:'0 0 11%' }}>Estado</div>
              </div>
              {patients.filter(p => {
                const q = searchPac.toLowerCase()
                if(!q) return true
                const nombre = ((p.profile?.first_name||'')+' '+(p.profile?.last_name||'')).toLowerCase()
                const email = (p.profile?.email||'').toLowerCase()
                const diag = (allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description||'').toLowerCase()
                return nombre.includes(q)||email.includes(q)||diag.includes(q)
              }).map(p => (
                <div key={p.id} onClick={() => openPatient(p)}
                  style={{ display:'flex', padding:'11px 14px', borderTop:'0.5px solid #f0f0f0', alignItems:'center', cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fffe'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ flex:'0 0 35%', display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:500, flexShrink:0 }}>{initials(pName(p))}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pName(p)}</div>
                      <div style={{ fontSize:14, color:'#999' }}>{p.profile?.email}</div>
                    </div>
                  </div>
                  <div style={{ flex:'0 0 10%', fontSize:14, color:'#666' }}>{age(p.birth_date)} años</div>
                  <div style={{ flex:'0 0 22%', fontSize:14, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.specialty_type || '--'}</div>
                <div style={{ flex:'0 0 22%', fontSize:14, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description || '—'}</div>
                  <div style={{ flex:'0 0 11%' }}>
                    <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, fontWeight:500, background: p.status === 'active' ? '#E1F5EE' : '#FAEEDA', color: p.status === 'active' ? '#0F6E56' : '#854F0B' }}>{p.status === 'active' ? 'activo' : 'pendiente'}</span>
                  </div>
                </div>
              ))}
              {patients.length === 0 && <div style={{ padding:40, textAlign:'center', fontSize:14, color:'#999' }}>No tienes pacientes asignados aun</div>}
            </div>
          )}
        </div>
      )}

          {view === 'perfil' && selPatient && (
            <div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:500, flexShrink:0 }}>{initials(pName(selPatient))}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:500, color:'#1a1a1a' }}>{pName(selPatient)}</div>
                  <div style={{ fontSize:14, color:'#666', marginTop:2 }}>{age(selPatient.birth_date)} años · {selPatient.height_cm ? selPatient.height_cm + ' cm' : ''} · {selPatient.sex || ''}</div>
                  <div style={{ display:'flex', gap:6, marginTop:5 }}>
                    <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56' }}>{selPatient.specialty_type || 'Sin tipo de consulta'}</span>
                    <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{selPatient.profile?.email}</span>
                  </div>
                </div>
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:14, color:'#bbb' }}>Info de solo lectura</div>
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', borderBottom:'0.5px solid #eee', marginBottom:14, background:'#fff', borderRadius:'12px 12px 0 0', overflow:'hidden' }}>
                {(() => {
                  const MODULE_LABELS = {
                    integral:     'Atención integral',
                    metabolica:   'Atención metabólica',
                    estetica:     'Atención estética',
                    fisioterapia: 'Fisioterapia',
                    enfermeria:   'Enfermería',
                  }
                  const MODULE_COLORS = {
                    integral:     '#1a5c8a',
                    metabolica:   '#0F6E56',
                    estetica:     '#8e44ad',
                    fisioterapia: '#e67e22',
                    enfermeria:   '#c0392b',
                  }
                  const MODULE_ORDER = ['integral','metabolica','estetica','fisioterapia','enfermeria']
                  const sortedModules = [...patientCareModules].sort((a,b) => MODULE_ORDER.indexOf(a.module_type) - MODULE_ORDER.indexOf(b.module_type))
                  const tabs = [
                    ...sortedModules.map(m => ({ key:'modulo_'+m.module_type, label: MODULE_LABELS[m.module_type], color: MODULE_COLORS[m.module_type] })),
                    { key:'chat_modulos', label:'Chat', color:'#555' },
                  ]
                  return tabs.map(tab => (
                    <div key={tab.key} onClick={() => setPatientTab(tab.key)}
                      style={{ padding:'9px 14px', fontSize:13, cursor:'pointer', borderBottom: patientTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent', color: patientTab === tab.key ? tab.color : '#888', fontWeight: patientTab === tab.key ? 500 : 400, whiteSpace:'nowrap' }}>
                      {tab.label}
                    </div>
                  ))
                })()}
              </div>

              {patientTab === 'chat_modulos' && (
                <ModuleChat
                  patient={selPatient}
                  careModules={patientCareModules}
                  profile={profile}
                  senderRole="doctor"
                />
              )}

              {/* Vistas de módulos de atención */}
              {patientTab.startsWith('modulo_') && (() => {
                const moduleType = patientTab.replace('modulo_', '')
                const mod = patientCareModules.find(m => m.module_type === moduleType)
                return (
                  <div>
                    {moduleType === 'integral' && <IntegralModule patient={selPatient} careModule={mod} canEdit={true} />}
                    {moduleType === 'metabolica' && <MetabolicModule patient={selPatient} careModule={mod} canEdit={true} />}
                    {moduleType === 'estetica' && <AestheticModule patient={selPatient} careModule={mod} canEdit={true} />}
                    {moduleType === 'fisioterapia' && <FisioterapiaModule patient={selPatient} careModule={mod} canEdit={true} />}
                    {moduleType === 'enfermeria' && <EnfermeriaModule patient={selPatient} careModule={mod} canEdit={true} />}
                  </div>
                )
              })()}

              {patientTab === 'progreso' && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                    {[
                      { l:'Peso', v: latestMeasurement?.weight_kg, u:'kg' },
                      { l:'% Grasa', v: latestMeasurement?.body_fat_pct, u:'%' },
                      { l:'Masa muscular', v: latestMeasurement?.muscle_mass_kg, u:'kg' },
                      { l:'Grasa visceral', v: latestMeasurement?.visceral_fat_pts, u:'pts' },
                    ].map((m,i) => (
                      <div key={i} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ fontSize:14, color:'#888', marginBottom:4 }}>{m.l}</div>
                        <div style={{ fontSize:22, fontWeight:500, color:'#1a1a1a' }}>{m.v || '--'} <span style={{ fontSize:14, color:'#999', fontWeight:400 }}>{m.v ? m.u : ''}</span></div>
                        {latestMeasurement && <div style={{ fontSize:14, color:'#bbb', marginTop:3 }}>{latestMeasurement.measured_at}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Historial de mediciones</div>
                    {measurements.slice(0,8).map(m => (
                      <div key={m.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:8, padding:'8px 0', borderBottom:'0.5px solid #f0f0f0', fontSize:14 }}>
                        <span style={{ color:'#888' }}>{m.measured_at}</span>
                        <span style={{ color:'#1a1a1a' }}>{m.weight_kg ? m.weight_kg + ' kg' : '--'}</span>
                        <span style={{ color:'#1a1a1a' }}>{m.body_fat_pct ? m.body_fat_pct + '%' : '--'}</span>
                        <span style={{ color:'#1a1a1a' }}>{m.muscle_mass_kg ? m.muscle_mass_kg + ' kg' : '--'}</span>
                        <span style={{ color:'#1a1a1a' }}>{m.visceral_fat_pts ? m.visceral_fat_pts + ' pts' : '--'}</span>
                      </div>
                    ))}
                    {measurements.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Sin mediciones registradas</div>}
                  </div>
                </div>
              )}

              {patientTab === 'objetivos' && (
                <div>
                  <button style={{ ...s.btnPrimary, marginBottom:12 }} onClick={() => setModal('new-goal')}>+ Nuevo objetivo</button>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    {goals.map(g => {
                      const pct = g.initial_value && g.target_value
                        ? Math.min(100, Math.max(0, Math.round(Math.abs((g.initial_value - (latestMeasurement?.[g.name] || g.initial_value)) / (g.initial_value - g.target_value)) * 100)))
                        : 0
                      return (
                        <div key={g.id} style={{ marginBottom:14 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                            <span style={{ fontSize:14, color:'#444' }}>{g.name}</span>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{g.initial_value} → {g.target_value}</span>
                              <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#D85A30' }} onClick={() => deleteGoal(g.id)}>x</button>
                            </div>
                          </div>
                          <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                            <div style={{ height:'100%', background:G, borderRadius:3, width: pct + '%' }} />
                          </div>
                          <div style={{ fontSize:14, color:'#999', marginTop:2, textAlign:'right' }}>{pct}%{g.deadline ? ' · Hasta ' + g.deadline : ''}</div>
                        </div>
                      )
                    })}
                    {goals.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Sin objetivos activos</div>}
                  </div>
                </div>
              )}

              {patientTab === 'tareas' && (
                <div>
                  <button style={{ ...s.btnPrimary, marginBottom:12 }} onClick={() => setModal('assign-tasks')}>+ Asignar tarea</button>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    {tasks.map(t => (
                      <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'0.5px solid #f0f0f0' }}>
                        <div style={{ width:18, height:18, borderRadius:'50%', border: '1.5px solid ' + (t.is_completed ? G : '#ddd'), background: t.is_completed ? G : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff', flexShrink:0 }}>
                          {t.is_completed ? 'v' : ''}
                        </div>
                        <span style={{ fontSize:14, flex:1, color: t.is_completed ? '#bbb' : '#1a1a1a', textDecoration: t.is_completed ? 'line-through' : 'none' }}>{t.description}</span>
                        {t.category && <span style={{ fontSize:14, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.category}</span>}
                        <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#D85A30' }} onClick={() => deleteTask(t.id)}>x</button>
                      </div>
                    ))}
                    {tasks.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Sin tareas asignadas</div>}
                  </div>
                </div>
              )}

              {patientTab === 'tratamientos' && (
                <div>
                  <button style={{ ...s.btnPrimary, marginBottom:12 }} onClick={() => setModal('new-treatment')}>+ Registrar tratamiento</button>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    {treatments.map(t => (
                      <div key={t.id} style={{ padding:'10px 0', borderBottom:'0.5px solid #f0f0f0' }}>
                        <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', marginBottom:4 }}>{t.product_name}</div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:4 }}>
                          {t.appointment_date && <span style={{ fontSize:14, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.appointment_date}</span>}
                          {t.dose && <span style={{ fontSize:14, padding:'1px 7px', borderRadius:20, background:'#E6F1FB', color:'#185FA5' }}>{t.dose}</span>}
                          {t.zone && <span style={{ fontSize:14, padding:'1px 7px', borderRadius:20, background:'#FAEEDA', color:'#854F0B' }}>{t.zone}</span>}
                          {t.session_label && <span style={{ fontSize:14, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.session_label}</span>}
                        </div>
                        {t.notes && <div style={{ fontSize:14, color:'#888', fontStyle:'italic' }}>{t.notes}</div>}
                      </div>
                    ))}
                    {treatments.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Sin tratamientos registrados</div>}
                  </div>
                </div>
              )}

              {patientTab === 'notas' && (
                <div>
                  <button style={{ ...s.btnPrimary, marginBottom:12 }} onClick={() => setModal('new-note')}>+ Nueva nota</button>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    {notes.map(n => {
                      function noteAlert(type, val) {
                        const v = parseFloat(val)
                        if (!val || isNaN(v)) return null
                        if (type === 'pas') { if (v >= 140 || v < 90) return '🔴'; if (v >= 120) return '⚠️' }
                        if (type === 'pad') { if (v >= 90 || v < 60) return '🔴'; if (v >= 80) return '⚠️' }
                        if (type === 'spo2') { if (v < 90) return '🔴'; if (v < 95) return '⚠️' }
                        if (type === 'glucose') { if (v < 70 || v >= 126) return '🔴'; if (v >= 100) return '⚠️' }
                        if (type === 'hr') { if (v > 120 || v < 50) return '🔴'; if (v > 100 || v < 60) return '⚠️' }
                        return null
                      }
                      return (
                        <div key={n.id} style={{ padding:'12px 0', borderBottom:'0.5px solid #f0f0f0' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                            <div style={{ fontSize:14, color:'#999' }}>{n.note_date} · {n.visit_type}</div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button style={{ fontSize:14, padding:'2px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'#E6F1FB', color:'#185FA5' }}
                                onClick={() => { setModal('edit-note'); setModalData({ note:n }) }}>Editar</button>
                              <button style={{ fontSize:14, padding:'2px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'#FAECE7', color:'#D85A30' }}
                                onClick={() => { if (window.confirm('Eliminar esta nota clinica?')) deleteNote(n.id) }}>Eliminar</button>
                            </div>
                          </div>
                          {(n.pas || n.spo2 || n.glucose || n.heart_rate) && (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                              {n.pas && n.pad && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#444' }}>TA: {n.pas}/{n.pad} mmHg{n.pam ? ' · PAM: ' + n.pam : ''} {noteAlert('pas',n.pas) || noteAlert('pad',n.pad) || ''}</span>}
                              {n.spo2 && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#444' }}>SpO2: {n.spo2}% {n.o2_device && n.o2_device !== 'aa' ? '(' + n.o2_device + (n.o2_flow ? ' ' + n.o2_flow + ' L/min' : '') + ')' : '(aa)'} {noteAlert('spo2',n.spo2) || ''}</span>}
                              {n.glucose && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#444' }}>Glicemia: {n.glucose} mg/dL {noteAlert('glucose',n.glucose) || ''}</span>}
                              {n.heart_rate && <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#444' }}>FC: {n.heart_rate} lpm {noteAlert('hr',n.heart_rate) || ''}</span>}
                            </div>
                          )}
                          {n.content && <div style={{ fontSize:14, color:'#444', lineHeight:1.6 }}>{n.content}</div>}
                        </div>
                      )
                    })}
                    {notes.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Sin notas clinicas</div>}
                  </div>
                </div>
              )}

              {patientTab === 'diagnosticos' && (
                <div>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Buscar diagnostico CIE-10</div>
                    <div style={{ position:'relative' }}>
                      <input
                        value={cie10Search}
                        onChange={e => { setCie10Search(e.target.value); searchCie10(e.target.value) }}
                        placeholder="Escribe codigo o nombre del diagnostico..."
                        style={{ width:'100%', padding:'9px 12px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                      />
                      {cie10Results.length > 0 && (
                        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:10, maxHeight:240, overflowY:'auto' }}>
                          {cie10Results.map(r => (
                            <div key={r.code} onClick={() => addDiagnosis(r.code, r.description)}
                              style={{ padding:'9px 12px', cursor:'pointer', borderBottom:'0.5px solid #f0f0f0', fontSize:14 }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <span style={{ fontWeight:500, color:'#1D9E75', marginRight:8 }}>{r.code}</span>
                              <span style={{ color:'#444' }}>{r.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Diagnosticos activos ({diagnoses.length})</div>
                    {diagnoses.map(d => (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'0.5px solid #f0f0f0' }}>
                        <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#E6F1FB', color:'#185FA5', fontWeight:500, whiteSpace:'nowrap' }}>{d.cie10_code}</span>
                        <span style={{ fontSize:14, flex:1, color:'#1a1a1a' }}>{d.cie10_description}</span>
                        <span style={{ fontSize:14, color:'#bbb', whiteSpace:'nowrap' }}>{d.diagnosis_date}</span>
                        <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#D85A30', flexShrink:0 }} onClick={() => deleteDiagnosis(d.id)}>x</button>
                      </div>
                    ))}
                    {diagnoses.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Sin diagnosticos registrados</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'calendario' && (
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 260px', gap:14, height: isMobile ? 'auto' : 'calc(100vh - 130px)' }}>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'0.5px solid #eee' }}>
                  <button style={s.calNavBtn} onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}>{'<'}</button>
                  <div style={{ fontSize:14, fontWeight:500 }}>{MONTHS[calMonth]} {calYear}</div>
                  <button style={s.calNavBtn} onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}>{'>'}</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'8px 10px 4px' }}>
                  {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:14, fontWeight:500, color:'#999', textTransform:'uppercase' }}>{d}</div>)}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 10px 10px', gap:2, flex:1 }}>
                  {renderCalendar().map((cell, i) => {
                    const dayAppts = cell.dateStr ? apptsByDate(cell.dateStr) : []
                    return (
                      <div key={i} onClick={() => cell.dateStr && setSelDate(cell.dateStr)}
                        style={{ minHeight:60, padding:5, borderRadius:6, cursor: cell.dateStr ? 'pointer' : 'default', opacity: cell.current ? 1 : 0.3, background: cell.isSelected ? '#E1F5EE' : cell.isToday ? '#f0fdf9' : 'transparent', border: cell.isToday ? ('1px solid ' + G) : '1px solid transparent' }}>
                        <div style={{ fontSize:14, color: cell.isToday ? G : '#666', fontWeight: cell.isToday ? 600 : 400, marginBottom:2 }}>{cell.day}</div>
                        {dayAppts.slice(0,2).map(a => (
                          <div key={a.id} style={{ fontSize:9, padding:'1px 3px', borderRadius:2, color:'#fff', marginBottom:1, background:G, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {a.appointment_time?.substring(0,5)} {a.patient?.profile?.first_name}
                          </div>
                        ))}
                        {dayAppts.length > 2 && <div style={{ fontSize:9, color:'#999' }}>+{dayAppts.length-2}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ padding:'12px 14px', borderBottom:'0.5px solid #eee' }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>
                    {selDate ? (DAYS_FULL[new Date(selDate + 'T12:00:00').getDay()] + ' ' + new Date(selDate + 'T12:00:00').getDate() + ' de ' + MONTHS[new Date(selDate + 'T12:00:00').getMonth()]) : 'Selecciona un dia'}
                  </div>
                  <div style={{ fontSize:14, color:'#999', marginTop:1 }}>{selDate ? (apptsByDate(selDate).length + ' citas') : ''}</div>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:10 }}>
                  {!selDate && <div style={{ textAlign:'center', padding:30, fontSize:14, color:'#999' }}>Haz clic en un dia</div>}
                  {selDate && apptsByDate(selDate).length === 0 && (
                    <div style={{ textAlign:'center', padding:20, fontSize:14, color:'#999' }}>
                      <div style={{ marginBottom:10 }}>Sin citas para este dia</div>
                      <button style={s.btnPrimary} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Agendar cita</button>
                    </div>
                  )}
                  {selDate && apptsByDate(selDate).map(a => (
                    <div key={a.id} style={{ background:'#f8f8f8', borderRadius:8, padding:10, marginBottom:8, borderLeft:'3px solid ' + G }}>
                      <div style={{ fontSize:14, color:'#999', marginBottom:3 }}>{a.appointment_time?.substring(0,5)} hrs</div>
                      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{a.patient?.profile?.first_name} {a.patient?.profile?.last_name}</div>
                      <div style={{ fontSize:14, color:'#666' }}>{a.visit_type}</div>
                      <div style={{ display:'flex', gap:5, marginTop:6 }}>
                        <span style={{ fontSize:14, padding:'1px 7px', borderRadius:20, background:'#fff', color:'#888', border:'0.5px solid #eee' }}>{a.duration_min} min</span>
                      </div>
                      {a.notes && <div style={{ fontSize:14, color:'#888', marginTop:5, fontStyle:'italic' }}>{a.notes}</div>}
                      <div style={{ display:'flex', gap:5, marginTop:7 }}>
                        <button style={{ fontSize:14, padding:'3px 9px', borderRadius:6, border:'none', cursor:'pointer', background:'#E6F1FB', color:'#185FA5' }}
                          onClick={() => { setModal('edit-appt'); setModalData({ appt:a }) }}>Editar</button>
                        <button style={{ fontSize:14, padding:'3px 9px', borderRadius:6, border:'none', cursor:'pointer', background:'#FAECE7', color:'#D85A30' }}
                          onClick={() => { setModal('confirm-cancel'); setModalData({ apptId:a.id }) }}>Cancelar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'chat' && (
            <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', height:'calc(100vh - 130px)', background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
              <div style={{ borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column' }}>
                <div style={{ padding:'11px 12px', borderBottom:'0.5px solid #eee', fontSize:14, fontWeight:500, color:'#1a1a1a' }}>
                  Conversaciones
                  {pendingCount > 0 && <span style={{ marginLeft:8, background:'#D85A30', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:14, fontWeight:500 }}>{pendingCount}</span>}
                </div>
                <div style={{ flex:1, overflowY:'auto' }}>
                  {pendingChats().map(c => {
                    const last = c.msgs[0]
                    const unread = c.msgs.filter(m => !m.is_read && m.sender_role === 'patient').length
                    return (
                      <div key={c.patientId} onClick={() => openChat(c)}
                        style={{ padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', cursor:'pointer', background: activeChat?.patientId === c.patientId ? '#E1F5EE' : 'transparent' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                          <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{c.name || 'Paciente'}</div>
                          {unread > 0 && <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', marginTop:4 }} />}
                        </div>
                        <div style={{ fontSize:14, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last?.content}</div>
                      </div>
                    )
                  })}
                  {pendingChats().length === 0 && <div style={{ padding:20, textAlign:'center', fontSize:14, color:'#999' }}>Sin conversaciones</div>}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {!activeChat && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#999' }}>Selecciona una conversacion</div>}
                {activeChat && (
                  <>
                    <div style={{ padding:'11px 14px', borderBottom:'0.5px solid #eee', fontSize:14, fontWeight:500 }}>{activeChat.name}</div>
                    <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
                      {[...activeChat.msgs].reverse().map(m => (
                        <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: m.sender_role === 'doctor' ? 'flex-end' : 'flex-start' }}>
                          {m.sender_role === 'doctor' && <div style={{ fontSize:11, color:'#888', marginBottom:2, textAlign:'right' }}>{m.sender?.first_name ? `Dr. ${m.sender.first_name} ${m.sender.last_name}` : 'Doctor adicional'}</div>}
                          <div style={{ maxWidth:'78%', padding:'8px 11px', borderRadius:12, fontSize:14, lineHeight:1.5, background: m.sender_role === 'doctor' ? G : '#f0f0f0', color: m.sender_role === 'doctor' ? '#fff' : '#1a1a1a' }}>
                            {m.content}
                          </div>
                          <div style={{ fontSize:14, color:'#999', marginTop:2 }}>{new Date(m.created_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:'10px 12px', borderTop:'0.5px solid #eee', display:'flex', gap:8 }}>
                      <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                        placeholder="Escribe tu respuesta..."
                        style={{ flex:1, padding:'8px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                      <button onClick={sendMessage} style={{ width:32, height:32, borderRadius:'50%', background:G, border:'none', cursor:'pointer', color:'#fff', fontSize:14 }}>{'>'}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function MeasurementForm({ saving, onSave, onClose }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], weight:'', fat:'', muscle:'', visceral:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Registrar medicion</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}><Field label="Fecha" value={form.date} onChange={f('date')} type="date" /></div>
        <Field label="Peso (kg)" value={form.weight} onChange={f('weight')} type="number" placeholder="64.2" />
        <Field label="% Grasa" value={form.fat} onChange={f('fat')} type="number" placeholder="29.1" />
        <Field label="Masa muscular (kg)" value={form.muscle} onChange={f('muscle')} type="number" placeholder="42.3" />
        <Field label="Grasa visceral (pts)" value={form.visceral} onChange={f('visceral')} type="number" placeholder="8" />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar medicion'}</button>
      </div>
    </>
  )
}

function GoalForm({ saving, onSave, onClose }) {
  const [form, setForm] = useState({ name:'', initial:'', target:'', deadline:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Nuevo objetivo</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}><Field label="Nombre del objetivo" value={form.name} onChange={f('name')} placeholder="% grasa corporal" /></div>
        <Field label="Valor actual" value={form.initial} onChange={f('initial')} type="number" placeholder="29.1" />
        <Field label="Meta" value={form.target} onChange={f('target')} type="number" placeholder="22.0" />
        <div style={{ gridColumn:'1/-1' }}><Field label="Fecha limite" value={form.deadline} onChange={f('deadline')} type="date" /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar objetivo'}</button>
      </div>
    </>
  )
}

function TaskPickerForm({ library, saving, onSave, onClose }) {
  const [selected, setSelected] = useState(new Set())
  const [custom, setCustom] = useState('')
  const categories = [...new Set(library.map(l => l.category).filter(Boolean))]

  function toggle(name) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function addCustom() {
    if (!custom.trim()) return
    setSelected(prev => new Set([...prev, custom.trim()]))
    setCustom('')
  }

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Asignar tareas</div>
      <div style={{ maxHeight:300, overflowY:'auto', marginBottom:12 }}>
        {categories.map(cat => (
          <div key={cat}>
            <div style={{ fontSize:14, fontWeight:500, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 0 4px' }}>{cat}</div>
            {library.filter(l => l.category === cat).map(item => (
              <div key={item.id} onClick={() => toggle(item.name)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border: '0.5px solid ' + (selected.has(item.name) ? G : '#eee'), background: selected.has(item.name) ? '#E1F5EE' : '#fff', marginBottom:4, cursor:'pointer' }}>
                <span style={{ fontSize:14, flex:1, color: selected.has(item.name) ? '#0F6E56' : '#444' }}>{item.name}</span>
                {selected.has(item.name) && <span style={{ color:G, fontSize:14 }}>v</span>}
              </div>
            ))}
          </div>
        ))}
        {library.filter(l => !l.category).map(item => (
          <div key={item.id} onClick={() => toggle(item.name)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border: '0.5px solid ' + (selected.has(item.name) ? G : '#eee'), background: selected.has(item.name) ? '#E1F5EE' : '#fff', marginBottom:4, cursor:'pointer' }}>
            <span style={{ fontSize:14, flex:1, color: selected.has(item.name) ? '#0F6E56' : '#444' }}>{item.name}</span>
            {selected.has(item.name) && <span style={{ color:G }}>v</span>}
          </div>
        ))}
      </div>
      <div style={{ borderTop:'0.5px dashed #eee', paddingTop:10, marginBottom:12 }}>
        <div style={{ fontSize:14, color:'#999', marginBottom:6 }}>Agregar tarea personalizada:</div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Descripcion de la tarea..."
            style={{ flex:1, padding:'7px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
          <button style={s.btnPrimary} onClick={addCustom}>+</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving || selected.size === 0}
          onClick={() => onSave([...selected])}>{saving ? 'Asignando...' : 'Asignar ' + selected.size + ' tarea(s)'}</button>
      </div>
    </>
  )
}

function TreatmentForm({ library, saving, onSave, onClose }) {
  const [form, setForm] = useState({ product:'', dose:'', zone:'', session:'', date: new Date().toISOString().split('T')[0], notes:'' })
  const [custom, setCustom] = useState('')
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Registrar tratamiento</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.fieldLabel}>Procedimiento / producto</label>
          <select value={form.product} onChange={f('product')} style={s.fieldInput}>
            <option value="">Selecciona...</option>
            {library.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            <option value="__custom__">+ Agregar otra opcion</option>
          </select>
        </div>
        {form.product === '__custom__' && (
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.fieldLabel}>Nombre del tratamiento</label>
            <input value={custom} onChange={e => { setCustom(e.target.value); setForm(p => ({ ...p, product: e.target.value })) }}
              placeholder="Nombre del tratamiento..." style={s.fieldInput} />
          </div>
        )}
        <Field label="Dosis / duracion" value={form.dose} onChange={f('dose')} placeholder="2 ml / 60 min" />
        <Field label="Zona tratada" value={form.zone} onChange={f('zone')} placeholder="Cara y cuello" />
        <Field label="Fecha" value={form.date} onChange={f('date')} type="date" />
        <Field label="Sesion" value={form.session} onChange={f('session')} placeholder="Sesion 2 de 3" />
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.fieldLabel}>Observaciones</label>
          <textarea value={form.notes} onChange={f('notes')} rows={2} style={{ ...s.fieldInput, resize:'vertical' }} placeholder="Buena tolerancia al producto..." />
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar tratamiento'}</button>
      </div>
    </>
  )
}

function NoteForm({ saving, onSave, onClose }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], visitType:'Seguimiento', content:'', pas:'', pad:'', spo2:'', o2device:'aa', o2flow:'', glucose:'', hr:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  const pam = form.pas && form.pad ? Math.round((parseInt(form.pas) + 2 * parseInt(form.pad)) / 3) : null
  const DEVICES = ['aa','Canula nasal','Mascarilla simple','Mascarilla con reservorio','Ventimask','CPAP','BPAP','Tubo endotraqueal','Venturi']

  function vitalStatus(type, val) {
    const v = parseFloat(val)
    if (!val || isNaN(v)) return null
    if (type === 'pas') {
      if (v >= 140) return { icon:'🔴', msg:'Hipertension' }
      if (v >= 120) return { icon:'⚠️', msg:'PA elevada' }
      if (v < 90)  return { icon:'🔴', msg:'Hipotension' }
      return { icon:'✅', msg:'Normal' }
    }
    if (type === 'pad') {
      if (v >= 90) return { icon:'🔴', msg:'Hipertension' }
      if (v >= 80) return { icon:'⚠️', msg:'PA elevada' }
      if (v < 60)  return { icon:'🔴', msg:'Hipotension' }
      return { icon:'✅', msg:'Normal' }
    }
    if (type === 'spo2') {
      if (v < 90)  return { icon:'🔴', msg:'Hipoxemia critica' }
      if (v < 95)  return { icon:'⚠️', msg:'Hipoxemia leve' }
      return { icon:'✅', msg:'Normal' }
    }
    if (type === 'glucose') {
      if (v < 70)   return { icon:'🔴', msg:'Hipoglicemia' }
      if (v >= 126) return { icon:'🔴', msg:'Hiperglicemia' }
      if (v >= 100) return { icon:'⚠️', msg:'Prediabetes/ayuno alterado' }
      return { icon:'✅', msg:'Normal' }
    }
    if (type === 'hr') {
      if (v > 120 || v < 50) return { icon:'🔴', msg: v > 120 ? 'Taquicardia severa' : 'Bradicardia severa' }
      if (v > 100 || v < 60) return { icon:'⚠️', msg: v > 100 ? 'Taquicardia' : 'Bradicardia' }
      return { icon:'✅', msg:'Normal' }
    }
    return null
  }

  function VitalBadge({ type, val }) {
    const st = vitalStatus(type, val)
    if (!st) return null
    const colors = { '✅': ['#E1F5EE','#0F6E56'], '⚠️': ['#FAEEDA','#854F0B'], '🔴': ['#FAECE7','#C24B2A'] }
    const [bg, fg] = colors[st.icon] || ['#f0f0f0','#666']
    return <span style={{ fontSize:14, padding:'2px 7px', borderRadius:20, background:bg, color:fg, marginLeft:6, fontWeight:500 }}>{st.icon} {st.msg}</span>
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' }

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Nueva nota clinica</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <Field label="Fecha" value={form.date} onChange={f('date')} type="date" />
        <div>
          <label style={s.fieldLabel}>Tipo de consulta</label>
          <select value={form.visitType} onChange={f('visitType')} style={s.fieldInput}>
            {['Seguimiento','Primera consulta','Procedimiento','Control'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div style={{ background:'#f8f8f8', borderRadius:10, padding:12, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:500, color:'#666', marginBottom:10 }}>Signos vitales</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <label style={s.fieldLabel}>PAS (mmHg) <VitalBadge type="pas" val={form.pas} /></label>
            <input type="number" value={form.pas} onChange={f('pas')} placeholder="120" style={{ ...inp, borderColor: vitalStatus('pas',form.pas)?.icon === '🔴' ? '#D85A30' : vitalStatus('pas',form.pas)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={s.fieldLabel}>PAD (mmHg) <VitalBadge type="pad" val={form.pad} /></label>
            <input type="number" value={form.pad} onChange={f('pad')} placeholder="80" style={{ ...inp, borderColor: vitalStatus('pad',form.pad)?.icon === '🔴' ? '#D85A30' : vitalStatus('pad',form.pad)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={s.fieldLabel}>PAM (mmHg)</label>
            <input value={pam !== null ? pam + ' mmHg' : ''} readOnly placeholder="Auto" style={{ ...inp, background:'#eee', color:'#666', cursor:'not-allowed' }} />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <label style={s.fieldLabel}>SpO2 (%) <VitalBadge type="spo2" val={form.spo2} /></label>
            <input type="number" value={form.spo2} onChange={f('spo2')} placeholder="98" style={{ ...inp, borderColor: vitalStatus('spo2',form.spo2)?.icon === '🔴' ? '#D85A30' : vitalStatus('spo2',form.spo2)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={s.fieldLabel}>O2 / Dispositivo</label>
            <select value={form.o2device} onChange={f('o2device')} style={s.fieldInput}>
              {DEVICES.map(d => <option key={d} value={d}>{d === 'aa' ? 'Aire ambiente' : d}</option>)}
            </select>
          </div>
          <div>
            <label style={s.fieldLabel}>Flujo O2 (L/min)</label>
            <input type="number" value={form.o2flow} onChange={f('o2flow')} placeholder="2"
              disabled={form.o2device === 'aa'}
              style={{ ...inp, background: form.o2device === 'aa' ? '#eee' : '#fff', cursor: form.o2device === 'aa' ? 'not-allowed' : 'text' }} />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={s.fieldLabel}>Glicemia (mg/dL) <VitalBadge type="glucose" val={form.glucose} /></label>
            <input type="number" value={form.glucose} onChange={f('glucose')} placeholder="90" style={{ ...inp, borderColor: vitalStatus('glucose',form.glucose)?.icon === '🔴' ? '#D85A30' : vitalStatus('glucose',form.glucose)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={s.fieldLabel}>FC (lpm) <VitalBadge type="hr" val={form.hr} /></label>
            <input type="number" value={form.hr} onChange={f('hr')} placeholder="72" style={{ ...inp, borderColor: vitalStatus('hr',form.hr)?.icon === '🔴' ? '#D85A30' : vitalStatus('hr',form.hr)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
        </div>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={s.fieldLabel}>Nota clinica</label>
        <textarea value={form.content} onChange={f('content')} rows={4} style={{ ...s.fieldInput, resize:'vertical' }} placeholder="Paciente refiere..." />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave({ ...form, pam })}>{saving ? 'Guardando...' : 'Guardar nota'}</button>
      </div>
    </>
  )
}

function ApptForm({ appt, patients, saving, defaultDate, onSave, onClose }) {
  const [form, setForm] = useState({ id:appt?.id||null, patientId:appt?.patient_id||'', date:appt?.appointment_date||defaultDate||'', time:appt?.appointment_time?.substring(0,5)||'09:00', visitType:appt?.visit_type||'Consulta de seguimiento', duration:appt?.duration_min||30, notes:appt?.notes||'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  const pn = p => ((p.profile?.first_name || '') + ' ' + (p.profile?.last_name || '')).trim()
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>{appt ? 'Editar cita' : 'Nueva cita'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.fieldLabel}>Paciente</label>
          <select value={form.patientId} onChange={f('patientId')} style={s.fieldInput}>
            <option value="">Selecciona...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{pn(p)}</option>)}
          </select>
        </div>
        <Field label="Fecha" value={form.date} onChange={f('date')} type="date" />
        <Field label="Hora" value={form.time} onChange={f('time')} type="time" />
        <div>
          <label style={s.fieldLabel}>Tipo</label>
          <select value={form.visitType} onChange={f('visitType')} style={s.fieldInput}>
            {['Consulta de seguimiento','Primera consulta','Procedimiento estetico','Control de composicion corporal','Aplicacion de tratamiento','Control GLP-1'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={s.fieldLabel}>Duracion</label>
          <select value={form.duration} onChange={f('duration')} style={s.fieldInput}>
            {[30,45,60,90].map(v => <option key={v} value={v}>{v} min</option>)}
          </select>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.fieldLabel}>Notas</label>
          <textarea value={form.notes} onChange={f('notes')} rows={2} style={{ ...s.fieldInput, resize:'vertical' }} placeholder="Indicaciones..." />
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : appt ? 'Guardar cambios' : 'Agendar cita'}</button>
      </div>
    </>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={s.fieldLabel}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={s.fieldInput} />
    </div>
  )
}

const s = {
  btnPrimary: { background:'#1D9E75', color:'#fff', border:'none', fontSize:14, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' },
  btnCancel:  { background:'none', border:'1px solid #e0e0e0', fontSize:14, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  calNavBtn:  { background:'none', border:'1px solid #eee', borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#666' },
  fieldLabel: { display:'block', fontSize:14, color:'#666', marginBottom:4, fontWeight:500 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' },
}
