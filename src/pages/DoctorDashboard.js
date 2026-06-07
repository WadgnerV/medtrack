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
import SpotifyBar from '../components/SpotifyBar'
import ChatBubble from '../components/ChatBubble'
import NotificationBell from '../components/NotificationBell'
import UserMenu from '../components/UserMenu'

const G = '#1D9E75'
const SP = ' '

export default function DoctorDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('calendario')
  const [patients, setPatients] = useState([])
  const [appts, setAppts] = useState([])
  const [msgs, setMsgs] = useState([])
  const [library, setLibrary] = useState([])
  const [perms, setPerms] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selPatient, setSelPatient] = useState(() => {
    return null
  })
  const [patientCareModules, setPatientCareModules] = useState([])
  const [patientTab, setPatientTab] = useState('progreso')
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [saving, setSaving] = useState(false)
  const [activeChat, setActiveChat] = useState(null)
  const [chatMsg, setChatMsg] = useState('')
  function setViewPersist(v) { localStorage.setItem('doctorView', v); setView(v) }
  function setSelPatientPersist(p) { 
    if (p) localStorage.setItem('doctorSelPatient', JSON.stringify(p))
    else localStorage.removeItem('doctorSelPatient')
    setSelPatient(p) 
  }
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [selDate, setSelDate] = useState(null)
  const [calView, setCalView] = useState('semana')
  const [popupAppt, setPopupAppt] = useState(null)
  const [popupPos, setPopupPos] = useState({ x:0, y:0 })
  const [editPatientForm, setEditPatientForm] = useState({})
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (calView === 'semana' || calView === 'dia') {
      const id = calView === 'semana' ? 'cal-semana-scroll' : 'cal-dia-scroll'
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) {
          const now = new Date()
          const SLOT_H = calView === 'semana' ? 80 : 88
          const offset = (now.getHours() * 60 + now.getMinutes()) / 60 * SLOT_H - 150
          el.scrollTop = Math.max(0, offset)
        }
      }, 200)
    }
  }, [calView])

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(today)
    mon.setDate(today.getDate() + diff)
    mon.setHours(0,0,0,0)
    return mon
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [collapsedMenuOpen, setCollapsedMenuOpen] = useState(false)
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

  useEffect(() => { 
    if (profile?.id) {
      loadAll()
      localStorage.setItem('doctorView', 'calendario')
      localStorage.removeItem('doctorSelPatient')
      setSelPatient(null)
    }
  }, [profile?.id])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadPatients(), loadAppts(), loadMsgs(), loadLibrary(), loadPerms(), loadAllDiagnoses()])
    setLoading(false)
  }

  async function loadPatients() {
    // Pacientes asignados por assigned_doctor_id O por módulo de atención
    const [byDoctor, byModule] = await Promise.all([
      supabase.from('patients')
        .select('id, status, specialty_type, birth_date, sex, province, canton, id_number, phone, height_cm, profile:profile_id(id, first_name, last_name, email)')
        .eq('assigned_doctor_id', profile.id),
      supabase.from('patient_care_modules')
        .select('patient:patient_id(id, status, specialty_type, birth_date, sex, province, canton, id_number, phone, height_cm, profile:profile_id(id, first_name, last_name, email))')
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
    const allModules = data || []
    setPatientCareModules(allModules)
    // Establecer primera pestaña según módulos activos
    if (allModules.length > 0) {
      setPatientTab('modulo_' + allModules[0].module_type)
    } else {
      setPatientTab('progreso')
    }
  }

  async function saveEditPatient(form) {
    setSaving(true)
    const profileId = editPatientForm.profileId
    const patientId = editPatientForm.patientId
    if (!profileId || !patientId) { setSaving(false); return }
    await supabase.from('profiles').update({
      first_name: form.firstName, last_name: form.lastName,
    }).eq('id', profileId)
    await supabase.from('patients').update({
      id_number: form.idNumber || null,
      phone: form.phone || null,
      birth_date: form.birthDate || null,
      sex: form.sex || null,
      province: form.province || null,
      canton: form.canton || null,
      height_cm: form.height ? parseInt(form.height) : null,
    }).eq('id', patientId)
    await loadPatients(); setModal(null); setSaving(false)
  }

  function openPatient(p) {
    setSelPatientPersist(p)
    setPatientTab('progreso')
    setViewPersist('perfil')
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
      notes: form.notes, status: form.status || 'pending_confirmation', module_type: form.moduleType || null, created_by: profile.id
    }
    const prevAppt = form.id ? appts.find(a => a.id === form.id) : null
    const prevStatus = prevAppt?.status || null
    if (form.id) {
      await supabase.from('appointments').update(payload).eq('id', form.id)
      const pat = patients.find(p => p.id === form.patientId)
      // Si cambió fecha, hora → correo de reagendamiento
      const wasRescheduled = prevAppt && (
        prevAppt.appointment_date !== form.date ||
        prevAppt.appointment_time?.substring(0,5) !== form.time?.substring(0,5)
      )
      if (wasRescheduled && pat?.profile?.email) {
        await supabase.functions.invoke('appointment-rescheduled', {
          body: {
            patient_email: pat.profile.email,
            patient_name: `${pat.profile.first_name} ${pat.profile.last_name}`,
            doctor_name: `Dr. ${profile.first_name} ${profile.last_name}`,
            appointment_date: form.date,
            appointment_time: form.time,
          }
        })
      }
      // Si cambió a no_show
      if (form.status === 'no_show' && prevStatus !== 'no_show') {
        if (pat?.profile?.email) {
          await supabase.functions.invoke('appointment-noshow', {
            body: {
              patient_email: pat.profile.email,
              patient_name: `${pat.profile.first_name} ${pat.profile.last_name}`,
              doctor_name: `Dr. ${profile.first_name} ${profile.last_name}`,
              appointment_date: form.date,
              appointment_time: form.time,
            }
          })
        }
      }
    } else {
      await supabase.from('appointments').insert(payload)
    }
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

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:13, color:G, fontFamily:'system-ui' }}>Cargando MedTrack...</div>

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"Inter, system-ui, sans-serif", background:'#f5f5f5', overflowX:'hidden', maxWidth:'100vw' }}>

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
            {modal === 'edit-patient' && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={() => setModal(null)}>
                <div style={{ background:'#fff', borderRadius:14, padding:28, width:480, maxWidth:'95vw', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize:16, fontWeight:600, color:'#1a3a5c', marginBottom:20 }}>Editar paciente</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Nombre</label>
                      <input value={editPatientForm.firstName||''} onChange={e => setEditPatientForm(p=>({...p, firstName:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Apellido</label>
                      <input value={editPatientForm.lastName||''} onChange={e => setEditPatientForm(p=>({...p, lastName:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Identificación</label>
                      <input value={editPatientForm.idNumber||''} onChange={e => setEditPatientForm(p=>({...p, idNumber:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Teléfono</label>
                      <input value={editPatientForm.phone||''} onChange={e => setEditPatientForm(p=>({...p, phone:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Fecha de nacimiento</label>
                      <input type="date" value={editPatientForm.birthDate||''} onChange={e => setEditPatientForm(p=>({...p, birthDate:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Sexo</label>
                      <select value={editPatientForm.sex||''} onChange={e => setEditPatientForm(p=>({...p, sex:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }}>
                        <option value="">Sin especificar</option>
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                        <option value="other">Otro</option>
                      </select></div>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Provincia</label>
                      <input value={editPatientForm.province||''} onChange={e => setEditPatientForm(p=>({...p, province:e.target.value}))} placeholder="ej: Heredia" style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Cantón</label>
                      <input value={editPatientForm.canton||''} onChange={e => setEditPatientForm(p=>({...p, canton:e.target.value}))} placeholder="ej: Heredia" style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
                    <div><label style={{ fontSize:12, color:'#888', display:'block', marginBottom:4 }}>Altura (cm)</label>
                      <input type="number" value={editPatientForm.height||''} onChange={e => setEditPatientForm(p=>({...p, height:e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setModal(null)} style={{ flex:1, padding:'8px', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
                    <button onClick={() => saveEditPatient(editPatientForm)} disabled={saving} style={{ flex:1, padding:'8px', background:'#1a3a5c', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, opacity:saving?0.7:1 }}>{saving?'Guardando...':'Guardar'}</button>
                  </div>
                </div>
              </div>
            )}
            {(modal === 'new-appt' || modal === 'edit-appt') && (
              <ApptForm appt={modalData.appt} patients={patients} saving={saving} defaultDate={selDate} defaultTime={modalData.defaultTime}
                doctorId={profile?.id} onSave={saveAppt} onClose={() => setModal(null)}
                onCancelAppt={async (id) => {
                  if (!window.confirm('¿Estás seguro que querés cancelar esta cita?')) return
                  await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
                  await loadAppts(); setModal(null)
                }}
                onGoToExpediente={(appt) => {
                  const p = patients.find(p => p.id === appt.patient_id)
                  if (p) {
                    setModal(null)
                    setSelPatient(p)
                    setPatientTab(appt.module_type ? 'modulo_' + appt.module_type : 'progreso')
                    setViewPersist('perfil')
                    loadPatientData(p.id)
                    loadPatientCareModules(p.id)
                  }
                }} />
            )}
            {modal === 'confirm-cancel' && (
              <>
                <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Cancelar cita</div>
                <p style={{ fontSize:13, color:'#666', marginBottom:18, lineHeight:1.6 }}>Esta accion no se puede deshacer.</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={s.btnCancel} onClick={() => setModal(null)}>No, mantener</button>
                  <button style={{ flex:1, padding:8, fontSize:13, fontWeight:500, background:'#D85A30', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}
                    onClick={() => cancelAppt(modalData.apptId)}>Si, cancelar cita</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!isMobile && <div style={{ width: sidebarCollapsed ? 52 : 210, minWidth: sidebarCollapsed ? 52 : 210, background:'#0F6E56', borderRight:'0.5px solid #085041', display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden', transition:'width 0.2s ease, min-width 0.2s ease' }}>
        <div style={{ padding:'10px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
          {!sidebarCollapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:6, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className="ti ti-heart-rate-monitor" style={{ color:'white', fontSize:15 }} aria-hidden="true"></i>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>MedTrack</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)' }}>Glow Clinic</div>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div style={{ width:28, height:28, borderRadius:6, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-heart-rate-monitor" style={{ color:'white', fontSize:15 }} aria-hidden="true"></i>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(p => !p)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', padding:4, display:'flex', alignItems:'center', marginLeft: sidebarCollapsed ? 0 : 'auto' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              {sidebarCollapsed
                ? <path d="M5 3L9 7L5 11" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M9 3L5 7L9 11" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
            </svg>
          </button>
        </div>

        {[
          { section:'Clínica', items:[{ label:'Calendario', key:'calendario', icon:'ti-calendar', badge:appts.filter(a => a.status === 'scheduled').length }] },
          { section:'Principal', items:[{ label:'Mis pacientes', key:'pacientes', icon:'ti-users', badge:patients.length }, { label:'Dashboard', key:'dashboard', icon:'ti-layout-dashboard' }] },
        ].map(group => (
          <div key={group.section}>
            {!sidebarCollapsed && <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:'0.07em', textTransform:'uppercase', padding:'10px 14px 3px' }}>{group.section}</div>}
            {group.items.map(item => {
              const active = view === item.key || (item.key === 'pacientes' && view === 'perfil')
              return (
                <div key={item.key} onClick={() => { setView(item.key); setSelPatient(null); if(isMobile) setMobileMenuOpen(false) }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', cursor:'pointer', fontSize:13, background: active ? 'rgba(255,255,255,0.15)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.75)', fontWeight: active ? 500 : 400, borderRadius:6, margin:'1px 8px' }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:15, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }} aria-hidden="true"></i>
                  {item.label}
                  {item.badge > 0 && <span style={{ marginLeft:'auto', fontSize:11, background:'rgba(255,255,255,0.9)', color:'#085041', borderRadius:10, padding:'1px 6px', fontWeight:500 }}>{item.badge}</span>}
                </div>
              )
            })}
          </div>
        ))}

        <div style={{ marginTop:'auto', paddingBottom:8 }}>
          {!sidebarCollapsed && <UserMenu />}
          {sidebarCollapsed && (
            <div style={{ padding:'10px 0', borderTop:'0.5px solid rgba(255,255,255,0.15)', display:'flex', justifyContent:'center', position:'relative' }}>
              <div onClick={() => setCollapsedMenuOpen(p => !p)} title={`${profile?.first_name} ${profile?.last_name}`}
                style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.2)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, cursor:'pointer' }}>
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              {collapsedMenuOpen && (
                <div style={{ position:'fixed', left:58, bottom:16, background:'#fff', border:'0.5px solid #eee', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden', zIndex:300, minWidth:180 }}>
                  <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee', fontSize:12 }}>
                    <div style={{ fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</div>
                    <div style={{ color:'#999', fontSize:11, marginTop:2 }}>{profile?.email}</div>
                  </div>
                  <div onClick={() => setCollapsedMenuOpen(false)} style={{ padding:'8px 14px', cursor:'pointer', fontSize:13, color:'#555', display:'flex', alignItems:'center', gap:8 }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8f8f8'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <i className="ti ti-user" style={{ fontSize:15, color:'#888' }} aria-hidden="true"></i> Mi perfil
                  </div>
                  <div style={{ height:'0.5px', background:'#f0f0f0' }} />
                  <div onClick={async () => { setCollapsedMenuOpen(false); await supabase.auth.signOut() }} style={{ padding:'8px 14px', cursor:'pointer', fontSize:13, color:'#D85A30', display:'flex', alignItems:'center', gap:8 }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8f8f8'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <i className="ti ti-logout" style={{ fontSize:15, color:'#D85A30' }} aria-hidden="true"></i> Cerrar sesión
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>}

      {/* Drawer móvil doctor */}
      {isMobile && showDrawer && (
        <>
          <div onClick={() => setShowDrawer(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 }} />
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'75vw', maxWidth:280, background:'#fff', zIndex:201, display:'flex', flexDirection:'column', overflowY:'auto' }}>
            <div style={{ padding:'14px', borderBottom:'0.5px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:26, height:26, background:G, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-heart-rate-monitor" style={{ color:'white', fontSize:13 }} aria-hidden="true"></i>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>MedTrack</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)' }}>Glow Clinic</div>
                </div>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#aaa' }}>×</button>
            </div>
            <div style={{ flex:1, padding:'8px 0' }}>
              <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 16px 3px' }}>Clínica</div>
              {[{ label:'Calendario', key:'calendario', icon:'ti-calendar' }].map(item => (
                <div key={item.key} onClick={() => { setViewPersist(item.key); setSelPatient(null); setShowDrawer(false) }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', cursor:'pointer', background: view===item.key?'#E1F5EE':'transparent', color: view===item.key?G:'#555', fontWeight: view===item.key?500:400, fontSize:13 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:15, color: view===item.key?G:'#999' }} aria-hidden="true"></i>
                  {item.label}
                </div>
              ))}
              <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 16px 3px' }}>Principal</div>
              {[{ label:'Mis pacientes', key:'pacientes', icon:'ti-users' }, { label:'Dashboard', key:'dashboard', icon:'ti-layout-dashboard' }].map(item => (
                <div key={item.key} onClick={() => { setViewPersist(item.key); setSelPatient(null); setShowDrawer(false) }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', cursor:'pointer', background: view===item.key?'#E1F5EE':'transparent', color: view===item.key?G:'#555', fontWeight: view===item.key?500:400, fontSize:13 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:15, color: view===item.key?G:'#999' }} aria-hidden="true"></i>
                  {item.label}
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
              <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>
                {view === 'perfil' && selPatient ? (
                  <span>
                    <button style={{ background:'none', border:'none', cursor:'pointer', color:'#999', fontSize:13, marginRight:6 }}
                      onClick={() => { setViewPersist('pacientes'); setSelPatientPersist(null) }}>{'<'} Mis pacientes</button>
                    {pName(selPatient)}
                  </span>
                ) : { dashboard:'Dashboard', pacientes:'Mis pacientes', calendario:'Calendario' }[view]}
              </div>
              <div style={{ fontSize:13, color:'#999', marginTop:1 }}>Glow Clinic</div>
            </div>
            {view === 'pacientes' && <div style={{ fontSize:13, color:'#666' }}>{patients.length} pacientes asignados</div>}

            {view === 'calendario' && <button style={s.btnPrimary} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Nueva cita</button>}
            <NotificationBell profile={profile} />
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
                  <span style={{ fontSize:13, color:'#999', fontWeight:500 }}>{k.label}</span>
                  <span style={{ fontSize:18, background:k.bg, borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>{k.icon}</span>
                </div>
                <div style={{ fontSize:30, fontWeight:600, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:13, color:'#aaa', marginTop:4 }}>{k.sub}</div>
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
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:'#1a1a1a' }}>📈 Mis citas por mes</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize:13, fill:'#999' }} />
                      <YAxis tick={{ fontSize:13, fill:'#999' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize:13, borderRadius:8, border:'0.5px solid #eee' }} />
                      <Line type="monotone" dataKey="citas" stroke="#0F6E56" strokeWidth={2.5} dot={{ r:4, fill:'#0F6E56' }} activeDot={{ r:6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* Lista compacta pacientes */}
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>👥 Mis pacientes</div>
                <button onClick={()=>setViewPersist('pacientes')} style={{ fontSize:13, color:'#0F6E56', background:'#E1F5EE', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:600 }}>Ver todos</button>
              </div>
              {patients.length===0 && <div style={{ fontSize:13, color:'#bbb', textAlign:'center', padding:20 }}>Sin pacientes asignados</div>}
              {patients.slice(0,6).map(p => {
                const initials = (p.first_name?.[0]||'')+(p.last_name?.[0]||'');
                const citasPac = appts.filter(a=>a.patient_id===p.id).length;
                return (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #ebebeb' }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                      {initials}
                    </div>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize:13, color:'#999' }}>{p.specialty_type||'Sin tipo de consulta'}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                      <span style={{ fontSize:13, fontWeight:500, padding:'2px 7px', borderRadius:99,
                        background: p.status==='active'?'#E1F5EE':'#f5f5f5',
                        color: p.status==='active'?'#0F6E56':'#999' }}>
                        {p.status==='active'?'activo':'inactivo'}
                      </span>
                      <span style={{ fontSize:13, color:'#bbb' }}>{citasPac} cita{citasPac!==1?'s':''}</span>
                    </div>
                  </div>
                );
              })}
              {patients.length>6 && <div style={{ fontSize:13, color:'#999', textAlign:'center', marginTop:8 }}>+{patients.length-6} más</div>}
            </div>
          </div>
        </div>
      )}

      {view === 'pacientes' && (
        <div>
          {/* Buscador */}
          <div style={{ padding:'10px 12px', marginBottom:12, position:'relative', display:'flex', alignItems:'center', background:'#fff', border:'0.5px solid #eee', borderRadius:12 }}>
            <span style={{ position:'absolute', left:24, fontSize:13, color:'#bbb', pointerEvents:'none' }}>🔍</span>
            <input type="text" placeholder="Buscar por nombre o email..." value={searchPac} onChange={e=>setSearchPac(e.target.value)}
              style={{ width:'100%', padding:'8px 12px 8px 34px', border:'0.5px solid #eee', borderRadius:8, fontSize:13, outline:'none', background:'#f9f9f9', boxSizing:'border-box' }} />
          </div>
          {false ? (
            <div />
          ) : (
            /* Desktop: cards */
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {patients.filter(p => {
                const q = searchPac.toLowerCase()
                if(!q) return true
                const nombre = ((p.profile?.first_name||'')+' '+(p.profile?.last_name||'')).toLowerCase()
                const email = (p.profile?.email||'').toLowerCase()
                const diag = (allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description||'').toLowerCase()
                return nombre.includes(q)||email.includes(q)||diag.includes(q)
              }).map(p => {
                const ACOLORS = [['#E1F5EE','#085041'],['#E6F1FB','#0C447C'],['#FBEAF0','#72243E'],['#FAEEDA','#633806'],['#EEEDFE','#3C3489'],['#F1EFE8','#444441']]
                const aci = Math.abs((pName(p)||'').split('').reduce((h,c)=>((h<<5)-h)+c.charCodeAt(0),0)) % ACOLORS.length
                const [abg, acolor] = ACOLORS[aci]
                const diag = allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description
                return (
                  <div key={p.id} onClick={() => openPatient(p)} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px 14px', cursor:'pointer', display:'flex', flexDirection:'column', gap:8 }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#ccc'} onMouseLeave={e=>e.currentTarget.style.borderColor='#eee'}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:abg, color:acolor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:500, flexShrink:0 }}>{initials(pName(p))}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{(p.profile?.last_name||'')} {(p.profile?.first_name||'')}</div>
                        <div style={{ fontSize:11, color:'#999', marginTop:1 }}>{age(p.birth_date)} años{p.province ? ` · ${p.province}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ height:'0.5px', background:'#f0f0f0' }} />
                    <div style={{ fontSize:11, color:'#888' }}>{p.profile?.email || ''}{p.phone ? ` · ${p.phone}` : ''}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f5f5f5', color: diag ? '#555' : '#bbb' }}>{diag || 'Sin diagnóstico'}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background: p.status==='active' ? '#E1F5EE' : '#FAEEDA', color: p.status==='active' ? '#0F6E56' : '#854F0B' }}>{p.status==='active' ? 'activo' : 'pendiente'}</span>
                    </div>
                  </div>
                )
              })}
              {patients.length === 0 && <div style={{ padding:40, textAlign:'center', fontSize:13, color:'#999', gridColumn:'1/-1' }}>No tienes pacientes asignados aun</div>}
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
                  <div style={{ fontSize:13, color:'#666', marginTop:2 }}>{age(selPatient.birth_date)} años · {selPatient.height_cm ? selPatient.height_cm + ' cm' : ''} · {selPatient.sex || ''}</div>
                  <div style={{ display:'flex', gap:6, marginTop:5 }}>
                    <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56' }}>{selPatient.specialty_type || 'Sin tipo de consulta'}</span>
                    <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{selPatient.profile?.email}</span>
                  </div>
                </div>
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:13, color:'#bbb' }}>Info de solo lectura</div>
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
                    {moduleType === 'integral' && <IntegralModule patient={selPatient} careModule={mod} canEdit={true} profile={profile} />}
                    {moduleType === 'metabolica' && <MetabolicModule patient={selPatient} careModule={mod} canEdit={true} />}
                    {moduleType === 'estetica' && <AestheticModule patient={selPatient} careModule={mod} canEdit={true} />}
                    {moduleType === 'fisioterapia' && <FisioterapiaModule patient={selPatient} careModule={mod} canEdit={true} profile={profile} />}
                    {moduleType === 'enfermeria' && <EnfermeriaModule patient={selPatient} careModule={mod} canEdit={true} profile={profile} />}
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
                        <div style={{ fontSize:13, color:'#888', marginBottom:4 }}>{m.l}</div>
                        <div style={{ fontSize:22, fontWeight:500, color:'#1a1a1a' }}>{m.v || '--'} <span style={{ fontSize:13, color:'#999', fontWeight:400 }}>{m.v ? m.u : ''}</span></div>
                        {latestMeasurement && <div style={{ fontSize:13, color:'#bbb', marginTop:3 }}>{latestMeasurement.measured_at}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Historial de mediciones</div>
                    {measurements.slice(0,8).map(m => (
                      <div key={m.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:8, padding:'8px 0', borderBottom:'1px solid #ebebeb', fontSize:13 }}>
                        <span style={{ color:'#888' }}>{m.measured_at}</span>
                        <span style={{ color:'#1a1a1a' }}>{m.weight_kg ? m.weight_kg + ' kg' : '--'}</span>
                        <span style={{ color:'#1a1a1a' }}>{m.body_fat_pct ? m.body_fat_pct + '%' : '--'}</span>
                        <span style={{ color:'#1a1a1a' }}>{m.muscle_mass_kg ? m.muscle_mass_kg + ' kg' : '--'}</span>
                        <span style={{ color:'#1a1a1a' }}>{m.visceral_fat_pts ? m.visceral_fat_pts + ' pts' : '--'}</span>
                      </div>
                    ))}
                    {measurements.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:20 }}>Sin mediciones registradas</div>}
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
                            <span style={{ fontSize:13, color:'#444' }}>{g.name}</span>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{g.initial_value} → {g.target_value}</span>
                              <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#D85A30' }} onClick={() => deleteGoal(g.id)}>x</button>
                            </div>
                          </div>
                          <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                            <div style={{ height:'100%', background:G, borderRadius:3, width: pct + '%' }} />
                          </div>
                          <div style={{ fontSize:13, color:'#999', marginTop:2, textAlign:'right' }}>{pct}%{g.deadline ? ' · Hasta ' + g.deadline : ''}</div>
                        </div>
                      )
                    })}
                    {goals.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:20 }}>Sin objetivos activos</div>}
                  </div>
                </div>
              )}

              {patientTab === 'tareas' && (
                <div>
                  <button style={{ ...s.btnPrimary, marginBottom:12 }} onClick={() => setModal('assign-tasks')}>+ Asignar tarea</button>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    {tasks.map(t => (
                      <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid #ebebeb' }}>
                        <div style={{ width:18, height:18, borderRadius:'50%', border: '1.5px solid ' + (t.is_completed ? G : '#ddd'), background: t.is_completed ? G : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#fff', flexShrink:0 }}>
                          {t.is_completed ? 'v' : ''}
                        </div>
                        <span style={{ fontSize:13, flex:1, color: t.is_completed ? '#bbb' : '#1a1a1a', textDecoration: t.is_completed ? 'line-through' : 'none' }}>{t.description}</span>
                        {t.category && <span style={{ fontSize:13, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.category}</span>}
                        <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#D85A30' }} onClick={() => deleteTask(t.id)}>x</button>
                      </div>
                    ))}
                    {tasks.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:20 }}>Sin tareas asignadas</div>}
                  </div>
                </div>
              )}

              {patientTab === 'tratamientos' && (
                <div>
                  <button style={{ ...s.btnPrimary, marginBottom:12 }} onClick={() => setModal('new-treatment')}>+ Registrar tratamiento</button>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    {treatments.map(t => (
                      <div key={t.id} style={{ padding:'10px 0', borderBottom:'1px solid #ebebeb' }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:4 }}>{t.product_name}</div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:4 }}>
                          {t.appointment_date && <span style={{ fontSize:13, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.appointment_date}</span>}
                          {t.dose && <span style={{ fontSize:13, padding:'1px 7px', borderRadius:20, background:'#E6F1FB', color:'#185FA5' }}>{t.dose}</span>}
                          {t.zone && <span style={{ fontSize:13, padding:'1px 7px', borderRadius:20, background:'#FAEEDA', color:'#854F0B' }}>{t.zone}</span>}
                          {t.session_label && <span style={{ fontSize:13, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{t.session_label}</span>}
                        </div>
                        {t.notes && <div style={{ fontSize:13, color:'#888', fontStyle:'italic' }}>{t.notes}</div>}
                      </div>
                    ))}
                    {treatments.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:20 }}>Sin tratamientos registrados</div>}
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
                      const [expanded, setExpanded] = React.useState(false)
                      const hasAlerts = n.pas || n.spo2 || n.glucose || n.heart_rate
                      const createdAt = n.created_at ? new Date(n.created_at) : new Date(n.note_date)
                      const canEditNote = (Date.now() - createdAt.getTime()) < 24 * 60 * 60 * 1000
                      return (
                        <div key={n.id} style={{ borderBottom:'1px solid #ebebeb' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', cursor:'pointer' }} onClick={() => setExpanded(x => !x)}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <span style={{ fontSize:13, color:'#999' }}>{n.note_date}</span>
                              {n.visit_type && <span style={{ fontSize:12, padding:'1px 8px', borderRadius:20, background:'#f0f0f0', color:'#666' }}>{n.visit_type}</span>}
                              {hasAlerts && <span style={{ fontSize:12 }}>{noteAlert('pas',n.pas) || noteAlert('pad',n.pad) || noteAlert('spo2',n.spo2) || noteAlert('glucose',n.glucose) || noteAlert('hr',n.heart_rate) || ''}</span>}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              {canEditNote && <button style={{ fontSize:13, padding:'2px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'#E6F1FB', color:'#185FA5' }}
                                onClick={e => { e.stopPropagation(); setModal('edit-note'); setModalData({ note:n }) }}>Editar</button>}
                              {canEditNote && <button style={{ fontSize:13, padding:'2px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'#FAECE7', color:'#D85A30' }}
                                onClick={e => { e.stopPropagation(); if (window.confirm('Eliminar esta nota clinica?')) deleteNote(n.id) }}>Eliminar</button>}
                              {!canEditNote && <span style={{ fontSize:11, color:'#bbb', fontStyle:'italic' }}>Bloqueada</span>}
                              <span style={{ fontSize:12, color:'#bbb', marginLeft:4 }}>{expanded ? '▲' : '▼'}</span>
                            </div>
                          </div>
                          {expanded && (
                            <div style={{ paddingBottom:12 }}>
                              {hasAlerts && (
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                                  {n.pas && n.pad && <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#444' }}>TA: {n.pas}/{n.pad} mmHg{n.pam ? ' · PAM: ' + n.pam : ''} {noteAlert('pas',n.pas) || noteAlert('pad',n.pad) || ''}</span>}
                                  {n.spo2 && <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#444' }}>SpO2: {n.spo2}% {n.o2_device && n.o2_device !== 'aa' ? '(' + n.o2_device + (n.o2_flow ? ' ' + n.o2_flow + ' L/min' : '') + ')' : '(aa)'} {noteAlert('spo2',n.spo2) || ''}</span>}
                                  {n.glucose && <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#444' }}>Glicemia: {n.glucose} mg/dL {noteAlert('glucose',n.glucose) || ''}</span>}
                                  {n.heart_rate && <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#444' }}>FC: {n.heart_rate} lpm {noteAlert('hr',n.heart_rate) || ''}</span>}
                                </div>
                              )}
                              {n.content && <div style={{ fontSize:13, color:'#444', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{n.content}</div>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {notes.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:20 }}>Sin notas clinicas</div>}
                  </div>
                </div>
              )}

              {patientTab === 'diagnosticos' && (
                <div>
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Buscar diagnostico CIE-10</div>
                    <div style={{ position:'relative' }}>
                      <input
                        value={cie10Search}
                        onChange={e => { setCie10Search(e.target.value); searchCie10(e.target.value) }}
                        placeholder="Escribe codigo o nombre del diagnostico..."
                        style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                      />
                      {cie10Results.length > 0 && (
                        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:10, maxHeight:240, overflowY:'auto' }}>
                          {cie10Results.map(r => (
                            <div key={r.code} onClick={() => addDiagnosis(r.code, r.description)}
                              style={{ padding:'9px 12px', cursor:'pointer', borderBottom:'1px solid #ebebeb', fontSize:13 }}
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
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Diagnosticos activos ({diagnoses.length})</div>
                    {diagnoses.map(d => (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #ebebeb' }}>
                        <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#E6F1FB', color:'#185FA5', fontWeight:500, whiteSpace:'nowrap' }}>{d.cie10_code}</span>
                        <span style={{ fontSize:13, flex:1, color:'#1a1a1a' }}>{d.cie10_description}</span>
                        <span style={{ fontSize:13, color:'#bbb', whiteSpace:'nowrap' }}>{d.diagnosis_date}</span>
                        <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#D85A30', flexShrink:0 }} onClick={() => deleteDiagnosis(d.id)}>x</button>
                      </div>
                    ))}
                    {diagnoses.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:20 }}>Sin diagnosticos registrados</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'calendario' && (
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              {/* Mini calendario lateral */}
              {!isMobile && (
                <div style={{ width:220, flexShrink:0, background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#888', padding:'2px 6px' }}>{'<'}</button>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1a3a5c' }}>{MONTHS[calMonth]} {calYear}</div>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#888', padding:'2px 6px' }}>{'>'}</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
                    {['L','M','M','J','V','S','D'].map((d,i) => (
                      <div key={i} style={{ textAlign:'center', fontSize:10, color:'#bbb', fontWeight:500, padding:'2px 0' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
                    {renderCalendar().map((cell, i) => {
                      const hasAppts = cell.dateStr ? apptsByDate(cell.dateStr).length > 0 : false
                      return (
                        <div key={i} onClick={() => { if(cell.dateStr) {
                          const d = new Date(cell.dateStr + 'T12:00:00')
                          const day = d.getDay()
                          const diff = day === 0 ? -6 : 1 - day
                          const monday = new Date(d)
                          monday.setDate(d.getDate() + diff)
                          setWeekStart(new Date(monday))
                          setSelDate(cell.dateStr)
                          setCalView('semana')
                        } }}
                          style={{ textAlign:'center', fontSize:11, padding:'3px 2px', borderRadius:4, cursor: cell.dateStr ? 'pointer' : 'default', opacity: cell.current ? 1 : 0.3, background: cell.isToday ? G : selDate === cell.dateStr ? '#1a3a5c' : 'transparent', color: cell.isToday || selDate === cell.dateStr ? '#fff' : '#444', fontWeight: cell.isToday ? 700 : 400, position:'relative' }}>
                          {cell.day}
                          {hasAppts && !cell.isToday && <div style={{ position:'absolute', bottom:1, left:'50%', transform:'translateX(-50%)', width:3, height:3, borderRadius:'50%', background: G }} />}
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={() => {
                    const today = new Date()
                    const d = new Date(today)
                    d.setDate(d.getDate() - d.getDay())
                    setWeekStart(new Date(d))
                    setCalMonth(today.getMonth())
                    setCalYear(today.getFullYear())
                    setSelDate(today.toISOString().split('T')[0])
                    setCalView('semana')
                  }} style={{ width:'100%', marginTop:12, padding:'6px', background:'#f0f4f8', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', fontWeight:500 }}>
                    Hoy
                  </button>
                </div>
              )}
              {/* Columna principal */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
              {/* Controles de vista */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                <div style={{ display:'flex', gap:6 }}>
                  {/* Navegación */}
                  {calView === 'mes' && <>
                    <button style={s.calNavBtn} onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}>{'<'}</button>
                    <div style={{ fontSize:13, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>{MONTHS[calMonth]} {calYear}</div>
                    <button style={s.calNavBtn} onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}>{'>'}</button>
                  </>}
                  {calView === 'semana' && <>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(new Date(d)) }}>{'<'}</button>
                    <div style={{ fontSize:13, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>
                      {weekStart.toLocaleDateString('es-CR',{day:'numeric',month:'short'})} — {new Date(weekStart.getTime()+6*86400000).toLocaleDateString('es-CR',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(new Date(d)) }}>{'>'}</button>
                  </>}
                  {calView === 'dia' && <>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(selDate||new Date()); d.setDate(d.getDate()-1); setSelDate(d.toISOString().split('T')[0]) }}>{'<'}</button>
                    <div style={{ fontSize:13, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>
                      {selDate ? new Date(selDate+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'}) : 'Hoy'}
                    </div>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(selDate||new Date()); d.setDate(d.getDate()+1); setSelDate(d.toISOString().split('T')[0]) }}>{'>'}</button>
                  </>}
                </div>
                <div style={{ display:'flex', background:'#f5f5f5', borderRadius:8, padding:3, gap:2 }}>
                  {[['mes','Mes'],['semana','Semana'],['dia','Día']].map(([key,label]) => (
                    <button key={key} onClick={() => setCalView(key)}
                      style={{ padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight: calView===key ? 600 : 400, background: calView===key ? '#fff' : 'transparent', color: calView===key ? G : '#888', boxShadow: calView===key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista MES */}
              {calView === 'mes' && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'8px 10px 4px' }}>
                    {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:500, color:'#999', textTransform:'uppercase' }}>{d}</div>)}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 10px 10px', gap:2, flex:1 }}>
                    {renderCalendar().map((cell, i) => {
                      const dayAppts = cell.dateStr ? apptsByDate(cell.dateStr) : []
                      return (
                        <div key={i} onClick={() => { if(cell.dateStr) {
                          const d = new Date(cell.dateStr + 'T12:00:00')
                          const day = d.getDay()
                          const diff = day === 0 ? -6 : 1 - day
                          const monday = new Date(d)
                          monday.setDate(d.getDate() + diff)
                          setWeekStart(new Date(monday))
                          setSelDate(cell.dateStr)
                          setCalView('semana')
                        } }}
                          style={{ minHeight:70, padding:5, borderRadius:6, cursor: cell.dateStr ? 'pointer' : 'default', opacity: cell.current ? 1 : 0.3, background: cell.isToday ? '#f0fdf9' : 'transparent', border: cell.isToday ? ('1px solid '+G) : '1px solid transparent' }}>
                          <div style={{ fontSize:13, color: cell.isToday ? G : '#666', fontWeight: cell.isToday ? 600 : 400, marginBottom:2 }}>{cell.day}</div>
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
              )}

              {/* Vista SEMANA */}
              {calView === 'semana' && (() => {
                const HORA_INI = 0
                const HORA_FIN = 24
                const SLOT_H = 80 // px por hora
                const totalH = (HORA_FIN - HORA_INI) * SLOT_H
                const now = new Date()
                const todayStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')
                const nowMinutes = now.getHours() * 60 + now.getMinutes()
                const nowOffsetPx = HORA_INI <= now.getHours() && now.getHours() < HORA_FIN
                  ? ((now.getHours() - HORA_INI) * 60 + now.getMinutes()) / 60 * SLOT_H : -1

                const weekDays = Array.from({length:7}, (_,i) => {
                  const d = new Date(weekStart)
                  d.setDate(weekStart.getDate() + i)
                  const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
                  return { date: d, dateStr: ds, isToday: ds === todayStr }
                })
                const hours = Array.from({length: HORA_FIN - HORA_INI}, (_,i) => HORA_INI + i)

                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
                    {/* Header días */}
                    <div style={{ display:'grid', gridTemplateColumns:`48px repeat(7,1fr)`, borderBottom:'0.5px solid #eee' }}>
                      <div />
                      {weekDays.map(({date, isToday}) => (
                        <div key={date.toISOString()} style={{ textAlign:'center', padding:'8px 4px', borderLeft:'1px solid #ebebeb', background: isToday ? '#f0fdf9' : '#fff' }}>
                          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase' }}>
                            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][date.getDay()===0?6:date.getDay()-1]}
                          </div>
                          <div style={{ fontSize:16, fontWeight: isToday ? 700 : 400, color: isToday ? G : '#1a1a1a',
                            background: isToday ? G : 'transparent', color: isToday ? '#fff' : '#1a1a1a',
                            borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0' }}>
                            {date.getDate()}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Grid horario */}
                    <div id="cal-semana-scroll" style={{ overflowY:'auto', maxHeight: isMobile ? '60vh' : 'calc(100vh - 260px)', position:'relative' }}>
                      <div style={{ display:'grid', gridTemplateColumns:`48px repeat(7,1fr)`, position:'relative' }}>
                        {/* Columna horas */}
                        <div>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, position:'relative' }}>
                              <span style={{ position:'absolute', top:-6, right:6, fontSize:10, color:'#bbb', lineHeight:1, whiteSpace:'nowrap' }}>{h === 0 ? '12 AM' : h < 12 ? h+' AM' : h === 12 ? '12 PM' : (h-12)+' PM'}</span>
                              <span style={{ position:'absolute', top:'50%', right:6, fontSize:9, color:'#ccc', lineHeight:1, whiteSpace:'nowrap', transform:'translateY(-50%)' }}>{h === 0 ? '12:30' : h < 12 ? h+':30' : h === 12 ? '12:30' : (h-12)+':30'}</span>
                            </div>
                          ))}
                        </div>
                        {/* Columnas días */}
                        {weekDays.map(({dateStr, isToday}) => {
                          const dayAppts = apptsByDate(dateStr)
                          return (
                            <div key={dateStr} style={{ borderLeft:'1px solid #ebebeb', position:'relative', background: isToday ? '#fafffe' : '#fff' }}>
                              {hours.map(h => (
                                <div key={h} style={{ height:SLOT_H, cursor:'pointer', position:'relative' }}
                                  onClick={() => { setSelDate(dateStr); setModal('new-appt'); setModalData({ defaultTime: String(h).padStart(2,'0')+':00' }) }}>
                                  <div style={{ position:'absolute', top:0, left:0, right:0, borderTop:'1px solid #ebebeb', pointerEvents:'none' }} />
                                  <div style={{ position:'absolute', top:'50%', left:0, right:0, borderTop:'1px dashed #e8e8e8', pointerEvents:'none' }} />
                                </div>
                              ))}
                              {/* Indicador hora actual */}
                              {isToday && nowOffsetPx >= 0 && (
                                <div style={{ position:'absolute', left:0, right:0, top:nowOffsetPx, zIndex:10, display:'flex', alignItems:'center' }}>
                                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', flexShrink:0 }} />
                                  <div style={{ flex:1, height:1.5, background:'#D85A30' }} />
                                </div>
                              )}
                              {/* Citas */}
                              {dayAppts.map(a => {
                                const [ah, am] = (a.appointment_time||'00:00').split(':').map(Number)
                                if (ah < HORA_INI || ah >= HORA_FIN) return null
                                const top = ((ah - HORA_INI) * 60 + am) / 60 * SLOT_H
                                const height = Math.max((a.duration_min||30) / 60 * SLOT_H - 4, 18)
                                return (
                                  <>{(() => {
                                    const ML = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }
                                    const [ah2, am2] = (a.appointment_time||'00:00').split(':').map(Number)
                                    const endMin = ah2*60 + am2 + (a.duration_min||30)
                                    const fmt = (h,m) => { const p=h>=12?'pm':'am'; const h12=h%12||12; return h12+':'+(m<10?'0':'')+m+p }
                                    const timeStr = fmt(ah2,am2)+' - '+fmt(Math.floor(endMin/60)%24,endMin%60)
                                    return (
                                      <div key={a.id} style={{ position:'absolute', left:2, right:2, top, height, background:G+'22', borderLeft:'3px solid '+G, borderRadius:4, padding:'3px 5px', overflow:'hidden', cursor:'pointer', zIndex:5 }}
                                        onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setPopupAppt(a); setPopupPos({ x: Math.min(r.right+8, window.innerWidth-320), y: Math.min(r.top, window.innerHeight-400) }) }}>
                                        <div style={{ fontSize:10, fontWeight:600, color:G, lineHeight:1.3, display:'flex', justifyContent:'space-between' }}>
                                          <span>{timeStr}</span>
                                          {a.status === 'confirmed_patient' && <span>✅</span>}
                                          {a.status === 'confirmed_doctor' && <span style={{ color:'#7EC8E3' }}>✅</span>}
                                          {a.status === 'no_show' && <span style={{ background:'#F59E0B', borderRadius:'50%', width:10, height:10, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#fff' }}>-</span>}
                                        </div>
                                        <div style={{ fontSize:10, fontWeight:500, color:'#1a1a1a', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.patient?.profile?.last_name} {a.patient?.profile?.first_name}</div>
                                        {a.module_type && <div style={{ fontSize:9, color:'#555', lineHeight:1.3 }}>{ML[a.module_type]}</div>}
                                        {a.visit_type && <div style={{ fontSize:9, color:'#777', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.visit_type}</div>}
                                      </div>
                                    )
                                  })()}</>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Vista DÍA */}
              {calView === 'dia' && (() => {
                const HORA_INI = 0
                const HORA_FIN = 24
                const SLOT_H = 88
                const now = new Date()
                const todayStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')
                const currentDate = selDate || todayStr
                const dayAppts = apptsByDate(currentDate)
                const isToday = currentDate === todayStr
                const nowOffsetPx = isToday && HORA_INI <= now.getHours() && now.getHours() < HORA_FIN
                  ? ((now.getHours() - HORA_INI) * 60 + now.getMinutes()) / 60 * SLOT_H : -1
                const hours = Array.from({length: HORA_FIN - HORA_INI}, (_,i) => HORA_INI + i)

                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>
                        {new Date(currentDate+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                      </div>
                      <span style={{ fontSize:12, color:'#888' }}>{dayAppts.length} citas</span>
                    </div>
                    <div id="cal-dia-scroll" style={{ overflowY:'auto', maxHeight: isMobile ? '65vh' : 'calc(100vh - 240px)', position:'relative' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'48px 1fr', position:'relative' }}>
                        <div>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, position:'relative' }}>
                              <span style={{ position:'absolute', top:-6, right:6, fontSize:10, color:'#bbb', lineHeight:1, whiteSpace:'nowrap' }}>{h === 0 ? '12 AM' : h < 12 ? h+' AM' : h === 12 ? '12 PM' : (h-12)+' PM'}</span>
                              <span style={{ position:'absolute', top:'50%', right:6, fontSize:9, color:'#ccc', lineHeight:1, whiteSpace:'nowrap', transform:'translateY(-50%)' }}>{h === 0 ? '12:30' : h < 12 ? h+':30' : h === 12 ? '12:30' : (h-12)+':30'}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ position:'relative', background: isToday ? '#fafffe' : '#fff' }}>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, borderLeft:'1px solid #ebebeb', cursor:'pointer', position:'relative', backgroundImage: 'linear-gradient(to bottom, #ebebeb 0px, transparent 1px, transparent 50%, #e0e0e0 50%, transparent calc(50% + 1px), transparent 100%)', backgroundSize: `100% ${SLOT_H}px` }}
                              onClick={() => { setSelDate(currentDate); setModal('new-appt'); setModalData({ defaultTime: String(h).padStart(2,'0')+':00' }) }}>
                              <div style={{ position:'absolute', top:SLOT_H/2, left:0, right:0, borderBottom:'1px dashed #e0e0e0', pointerEvents:'none' }} />
                            </div>
                          ))}
                          {isToday && nowOffsetPx >= 0 && (
                            <div style={{ position:'absolute', left:0, right:0, top:nowOffsetPx, zIndex:10, display:'flex', alignItems:'center' }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', flexShrink:0 }} />
                              <div style={{ flex:1, height:1.5, background:'#D85A30' }} />
                            </div>
                          )}
                          {dayAppts.map(a => {
                            const [ah, am] = (a.appointment_time||'00:00').split(':').map(Number)
                            if (ah < HORA_INI || ah >= HORA_FIN) return null
                            const top = ((ah - HORA_INI) * 60 + am) / 60 * SLOT_H
                            const height = Math.max((a.duration_min||30) / 60 * SLOT_H - 2, 28)
                            {(() => {
                                const ML = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }
                                const [ah2, am2] = (a.appointment_time||'00:00').split(':').map(Number)
                                const endMin = ah2*60 + am2 + (a.duration_min||30)
                                const fmt = (h,m) => { const p=h>=12?'pm':'am'; const h12=h%12||12; return h12+':'+(m<10?'0':'')+m+p }
                                const timeStr = fmt(ah2,am2)+' - '+fmt(Math.floor(endMin/60)%24,endMin%60)
                                return (
                                  <div key={a.id} style={{ position:'absolute', left:4, right:4, top, height, background:G+'22', borderLeft:'3px solid '+G, borderRadius:6, padding:'5px 8px', overflow:'hidden', cursor:'pointer', zIndex:5 }}
                                    onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setPopupAppt(a); setPopupPos({ x: Math.min(r.right+8, window.innerWidth-320), y: Math.min(r.top, window.innerHeight-400) }) }}>
                                    <div style={{ fontSize:11, fontWeight:700, color:G, marginBottom:2, display:'flex', justifyContent:'space-between' }}>
                                      <span>{timeStr}</span>
                                      {a.status === 'confirmed_patient' && <span>✅</span>}
                                      {a.status === 'confirmed_doctor' && <span style={{ color:'#7EC8E3' }}>✅</span>}
                                      {a.status === 'no_show' && <span style={{ background:'#F59E0B', borderRadius:'50%', width:10, height:10, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#fff' }}>-</span>}
                                    </div>
                                    <div style={{ fontSize:11, fontWeight:600, color:'#1a1a1a', marginBottom:1 }}>{a.patient?.profile?.last_name} {a.patient?.profile?.first_name}</div>
                                    {a.module_type && <div style={{ fontSize:10, color:'#555', marginBottom:1 }}>{ML[a.module_type]}</div>}
                                    {a.visit_type && <div style={{ fontSize:10, color:'#777', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.visit_type}</div>}
                                  </div>
                                )
                              })()}
                          })}
                          {dayAppts.length === 0 && (
                            <div style={{ position:'absolute', top:'40%', left:0, right:0, textAlign:'center', fontSize:13, color:'#bbb' }}>Sin citas para este día</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* POPUP DE CITA */}
              {popupAppt && (
                <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={() => setPopupAppt(null)}>
                  <div style={{ position:'fixed', left: popupPos.x, top: popupPos.y, width:300, background:'#fff', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', border:'0.5px solid #eee', zIndex:201, overflow:'hidden' }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ background: G+'15', borderBottom:'0.5px solid #eee', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>
                          {popupAppt.doctor ? `${popupAppt.doctor.first_name} ${popupAppt.doctor.last_name}` : 'Sin médico asignado'}
                        </div>
                        <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>
                          {new Date(popupAppt.appointment_date+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'})}
                        </div>
                        <div style={{ fontSize:12, color:'#555' }}>
                          {(() => {
                            const [h,m] = (popupAppt.appointment_time||'00:00').split(':').map(Number)
                            const end = h*60+m+(popupAppt.duration_min||30)
                            const fmt = (hh,mm) => { const p=hh>=12?'pm':'am'; return (hh%12||12)+':'+(mm<10?'0':'')+mm+p }
                            return fmt(h,m)+' — '+fmt(Math.floor(end/60)%24,end%60)+` (${popupAppt.duration_min||30} min)`
                          })()}
                        </div>
                      </div>
                      <button onClick={() => setPopupAppt(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#999', padding:0 }}>✕</button>
                    </div>
                    <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee' }}>
                      <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>Estado</div>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {[
                          { key:'pending_confirmation', label:'Sin confirmar' },
                          { key:'confirmed_patient', label:'Confirmado paciente ✅' },
                          { key:'confirmed_doctor', label:'Confirmado médico ✅' },
                          { key:'no_show', label:'No asistió ❌' },
                        ].map(st => (
                          <button key={st.key} onClick={() => { updateApptStatus(popupAppt.id, st.key); setPopupAppt(p => ({...p, status: st.key})) }}
                            style={{ padding:'3px 8px', borderRadius:20, border:'1px solid #bfdbfe', background: popupAppt.status === st.key ? '#1a3a5c' : '#eff6ff', color: popupAppt.status === st.key ? '#fff' : '#555', fontSize:10, cursor:'pointer', fontWeight: popupAppt.status === st.key ? 600 : 400 }}>
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', marginBottom:4 }}>
                        {popupAppt.patient?.profile?.last_name} {popupAppt.patient?.profile?.first_name}
                      </div>
                      {popupAppt.patient?.phone && <div style={{ fontSize:11, color:'#666' }}>📞 {popupAppt.patient.phone}</div>}
                      {popupAppt.patient?.profile?.email && <div style={{ fontSize:11, color:'#666' }}>✉️ {popupAppt.patient.profile.email}</div>}
                      {popupAppt.visit_type && <div style={{ fontSize:11, color:'#888', marginTop:4 }}>{popupAppt.visit_type}</div>}
                      {popupAppt.notes && <div style={{ fontSize:11, color:'#888', marginTop:2, fontStyle:'italic' }}>{popupAppt.notes}</div>}
                    </div>
                    <div style={{ padding:'10px 14px', display:'flex', gap:6 }}>
                      <button onClick={() => { const p = patients.find(x => x.id === popupAppt.patient_id); if(p) { setPopupAppt(null); openPatient(p) } }}
                        style={{ flex:1, padding:'6px', background:'#1a3a5c', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:500 }}>
                        Ver expediente
                      </button>
                      <button onClick={() => { setPopupAppt(null); setModal('edit-appt'); setModalData({appt:popupAppt}) }}
                        style={{ padding:'6px 10px', background:'#fff', color:'#555', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:11 }}>
                        Editar
                      </button>
                      <button onClick={() => { if(window.confirm('¿Cancelar esta cita?')) { cancelAppt(popupAppt.id); setPopupAppt(null) } }}
                        style={{ padding:'6px 10px', background:'#fff', color:'#D85A30', border:'1px solid #D85A30', borderRadius:8, cursor:'pointer', fontSize:11 }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>{/* fin columna principal */}
            </div>
          )}

          {view === 'chat' && (
            <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', height:'calc(100vh - 130px)', background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
              <div style={{ borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column' }}>
                <div style={{ padding:'11px 12px', borderBottom:'0.5px solid #eee', fontSize:13, fontWeight:500, color:'#1a1a1a' }}>
                  Conversaciones
                  {pendingCount > 0 && <span style={{ marginLeft:8, background:'#D85A30', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:13, fontWeight:500 }}>{pendingCount}</span>}
                </div>
                <div style={{ flex:1, overflowY:'auto' }}>
                  {pendingChats().map(c => {
                    const last = c.msgs[0]
                    const unread = c.msgs.filter(m => !m.is_read && m.sender_role === 'patient').length
                    return (
                      <div key={c.patientId} onClick={() => openChat(c)}
                        style={{ padding:'10px 12px', borderBottom:'1px solid #ebebeb', cursor:'pointer', background: activeChat?.patientId === c.patientId ? '#E1F5EE' : 'transparent' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{c.name || 'Paciente'}</div>
                          {unread > 0 && <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', marginTop:4 }} />}
                        </div>
                        <div style={{ fontSize:13, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last?.content}</div>
                      </div>
                    )
                  })}
                  {pendingChats().length === 0 && <div style={{ padding:20, textAlign:'center', fontSize:13, color:'#999' }}>Sin conversaciones</div>}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {!activeChat && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#999' }}>Selecciona una conversacion</div>}
                {activeChat && (
                  <>
                    <div style={{ padding:'11px 14px', borderBottom:'0.5px solid #eee', fontSize:13, fontWeight:500 }}>{activeChat.name}</div>
                    <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
                      {[...activeChat.msgs].reverse().map(m => (
                        <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: m.sender_role === 'doctor' ? 'flex-end' : 'flex-start' }}>
                          {m.sender_role === 'doctor' && <div style={{ fontSize:11, color:'#888', marginBottom:2, textAlign:'right' }}>{m.sender?.first_name ? `Dr. ${m.sender.first_name} ${m.sender.last_name}` : 'Doctor adicional'}</div>}
                          <div style={{ maxWidth:'78%', padding:'8px 11px', borderRadius:12, fontSize:13, lineHeight:1.5, background: m.sender_role === 'doctor' ? G : '#f0f0f0', color: m.sender_role === 'doctor' ? '#fff' : '#1a1a1a' }}>
                            {m.content}
                          </div>
                          <div style={{ fontSize:13, color:'#999', marginTop:2 }}>{new Date(m.created_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:'10px 12px', borderTop:'0.5px solid #eee', display:'flex', gap:8 }}>
                      <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                        placeholder="Escribe tu respuesta..."
                        style={{ flex:1, padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                      <button onClick={sendMessage} style={{ width:32, height:32, borderRadius:'50%', background:G, border:'none', cursor:'pointer', color:'#fff', fontSize:13 }}>{'>'}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      <ChatBubble profile={profile} />
      <SpotifyBar returnTo='/doctor' />
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
            <div style={{ fontSize:13, fontWeight:500, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 0 4px' }}>{cat}</div>
            {library.filter(l => l.category === cat).map(item => (
              <div key={item.id} onClick={() => toggle(item.name)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border: '0.5px solid ' + (selected.has(item.name) ? G : '#eee'), background: selected.has(item.name) ? '#E1F5EE' : '#fff', marginBottom:4, cursor:'pointer' }}>
                <span style={{ fontSize:13, flex:1, color: selected.has(item.name) ? '#0F6E56' : '#444' }}>{item.name}</span>
                {selected.has(item.name) && <span style={{ color:G, fontSize:13 }}>v</span>}
              </div>
            ))}
          </div>
        ))}
        {library.filter(l => !l.category).map(item => (
          <div key={item.id} onClick={() => toggle(item.name)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border: '0.5px solid ' + (selected.has(item.name) ? G : '#eee'), background: selected.has(item.name) ? '#E1F5EE' : '#fff', marginBottom:4, cursor:'pointer' }}>
            <span style={{ fontSize:13, flex:1, color: selected.has(item.name) ? '#0F6E56' : '#444' }}>{item.name}</span>
            {selected.has(item.name) && <span style={{ color:G }}>v</span>}
          </div>
        ))}
      </div>
      <div style={{ borderTop:'0.5px dashed #eee', paddingTop:10, marginBottom:12 }}>
        <div style={{ fontSize:13, color:'#999', marginBottom:6 }}>Agregar tarea personalizada:</div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Descripcion de la tarea..."
            style={{ flex:1, padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
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
    return <span style={{ fontSize:13, padding:'2px 7px', borderRadius:20, background:bg, color:fg, marginLeft:6, fontWeight:500 }}>{st.icon} {st.msg}</span>
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' }

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
        <div style={{ fontSize:13, fontWeight:500, color:'#666', marginBottom:10 }}>Signos vitales</div>
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

const MODULE_LABELS = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }

function ApptForm({ appt, patients, saving, defaultDate, defaultTime, doctorId, onSave, onClose, onGoToExpediente, onCancelAppt }) {
  const [form, setForm] = useState({ id:appt?.id||null, patientId:appt?.patient_id||'', date:appt?.appointment_date||defaultDate||'', time:appt?.appointment_time?.substring(0,5)||defaultTime||'09:00', visitType:appt?.visit_type||'Consulta de seguimiento', duration:appt?.duration_min||30, notes:appt?.notes||'', moduleType:appt?.module_type||'', status:appt?.status||'pending_confirmation' })
  const [patientModules, setPatientModules] = useState([])
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  const pn = p => ((p.profile?.first_name || '') + ' ' + (p.profile?.last_name || '')).trim()

  useEffect(() => {
    if (form.patientId && doctorId) loadPatientModules(form.patientId)
  }, [form.patientId, doctorId])

  async function loadPatientModules(patientId) {
    const { data } = await supabase.from('patient_care_modules')
      .select('module_type')
      .eq('patient_id', patientId)
      .eq('assigned_professional_id', doctorId)
      .eq('is_active', true)
    const mods = data || []
    setPatientModules(mods)
    if (mods.length === 1) setForm(p => ({ ...p, moduleType: mods[0].module_type }))
    else setForm(p => ({ ...p, moduleType: '' }))
  }

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
        <div style={{ fontSize:16, fontWeight:600, color:'#1a1a1a' }}>{appt ? 'Editar cita' : 'Nueva cita'}</div>
        {appt && (appt.status === 'confirmed_patient' || appt.status === 'confirmed_doctor') && onGoToExpediente && (
          <button onClick={() => onGoToExpediente(appt)} style={{ background:'#0F6E56', color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:500, cursor:'pointer' }}>
            📋 Ir al expediente
          </button>
        )}
        {appt && appt.status !== 'confirmed_patient' && appt.status !== 'confirmed_doctor' && (
          <div style={{ position:'relative', display:'inline-block' }} className="tooltip-wrap">
            <button disabled style={{ background:'#f0f0f0', color:'#bbb', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:500, cursor:'not-allowed' }}>
              📋 Ir al expediente
            </button>
            <div style={{ position:'absolute', right:0, top:'110%', background:'#1a1a1a', color:'#fff', fontSize:11, padding:'6px 10px', borderRadius:7, width:220, lineHeight:1.5, zIndex:999, pointerEvents:'none', display:'none' }} className="tooltip-box">
              Confirmá la asistencia del paciente en el campo de estado para habilitar el acceso al expediente.
            </div>
            <style>{`.tooltip-wrap:hover .tooltip-box { display: block !important; }`}</style>
          </div>
        )}
      </div>
      <div style={{ fontSize:13, color:'#999', marginBottom:18 }}>{appt ? 'Modificá los datos de la cita' : 'Completá los datos para agendar'}</div>

      <div style={{ marginBottom:12 }}>
        <label style={s.fieldLabel}>Paciente</label>
        <select value={form.patientId} onChange={f('patientId')} style={s.fieldInput}>
          <option value="">Selecciona...</option>
          {patients.map(p => <option key={p.id} value={p.id}>{pn(p)}</option>)}
        </select>
      </div>

      {patientModules.length > 1 && (
        <div style={{ marginBottom:12, background:'#FFF8E1', border:'1px solid #F59E0B', borderRadius:8, padding:'10px 12px' }}>
          <label style={{ ...s.fieldLabel, color:'#854F0B' }}>⚠️ ¿A qué módulo pertenece esta cita?</label>
          <select value={form.moduleType} onChange={f('moduleType')} style={s.fieldInput}>
            <option value="">Selecciona un módulo...</option>
            {patientModules.map(m => <option key={m.module_type} value={m.module_type}>{MODULE_LABELS[m.module_type]}</option>)}
          </select>
        </div>
      )}

      {patientModules.length === 1 && (
        <div style={{ marginBottom:12, background:'#E1F5EE', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#0F6E56' }}>
          📋 Módulo: <strong>{MODULE_LABELS[patientModules[0].module_type]}</strong>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <Field label="Fecha" value={form.date} onChange={f('date')} type="date" />
        <Field label="Hora" value={form.time} onChange={f('time')} type="time" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <div>
          <label style={s.fieldLabel}>Tipo de consulta</label>
          <select value={form.visitType} onChange={f('visitType')} style={s.fieldInput}>
            {['Consulta de seguimiento','Primera consulta','Procedimiento estético','Control de composición corporal','Aplicación de tratamiento','Control GLP-1'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={s.fieldLabel}>Duración</label>
          <select value={form.duration} onChange={f('duration')} style={s.fieldInput}>
            {[15,30,45,60,75,90,105,120].map(v => <option key={v} value={v}>{v} min</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={s.fieldLabel}>Estado de la cita</label>
        <select value={form.status} onChange={f('status')} style={s.fieldInput}>
          <option value="pending_confirmation">⏳ Pendiente confirmación</option>
          <option value="confirmed_patient">✅ Confirmada por paciente</option>
          <option value="confirmed_doctor">✅ Confirmada por médico</option>
          <option value="no_show">🟡 No asistió</option>
        </select>
      </div>

      <div style={{ marginBottom:18 }}>
        <label style={s.fieldLabel}>Notas</label>
        <textarea value={form.notes} onChange={f('notes')} rows={2} style={{ ...s.fieldInput, resize:'vertical' }} placeholder="Indicaciones u observaciones..." />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        {appt && onCancelAppt && (
          <button style={{ background:'#fff', border:'1px solid #D85A30', color:'#D85A30', fontSize:13, padding:'7px 12px', borderRadius:8, cursor:'pointer' }}
            onClick={() => onCancelAppt(appt.id)}>🗑 Cancelar cita</button>
        )}
        <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : appt ? 'Guardar cambios' : 'Agendar cita'}</button>
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
  btnPrimary: { background:'#1D9E75', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' },
  btnCancel:  { background:'none', border:'1px solid #e0e0e0', fontSize:13, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  calNavBtn:  { background:'none', border:'1px solid #eee', borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#666' },
  fieldLabel: { display:'block', fontSize:13, color:'#666', marginBottom:4, fontWeight:500 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' },
}
