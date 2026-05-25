import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import IntegralModule from './IntegralModule'
import ModuleChat from '../components/ModuleChat'
import MetabolicModule from './MetabolicModule'
import AestheticModule from './AestheticModule'
import FisioterapiaModule from './FisioterapiaModule'
import EnfermeriaModule from './EnfermeriaModule'
import UserMenu from '../components/UserMenu'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Dot, PieChart, Pie, Cell, Legend } from 'recharts'

const G = '#1D9E75'
const SP = ' '

function EditDoctorForm({ doctor, saving, onSave, onClose }) {
  const CANTONES = {
    'San Jose': ['San Jose','Escazu','Desamparados','Puriscal','Tarrazu','Aserri','Mora','Goicoechea','Santa Ana','Alajuelita','Vazquez de Coronado','Acosta','Tibas','Moravia','Montes de Oca','Turrubares','Dota','Curridabat','Perez Zeledon','Leon Cortes'],
    'Alajuela': ['Alajuela','San Ramon','Grecia','San Mateo','Atenas','Naranjo','Palmares','Poas','Orotina','San Carlos','Zarcero','Valverde Vega','Upala','Los Chiles','Guatuso','Rio Cuarto'],
    'Cartago': ['Cartago','Paraiso','La Union','Jimenez','Turrialba','Alvarado','Oreamuno','El Guarco'],
    'Heredia': ['Heredia','Barva','Santo Domingo','Santa Barbara','San Rafael','San Isidro','Belen','Flores','San Pablo','Sarapiqui'],
    'Guanacaste': ['Liberia','Nicoya','Santa Cruz','Bagaces','Carrillo','Canas','Abangares','Tilaran','Nandayure','La Cruz','Hojancha'],
    'Puntarenas': ['Puntarenas','Esparza','Buenos Aires','Montes de Oro','Osa','Quepos','Golfito','Coto Brus','Parrita','Corredores','Garabito','Monteverde'],
    'Limon': ['Limon','Pococi','Siquirres','Talamanca','Matina','Guacimo'],
  }
  const [form, setForm] = useState({
    firstName:   doctor.first_name   || '',
    lastName:    doctor.last_name    || '',
    medicalCode: doctor.medical_code || '',
    specialty:   doctor.specialty    || '',
    sex:         doctor.sex          || '',
    idNumber:    doctor.id_number    || '',
    phone:       doctor.phone        || '',
    province:    doctor.province     || '',
    canton:      doctor.canton       || '',
    newSpecialty: '',
  })
  const [specialties, setSpecialties] = useState([])
  const supabaseLocal = require('../lib/supabase').supabase
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    supabaseLocal.from('specialties').select('name').order('name').then(({ data }) => {
      if (data) setSpecialties(data.map(s => s.name))
    })
  }, [])

  async function addNewSpecialty() {
    if (!form.newSpecialty?.trim()) return
    await supabaseLocal.from('specialties').insert({ name: form.newSpecialty.trim() })
    const { data } = await supabaseLocal.from('specialties').select('name').order('name')
    if (data) setSpecialties(data.map(s => s.name))
    setForm(p => ({ ...p, specialty: form.newSpecialty.trim(), newSpecialty: '' }))
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Editar médico colaborador</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div>
          <label style={lbl}>Nombre</label>
          <input value={form.firstName} onChange={f('firstName')} style={inp} />
        </div>
        <div>
          <label style={lbl}>Apellidos</label>
          <input value={form.lastName} onChange={f('lastName')} style={inp} />
        </div>
        <div>
          <label style={lbl}>Sexo</label>
          <select value={form.sex} onChange={f('sex')} style={inp}>
            <option value="">Seleccionar</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div>
          <label style={lbl}>Cédula / ID</label>
          <input value={form.idNumber} onChange={f('idNumber')} placeholder="1-1234-5678" style={inp} />
        </div>
        <div>
          <label style={lbl}>Teléfono</label>
          <input type="tel" value={form.phone} onChange={f('phone')} placeholder="8888-8888" style={inp} />
        </div>
        <div>
          <label style={lbl}>Código profesional</label>
          <input value={form.medicalCode} onChange={f('medicalCode')} placeholder="MED-12345" style={inp} />
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Especialidad</label>
          <select value={form.specialty} onChange={f('specialty')} style={inp}>
            <option value="">Seleccionar</option>
            {specialties.map(sp => <option key={sp} value={sp}>{sp}</option>)}
            <option value="__nueva__">+ Agregar nueva especialidad...</option>
          </select>
        </div>
        {form.specialty === '__nueva__' && (
          <div style={{ gridColumn:'1/-1', display:'flex', gap:8 }}>
            <input value={form.newSpecialty} onChange={f('newSpecialty')} placeholder="Nombre de la especialidad" style={inp} />
            <button onClick={addNewSpecialty} style={{ background:'#0F6E56', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap' }}>Guardar</button>
          </div>
        )}
        <div>
          <label style={lbl}>Provincia</label>
          <select value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value, canton: '' }))} style={inp}>
            <option value="">Seleccionar</option>
            {Object.keys(CANTONES).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Cantón</label>
          <select value={form.canton} onChange={f('canton')} style={inp} disabled={!form.province}>
            <option value="">Seleccionar</option>
            {form.province && CANTONES[form.province] && CANTONES[form.province].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button onClick={onClose} style={{ background:'none', border:'1px solid #e0e0e0', fontSize:13, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' }}>Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving} style={{ background:'#0F6E56', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </>
  )
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState(() => localStorage.getItem('adminView') || 'calendario')
  function setViewPersist(v) { localStorage.setItem('adminView', v); setView(v) }
  const [searchPac, setSearchPac] = useState('')
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [appts, setAppts] = useState([])
  const [msgs, setMsgs] = useState([])
  const [library, setLibrary] = useState([])
  const [perms, setPerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [activeChat, setActiveChat] = useState(null)
  const [chatMsg, setChatMsg] = useState('')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calView, setCalView] = useState('semana')
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
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [selDate, setSelDate] = useState(null)
  const [selDoctor, setSelDoctor] = useState(null)
  const [selPatient, setSelPatient] = useState(null)
  const [patientTab, setPatientTab] = useState('modulos')
  const [measurements, setMeasurements] = useState([])
  const [goals, setGoals] = useState([])
  const [patientTasks, setPatientTasks] = useState([])
  const [treatments, setTreatments] = useState([])
  const [notes, setNotes] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [cie10Search, setCie10Search] = useState('')
  const [cie10Results, setCie10Results] = useState([])

  useEffect(() => { loadAll() }, [])

  const [allGoals, setAllGoals] = useState([])
  const [allDiagnoses, setAllDiagnoses] = useState([])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadDoctors(), loadPatients(), loadAppts(), loadMsgs(), loadLibrary(), loadPerms(), loadAllGoals(), loadAllDiagnoses()])
    setLoading(false)
  }

  async function loadAllGoals() {
    const { data } = await supabase.from('goals').select('patient_id, is_active, target_value, initial_value')
    setAllGoals(data || [])
  }

  async function loadAllDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses').select('cie10_code, cie10_description, patient_id').eq('is_active', true)
    setAllDiagnoses(data || [])
  }

  async function saveDoctor(form) {
    setSaving(true)
    const d = modalData.doctor
    await supabase.from('profiles').update({
      first_name:   form.firstName   || null,
      last_name:    form.lastName    || null,
      medical_code: form.medicalCode || null,
      specialty:    form.specialty   || null,
      sex:          form.sex         || null,
      id_number:    form.idNumber    || null,
      phone:        form.phone       || null,
      province:     form.province    || null,
      canton:       form.canton      || null,
    }).eq('id', d.id)
    await loadDoctors()
    setModal(null)
    setSaving(false)
  }

  async function loadDoctors() {
    const { data } = await supabase.from('profiles').select('*').in('role', ['admin','doctor']).order('first_name')
    setDoctors(data || [])
  }

  async function loadPatients() {
    const { data } = await supabase.from('patients').select('id, status, specialty_type, birth_date, sex, province, profile:profile_id(id, first_name, last_name, email), doctor:assigned_doctor_id(id, first_name, last_name)').order('created_at', { ascending: false })
    setPatients(data || [])
  }

  async function loadAppts() {
    const { data } = await supabase.from('appointments').select('*, patient:patient_id(id, profile:profile_id(first_name, last_name)), doctor:doctor_id(id, first_name, last_name)').order('appointment_date').order('appointment_time')
    setAppts(data || [])
  }

  async function loadMsgs() {
    const { data } = await supabase.from('messages').select('*, patient:patient_id(id, profile:profile_id(first_name, last_name)), sender:sender_id(first_name, last_name)').order('created_at', { ascending: false })
    setMsgs(data || [])
  }

  async function loadLibrary() {
    const { data } = await supabase.from('library_items').select('*').order('name')
    setLibrary(data || [])
  }

  async function loadPerms() {
    const { data } = await supabase.from('doctor_permissions').select('*, doctor:doctor_id(first_name, last_name)')
    setPerms(data || [])
  }

  function age(dob) {
    if (!dob) return '--'
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25))
  }

  function pName(p) { return ((p.profile?.first_name || '') + SP + (p.profile?.last_name || '')).trim() }
  function dName(d) { return d ? ((d.first_name || '') + SP + (d.last_name || '')).trim() : '--' }
  function initials(name) { return name.split(SP).map(n => n[0] || '').join('').substring(0,2).toUpperCase() }

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DAYS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
  const DAYS_FULL = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado']

  async function handleSignOut() { await signOut(); navigate('/login') }

  async function createUser(form, role) {
    setSaving(true); setFormError('')

    // Guardar sesión actual para restaurarla después
    const { data: { session: currentSession } } = await supabase.auth.getSession()

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: {
        first_name: form.firstName, last_name: form.lastName, role,
        id_number:  form.idNumber  || '',
        phone:      form.phone     || '',
        birth_date: form.birthDate || '',
        sex:        form.sex       || '',
        province:   form.province  || '',
        canton:     form.canton    || '',
        height_cm:  form.height    ? String(form.height) : '',
      }}
    })
    if (error) {
      const msg = error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already exists') || error.message?.toLowerCase().includes('duplicate')
        ? 'Este correo electrónico ya está registrado en el sistema.'
        : error.message
      setFormError(msg); setSaving(false); return
    }
    const userId = signUpData?.user?.id

    // Restaurar sesión del admin
    if (currentSession) {
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      })
    }

    if (role === 'patient' && userId) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500))
        const { data } = await supabase.from('patients').select('id').eq('profile_id', userId).single()
        if (data?.id) break
      }
      await supabase.from('patients').update({
        assigned_doctor_id: form.doctorId || null,
      }).eq('profile_id', userId)
    }
    // Para doctor, guardar campos extra en profiles
    if (role === 'doctor' && userId) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500))
        const { data } = await supabase.from('profiles').select('id').eq('id', userId).single()
        if (data?.id) break
      }
      await supabase.from('profiles').update({
        specialty:    form.specialty    || null,
        medical_code: form.medicalCode  || null,
        sex:          form.sex          || null,
        id_number:    form.idNumber     || null,
        phone:        form.phone        || null,
        province:     form.province     || null,
        canton:       form.canton       || null,
      }).eq('id', userId)
    }

    if (role === 'doctor') await loadDoctors()
    else await loadPatients()
    setModal(null); setSaving(false)
  }

  async function reassignPatient(patientId, doctorId) {
    setSaving(true)
    await supabase.from('patients').update({ assigned_doctor_id: doctorId || null }).eq('id', patientId)
    await loadPatients(); setModal(null); setSaving(false)
  }

  async function deleteRecord(type, id) {
    if (type === 'appointment') { await supabase.from('appointments').delete().eq('id', id); await loadAppts() }
    if (type === 'library') { await supabase.from('library_items').delete().eq('id', id); await loadLibrary() }
    if (type === 'patient') { await supabase.from('profiles').update({ is_active: false }).eq('id', id); await supabase.from('patients').update({ status: 'inactive' }).eq('id', id); await loadPatients() }
    if (type === 'note') { await supabase.from('clinical_notes').delete().eq('id', id); if (selPatient) { const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false }); setNotes(data || []) } }
    if (type === 'doctor') { await supabase.from('profiles').update({ is_active: false }).eq('id', id); await supabase.from('profiles').delete().eq('id', id); await loadDoctors() }
    setModal(null)
  }

  async function openDeleteDoctor(doctor) {
    // Verificar si tiene pacientes asignados en módulos
    const { data: mods } = await supabase.from('patient_care_modules')
      .select('patient_id, module_type')
      .eq('assigned_professional_id', doctor.id)
      .eq('is_active', true)
    
    if (mods && mods.length > 0) {
      setModal('confirm-delete-doctor-blocked')
      setModalData({ doctor, modCount: mods.length })
    } else {
      setModal('confirm-delete')
      setModalData({ type:'doctor', id: doctor.id, name: doctor.first_name + SP + doctor.last_name })
    }
  }
  async function updateApptStatus(id, status, appt = null) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    await loadAppts()

    // Si es no_show, disparar correo al paciente
    if (status === 'no_show' && appt) {
      const patient = patients.find(p => p.id === appt.patient_id)
      const doctor = doctors.find(d => d.id === appt.doctor_id)
      if (patient?.profile?.email) {
        await supabase.functions.invoke('appointment-noshow', {
          body: {
            patient_email: patient.profile.email,
            patient_name: `${patient.profile.first_name} ${patient.profile.last_name}`,
            doctor_name: `Dr. ${doctor?.first_name} ${doctor?.last_name}`,
            appointment_date: appt.appointment_date,
            appointment_time: appt.appointment_time,
          }
        })
      }
    }
  }

  async function saveAppt(form) {
    const payload = { patient_id: form.patientId, doctor_id: form.doctorId, appointment_date: form.date, appointment_time: form.time, visit_type: form.visitType, duration_min: parseInt(form.duration), notes: form.notes, status: form.status || 'pending_confirmation', module_type: form.moduleType || null, created_by: profile?.id }
    const prevStatus = form.id ? appts.find(a => a.id === form.id)?.status : null
    if (form.id) {
      await supabase.from('appointments').update(payload).eq('id', form.id)
      // Si cambió a no_show, disparar correo
      if (form.status === 'no_show' && prevStatus !== 'no_show') {
        const patient = patients.find(p => p.id === form.patientId)
        const doctor = doctors.find(d => d.id === form.doctorId)
        if (patient?.profile?.email) {
          await supabase.functions.invoke('appointment-noshow', {
            body: {
              patient_email: patient.profile.email,
              patient_name: `${patient.profile.first_name} ${patient.profile.last_name}`,
              doctor_name: `Dr. ${doctor?.first_name} ${doctor?.last_name}`,
              appointment_date: form.date,
              appointment_time: form.time,
            }
          })
        }
      }
    } else {
      await supabase.from('appointments').insert(payload)
      // Enviar correo de confirmación al paciente
      const patient = patients.find(p => p.id === form.patientId)
      const doctor = doctors.find(d => d.id === form.doctorId)
      if (patient?.profile?.email) {
        await supabase.functions.invoke('appointment-confirmation', {
          body: {
            patient_email: patient.profile.email,
            patient_name: `${patient.profile.first_name} ${patient.profile.last_name}`,
            doctor_name: `Dr. ${doctor?.first_name} ${doctor?.last_name}`,
            appointment_date: form.date,
            appointment_time: form.time,
          }
        })
      }
    }
    await loadAppts(); setModal(null); setSaving(false)
  }

  async function addLibraryItem(form) {
    setSaving(true)
    await supabase.from('library_items').insert({ type: form.type, name: form.name, category: form.category || null, is_global: true, created_by: profile?.id })
    await loadLibrary(); setModal(null); setSaving(false)
  }

  async function savePerm(doctorId, field, value) {
    await supabase.from('doctor_permissions').update({ [field]: value }).eq('doctor_id', doctorId)
    await loadPerms()
  }

  async function openChat(c) {
    setActiveChat(c)
    const unreadIds = c.msgs.filter(m => !m.is_read && m.sender_role === 'patient').map(m => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
      await loadMsgs()
    }
  }

  async function deleteChat(patientId) {
    if (!window.confirm('¿Eliminar toda la conversación con este paciente?')) return
    await supabase.from('messages').delete().eq('patient_id', patientId)
    setActiveChat(null)
    await loadMsgs()
  }

  async function sendMessage() {
    if (!chatMsg.trim() || !activeChat) return
    await supabase.from('messages').insert({ patient_id: activeChat.patientId, sender_id: profile?.id, content: chatMsg.trim(), sender_role: 'doctor', is_read: false })
    setChatMsg(''); await loadMsgs()
  }

  function apptsByDate(dateStr) {
    return appts.filter(a => a.appointment_date === dateStr && a.status !== 'cancelled').sort((a,b) => a.appointment_time.localeCompare(b.appointment_time))
  }

  function doctorColor(doctorId) {
    const colors = ['#0F6E56','#1a5c8a','#8e44ad','#e67e22','#c0392b','#2980b9','#16a085','#d35400']
    const idx = doctors.findIndex(d => d.id === doctorId)
    return colors[idx % colors.length] || '#1D9E75'
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
      if (!byPatient[m.patient_id]) byPatient[m.patient_id] = { patientId: m.patient_id, name: pName(m.patient || {}), msgs: [] }
      byPatient[m.patient_id].msgs.push(m)
    })
    return Object.values(byPatient)
  }

  const pendingCount = msgs.filter(m => !m.is_read && m.sender_role === 'patient').length

  async function openPatient(p) {
    setSelPatient(p)
    setPatientTab('progreso')
    setViewPersist('perfil-paciente')
    const pid = p.id
    const [m, g, t, tr, n] = await Promise.all([
      supabase.from('measurements').select('*').eq('patient_id', pid).order('measured_at', { ascending: false }),
      supabase.from('goals').select('*').eq('patient_id', pid).eq('is_active', true),
      supabase.from('tasks').select('*').eq('patient_id', pid).order('created_at', { ascending: false }),
      supabase.from('treatments').select('*').eq('patient_id', pid).order('appointment_date', { ascending: false }),
      supabase.from('clinical_notes').select('*').eq('patient_id', pid).order('note_date', { ascending: false }),
    ])
    setMeasurements(m.data || [])
    setGoals(g.data || [])
    setPatientTasks(t.data || [])
    setTreatments(tr.data || [])
    setNotes(n.data || [])
    await loadDiagnoses(pid)
  }

  async function adminSaveMeasurement(form) {
    setSaving(true)
    await supabase.from('measurements').insert({
      patient_id: selPatient.id, recorded_by: profile?.id,
      measured_at: form.date, weight_kg: form.weight || null,
      body_fat_pct: form.fat || null, muscle_mass_kg: form.muscle || null,
      visceral_fat_pts: form.visceral || null
    })
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', selPatient.id).order('measured_at', { ascending: false })
    setMeasurements(data || [])
    setModal(null); setSaving(false)
  }

  async function adminDeleteMeasurement(id) {
    await supabase.from('measurements').delete().eq('id', id)
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', selPatient.id).order('measured_at', { ascending: false })
    setMeasurements(data || [])
  }

  async function adminEditMeasurement(id, form) {
    setSaving(true)
    await supabase.from('measurements').update({
      measured_at: form.date, weight_kg: form.weight || null,
      body_fat_pct: form.fat || null, muscle_mass_kg: form.muscle || null,
      visceral_fat_pts: form.visceral || null
    }).eq('id', id)
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', selPatient.id).order('measured_at', { ascending: false })
    setMeasurements(data || [])
    setModal(null); setSaving(false)
  }

  async function adminSaveGoal(form) {
    setSaving(true)
    await supabase.from('goals').insert({
      patient_id: selPatient.id, created_by: profile?.id,
      name: form.name, initial_value: form.initial || null,
      target_value: form.target || null, deadline: form.deadline || null
    })
    const { data } = await supabase.from('goals').select('*').eq('patient_id', selPatient.id).eq('is_active', true)
    setGoals(data || [])
    setModal(null); setSaving(false)
  }

  async function adminDeleteGoal(id) {
    await supabase.from('goals').update({ is_active: false }).eq('id', id)
    const { data } = await supabase.from('goals').select('*').eq('patient_id', selPatient.id).eq('is_active', true)
    setGoals(data || [])
  }

  async function adminAssignTasks(selectedTasks) {
    setSaving(true)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const inserts = selectedTasks.map(desc => ({
      patient_id: selPatient.id, assigned_by: profile?.id,
      description: desc, week_start: weekStart.toISOString().split('T')[0]
    }))
    await supabase.from('tasks').insert(inserts)
    const { data } = await supabase.from('tasks').select('*').eq('patient_id', selPatient.id).order('created_at', { ascending: false })
    setPatientTasks(data || [])
    setModal(null); setSaving(false)
  }

  async function adminDeleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    const { data } = await supabase.from('tasks').select('*').eq('patient_id', selPatient.id).order('created_at', { ascending: false })
    setPatientTasks(data || [])
  }

  async function adminSaveTreatment(form) {
    setSaving(true)
    await supabase.from('treatments').insert({
      patient_id: selPatient.id, registered_by: profile?.id,
      product_name: form.product, dose: form.dose || null,
      zone: form.zone || null, session_label: form.session || null,
      appointment_date: form.date || null, notes: form.notes || null
    })
    const { data } = await supabase.from('treatments').select('*').eq('patient_id', selPatient.id).order('appointment_date', { ascending: false })
    setTreatments(data || [])
    setModal(null); setSaving(false)
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

  async function adminAddDiagnosis(code, description) {
    await supabase.from('patient_diagnoses').insert({
      patient_id: selPatient.id, cie10_code: code, cie10_description: description,
      diagnosed_by: profile?.id, diagnosis_date: new Date().toISOString().split('T')[0]
    })
    await loadDiagnoses(selPatient.id)
    setCie10Search(''); setCie10Results([])
  }

  async function adminDeleteDiagnosis(id) {
    await supabase.from('patient_diagnoses').update({ is_active: false }).eq('id', id)
    await loadDiagnoses(selPatient.id)
  }

  async function adminDeleteNote(id) {
    await supabase.from('clinical_notes').delete().eq('id', id)
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false })
    setNotes(data || [])
    setModal(null)
  }

  async function adminEditNote(id, form) {
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

  async function adminSaveNote(form) {
    setSaving(true)
    await supabase.from('clinical_notes').insert({
      patient_id: selPatient.id, author_id: profile?.id,
      note_date: form.date, visit_type: form.visitType, content: form.content,
      pas: form.pas || null, pad: form.pad || null, pam: form.pam || null,
      spo2: form.spo2 || null, o2_device: form.o2device || 'aa',
      o2_flow: form.o2flow || null, glucose: form.glucose || null,
      heart_rate: form.hr || null
    })
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false })
    setNotes(data || [])
    setModal(null); setSaving(false)
  }

  function openDelete(type, id, name) {
    setModal('confirm-delete')
    setModalData({ type, id, name })
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:G, fontFamily:'system-ui' }}>Cargando MedTrack...</div>

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'system-ui,-apple-system,sans-serif', background:'#f5f5f5' }}>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ width:420, background:'#fff', borderRadius:16, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            {modal === 'confirm-delete' && (
              <>
                <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Eliminar {modalData.type === 'patient' ? 'paciente' : modalData.type === 'doctor' ? 'medico' : modalData.type === 'appointment' ? 'cita' : modalData.type === 'note' ? 'nota clinica' : modalData.type === 'library' ? 'item' : modalData.type}</div>
                <p style={{ fontSize:14, color:'#666', marginBottom:18, lineHeight:1.6 }}>Se eliminara permanentemente <strong>"{modalData.name}"</strong>. Esta accion no se puede deshacer.</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={s.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
                  <button style={{ flex:1, padding:8, fontSize:14, fontWeight:500, background:'#D85A30', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', opacity:saving?0.7:1 }}
                    disabled={saving} onClick={() => deleteRecord(modalData.type, modalData.id)}>
                    {saving ? 'Eliminando...' : 'Si, eliminar'}
                  </button>
                </div>
              </>
            )}
            {modal === 'confirm-delete-doctor-blocked' && (
              <>
                <div style={{ fontSize:15, fontWeight:600, color:'#D85A30', marginBottom:12 }}>⚠️ No se puede eliminar este médico</div>
                <p style={{ fontSize:14, color:'#666', marginBottom:8, lineHeight:1.6 }}>
                  <strong>{modalData.doctor?.first_name} {modalData.doctor?.last_name}</strong> tiene <strong>{modalData.modCount} paciente{modalData.modCount !== 1 ? 's' : ''}</strong> asignado{modalData.modCount !== 1 ? 's' : ''} en módulos activos.
                </p>
                <p style={{ fontSize:14, color:'#666', marginBottom:18, lineHeight:1.6 }}>
                  Antes de eliminar este perfil, asegurate de reasignar o desactivar los módulos médicos en los que está asignado.
                </p>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center' }} onClick={() => setModal(null)}>Entendido</button>
                </div>
              </>
            )}
            {modal === 'edit-doctor' && modalData?.doctor && (
            <EditDoctorForm
              doctor={modalData.doctor}
              saving={saving}
              onSave={saveDoctor}
              onClose={() => setModal(null)}
            />
          )}

          {(modal === 'new-doctor' || modal === 'new-patient') && (
              <NewUserForm
                type={modal === 'new-doctor' ? 'doctor' : 'patient'}
                doctors={doctors} saving={saving} error={formError}
                onSave={form => createUser(form, modal === 'new-doctor' ? 'doctor' : 'patient')}
                onClose={() => setModal(null)} />
            )}
            {modal === 'assign' && (
              <AssignForm patient={modalData.patient} doctors={doctors} saving={saving}
                onSave={docId => reassignPatient(modalData.patient.id, docId)}
                onClose={() => setModal(null)} />
            )}
            {(modal === 'new-appt' || modal === 'edit-appt') && (
              <ApptForm appt={modalData.appt} patients={patients} doctors={doctors}
                saving={saving} error={formError} defaultDate={selDate} defaultTime={modalData.defaultTime}
                onSave={saveAppt} onClose={() => setModal(null)}
                onGoToExpediente={(appt) => {
                  const p = patients.find(p => p.id === appt.patient_id)
                  if (p) {
                    setModal(null)
                    openPatient(p)
                    setPatientTab(appt.module_type ? 'modulo_' + appt.module_type : 'modulos')
                  }
                }} />
            )}
            {modal === 'new-library' && (
              <LibraryForm saving={saving} onSave={addLibraryItem} onClose={() => setModal(null)} />
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
          { section:'Clinica', items:[{ icon:'C', label:'Calendario', key:'calendario', badge:appts.filter(a => a.status === 'scheduled' && a.appointment_date === new Date().toISOString().split('T')[0]).length }, { icon:'R', label:'Reportes', key:'reportes' }] },
          { section:'Usuarios', items:[{ icon:'M', label:'Medicos', key:'medicos', badge:doctors.length }, { icon:'P', label:'Pacientes', key:'pacientes', badge:patients.length }] },
          { section:'Principal', items:[{ icon:'D', label:'Dashboard', key:'dashboard' }] },
          { section:'Sistema', items:[{ icon:'B', label:'Biblioteca', key:'biblioteca' }, { icon:'K', label:'Permisos', key:'permisos' }, { icon:'G', label:'Configuracion', key:'config' }] },
        ].map(group => (
          <div key={group.section}>
            <div style={{ fontSize:14, fontWeight:500, color:'#bbb', letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 14px 4px' }}>{group.section}</div>
            {group.items.map(item => (
              <div key={item.key} onClick={() => { setViewPersist(item.key); setShowDrawer(false) }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', cursor:'pointer', fontSize:14, borderLeft: view === item.key ? ('2px solid ' + G) : '2px solid transparent', background: view === item.key ? '#E1F5EE' : 'transparent', color: view === item.key ? '#0F6E56' : '#666', fontWeight: view === item.key ? 500 : 400 }}>
                {item.label}
                {item.badge > 0 && <span style={{ marginLeft:'auto', fontSize:14, background: item.badgeRed ? '#D85A30' : G, color:'#fff', borderRadius:10, padding:'1px 6px', fontWeight:500 }}>{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}

        <UserMenu />
      </div>}

      {/* Overlay para cerrar menú en móvil */}
      {/* Drawer móvil admin */}
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
                { label:'Médicos', key:'medicos', icon:'👨‍⚕️' },
                { label:'Pacientes', key:'pacientes', icon:'👥' },
                { label:'Calendario', key:'calendario', icon:'📅' },
                { label:'Reportes', key:'reportes', icon:'📈' },
                { label:'Biblioteca', key:'biblioteca', icon:'📚' },
                { label:'Permisos', key:'permisos', icon:'🔑' },
                { label:'Configuración', key:'config', icon:'⚙️' },
              ].map(item => (
                <div key={item.key} onClick={() => { setViewPersist(item.key); setShowDrawer(false) }}
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
                {{ dashboard:'Dashboard', medicos:'Médicos', pacientes:'Pacientes', calendario:'Calendario', reportes:'Reportes', biblioteca:'Biblioteca', permisos:'Permisos', config:'Configuración' }[view]}
              </div>
              <div style={{ fontSize:14, color:'#999', marginTop:1 }}>Glow Clinic</div>
            </div>
            {view === 'medicos'    && <button style={s.btnPrimary} onClick={() => { setFormError(''); setModal('new-doctor') }}>+ Nuevo médico</button>}
            {view === 'pacientes'  && <button style={s.btnPrimary} onClick={() => { setFormError(''); setModal('new-patient') }}>+ Nuevo paciente</button>}
            {view === 'calendario' && <button style={s.btnPrimary} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Nueva cita</button>}
            {view === 'biblioteca' && <button style={s.btnPrimary} onClick={() => setModal('new-library')}>+ Nuevo item</button>}
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding: isMobile ? '12px 12px 16px' : '16px 18px' }}>


    
      {view === 'dashboard' && (
        <div>
          {/* ── KPIs ── */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:'Pacientes activos', value: patients.length, icon:'👥', color:'#0F6E56', bg:'#E1F5EE' },
              { label:'Médicos activos', value: doctors.filter(d=>d.role==='doctor'||d.role==='admin').length, icon:'👨‍⚕️', color:'#1a6e4e', bg:'#d4ede5' },
              { label:'Citas este mes', value: appts.filter(a=>a.appointment_date?.startsWith(new Date().toISOString().substring(0,7))).length, icon:'📅', color:'#2a7a5e', bg:'#c8e6da' },
              { label:'Mensajes hoy', value: msgs.filter(m=>m.created_at?.startsWith(new Date().toISOString().substring(0,10))).length, icon:'💬', color:'#3d8a6e', bg:'#bbddd0' },
            ].map((k,i) => (
              <div key={i} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:14, color:'#999', fontWeight:500 }}>{k.label}</span>
                  <span style={{ fontSize:18, background:k.bg, borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>{k.icon}</span>
                </div>
                <div style={{ fontSize:28, fontWeight:600, color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* ── FILA 1: Citas por mes (línea) + Citas por médico este mes (barras) ── */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>

            {/* Citas por mes - LineChart */}
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
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#1a1a1a' }}>📈 Citas por mes</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={data} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize:14, fill:'#999' }} />
                      <YAxis tick={{ fontSize:14, fill:'#999' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize:14, borderRadius:8, border:'0.5px solid #eee' }} />
                      <Line type="monotone" dataKey="citas" stroke="#e67e22" strokeWidth={2.5} dot={{ r:4, fill:'#e67e22' }} activeDot={{ r:6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* Citas por médico este mes - BarChart horizontal */}
            {(() => {
              const mes = new Date().toISOString().substring(0,7);
              const data = doctors
                .filter(d=>d.role==='doctor'||d.role==='admin')
                .map(d => ({ nombre: (d.sex==='female'?'Dra. ':'Dr. ')+d.first_name+' '+d.last_name, citas: appts.filter(a=>a.doctor_id===d.id&&a.appointment_date?.startsWith(mes)).length }));
              const chartH = Math.max(120, data.length * 40);
              return (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#1a1a1a' }}>📊 Citas por médico este mes</div>
                  <div style={{ overflowY: data.length > 5 ? 'auto' : 'visible', maxHeight: data.length > 5 ? 200 : 'none' }}>
                    <ResponsiveContainer width="100%" height={chartH}>
                      <BarChart data={data} layout="vertical" margin={{ top:0, right:20, left:0, bottom:0 }}>
                        <XAxis type="number" tick={{ fontSize:11, fill:'#999' }} allowDecimals={false} />
                        <YAxis type="category" dataKey="nombre" tick={{ fontSize:11, fill:'#555' }} width={110} />
                        <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:'0.5px solid #eee' }} />
                        <Bar dataKey="citas" fill="#0F6E56" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── FILA 2: Pacientes por médico + Distribución por sexo ── */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>

            {/* Pacientes por médico - BarChart horizontal */}
            {(() => {
              const data = doctors
                .filter(d=>d.role==='doctor'||d.role==='admin')
                .map(d => ({ nombre: (d.sex==='female'?'Dra. ':'Dr. ')+d.first_name+' '+d.last_name, pacientes: patients.filter(p=>p.doctor?.id===d.id).length }));
              const chartH2 = Math.max(120, data.length * 40);
              return (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#1a1a1a' }}>👨‍⚕️ Pacientes por médico</div>
                  <div style={{ overflowY: data.length > 5 ? 'auto' : 'visible', maxHeight: data.length > 5 ? 200 : 'none' }}>
                    <ResponsiveContainer width="100%" height={chartH2}>
                      <BarChart data={data} layout="vertical" margin={{ top:0, right:20, left:0, bottom:0 }}>
                        <XAxis type="number" tick={{ fontSize:11, fill:'#999' }} allowDecimals={false} />
                        <YAxis type="category" dataKey="nombre" tick={{ fontSize:11, fill:'#555' }} width={110} />
                        <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:'0.5px solid #eee' }} />
                        <Bar dataKey="pacientes" fill="#0F6E56" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* Distribución por sexo - PieChart */}
            {(() => {
              const COLORES = { female:'#e91e8c', male:'#1a5c8a', other:'#7a4000' };
              const LABELS  = { female:'Femenino', male:'Masculino', other:'Otro' };
              const data = ['female','male','other']
                .map(k => ({ name: LABELS[k], value: patients.filter(p=>p.sex===k).length, color: COLORES[k] }))
                .filter(d=>d.value>0);
              const total = patients.length;
              return (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:4, color:'#1a1a1a' }}>⚧ Distribución por sexo</div>
                  {total===0
                    ? <div style={{ fontSize:14, color:'#bbb', textAlign:'center', padding:20 }}>Sin datos</div>
                    : <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                            {data.map((entry,i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize:14, borderRadius:8 }} formatter={(v,n)=>[v+' pacientes',n]} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:14 }} />
                        </PieChart>
                      </ResponsiveContainer>
                  }
                </div>
              );
            })()}
          </div>

          {/* ── FILA 3: Provincias + Grupos de edad ── */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>

            {/* Pacientes por provincia - todas las 7 provincias CR */}
            {(() => {
              const PROVS = ['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón'];
              const data = PROVS.map(pv => ({ provincia: pv.replace('San José','S. José').replace('Guanacaste','Guanac.').replace('Puntarenas','Puntar.'), pacientes: patients.filter(p=>p.province===pv).length }));
              return (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#1a1a1a' }}>📍 Pacientes por provincia</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data} margin={{ top:0, right:10, left:-20, bottom:20 }}>
                      <XAxis dataKey="provincia" tick={{ fontSize:9, fill:'#999' }} angle={-30} textAnchor="end" />
                      <YAxis tick={{ fontSize:14, fill:'#999' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize:14, borderRadius:8, border:'0.5px solid #eee' }} />
                      <Bar dataKey="pacientes" fill="#1a5c8a" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* Grupos de edad - BarChart vertical */}
            {(() => {
              const getAge = dob => {
                if(!dob) return null;
                const d = new Date(dob); const now = new Date();
                return now.getFullYear()-d.getFullYear()-(now<new Date(now.getFullYear(),d.getMonth(),d.getDate())?1:0);
              };
              const grupos = [
                { label:'18-25', min:18, max:25 },
                { label:'26-35', min:26, max:35 },
                { label:'36-45', min:36, max:45 },
                { label:'46-55', min:46, max:55 },
                { label:'56-65', min:56, max:65 },
                { label:'65+',   min:66, max:200 },
              ];
              const data = grupos.map(g => ({
                grupo: g.label,
                pacientes: patients.filter(p=>{ const a=getAge(p.birth_date); return a!==null&&a>=g.min&&a<=g.max; }).length
              }));
              return (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#1a1a1a' }}>👤 Pacientes por grupo de edad</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data} margin={{ top:0, right:10, left:-20, bottom:0 }}>
                      <XAxis dataKey="grupo" tick={{ fontSize:14, fill:'#999' }} />
                      <YAxis tick={{ fontSize:14, fill:'#999' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize:14, borderRadius:8, border:'0.5px solid #eee' }} />
                      <Bar dataKey="pacientes" radius={[4,4,0,0]}>
                        {data.map((_,i) => <Cell key={i} fill={['#1D9E75','#1a5c8a','#8e44ad','#e67e22','#c0392b','#7f8c8d'][i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </div>

          {/* ── FILA 4: Diagnósticos + Metas ── */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>

            {/* Diagnósticos */}
            {(() => {
              const colors = ['#0F6E56','#1a7a62','#2a8a70','#3a9a80','#4aaa90','#5bbaa0','#6ccab0','#7ddac0'];
              const diagMap = {};
              allDiagnoses.forEach(d => {
                const key = d.cie10_code ? d.cie10_code+' '+( d.cie10_description||'') : (d.cie10_description||'Sin desc.');
                diagMap[key] = (diagMap[key]||0) + 1;
              });
              const data = Object.entries(diagMap).sort((a,b)=>b[1]-a[1]).slice(0,8)
                .map(([name,value]) => ({ name: name.length>22 ? name.substring(0,22)+'…' : name, value }));
              return (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#1a1a1a' }}>🩺 Pacientes por diagnóstico</div>
                  {data.length===0
                    ? <div style={{ fontSize:14, color:'#bbb', textAlign:'center', padding:20 }}>Sin diagnósticos registrados</div>
                    : <ResponsiveContainer width="100%" height={Math.max(120, data.length*28)}>
                        <BarChart data={data} layout="vertical" margin={{ top:0, right:30, left:0, bottom:0 }}>
                          <XAxis type="number" tick={{ fontSize:14, fill:'#999' }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize:14, fill:'#555' }} width={120} />
                          <Tooltip contentStyle={{ fontSize:14, borderRadius:8, border:'0.5px solid #eee' }} />
                          <Bar dataKey="value" radius={[0,4,4,0]}>
                            {data.map((_,i) => <Cell key={i} fill={colors[i%colors.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>
              );
            })()}

            {/* Metas - PieChart */}
            {(() => {
              const achieved = patients.filter(p=>p.goals_achieved===true).length;
              const pending  = patients.filter(p=>p.goals_achieved===false).length;
              const nodata   = patients.length - achieved - pending;
              const data = [
                { name:'Alcanzadas', value:achieved, color:'#0F6E56' },
                { name:'En progreso', value:pending,  color:'#7dbeaa' },
                { name:'Sin evaluar', value:nodata,   color:'#ccc' },
              ].filter(d=>d.value>0);
              return (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:4, color:'#1a1a1a' }}>🎯 Metas de pacientes</div>
                  {patients.length===0
                    ? <div style={{ fontSize:14, color:'#bbb', textAlign:'center', padding:20 }}>Sin pacientes</div>
                    : <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                            {data.map((entry,i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize:14, borderRadius:8 }} formatter={(v,n)=>[v+' pacientes',n]} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:14 }} />
                        </PieChart>
                      </ResponsiveContainer>
                  }
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {view === 'medicos' && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
              {!isMobile && <div style={{ display:'flex', padding:'9px 14px', background:'#f8f8f8', fontSize:14, fontWeight:500, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                <div style={{ flex:'0 0 40%' }}>Medico</div>
                <div style={{ flex:'0 0 16%' }}>Rol</div>
                <div style={{ flex:'0 0 14%' }}>Pac.</div>
                <div style={{ flex:'0 0 14%' }}>Estado</div>
                <div style={{ flex:'0 0 16%', textAlign:'right' }}>Acciones</div>
              </div>}
              {doctors.map(d => isMobile ? (
                <div key={d.id} style={{ padding:'12px 14px', borderTop:'0.5px solid #f0f0f0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:500, flexShrink:0 }}>{initials(d.first_name + SP + d.last_name)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.first_name} {d.last_name}</div>
                      <div style={{ fontSize:12, color:'#999', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.email}</div>
                    </div>
                    <span style={{ fontSize:12, padding:'2px 8px', borderRadius:20, fontWeight:500, flexShrink:0, background: d.role === 'admin' ? '#E1F5EE' : '#E6F1FB', color: d.role === 'admin' ? '#0F6E56' : '#185FA5' }}>{d.role === 'admin' ? 'Admin' : 'Colaborador'}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:44 }}>
                    <div style={{ fontSize:12, color:'#888' }}>{patients.filter(p => p.doctor?.id === d.id).length} pacientes · <span style={{ color:'#0F6E56' }}>activo</span></div>
                    <div style={{ display:'flex', gap:4 }}>
                      {d.role !== 'admin' && (
                        <>
                          <button style={s.iconBtn} onClick={() => setViewPersist('permisos')}>P</button>
                          <button style={s.iconBtn} onClick={() => { setModal('edit-doctor'); setModalData({ doctor:d }) }}>E</button>
                          <button style={s.iconBtnDel} onClick={() => openDeleteDoctor(d)}>X</button>
                        </>
                      )}
                      {d.role === 'admin' && <button style={s.iconBtn} onClick={() => { setModal('edit-doctor'); setModalData({ doctor:d }) }}>E</button>}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={d.id} style={{ display:'flex', padding:'11px 14px', borderTop:'0.5px solid #f0f0f0', alignItems:'center' }}>
                  <div style={{ flex:'0 0 40%', display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:500, flexShrink:0 }}>{initials(d.first_name + SP + d.last_name)}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.first_name} {d.last_name}</div>
                      <div style={{ fontSize:14, color:'#999', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.email}</div>
                    </div>
                  </div>
                  <div style={{ flex:'0 0 16%' }}>
                    <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, fontWeight:500, background: d.role === 'admin' ? '#E1F5EE' : '#E6F1FB', color: d.role === 'admin' ? '#0F6E56' : '#185FA5' }}>{d.role === 'admin' ? 'Admin' : 'Colaborador'}</span>
                  </div>
                  <div style={{ flex:'0 0 14%', fontSize:14, color:'#666' }}>{patients.filter(p => p.doctor?.id === d.id).length}</div>
                  <div style={{ flex:'0 0 14%' }}>
                    <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, fontWeight:500, background:'#E1F5EE', color:'#0F6E56' }}>activo</span>
                  </div>
                  <div style={{ flex:'0 0 16%', display:'flex', justifyContent:'flex-end', gap:4 }}>
                    {d.role !== 'admin' && (
                      <>
                        <button style={s.iconBtn} onClick={() => setViewPersist('permisos')}>P</button>
                        <button style={s.iconBtn} onClick={() => { setModal('edit-doctor'); setModalData({ doctor:d }) }}>E</button>
                        <button style={s.iconBtnDel} onClick={() => openDeleteDoctor(d)}>X</button>
                      </>
                    )}
                    {d.role === 'admin' && <button style={s.iconBtn} onClick={() => { setModal('edit-doctor'); setModalData({ doctor:d }) }}>E</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'perfil-paciente' && selPatient && (
            <PatientProfileAdmin
              patient={selPatient}
              patients={patients}
              doctors={doctors}
              measurements={measurements}
              goals={goals}
              tasks={patientTasks}
              treatments={treatments}
              notes={notes}
              library={library}
              tab={patientTab}
              setTab={setPatientTab}
              saving={saving}
              modal={modal}
              modalData={modalData}
              setModal={setModal}
              setModalData={setModalData}
              onSaveMeasurement={adminSaveMeasurement}
              onEditMeasurement={adminEditMeasurement}
              onDeleteMeasurement={adminDeleteMeasurement}
              onSaveGoal={adminSaveGoal}
              onDeleteGoal={adminDeleteGoal}
              onAssignTasks={adminAssignTasks}
              onDeleteTask={adminDeleteTask}
              onSaveTreatment={adminSaveTreatment}
              onSaveNote={adminSaveNote}
              onEditNote={adminEditNote}
              onDeleteNote={adminDeleteNote}
              diagnoses={diagnoses}
              onAddDiagnosis={adminAddDiagnosis}
              onDeleteDiagnosis={adminDeleteDiagnosis}
              cie10Search={cie10Search}
              setCie10Search={setCie10Search}
              cie10Results={cie10Results}
              onSearchCie10={searchCie10}
              onBack={() => { setViewPersist('pacientes'); setSelPatient(null) }}
              isMobile={isMobile}
            />
          )}

          {view === 'pacientes' && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', position:'relative', display:'flex', alignItems:'center' }}><span style={{ position:'absolute', left:24, fontSize:14, color:'#bbb', pointerEvents:'none' }}>🔍</span><input type="text" placeholder="Buscar por nombre, email o diagnóstico..." value={searchPac} onChange={e=>setSearchPac(e.target.value)} style={{ width:'100%', padding:'8px 12px 8px 34px', border:'0.5px solid #eee', borderRadius:8, fontSize:14, outline:'none', background:'#f9f9f9', boxSizing:'border-box' }} /></div>
              {!isMobile && <div style={{ display:'flex', padding:'9px 14px', background:'#f8f8f8', fontSize:14, fontWeight:500, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                <div style={{ flex:'0 0 28%' }}>Paciente</div>
                <div style={{ flex:'0 0 8%' }}>Edad</div>
                <div style={{ flex:'0 0 18%' }}>Médico</div>
                <div style={{ flex:'0 0 18%', fontSize:14, fontWeight:500, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>Diagnóstico</div>
                <div style={{ flex:'0 0 12%' }}>Estado</div>
                <div style={{ flex:'0 0 16%', textAlign:'right' }}>Acciones</div>
              </div>}
              {patients.filter(p => {
                const q = searchPac.toLowerCase()
                if(!q) return true
                const nombre = ((p.first_name||'')+' '+(p.last_name||'')).toLowerCase()
                const email = (p.email||'').toLowerCase()
                const diag = (allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description||'').toLowerCase()
                return nombre.includes(q)||email.includes(q)||diag.includes(q)
              }).map(p => isMobile ? (
                <div key={p.id} onClick={() => openPatient(p)} style={{ padding:'12px 14px', borderTop:'0.5px solid #f0f0f0', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:500, flexShrink:0 }}>{initials(pName(p))}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pName(p)}</div>
                      <div style={{ fontSize:12, color:'#999' }}>{p.specialty_type || '--'} · {age(p.birth_date)} años</div>
                    </div>
                    <span style={{ fontSize:12, padding:'2px 8px', borderRadius:20, fontWeight:500, flexShrink:0, background: p.status === 'active' ? '#E1F5EE' : '#FAEEDA', color: p.status === 'active' ? '#0F6E56' : '#854F0B' }}>{p.status === 'active' ? 'activo' : 'pendiente'}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingLeft:44 }}>
                    <div style={{ fontSize:12, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                      {p.doctor ? dName(p.doctor) : 'Sin asignar'}{allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description ? ' · ' + allDiagnoses.find(d=>d.patient_id===p.id).cie10_description : ''}
                    </div>
                    <div style={{ display:'flex', gap:4, flexShrink:0, marginLeft:8 }}>
                      <button style={s.iconBtn} title="Reasignar" onClick={e => { e.stopPropagation(); setModal('assign'); setModalData({ patient:p }) }}>R</button>
                      <button style={s.iconBtnDel} onClick={e => { e.stopPropagation(); openDelete('patient', p.id, pName(p)) }}>X</button>
                    </div>
                  </div>
                </div>
              ) : (
                  <div key={p.id} onClick={() => openPatient(p)} style={{ display:'flex', padding:'10px 14px', borderTop:'0.5px solid #f0f0f0', alignItems:'center', cursor:'pointer' }}>
                  <div style={{ flex:'0 0 28%', display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:500, flexShrink:0 }}>{initials(pName(p))}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pName(p)}</div>
                      <div style={{ fontSize:14, color:'#999' }}>{p.specialty_type || '--'}</div>
                    </div>
                  </div>
                  <div style={{ flex:'0 0 8%', fontSize:14, color:'#666' }}>{age(p.birth_date)}</div>
                  <div style={{ flex:'0 0 18%', fontSize:14, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.doctor ? dName(p.doctor) : 'Sin asignar'}</div>
                <div style={{ flex:'0 0 18%', fontSize:14, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description || '—'}</div>
                  <div style={{ flex:'0 0 12%' }}>
                    <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, fontWeight:500, background: p.status === 'active' ? '#E1F5EE' : '#FAEEDA', color: p.status === 'active' ? '#0F6E56' : '#854F0B' }}>{p.status === 'active' ? 'activo' : 'pendiente'}</span>
                  </div>
                  <div style={{ flex:'0 0 16%', display:'flex', justifyContent:'flex-end', gap:4 }}>
                    <button style={s.iconBtn} title="Reasignar" onClick={e => { e.stopPropagation(); setModal('assign'); setModalData({ patient:p }) }}>R</button>
                    <button style={s.iconBtnDel} onClick={e => { e.stopPropagation(); openDelete('patient', p.id, pName(p)) }}>X</button>
                  </div>
                </div>
              ))}
              {patients.length === 0 && <div style={{ padding:30, textAlign:'center', fontSize:14, color:'#999' }}>No hay pacientes registrados</div>}
            </div>
          )}

          {view === 'calendario' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Controles de vista */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                <div style={{ display:'flex', gap:6 }}>
                  {calView === 'mes' && <>
                    <button style={s.calNavBtn} onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}>{'<'}</button>
                    <div style={{ fontSize:14, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>{MONTHS[calMonth]} {calYear}</div>
                    <button style={s.calNavBtn} onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}>{'>'}</button>
                  </>}
                  {calView === 'semana' && <>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(new Date(d)) }}>{'<'}</button>
                    <div style={{ fontSize:14, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>
                      {weekStart.toLocaleDateString('es-CR',{day:'numeric',month:'short'})} — {new Date(weekStart.getTime()+6*86400000).toLocaleDateString('es-CR',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(new Date(d)) }}>{'>'}</button>
                  </>}
                  {calView === 'dia' && <>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(selDate||new Date()); d.setDate(d.getDate()-1); setSelDate(d.toISOString().split('T')[0]) }}>{'<'}</button>
                    <div style={{ fontSize:14, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>
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
                        <div key={i} onClick={() => { if(cell.dateStr) { setSelDate(cell.dateStr); setCalView('dia') } }}
                          style={{ minHeight:70, padding:5, borderRadius:6, cursor: cell.dateStr ? 'pointer' : 'default', opacity: cell.current ? 1 : 0.3, background: cell.isToday ? '#f0fdf9' : 'transparent', border: cell.isToday ? ('1px solid '+G) : '1px solid transparent' }}>
                          <div style={{ fontSize:13, color: cell.isToday ? G : '#666', fontWeight: cell.isToday ? 600 : 400, marginBottom:2 }}>{cell.day}</div>
                          {dayAppts.slice(0,2).map(a => {
                            const statusConfig = { pending_confirmation:'#F59E0B', confirmed_patient:'#0F6E56', confirmed_doctor:'#185FA5', no_show:'#854F0B', scheduled:'#888' }
                            const sc = statusConfig[a.status] || G
                            return (
                              <div key={a.id} style={{ fontSize:9, padding:'1px 3px', borderRadius:2, color:'#fff', marginBottom:1, background: doctorColor(a.doctor_id), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <span>{a.appointment_time?.substring(0,5)} {a.patient?.profile?.first_name}</span>
                                {a.status === 'confirmed_patient' && <span style={{ fontSize:8 }}>✅</span>}
                                {a.status === 'confirmed_doctor' && <span style={{ fontSize:8, color:'#7EC8E3' }}>✅</span>}
                                {a.status === 'no_show' && <span style={{ fontSize:8, background:'#F59E0B', borderRadius:'50%', width:10, height:10, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>-</span>}
                              </div>
                            )
                          })}
                          {dayAppts.length > 2 && <div style={{ fontSize:9, color:'#999' }}>+{dayAppts.length-2}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Vista SEMANA */}
              {calView === 'semana' && (() => {
                const HORA_INI = 12
                const HORA_FIN = 24
                const SLOT_H = 48
                const now = new Date()
                const todayStr = now.toISOString().split('T')[0]
                const nowOffsetPx = HORA_INI <= now.getHours() && now.getHours() < HORA_FIN
                  ? ((now.getHours() - HORA_INI) * 60 + now.getMinutes()) / 60 * SLOT_H : -1
                const weekDays = Array.from({length:7}, (_,i) => {
                  const d = new Date(weekStart)
                  d.setDate(weekStart.getDate() + i)
                  return { date: d, dateStr: d.toISOString().split('T')[0], isToday: d.toISOString().split('T')[0] === todayStr }
                })
                const hours = Array.from({length: HORA_FIN - HORA_INI}, (_,i) => HORA_INI + i)
                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ display:'grid', gridTemplateColumns:`48px repeat(7,1fr)`, borderBottom:'0.5px solid #eee' }}>
                      <div />
                      {weekDays.map(({date, isToday}) => (
                        <div key={date.toISOString()} style={{ textAlign:'center', padding:'8px 4px', borderLeft:'0.5px solid #f0f0f0', background: isToday ? '#f0fdf9' : '#fff' }}>
                          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase' }}>
                            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][date.getDay()===0?6:date.getDay()-1]}
                          </div>
                          <div style={{ fontSize:16, fontWeight: isToday ? 700 : 400, background: isToday ? G : 'transparent', color: isToday ? '#fff' : '#1a1a1a', borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0' }}>
                            {date.getDate()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ overflowY:'auto', maxHeight: isMobile ? '60vh' : 'calc(100vh - 260px)', position:'relative' }}>
                      <div style={{ display:'grid', gridTemplateColumns:`48px repeat(7,1fr)`, position:'relative' }}>
                        <div>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, borderBottom:'0.5px solid #f5f5f5', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:6, paddingTop:2 }}>
                              <span style={{ fontSize:10, color:'#bbb' }}>{h === 12 ? '12 PM' : h < 12 ? h+' AM' : h === 24 ? '12 AM' : (h-12)+' PM'}</span>
                            </div>
                          ))}
                        </div>
                        {weekDays.map(({dateStr, isToday}) => {
                          const dayAppts = apptsByDate(dateStr)
                          return (
                            <div key={dateStr} style={{ borderLeft:'0.5px solid #f0f0f0', position:'relative', background: isToday ? '#fafffe' : '#fff' }}>
                              {hours.map(h => (
                                <div key={h} style={{ height:SLOT_H, borderBottom:'0.5px solid #f5f5f5', cursor:'pointer' }}
                                  onClick={() => { setSelDate(dateStr); setModal('new-appt'); setModalData({ defaultTime: String(h).padStart(2,'0')+':00' }) }} />
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
                                const height = Math.max((a.duration_min||30) / 60 * SLOT_H - 2, 20)
                                const color = doctorColor(a.doctor_id)
                                return (
                                  <div key={a.id} style={{ position:'absolute', left:2, right:2, top, height, background:color+'22', borderLeft:'3px solid '+color, borderRadius:4, padding:'2px 4px', overflow:'hidden', cursor:'pointer', zIndex:5 }}
                                    onClick={() => { setSelDate(dateStr); setModal('edit-appt'); setModalData({appt:a}) }}>
                                    <div style={{ fontSize:10, fontWeight:600, color, lineHeight:1.2, display:'flex', justifyContent:'space-between' }}>
                                      <span>{a.appointment_time?.substring(0,5)}</span>
                                      {a.status === 'confirmed_patient' && <span style={{ color:'#0F6E56' }}>✅</span>}
                                      {a.status === 'confirmed_doctor' && <span style={{ color:'#7EC8E3' }}>✅</span>}
                                      {a.status === 'no_show' && <span style={{ background:'#F59E0B', borderRadius:'50%', width:10, height:10, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#fff' }}>-</span>}
                                    </div>
                                    <div style={{ fontSize:10, color:'#333', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.patient?.profile?.first_name} {a.patient?.profile?.last_name}</div>
                                  </div>
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
                const HORA_INI = 12
                const HORA_FIN = 24
                const SLOT_H = 56
                const now = new Date()
                const todayStr = now.toISOString().split('T')[0]
                const currentDate = selDate || todayStr
                const dayAppts = apptsByDate(currentDate)
                const isToday = currentDate === todayStr
                const nowOffsetPx = isToday && HORA_INI <= now.getHours() && now.getHours() < HORA_FIN
                  ? ((now.getHours() - HORA_INI) * 60 + now.getMinutes()) / 60 * SLOT_H : -1
                const hours = Array.from({length: HORA_FIN - HORA_INI}, (_,i) => HORA_INI + i)
                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:14, fontWeight:500 }}>
                        {new Date(currentDate+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                      </div>
                      <span style={{ fontSize:12, color:'#888' }}>{dayAppts.length} citas</span>
                    </div>
                    <div style={{ overflowY:'auto', maxHeight: isMobile ? '65vh' : 'calc(100vh - 240px)', position:'relative' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'48px 1fr', position:'relative' }}>
                        <div>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, borderBottom:'0.5px solid #f5f5f5', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:6, paddingTop:2 }}>
                              <span style={{ fontSize:10, color:'#bbb' }}>{h === 12 ? '12 PM' : h < 12 ? h+' AM' : h === 24 ? '12 AM' : (h-12)+' PM'}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ position:'relative', background: isToday ? '#fafffe' : '#fff' }}>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, borderBottom:'0.5px solid #f5f5f5', borderLeft:'0.5px solid #f0f0f0', cursor:'pointer' }}
                              onClick={() => { setSelDate(currentDate); setModal('new-appt'); setModalData({ defaultTime: String(h).padStart(2,'0')+':00' }) }} />
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
                            const color = doctorColor(a.doctor_id)
                            const statusConfig = { pending_confirmation:{ label:'Pendiente', bg:'#FFF8E1', color:'#F59E0B' }, confirmed_patient:{ label:'Confirmada ✅', bg:'#E1F5EE', color:'#0F6E56' }, confirmed_doctor:{ label:'Confirmada ✅', bg:'#E6F1FB', color:'#185FA5' }, no_show:{ label:'No asistió', bg:'#FAEEDA', color:'#854F0B' }, scheduled:{ label:'Agendada', bg:'#f0f0f0', color:'#888' } }
                            const st = statusConfig[a.status] || statusConfig.scheduled
                            return (
                              <div key={a.id} style={{ position:'absolute', left:4, right:4, top, height, background:color+'22', borderLeft:'3px solid '+color, borderRadius:6, padding:'4px 8px', overflow:'hidden', cursor:'pointer', zIndex:5 }}
                                onClick={() => { setModal('edit-appt'); setModalData({appt:a}) }}>
                                <div style={{ fontSize:11, fontWeight:600, color, display:'flex', justifyContent:'space-between' }}>
                                  <span>{a.appointment_time?.substring(0,5)} — {a.patient?.profile?.first_name} {a.patient?.profile?.last_name}</span>
                                  <span style={{ fontSize:10, padding:'0 5px', borderRadius:10, background:st.bg, color:st.color }}>{st.label}</span>
                                </div>
                                <div style={{ fontSize:11, color:'#666' }}>{a.doctor?.first_name} {a.doctor?.last_name} · {a.duration_min} min</div>
                                <div style={{ display:'flex', gap:4, marginTop:4 }}>
                                  {a.status !== 'confirmed_doctor' && a.status !== 'no_show' && (
                                    <button style={{ fontSize:10, padding:'1px 6px', borderRadius:4, border:'none', cursor:'pointer', background:'#E6F1FB', color:'#185FA5' }}
                                      onClick={e => { e.stopPropagation(); updateApptStatus(a.id, 'confirmed_doctor') }}>✅ Confirmar</button>
                                  )}
                                  {a.status !== 'no_show' && (
                                    <button style={{ fontSize:10, padding:'1px 6px', borderRadius:4, border:'none', cursor:'pointer', background:'#FAEEDA', color:'#854F0B' }}
                                      onClick={e => { e.stopPropagation(); updateApptStatus(a.id, 'no_show', a) }}>No asistió</button>
                                  )}
                                </div>
                              </div>
                            )
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

              {/* Leyenda médicos */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'10px 16px', display:'flex', gap:16, flexWrap:'wrap' }}>
                {doctors.map(d => (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#555' }}>
                    <div style={{ width:10, height:10, borderRadius:3, background: doctorColor(d.id) }} />
                    {d.first_name} {d.last_name}
                  </div>
                ))}
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
                    <div style={{ padding:'11px 14px', borderBottom:'0.5px solid #eee', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span>{activeChat.name}</span>
                      <button onClick={() => deleteChat(activeChat.patientId)} style={{ background:'none', border:'none', cursor:'pointer', color:'#D85A30', fontSize:14, padding:'2px 8px', borderRadius:6, border:'1px solid #D85A30' }}>Eliminar chat</button>
                    </div>
                    <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
                      {[...activeChat.msgs].reverse().map(m => (
                        <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: m.sender_role === 'doctor' ? 'flex-end' : 'flex-start' }}>
                          {m.sender_role === 'doctor' && <div style={{ fontSize:14, color:'#888', marginBottom:2, textAlign:'right' }}>{m.sender?.first_name ? `Dr. ${m.sender.first_name} ${m.sender.last_name}` : 'Doctor adicional'}</div>}
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

          {view === 'reportes' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                {[{ l:'Total pacientes', v:patients.length }, { l:'Citas este mes', v:appts.filter(a => a.appointment_date?.startsWith(new Date().toISOString().substring(0,7))).length }, { l:'Mensajes totales', v:msgs.length }, { l:'Medicos activos', v:doctors.length }].map((m,i) => (
                  <div key={i} style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:14, color:'#888', marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:22, fontWeight:500, color:'#1a1a1a' }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Pacientes por provincia</div>
                  {[...new Set(patients.map(p => p.province).filter(Boolean))].map(prov => {
                    const count = patients.filter(p => p.province === prov).length
                    const pct = patients.length ? (count / patients.length * 100) : 0
                    return (
                      <div key={prov} style={{ marginBottom:9 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:3 }}>
                          <span style={{ color:'#444' }}>{prov}</span><span style={{ fontWeight:500 }}>{count}</span>
                        </div>
                        <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                          <div style={{ height:'100%', background:G, borderRadius:3, width: pct + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                  {patients.filter(p => p.province).length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Sin datos de provincia aun</div>}
                </div>
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Distribucion por sexo</div>
                  {['female','male','other'].map(sx => {
                    const count = patients.filter(p => p.sex === sx).length
                    const pct = patients.length ? (count / patients.length * 100) : 0
                    const labels = { female:'Femenino', male:'Masculino', other:'Otro' }
                    const colors = { female:G, male:'#185FA5', other:'#BA7517' }
                    return (
                      <div key={sx} style={{ marginBottom:9 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:3 }}>
                          <span style={{ color:'#444' }}>{labels[sx]}</span>
                          <span style={{ fontWeight:500 }}>{count} ({Math.round(pct)}%)</span>
                        </div>
                        <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                          <div style={{ height:'100%', borderRadius:3, width: pct + '%', background: colors[sx] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {view === 'biblioteca' && (
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
              {['task','treatment'].map(type => (
                <div key={type} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>{type === 'task' ? 'Tareas' : 'Tratamientos'} ({library.filter(l => l.type === type).length})</div>
                  {library.filter(l => l.type === type).map(item => (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border:'0.5px solid #eee', marginBottom:5, background:'#fafafa' }}>
                      <span style={{ fontSize:14, flex:1, color:'#1a1a1a' }}>{item.name}</span>
                      {item.category && <span style={{ fontSize:14, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888', whiteSpace:'nowrap' }}>{item.category}</span>}
                      <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#D85A30' }}
                        onClick={() => openDelete('library', item.id, item.name)}>X</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {view === 'permisos' && (
            <div>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                {doctors.filter(d => d.role === 'doctor').map(d => (
                  <div key={d.id} onClick={() => setSelDoctor(d.id)}
                    style={{ flex:1, padding:'10px 14px', borderRadius:10, border: '1px solid ' + (selDoctor === d.id ? G : '#eee'), background: selDoctor === d.id ? '#E1F5EE' : '#fff', cursor:'pointer' }}>
                    <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{d.first_name} {d.last_name}</div>
                    <div style={{ fontSize:14, color:'#999' }}>Colaborador</div>
                  </div>
                ))}
                {doctors.filter(d => d.role === 'doctor').length === 0 && <div style={{ fontSize:14, color:'#999' }}>No hay medicos colaboradores registrados</div>}
              </div>
              {selDoctor && (() => {
                const perm = perms.find(p => p.doctor_id === selDoctor)
                if (!perm) return <div style={{ fontSize:14, color:'#999' }}>Sin permisos registrados</div>
                const fields = [
                  { key:'can_create_patients', label:'Crear pacientes nuevos' },
                  { key:'can_delete_patients', label:'Eliminar pacientes' },
                  { key:'can_view_all_patients', label:'Ver todos los pacientes' },
                  { key:'can_record_measurements', label:'Registrar mediciones' },
                  { key:'can_record_treatments', label:'Registrar tratamientos' },
                  { key:'can_manage_goals', label:'Gestionar objetivos y tareas' },
                  { key:'can_access_chat', label:'Acceso al chat' },
                  { key:'can_view_reports', label:'Ver reportes' },
                  { key:'can_edit_library', label:'Editar biblioteca global' },
                ]
                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Permisos - {doctors.find(d => d.id === selDoctor)?.first_name} {doctors.find(d => d.id === selDoctor)?.last_name}</div>
                    {fields.map(f => (
                      <div key={f.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                        <span style={{ fontSize:14, color:'#444' }}>{f.label}</span>
                        <div onClick={() => savePerm(selDoctor, f.key, !perm[f.key])}
                          style={{ width:36, height:20, borderRadius:10, cursor:'pointer', transition:'background 0.2s', position:'relative', background: perm[f.key] ? G : '#e0e0e0' }}>
                          <div style={{ position:'absolute', width:14, height:14, borderRadius:'50%', background:'#fff', top:3, left: perm[f.key] ? 19 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {view === 'config' && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:16 }}>Configuracion de la clinica</div>
              {[{ l:'Nombre de la clinica', v:'Glow Clinic' }, { l:'WhatsApp de agenda', v:'+506 6046-4569' }, { l:'Correo de contacto', v:'info@glowclinic.com' }, { l:'Nombre en app', v:'Glow Clinic', d:'Aparece como MEDTRACK by [nombre]' }].map((row,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{row.l}</div>
                    {row.d && <div style={{ fontSize:14, color:'#999' }}>{row.d}</div>}
                  </div>
                  <input defaultValue={row.v} style={{ padding:'7px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', width:200 }} />
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0' }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>Color principal</div>
                <input type="color" defaultValue="#1D9E75" style={{ width:40, height:32, padding:2, border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer' }} />
              </div>
              <button style={{ ...s.btnPrimary, marginTop:16, width:'auto' }}>Guardar configuracion</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function NewUserForm({ type, doctors, saving, error, onSave, onClose }) {
  const [specialties, setSpecialties] = useState([])

  useEffect(() => {
    async function loadSpecialties() {
      const { data } = await supabase.from('specialties').select('name').order('name')
      setSpecialties(data?.map(s => s.name) || [])
    }
    loadSpecialties()
  }, [])

  async function addSpecialty(name) {
    await supabase.from('specialties').insert({ name })
    const { data } = await supabase.from('specialties').select('name').order('name')
    setSpecialties(data?.map(s => s.name) || [])
  }

  const CANTONES = {
    'San Jose': ['San Jose','Escazu','Desamparados','Puriscal','Tarrazu','Aserri','Mora','Goicoechea','Santa Ana','Alajuelita','Vazquez de Coronado','Acosta','Tibas','Moravia','Montes de Oca','Turrubares','Dota','Curridabat','Perez Zeledon','Leon Cortes'],
    'Alajuela': ['Alajuela','San Ramon','Grecia','San Mateo','Atenas','Naranjo','Palmares','Poas','Orotina','San Carlos','Zarcero','Valverde Vega','Upala','Los Chiles','Guatuso','Rio Cuarto'],
    'Cartago': ['Cartago','Paraiso','La Union','Jimenez','Turrialba','Alvarado','Oreamuno','El Guarco'],
    'Heredia': ['Heredia','Barva','Santo Domingo','Santa Barbara','San Rafael','San Isidro','Belen','Flores','San Pablo','Sarapiqui'],
    'Guanacaste': ['Liberia','Nicoya','Santa Cruz','Bagaces','Carrillo','Canas','Abangares','Tilaran','Nandayure','La Cruz','Hojancha'],
    'Puntarenas': ['Puntarenas','Esparza','Buenos Aires','Montes de Oro','Osa','Quepos','Golfito','Coto Brus','Parrita','Corredores','Garabito','Rio Nuevo','Monteverde','Puerto Jimenez'],
    'Limon': ['Limon','Pococi','Siquirres','Talamanca','Matina','Guacimo'],
  }
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', specialty:'', medicalCode:'', doctorId:'', birthDate:'', height:'', sex:'', province:'', canton:'', idNumber:'', phone:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>{type === 'doctor' ? 'Nuevo medico colaborador' : 'Nuevo paciente'}</div>
      {error && <div style={{ background:'#FAECE7', color:'#C24B2A', fontSize:14, padding:'8px 11px', borderRadius:8, marginBottom:12 }}>{error}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <Field label="Nombre" value={form.firstName} onChange={f('firstName')} placeholder="Maria" />
        <Field label="Apellido" value={form.lastName} onChange={f('lastName')} placeholder="Rodriguez" />
        <div style={{ gridColumn:'1/-1' }}><Field label="Correo electronico" value={form.email} onChange={f('email')} type="email" placeholder="correo@ejemplo.com" /></div>
        <div style={{ gridColumn:'1/-1' }}><Field label="Contrasena temporal" value={form.password} onChange={f('password')} type="password" placeholder="Minimo 6 caracteres" /></div>
        {type === 'doctor' && <>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.fieldLabel}>Tipo de consulta</label>
            <select value={form.specialty} onChange={f('specialty')} style={s.fieldInput}>
              <option value="">Selecciona...</option>
              {specialties.map(sp => <option key={sp} value={sp}>{sp}</option>)}
              <option value="__nueva__">+ Agregar nueva especialidad...</option>
            </select>
          </div>
          {form.specialty === '__nueva__' && (
            <div style={{ gridColumn:'1/-1', display:'flex', gap:8 }}>
              <input value={form.newSpecialty || ''} onChange={e => setForm(p => ({ ...p, newSpecialty: e.target.value }))}
                placeholder="Nombre de la especialidad" style={s.fieldInput} />
              <button style={{ background:'#1D9E75', color:'#fff', border:'none', fontSize:14, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap' }}
                onClick={async () => {
                  if (!form.newSpecialty?.trim()) return
                  await addSpecialty(form.newSpecialty.trim())
                  setForm(p => ({ ...p, specialty: form.newSpecialty.trim(), newSpecialty: '' }))
                }}>Guardar</button>
            </div>
          )}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.fieldLabel}>Codigo profesional (colegiado)</label>
            <input value={form.medicalCode} onChange={f('medicalCode')} placeholder="MED-12345" style={s.fieldInput} />
          </div>
          <div>
            <label style={s.fieldLabel}>Sexo</label>
            <select value={form.sex} onChange={f('sex')} style={s.fieldInput}>
              <option value="">Seleccionar</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div>
            <label style={s.fieldLabel}>Cédula / ID</label>
            <input value={form.idNumber} onChange={f('idNumber')} placeholder="1-1234-5678" style={s.fieldInput} />
          </div>
          <div>
            <label style={s.fieldLabel}>Teléfono</label>
            <input type="tel" value={form.phone} onChange={f('phone')} placeholder="8888-8888" style={s.fieldInput} />
          </div>
          <div>
            <label style={s.fieldLabel}>Provincia</label>
            <select value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value, canton: '' }))} style={s.fieldInput}>
              <option value="">Seleccionar</option>
              {Object.keys(CANTONES).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={s.fieldLabel}>Cantón</label>
            <select value={form.canton} onChange={f('canton')} style={s.fieldInput} disabled={!form.province}>
              <option value="">Seleccionar</option>
              {form.province && CANTONES[form.province] && CANTONES[form.province].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </>}
        {type === 'patient' && (
          <>
            <Field label="Fecha de nacimiento" value={form.birthDate} onChange={f('birthDate')} type="date" />
            <Field label="Estatura (cm)" value={form.height} onChange={f('height')} type="number" placeholder="165" />
            <div>
              <label style={s.fieldLabel}>Sexo</label>
              <select value={form.sex} onChange={f('sex')} style={s.fieldInput}>
                <option value="">Selecciona...</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro</option>
              </select>
            </div>

              <div>
                <label style={s.fieldLabel}>Cedula / ID</label>
                <input value={form.idNumber} onChange={f('idNumber')} placeholder="1-1234-5678" style={s.fieldInput} />
              </div>
              <div>
                <label style={s.fieldLabel}>Telefono</label>
                <input type="tel" value={form.phone} onChange={f('phone')} placeholder="+506 8888-8888" style={s.fieldInput} />
              </div>
              <div>
                <label style={s.fieldLabel}>Provincia</label>
                <select value={form.province} onChange={f('province')} style={s.fieldInput}>
                  <option value="">Selecciona...</option>
                  <option value="San Jose">San Jose</option>
                  <option value="Alajuela">Alajuela</option>
                  <option value="Cartago">Cartago</option>
                  <option value="Heredia">Heredia</option>
                  <option value="Guanacaste">Guanacaste</option>
                  <option value="Puntarenas">Puntarenas</option>
                  <option value="Limon">Limon</option>
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Canton</label>
                <select value={form.canton} onChange={f('canton')} style={s.fieldInput} disabled={!form.province}>
                  <option value="">Selecciona...</option>
                  {form.province && CANTONES[form.province] && CANTONES[form.province].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
          </>
        )}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Creando...' : 'Crear usuario'}</button>
      </div>
    </>
  )
}

function AssignForm({ patient, doctors, saving, onSave, onClose }) {
  const name = ((patient.profile?.first_name || '') + ' ' + (patient.profile?.last_name || '')).trim()
  const [sel, setSel] = useState(patient.doctor?.id || null)
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Reasignar paciente</div>
      <div style={{ background:'#f8f8f8', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:14, color:'#444' }}>
        <strong>{name}</strong> - actualmente: {patient.doctor ? (patient.doctor.first_name + ' ' + patient.doctor.last_name) : 'Sin asignar'}
      </div>
      {doctors.map(d => (
        <div key={d.id} onClick={() => setSel(d.id)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:8, border: '1px solid ' + (sel === d.id ? '#1D9E75' : '#eee'), background: sel === d.id ? '#E1F5EE' : '#fff', marginBottom:6, cursor:'pointer' }}>
          <div style={{ fontSize:14, fontWeight:500, flex:1 }}>{d.first_name} {d.last_name}</div>
          {sel === d.id && <span style={{ color:'#1D9E75' }}>v</span>}
        </div>
      ))}
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(sel)}>{saving ? 'Guardando...' : 'Confirmar'}</button>
      </div>
    </>
  )
}

function ApptForm({ appt, patients, doctors, saving, error, defaultDate, defaultTime, onSave, onClose, isAdmin, onGoToExpediente }) {
  const [form, setForm] = useState({ id:appt?.id||null, patientId:appt?.patient_id||'', doctorId:appt?.doctor_id||'', date:appt?.appointment_date||defaultDate||'', time:appt?.appointment_time?.substring(0,5)||defaultTime||'09:00', visitType:appt?.visit_type||'Consulta de seguimiento', duration:appt?.duration_min||30, notes:appt?.notes||'', moduleType:appt?.module_type||'', status:appt?.status||'pending_confirmation' })
  const [patientModules, setPatientModules] = useState([])
  const MODULE_LABELS_A = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }

  useEffect(() => {
    if (form.patientId && form.doctorId) loadModules(form.patientId, form.doctorId)
  }, [form.patientId, form.doctorId])

  async function loadModules(patientId, doctorId) {
    const { data } = await supabase.from('patient_care_modules')
      .select('module_type')
      .eq('patient_id', patientId)
      .eq('assigned_professional_id', doctorId)
      .eq('is_active', true)
    const mods = data || []
    setPatientModules(mods)
    if (mods.length === 1) setForm(p => ({ ...p, moduleType: mods[0].module_type }))
    else if (mods.length === 0) setForm(p => ({ ...p, moduleType: '' }))
  }
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  const pn = p => ((p.profile?.first_name || '') + ' ' + (p.profile?.last_name || '')).trim()
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
      {error && <div style={{ background:'#FAECE7', color:'#C24B2A', fontSize:13, padding:'8px 11px', borderRadius:8, marginBottom:12 }}>{error}</div>}

      <div style={{ marginBottom:12 }}>
        <label style={s.fieldLabel}>Paciente</label>
        <select value={form.patientId} onChange={f('patientId')} style={s.fieldInput}>
          <option value="">Selecciona un paciente...</option>
          {patients.map(p => <option key={p.id} value={p.id}>{pn(p)}</option>)}
        </select>
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={s.fieldLabel}>Médico asignado</label>
        <select value={form.doctorId} onChange={f('doctorId')} style={s.fieldInput}>
          <option value="">Selecciona...</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
        </select>
      </div>

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

      {patientModules.length > 1 && (
        <div style={{ marginBottom:12, background:'#FFF8E1', border:'1px solid #F59E0B', borderRadius:8, padding:'10px 12px' }}>
          <label style={{ ...s.fieldLabel, color:'#854F0B' }}>⚠️ ¿A qué módulo pertenece esta cita?</label>
          <select value={form.moduleType} onChange={f('moduleType')} style={s.fieldInput}>
            <option value="">Selecciona un módulo...</option>
            {patientModules.map(m => <option key={m.module_type} value={m.module_type}>{MODULE_LABELS_A[m.module_type]}</option>)}
          </select>
        </div>
      )}
      {patientModules.length === 1 && (
        <div style={{ marginBottom:12, background:'#E1F5EE', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#0F6E56' }}>
          📋 Módulo: <strong>{MODULE_LABELS_A[patientModules[0].module_type]}</strong>
        </div>
      )}
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
        <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : appt ? 'Guardar cambios' : 'Agendar cita'}</button>
      </div>
    </>
  )
}

function LibraryForm({ saving, onSave, onClose }) {
  const [form, setForm] = useState({ type:'task', name:'', category:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Nuevo item de biblioteca</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div>
          <label style={s.fieldLabel}>Tipo</label>
          <select value={form.type} onChange={f('type')} style={s.fieldInput}>
            <option value="task">Tarea</option>
            <option value="treatment">Tratamiento</option>
          </select>
        </div>
        <Field label="Categoria" value={form.category} onChange={f('category')} placeholder="Nutricion..." />
        <div style={{ gridColumn:'1/-1' }}><Field label="Nombre" value={form.name} onChange={f('name')} placeholder="Descripcion del item" /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Agregar'}</button>
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
  iconBtn:    { background:'#E6F1FB', color:'#185FA5', border:'none', cursor:'pointer', fontSize:14, fontWeight:500, padding:'4px 8px', borderRadius:6 },
  iconBtnDel: { background:'#FAECE7', color:'#D85A30', border:'none', cursor:'pointer', fontSize:14, fontWeight:500, padding:'4px 8px', borderRadius:6 },
  calNavBtn:  { background:'none', border:'1px solid #eee', borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#666' },
  fieldLabel: { display:'block', fontSize:14, color:'#666', marginBottom:4, fontWeight:500 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' },
}

function PatientProfileAdmin({ patient, doctors, profile, measurements, goals, tasks, treatments, notes, diagnoses, library, tab, setTab, saving, modal, modalData, setModal, setModalData, onSaveMeasurement, onEditMeasurement, onDeleteMeasurement, onSaveGoal, onDeleteGoal, onAssignTasks, onDeleteTask, onSaveTreatment, onSaveNote, onEditNote, onDeleteNote, onAddDiagnosis, onDeleteDiagnosis, cie10Search, setCie10Search, cie10Results, onSearchCie10, onBack }) {
  const [careModules, setCareModules] = React.useState([])

  React.useEffect(() => {
    if (patient?.id) loadCareModules()
  }, [patient?.id])

  async function loadCareModules() {
    const { data } = await supabase.from('patient_care_modules')
      .select('*, professional:assigned_professional_id(id, first_name, last_name)')
      .eq('patient_id', patient.id)
      .eq('is_active', true)
    setCareModules(data || [])
  }
  const pName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()
  const latest = measurements[0] || null

  function age(dob) {
    if (!dob) return '--'
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25))
  }

  return (
    <div>
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ width:420, background:'#fff', borderRadius:16, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            {modal === 'new-measurement' && <MeasurementForm saving={saving} onSave={onSaveMeasurement} onClose={() => setModal(null)} />}
            {modal === 'edit-measurement' && <MeasurementForm saving={saving} measurement={modalData.measurement} onSave={form => onEditMeasurement(modalData.measurement.id, form)} onClose={() => setModal(null)} />}
            {modal === 'new-goal' && <GoalForm saving={saving} onSave={onSaveGoal} onClose={() => setModal(null)} />}
            {modal === 'assign-tasks' && <TaskPickerForm library={library.filter(l => l.type === 'task')} saving={saving} onSave={onAssignTasks} onClose={() => setModal(null)} />}
            {modal === 'new-treatment' && <TreatmentForm library={library.filter(l => l.type === 'treatment')} saving={saving} onSave={onSaveTreatment} onClose={() => setModal(null)} />}
            {modal === 'new-note' && <NoteForm saving={saving} onSave={onSaveNote} onClose={() => setModal(null)} />}
            {modal === 'edit-note' && <NoteForm saving={saving} note={modalData.note} onSave={form => onEditNote(modalData.note.id, form)} onClose={() => setModal(null)} />}
          </div>
        </div>
      )}

      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:500, flexShrink:0 }}>
          {(pName[0] || '').toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:500, color:'#1a1a1a' }}>{pName}</div>
          <div style={{ fontSize:14, color:'#666', marginTop:2 }}>{age(patient.birth_date)} anos · {patient.height_cm ? patient.height_cm + ' cm' : ''} · {patient.sex || ''}</div>
          <div style={{ display:'flex', gap:6, marginTop:5 }}>
            <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56' }}>{patient.specialty_type || 'Sin tipo de consulta'}</span>
            <span style={{ fontSize:14, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#888' }}>{patient.profile?.email}</span>
          </div>
        </div>
        <button style={{ marginLeft:'auto', background:'none', border:'1px solid #eee', borderRadius:8, padding:'6px 12px', fontSize:14, cursor:'pointer', color:'#666' }} onClick={onBack}>
          Volver
        </button>
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
          const sorted = [...careModules].sort((a,b) => MODULE_ORDER.indexOf(a.module_type) - MODULE_ORDER.indexOf(b.module_type))
          const tabs = [
            ...sorted.map(m => ({ key:'modulo_'+m.module_type, label: MODULE_LABELS[m.module_type], color: MODULE_COLORS[m.module_type] })),
            { key:'chat_modulos', label:'Chat', color:'#555' },
            { key:'modulos', label:'Módulos', color:'#888' },
          ]
          return tabs.map(t => (
            <div key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'9px 14px', fontSize:13, cursor:'pointer', borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent', color: tab === t.key ? t.color : '#888', fontWeight: tab === t.key ? 500 : 400, whiteSpace:'nowrap' }}>
              {t.label}
            </div>
          ))
        })()}
      </div>

      {tab === 'chat_modulos' && (
        <ModuleChat
          patient={patient}
          careModules={careModules}
          profile={profile}
          senderRole="admin"
        />
      )}

      {tab.startsWith('modulo_') && (() => {
        const moduleType = tab.replace('modulo_', '')
        const mod = careModules.find(m => m.module_type === moduleType)
        return (
          <div>
            {moduleType === 'integral' && <IntegralModule patient={patient} careModule={mod} canEdit={true} />}
            {moduleType === 'metabolica' && <MetabolicModule patient={patient} careModule={mod} canEdit={true} canEditMeasurements={true} />}
            {moduleType === 'estetica' && <AestheticModule patient={patient} careModule={mod} canEdit={true} />}
            {moduleType === 'fisioterapia' && <FisioterapiaModule patient={patient} careModule={mod} canEdit={true} />}
            {moduleType === 'enfermeria' && <EnfermeriaModule patient={patient} careModule={mod} canEdit={true} />}
          </div>
        )
      })()}

      {tab === 'modulos' && (
        <CareModulesAdmin patient={patient} doctors={doctors} onModulesUpdated={loadCareModules} />
      )}

      {tab === 'diagnosticos' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Buscar diagnostico CIE-10</div>
            <div style={{ position:'relative' }}>
              <input
                value={cie10Search}
                onChange={e => { setCie10Search(e.target.value); onSearchCie10(e.target.value) }}
                placeholder="Escribe codigo o nombre del diagnostico..."
                style={{ width:'100%', padding:'9px 12px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
              />
              {cie10Results.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:10, maxHeight:240, overflowY:'auto' }}>
                  {cie10Results.map(r => (
                    <div key={r.code} onClick={() => onAddDiagnosis(r.code, r.description)}
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
                <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#D85A30', flexShrink:0 }} onClick={() => onDeleteDiagnosis(d.id)}>x</button>
              </div>
            ))}
            {diagnoses.length === 0 && <div style={{ fontSize:14, color:'#999', textAlign:'center', padding:20 }}>Sin diagnosticos registrados</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function MeasurementForm({ saving, onSave, onClose, measurement }) {
  const [form, setForm] = useState({
    date: measurement?.measured_at || new Date().toISOString().split('T')[0],
    weight: measurement?.weight_kg || '',
    fat: measurement?.body_fat_pct || '',
    muscle: measurement?.muscle_mass_kg || '',
    visceral: measurement?.visceral_fat_pts || ''
  })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>{measurement ? 'Editar medicion' : 'Registrar medicion'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Fecha</label><input type="date" value={form.date} onChange={f('date')} style={sa.inp} /></div>
        <div><label style={sa.lbl}>Peso (kg)</label><input type="number" value={form.weight} onChange={f('weight')} placeholder="64.2" style={sa.inp} /></div>
        <div><label style={sa.lbl}>% Grasa</label><input type="number" value={form.fat} onChange={f('fat')} placeholder="29.1" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Masa muscular (kg)</label><input type="number" value={form.muscle} onChange={f('muscle')} placeholder="42.3" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Grasa visceral (pts)</label><input type="number" value={form.visceral} onChange={f('visceral')} placeholder="8" style={sa.inp} /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar medicion'}</button>
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
        <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Nombre del objetivo</label><input value={form.name} onChange={f('name')} placeholder="% grasa corporal" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Valor actual</label><input type="number" value={form.initial} onChange={f('initial')} placeholder="29.1" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Meta</label><input type="number" value={form.target} onChange={f('target')} placeholder="22.0" style={sa.inp} /></div>
        <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Fecha limite</label><input type="date" value={form.deadline} onChange={f('deadline')} style={sa.inp} /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar objetivo'}</button>
      </div>
    </>
  )
}

function TaskPickerForm({ library, saving, onSave, onClose }) {
  const [selected, setSelected] = useState(new Set())
  const [custom, setCustom] = useState('')
  const categories = [...new Set(library.map(l => l.category).filter(Boolean))]
  function toggle(name) {
    setSelected(prev => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next })
  }
  function addCustom() { if (!custom.trim()) return; setSelected(prev => new Set([...prev, custom.trim()])); setCustom('') }
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Asignar tareas</div>
      <div style={{ maxHeight:280, overflowY:'auto', marginBottom:12 }}>
        {categories.map(cat => (
          <div key={cat}>
            <div style={{ fontSize:14, fontWeight:500, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 0 4px' }}>{cat}</div>
            {library.filter(l => l.category === cat).map(item => (
              <div key={item.id} onClick={() => toggle(item.name)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border: '0.5px solid ' + (selected.has(item.name) ? '#1D9E75' : '#eee'), background: selected.has(item.name) ? '#E1F5EE' : '#fff', marginBottom:4, cursor:'pointer' }}>
                <span style={{ fontSize:14, flex:1, color: selected.has(item.name) ? '#0F6E56' : '#444' }}>{item.name}</span>
                {selected.has(item.name) && <span style={{ color:'#1D9E75' }}>v</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop:'0.5px dashed #eee', paddingTop:10, marginBottom:12 }}>
        <div style={{ fontSize:14, color:'#999', marginBottom:6 }}>Tarea personalizada:</div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustom() }} placeholder="Descripcion..." style={{ flex:1, padding:'7px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
          <button style={sa.btnPrimary} onClick={addCustom}>+</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:(saving||selected.size===0)?0.7:1 }} disabled={saving||selected.size===0} onClick={() => onSave([...selected])}>
          {saving ? 'Asignando...' : 'Asignar ' + selected.size + ' tarea(s)'}
        </button>
      </div>
    </>
  )
}

function TreatmentForm({ library, saving, onSave, onClose }) {
  const [form, setForm] = useState({ product:'', dose:'', zone:'', session:'', date: new Date().toISOString().split('T')[0], notes:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Registrar tratamiento</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={sa.lbl}>Procedimiento</label>
          <select value={form.product} onChange={f('product')} style={sa.inp}>
            <option value="">Selecciona...</option>
            {library.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            <option value="otro">+ Otro</option>
          </select>
        </div>
        {form.product === 'otro' && <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Nombre</label><input value={form.customProduct || ''} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} style={sa.inp} /></div>}
        <div><label style={sa.lbl}>Dosis / duracion</label><input value={form.dose} onChange={f('dose')} placeholder="2 ml / 60 min" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Zona tratada</label><input value={form.zone} onChange={f('zone')} placeholder="Cara y cuello" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Fecha</label><input type="date" value={form.date} onChange={f('date')} style={sa.inp} /></div>
        <div><label style={sa.lbl}>Sesion</label><input value={form.session} onChange={f('session')} placeholder="Sesion 2 de 3" style={sa.inp} /></div>
        <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Observaciones</label><textarea value={form.notes} onChange={f('notes')} rows={2} style={{ ...sa.inp, resize:'vertical' }} placeholder="Buena tolerancia..." /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar tratamiento'}</button>
      </div>
    </>
  )
}

function NoteForm({ saving, onSave, onClose, note }) {
  const [form, setForm] = useState({
    date: note?.note_date || new Date().toISOString().split('T')[0],
    visitType: note?.visit_type || 'Seguimiento',
    content: note?.content || '',
    pas: note?.pas || '', pad: note?.pad || '', spo2: note?.spo2 || '',
    o2device: note?.o2_device || 'aa', o2flow: note?.o2_flow || '',
    glucose: note?.glucose || '', hr: note?.heart_rate || ''
  })
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const pam = form.pas && form.pad
    ? Math.round((parseInt(form.pas) + 2 * parseInt(form.pad)) / 3)
    : null

  const DEVICES = ['aa','Canula nasal','Mascarilla simple','Mascarilla con reservorio','Ventimask','CPAP','BPAP','Tubo endotraqueal','Venturi']

  function vitalStatus(type, val) {
    const v = parseFloat(val)
    if (!val || isNaN(v)) return null
    if (type === 'pas') {
      if (v >= 140) return { icon:'🔴', msg:'Hipertension grado 1+' }
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

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Nueva nota clinica</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div><label style={sa.lbl}>Fecha</label><input type="date" value={form.date} onChange={f('date')} style={sa.inp} /></div>
        <div>
          <label style={sa.lbl}>Tipo de consulta</label>
          <select value={form.visitType} onChange={f('visitType')} style={sa.inp}>
            {['Seguimiento','Primera consulta','Procedimiento','Control'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background:'#f8f8f8', borderRadius:10, padding:12, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:500, color:'#666', marginBottom:10 }}>Signos vitales</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <label style={sa.lbl}>PAS (mmHg) <VitalBadge type="pas" val={form.pas} /></label>
            <input type="number" value={form.pas} onChange={f('pas')} placeholder="120" style={{ ...sa.inp, borderColor: vitalStatus('pas',form.pas)?.icon === '🔴' ? '#D85A30' : vitalStatus('pas',form.pas)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={sa.lbl}>PAD (mmHg) <VitalBadge type="pad" val={form.pad} /></label>
            <input type="number" value={form.pad} onChange={f('pad')} placeholder="80" style={{ ...sa.inp, borderColor: vitalStatus('pad',form.pad)?.icon === '🔴' ? '#D85A30' : vitalStatus('pad',form.pad)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={sa.lbl}>PAM (mmHg)</label>
            <input value={pam !== null ? pam + ' mmHg' : ''} readOnly placeholder="Auto"
              style={{ ...sa.inp, background:'#eee', color:'#666', cursor:'not-allowed' }} />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <label style={sa.lbl}>SpO2 (%) <VitalBadge type="spo2" val={form.spo2} /></label>
            <input type="number" value={form.spo2} onChange={f('spo2')} placeholder="98" style={{ ...sa.inp, borderColor: vitalStatus('spo2',form.spo2)?.icon === '🔴' ? '#D85A30' : vitalStatus('spo2',form.spo2)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={sa.lbl}>O2 / Dispositivo</label>
            <select value={form.o2device} onChange={f('o2device')} style={sa.inp}>
              {DEVICES.map(d => <option key={d} value={d}>{d === 'aa' ? 'Aire ambiente' : d}</option>)}
            </select>
          </div>
          <div>
            <label style={sa.lbl}>Flujo O2 (L/min)</label>
            <input type="number" value={form.o2flow} onChange={f('o2flow')} placeholder="2"
              disabled={form.o2device === 'aa'}
              style={{ ...sa.inp, background: form.o2device === 'aa' ? '#eee' : '#fff', cursor: form.o2device === 'aa' ? 'not-allowed' : 'text' }} />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={sa.lbl}>Glicemia (mg/dL) <VitalBadge type="glucose" val={form.glucose} /></label>
            <input type="number" value={form.glucose} onChange={f('glucose')} placeholder="90" style={{ ...sa.inp, borderColor: vitalStatus('glucose',form.glucose)?.icon === '🔴' ? '#D85A30' : vitalStatus('glucose',form.glucose)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={sa.lbl}>FC (lpm) <VitalBadge type="hr" val={form.hr} /></label>
            <input type="number" value={form.hr} onChange={f('hr')} placeholder="72" style={{ ...sa.inp, borderColor: vitalStatus('hr',form.hr)?.icon === '🔴' ? '#D85A30' : vitalStatus('hr',form.hr)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={sa.lbl}>Nota clinica</label>
        <textarea value={form.content} onChange={f('content')} rows={4} style={{ ...sa.inp, resize:'vertical' }} placeholder="Paciente refiere..." />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave({ ...form, pam })}>
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>
    </>
  )
}

const sa = {
  btnPrimary: { background:'#1D9E75', color:'#fff', border:'none', fontSize:14, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5 },
  btnCancel:  { background:'none', border:'1px solid #e0e0e0', fontSize:14, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  lbl:        { display:'block', fontSize:14, color:'#666', marginBottom:4, fontWeight:500 },
  inp:        { width:'100%', padding:'8px 10px', fontSize:14, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' },
}


function CareModulesAdmin({ patient, doctors, onModulesUpdated }) {
  const G = '#0F6E56'
  const [modules, setModules] = useState([])
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)

  const MODULE_TYPES = [
    { key:'integral', label:'Atención médica integral' },
    { key:'metabolica', label:'Atención médica metabólica' },
    { key:'estetica', label:'Atención médica estética' },
    { key:'fisioterapia', label:'Atención de fisioterapia' },
    { key:'enfermeria', label:'Atención de enfermería' },
  ]

  useEffect(() => { if (patient?.id) loadModules() }, [patient])

  async function loadModules() {
    const { data } = await supabase.from('patient_care_modules')
      .select('*').eq('patient_id', patient.id)
    setModules(data || [])
  }

  function getModule(type) {
    return modules.find(m => m.module_type === type)
  }

  async function toggleModule(type) {
    const existing = getModule(type)
    setSaving(type)
    if (existing) {
      await supabase.from('patient_care_modules').update({ is_active: !existing.is_active }).eq('id', existing.id)
    } else {
      await supabase.from('patient_care_modules').insert({
        patient_id: patient.id,
        module_type: type,
        is_active: true,
      })
    }
    await loadModules()
    if (onModulesUpdated) onModulesUpdated()
    setSaving(null); setSaved(type); setTimeout(() => setSaved(null), 2000)
  }

  async function assignProfessional(type, professionalId) {
    const existing = getModule(type)
    setSaving(type + '_prof')
    if (existing) {
      await supabase.from('patient_care_modules').update({ assigned_professional_id: professionalId || null }).eq('id', existing.id)
      // Si es integral, también actualizar assigned_doctor_id en patients
      if (type === 'integral') {
        await supabase.from('patients').update({ assigned_doctor_id: professionalId || null }).eq('id', patient.id)
      }
    }
    await loadModules()
    setSaving(null); setSaved(type + '_prof'); setTimeout(() => setSaved(null), 2000)
  }

  const inp = { width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Módulos de atención</div>
      <div style={{ fontSize:12, color:'#888', marginBottom:14 }}>
        Activá los módulos de atención asignados a este paciente y asigná un profesional a cada uno.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {MODULE_TYPES.map(m => {
          const mod = getModule(m.key)
          const isActive = mod?.is_active || false
          return (
            <div key={m.key} style={{ background:'#fff', border: isActive ? `1.5px solid ${G}` : '1px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: isActive ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: isActive ? G : '#555' }}>{m.label}</div>
                  {!isActive && <div style={{ fontSize:11, color:'#bbb' }}>No asignado</div>}
                </div>
                <div onClick={() => toggleModule(m.key)}
                  style={{ width:40, height:22, borderRadius:11, cursor:'pointer', transition:'background 0.2s', position:'relative', background: isActive ? G : '#e0e0e0', flexShrink:0 }}>
                  <div style={{ position:'absolute', width:16, height:16, borderRadius:'50%', background:'#fff', top:3, left: isActive ? 21 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {isActive && (
                <div>
                  <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>Profesional asignado</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <select style={{ ...inp, flex:1 }}
                      value={mod?.assigned_professional_id || ''}
                      onChange={e => assignProfessional(m.key, e.target.value)}>
                      <option value="">Sin asignar</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.sex === 'female' ? 'Dra.' : 'Dr.'} {d.first_name} {d.last_name} · {d.specialty || ''}
                        </option>
                      ))}
                    </select>
                    {saving === m.key + '_prof' && <span style={{ fontSize:12, color:'#aaa', alignSelf:'center' }}>Guardando...</span>}
                    {saved === m.key + '_prof' && <span style={{ fontSize:12, color:G, alignSelf:'center' }}>✓</span>}
                  </div>
                  {!mod?.assigned_professional_id && (
                    <div style={{ fontSize:11, color:'#e67e22', marginTop:4 }}>
                      Aún no ha sido asignado un profesional para esta categoría
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
