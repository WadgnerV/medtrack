import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import UserMenu from '../components/UserMenu'

const G = '#1D9E75'
const SP = ' '

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('dashboard')
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
  const [selDate, setSelDate] = useState(null)
  const [selDoctor, setSelDoctor] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadDoctors(), loadPatients(), loadAppts(), loadMsgs(), loadLibrary(), loadPerms()])
    setLoading(false)
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
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { first_name: form.firstName, last_name: form.lastName, role } }
    })
    if (error) { setFormError(error.message); setSaving(false); return }
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
    setModal(null)
  }

  async function saveAppt(form) {
    setSaving(true)
    const payload = { patient_id: form.patientId, doctor_id: form.doctorId, appointment_date: form.date, appointment_time: form.time, visit_type: form.visitType, duration_min: parseInt(form.duration), notes: form.notes, status: 'scheduled', created_by: profile?.id }
    if (form.id) await supabase.from('appointments').update(payload).eq('id', form.id)
    else await supabase.from('appointments').insert(payload)
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

  async function sendMessage() {
    if (!chatMsg.trim() || !activeChat) return
    await supabase.from('messages').insert({ patient_id: activeChat.patientId, sender_id: profile?.id, content: chatMsg.trim(), sender_role: 'doctor', is_read: true })
    setChatMsg(''); await loadMsgs()
  }

  function apptsByDate(dateStr) {
    return appts.filter(a => a.appointment_date === dateStr && a.status !== 'cancelled').sort((a,b) => a.appointment_time.localeCompare(b.appointment_time))
  }

  function doctorColor(doctorId) {
    const colors = ['#1D9E75','#185FA5','#BA7517','#9F47A0','#D85A30']
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
                <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Eliminar {modalData.type}</div>
                <p style={{ fontSize:13, color:'#666', marginBottom:18, lineHeight:1.6 }}>Se eliminara permanentemente "{modalData.name}". Esta accion no se puede deshacer.</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={s.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
                  <button style={{ flex:1, padding:8, fontSize:12, fontWeight:500, background:'#D85A30', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', opacity:saving?0.7:1 }}
                    disabled={saving} onClick={() => deleteRecord(modalData.type, modalData.id)}>
                    {saving ? 'Eliminando...' : 'Si, eliminar'}
                  </button>
                </div>
              </>
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
                saving={saving} error={formError} defaultDate={selDate}
                onSave={saveAppt} onClose={() => setModal(null)} />
            )}
            {modal === 'new-library' && (
              <LibraryForm saving={saving} onSave={addLibraryItem} onClose={() => setModal(null)} />
            )}
          </div>
        </div>
      )}

      <div style={{ width:210, minWidth:210, background:'#fff', borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column', overflowY:'auto' }}>
        <div style={{ padding:'16px 14px 12px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>+</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', letterSpacing:'0.03em' }}>MEDTRACK</div>
            <div style={{ fontSize:9, color:'#999' }}>by Glow Clinic</div>
          </div>
        </div>

        {[
          { section:'Principal', items:[{ icon:'D', label:'Dashboard', key:'dashboard' }] },
          { section:'Usuarios', items:[{ icon:'M', label:'Medicos', key:'medicos', badge:doctors.length }, { icon:'P', label:'Pacientes', key:'pacientes', badge:patients.length }] },
          { section:'Clinica', items:[{ icon:'C', label:'Calendario', key:'calendario', badge:appts.filter(a => a.status === 'scheduled').length }, { icon:'H', label:'Chat', key:'chat', badge:pendingCount, badgeRed:true }, { icon:'R', label:'Reportes', key:'reportes' }] },
          { section:'Sistema', items:[{ icon:'B', label:'Biblioteca', key:'biblioteca' }, { icon:'K', label:'Permisos', key:'permisos' }, { icon:'G', label:'Configuracion', key:'config' }] },
        ].map(group => (
          <div key={group.section}>
            <div style={{ fontSize:10, fontWeight:500, color:'#bbb', letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 14px 4px' }}>{group.section}</div>
            {group.items.map(item => (
              <div key={item.key} onClick={() => setView(item.key)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', cursor:'pointer', fontSize:12, borderLeft: view === item.key ? ('2px solid ' + G) : '2px solid transparent', background: view === item.key ? '#E1F5EE' : 'transparent', color: view === item.key ? '#0F6E56' : '#666', fontWeight: view === item.key ? 500 : 400 }}>
                {item.label}
                {item.badge > 0 && <span style={{ marginLeft:'auto', fontSize:10, background: item.badgeRed ? '#D85A30' : G, color:'#fff', borderRadius:10, padding:'1px 6px', fontWeight:500 }}>{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}

        <UserMenu />
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <div style={{ padding:'12px 18px', borderBottom:'0.5px solid #eee', background:'#fff', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>
              {{ dashboard:'Dashboard', medicos:'Medicos', pacientes:'Pacientes', calendario:'Calendario', chat:'Chat', reportes:'Reportes', biblioteca:'Biblioteca', permisos:'Permisos', config:'Configuracion' }[view]}
            </div>
            <div style={{ fontSize:11, color:'#999', marginTop:1 }}>Glow Clinic</div>
          </div>
          {view === 'medicos'    && <button style={s.btnPrimary} onClick={() => { setFormError(''); setModal('new-doctor') }}>+ Nuevo medico</button>}
          {view === 'pacientes'  && <button style={s.btnPrimary} onClick={() => { setFormError(''); setModal('new-patient') }}>+ Nuevo paciente</button>}
          {view === 'calendario' && <button style={s.btnPrimary} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Nueva cita</button>}
          {view === 'biblioteca' && <button style={s.btnPrimary} onClick={() => setModal('new-library')}>+ Nuevo item</button>}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>

          {view === 'dashboard' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                {[
                  { l:'Total pacientes', v:patients.length, d:patients.filter(p => p.status === 'active').length + ' activos' },
                  { l:'Medicos activos', v:doctors.length, d:doctors.filter(d => d.role === 'doctor').length + ' colaboradores' },
                  { l:'Citas programadas', v:appts.filter(a => a.status === 'scheduled').length, d:'proximas' },
                  { l:'Chats pendientes', v:pendingCount, d:'sin leer', c:'#D85A30' },
                ].map((m,i) => (
                  <div key={i} style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:22, fontWeight:500, color:m.c || '#1a1a1a' }}>{m.v}</div>
                    <div style={{ fontSize:11, color:'#999', marginTop:3 }}>{m.d}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Pacientes por medico</div>
                  {doctors.map(d => {
                    const count = patients.filter(p => p.doctor?.id === d.id).length
                    const pct = patients.length ? (count / patients.length * 100) : 0
                    return (
                      <div key={d.id} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                          <span style={{ color:'#444' }}>{d.first_name} {d.last_name}</span>
                          <span style={{ fontWeight:500 }}>{count} pac.</span>
                        </div>
                        <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                          <div style={{ height:'100%', background:G, borderRadius:3, width:pct + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Proximas citas</div>
                  {appts.filter(a => a.status === 'scheduled').slice(0,5).map(a => (
                    <div key={a.id} style={{ borderBottom:'0.5px solid #f0f0f0', padding:'7px 0', fontSize:12 }}>
                      <div style={{ fontWeight:500, color:'#1a1a1a' }}>{a.patient?.profile?.first_name} {a.patient?.profile?.last_name}</div>
                      <div style={{ color:'#888', marginTop:2 }}>{a.appointment_date} - {a.appointment_time?.substring(0,5)}</div>
                    </div>
                  ))}
                  {appts.filter(a => a.status === 'scheduled').length === 0 && <div style={{ fontSize:12, color:'#999', textAlign:'center', padding:20 }}>Sin citas programadas</div>}
                </div>
              </div>
            </div>
          )}

          {view === 'medicos' && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
              <div style={{ display:'flex', padding:'9px 14px', background:'#f8f8f8', fontSize:10, fontWeight:500, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                <div style={{ flex:'0 0 40%' }}>Medico</div>
                <div style={{ flex:'0 0 16%' }}>Rol</div>
                <div style={{ flex:'0 0 14%' }}>Pac.</div>
                <div style={{ flex:'0 0 14%' }}>Estado</div>
                <div style={{ flex:'0 0 16%', textAlign:'right' }}>Acciones</div>
              </div>
              {doctors.map(d => (
                <div key={d.id} style={{ display:'flex', padding:'11px 14px', borderTop:'0.5px solid #f0f0f0', alignItems:'center' }}>
                  <div style={{ flex:'0 0 40%', display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:500, flexShrink:0 }}>{initials(d.first_name + SP + d.last_name)}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.first_name} {d.last_name}</div>
                      <div style={{ fontSize:10, color:'#999', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.email}</div>
                    </div>
                  </div>
                  <div style={{ flex:'0 0 16%' }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500, background: d.role === 'admin' ? '#E1F5EE' : '#E6F1FB', color: d.role === 'admin' ? '#0F6E56' : '#185FA5' }}>{d.role === 'admin' ? 'Admin' : 'Colaborador'}</span>
                  </div>
                  <div style={{ flex:'0 0 14%', fontSize:12, color:'#666' }}>{patients.filter(p => p.doctor?.id === d.id).length}</div>
                  <div style={{ flex:'0 0 14%' }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500, background:'#E1F5EE', color:'#0F6E56' }}>activo</span>
                  </div>
                  <div style={{ flex:'0 0 16%', display:'flex', justifyContent:'flex-end', gap:4 }}>
                    {d.role !== 'admin' && (
                      <>
                        <button style={s.iconBtn} onClick={() => setView('permisos')}>P</button>
                        <button style={s.iconBtn}>E</button>
                        <button style={s.iconBtnDel} onClick={() => openDelete('doctor', d.id, d.first_name + SP + d.last_name)}>X</button>
                      </>
                    )}
                    {d.role === 'admin' && <button style={s.iconBtn}>E</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'pacientes' && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
              <div style={{ display:'flex', padding:'9px 14px', background:'#f8f8f8', fontSize:10, fontWeight:500, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                <div style={{ flex:'0 0 34%' }}>Paciente</div>
                <div style={{ flex:'0 0 10%' }}>Edad</div>
                <div style={{ flex:'0 0 22%' }}>Medico</div>
                <div style={{ flex:'0 0 14%' }}>Estado</div>
                <div style={{ flex:'0 0 20%', textAlign:'right' }}>Acciones</div>
              </div>
              {patients.map(p => (
                <div key={p.id} style={{ display:'flex', padding:'10px 14px', borderTop:'0.5px solid #f0f0f0', alignItems:'center' }}>
                  <div style={{ flex:'0 0 34%', display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:500, flexShrink:0 }}>{initials(pName(p))}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pName(p)}</div>
                      <div style={{ fontSize:10, color:'#999' }}>{p.specialty_type || '--'}</div>
                    </div>
                  </div>
                  <div style={{ flex:'0 0 10%', fontSize:12, color:'#666' }}>{age(p.birth_date)}</div>
                  <div style={{ flex:'0 0 22%', fontSize:12, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.doctor ? dName(p.doctor) : 'Sin asignar'}</div>
                  <div style={{ flex:'0 0 14%' }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500, background: p.status === 'active' ? '#E1F5EE' : '#FAEEDA', color: p.status === 'active' ? '#0F6E56' : '#854F0B' }}>{p.status === 'active' ? 'activo' : 'pendiente'}</span>
                  </div>
                  <div style={{ flex:'0 0 20%', display:'flex', justifyContent:'flex-end', gap:4 }}>
                    <button style={s.iconBtn} onClick={() => { setModal('assign'); setModalData({ patient:p }) }}>R</button>
                    <button style={s.iconBtnDel} onClick={() => openDelete('patient', p.id, pName(p))}>X</button>
                  </div>
                </div>
              ))}
              {patients.length === 0 && <div style={{ padding:30, textAlign:'center', fontSize:13, color:'#999' }}>No hay pacientes registrados</div>}
            </div>
          )}

          {view === 'calendario' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:14, height:'calc(100vh - 130px)' }}>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'0.5px solid #eee' }}>
                  <button style={s.calNavBtn} onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}>{'<'}</button>
                  <div style={{ fontSize:14, fontWeight:500 }}>{MONTHS[calMonth]} {calYear}</div>
                  <button style={s.calNavBtn} onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}>{'>'}</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'8px 10px 4px' }}>
                  {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:500, color:'#999', textTransform:'uppercase' }}>{d}</div>)}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 10px 10px', gap:2, flex:1 }}>
                  {renderCalendar().map((cell, i) => {
                    const dayAppts = cell.dateStr ? apptsByDate(cell.dateStr) : []
                    return (
                      <div key={i} onClick={() => cell.dateStr && setSelDate(cell.dateStr)}
                        style={{ minHeight:60, padding:5, borderRadius:6, cursor: cell.dateStr ? 'pointer' : 'default', opacity: cell.current ? 1 : 0.3, background: cell.isSelected ? '#E1F5EE' : cell.isToday ? '#f0fdf9' : 'transparent', border: cell.isToday ? ('1px solid ' + G) : '1px solid transparent' }}>
                        <div style={{ fontSize:11, color: cell.isToday ? G : '#666', fontWeight: cell.isToday ? 600 : 400, marginBottom:2 }}>{cell.day}</div>
                        {dayAppts.slice(0,2).map(a => (
                          <div key={a.id} style={{ fontSize:9, padding:'1px 3px', borderRadius:2, color:'#fff', marginBottom:1, background: doctorColor(a.doctor_id), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {a.appointment_time?.substring(0,5)} {a.patient?.profile?.first_name}
                          </div>
                        ))}
                        {dayAppts.length > 2 && <div style={{ fontSize:9, color:'#999' }}>+{dayAppts.length-2}</div>}
                      </div>
                    )
                  })}
                </div>
                <div style={{ padding:'6px 16px', borderTop:'0.5px solid #eee', display:'flex', gap:12 }}>
                  {doctors.slice(0,4).map(d => (
                    <div key={d.id} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#888' }}>
                      <div style={{ width:8, height:8, borderRadius:2, background: doctorColor(d.id) }} />
                      {d.first_name}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ padding:'12px 14px', borderBottom:'0.5px solid #eee' }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>
                    {selDate ? (DAYS_FULL[new Date(selDate + 'T12:00:00').getDay()] + ' ' + new Date(selDate + 'T12:00:00').getDate() + ' de ' + MONTHS[new Date(selDate + 'T12:00:00').getMonth()]) : 'Selecciona un dia'}
                  </div>
                  <div style={{ fontSize:11, color:'#999', marginTop:1 }}>{selDate ? (apptsByDate(selDate).length + ' citas') : ''}</div>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:10 }}>
                  {!selDate && <div style={{ textAlign:'center', padding:30, fontSize:12, color:'#999' }}>Haz clic en un dia del calendario</div>}
                  {selDate && apptsByDate(selDate).length === 0 && (
                    <div style={{ textAlign:'center', padding:20, fontSize:12, color:'#999' }}>
                      <div style={{ marginBottom:10 }}>Sin citas para este dia</div>
                      <button style={s.btnPrimary} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Agendar cita</button>
                    </div>
                  )}
                  {selDate && apptsByDate(selDate).map(a => (
                    <div key={a.id} style={{ background:'#f8f8f8', borderRadius:8, padding:10, marginBottom:8, borderLeft:'3px solid ' + doctorColor(a.doctor_id) }}>
                      <div style={{ fontSize:10, color:'#999', marginBottom:3 }}>{a.appointment_time?.substring(0,5)} hrs</div>
                      <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>{a.patient?.profile?.first_name} {a.patient?.profile?.last_name}</div>
                      <div style={{ fontSize:11, color:'#666' }}>{a.visit_type}</div>
                      <div style={{ display:'flex', gap:5, marginTop:6 }}>
                        <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:'#fff', color:'#888', border:'0.5px solid #eee' }}>{a.duration_min} min</span>
                        <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:'#fff', color:'#888', border:'0.5px solid #eee' }}>{a.doctor?.first_name}</span>
                      </div>
                      {a.notes && <div style={{ fontSize:11, color:'#888', marginTop:5, fontStyle:'italic' }}>{a.notes}</div>}
                      <div style={{ display:'flex', gap:5, marginTop:7 }}>
                        <button style={{ fontSize:11, padding:'3px 9px', borderRadius:6, border:'none', cursor:'pointer', background:'#E6F1FB', color:'#185FA5' }}
                          onClick={() => { setModal('edit-appt'); setModalData({ appt:a }) }}>Editar</button>
                        <button style={{ fontSize:11, padding:'3px 9px', borderRadius:6, border:'none', cursor:'pointer', background:'#FAECE7', color:'#D85A30' }}
                          onClick={() => openDelete('appointment', a.id, 'cita')}>Cancelar</button>
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
                <div style={{ padding:'11px 12px', borderBottom:'0.5px solid #eee', fontSize:12, fontWeight:500, color:'#1a1a1a' }}>
                  Conversaciones
                  {pendingCount > 0 && <span style={{ marginLeft:8, background:'#D85A30', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:500 }}>{pendingCount}</span>}
                </div>
                <div style={{ flex:1, overflowY:'auto' }}>
                  {pendingChats().map(c => {
                    const last = c.msgs[0]
                    const unread = c.msgs.filter(m => !m.is_read && m.sender_role === 'patient').length
                    return (
                      <div key={c.patientId} onClick={() => setActiveChat(c)}
                        style={{ padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', cursor:'pointer', background: activeChat?.patientId === c.patientId ? '#E1F5EE' : 'transparent' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                          <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>{c.name || 'Paciente'}</div>
                          {unread > 0 && <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', marginTop:4 }} />}
                        </div>
                        <div style={{ fontSize:11, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last?.content}</div>
                      </div>
                    )
                  })}
                  {pendingChats().length === 0 && <div style={{ padding:20, textAlign:'center', fontSize:12, color:'#999' }}>Sin conversaciones</div>}
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
                          <div style={{ maxWidth:'78%', padding:'8px 11px', borderRadius:12, fontSize:12, lineHeight:1.5, background: m.sender_role === 'doctor' ? G : '#f0f0f0', color: m.sender_role === 'doctor' ? '#fff' : '#1a1a1a' }}>
                            {m.content}
                          </div>
                          <div style={{ fontSize:10, color:'#999', marginTop:2 }}>{new Date(m.created_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:'10px 12px', borderTop:'0.5px solid #eee', display:'flex', gap:8 }}>
                      <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                        placeholder="Escribe tu respuesta..."
                        style={{ flex:1, padding:'8px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                      <button onClick={sendMessage} style={{ width:32, height:32, borderRadius:'50%', background:G, border:'none', cursor:'pointer', color:'#fff', fontSize:14 }}>{'>'}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {view === 'reportes' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                {[{ l:'Total pacientes', v:patients.length }, { l:'Citas este mes', v:appts.filter(a => a.appointment_date?.startsWith(new Date().toISOString().substring(0,7))).length }, { l:'Mensajes totales', v:msgs.length }, { l:'Medicos activos', v:doctors.length }].map((m,i) => (
                  <div key={i} style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:22, fontWeight:500, color:'#1a1a1a' }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Pacientes por provincia</div>
                  {[...new Set(patients.map(p => p.province).filter(Boolean))].map(prov => {
                    const count = patients.filter(p => p.province === prov).length
                    const pct = patients.length ? (count / patients.length * 100) : 0
                    return (
                      <div key={prov} style={{ marginBottom:9 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                          <span style={{ color:'#444' }}>{prov}</span><span style={{ fontWeight:500 }}>{count}</span>
                        </div>
                        <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                          <div style={{ height:'100%', background:G, borderRadius:3, width: pct + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                  {patients.filter(p => p.province).length === 0 && <div style={{ fontSize:12, color:'#999', textAlign:'center', padding:20 }}>Sin datos de provincia aun</div>}
                </div>
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Distribucion por sexo</div>
                  {['female','male','other'].map(sx => {
                    const count = patients.filter(p => p.sex === sx).length
                    const pct = patients.length ? (count / patients.length * 100) : 0
                    const labels = { female:'Femenino', male:'Masculino', other:'Otro' }
                    const colors = { female:G, male:'#185FA5', other:'#BA7517' }
                    return (
                      <div key={sx} style={{ marginBottom:9 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {['task','treatment'].map(type => (
                <div key={type} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>{type === 'task' ? 'Tareas' : 'Tratamientos'} ({library.filter(l => l.type === type).length})</div>
                  {library.filter(l => l.type === type).map(item => (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border:'0.5px solid #eee', marginBottom:5, background:'#fafafa' }}>
                      <span style={{ fontSize:12, flex:1, color:'#1a1a1a' }}>{item.name}</span>
                      {item.category && <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888', whiteSpace:'nowrap' }}>{item.category}</span>}
                      <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#D85A30' }}
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
                    <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>{d.first_name} {d.last_name}</div>
                    <div style={{ fontSize:11, color:'#999' }}>Colaborador</div>
                  </div>
                ))}
                {doctors.filter(d => d.role === 'doctor').length === 0 && <div style={{ fontSize:13, color:'#999' }}>No hay medicos colaboradores registrados</div>}
              </div>
              {selDoctor && (() => {
                const perm = perms.find(p => p.doctor_id === selDoctor)
                if (!perm) return <div style={{ fontSize:13, color:'#999' }}>Sin permisos registrados</div>
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
                    <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Permisos - {doctors.find(d => d.id === selDoctor)?.first_name} {doctors.find(d => d.id === selDoctor)?.last_name}</div>
                    {fields.map(f => (
                      <div key={f.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                        <span style={{ fontSize:12, color:'#444' }}>{f.label}</span>
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
              <div style={{ fontSize:13, fontWeight:500, marginBottom:16 }}>Configuracion de la clinica</div>
              {[{ l:'Nombre de la clinica', v:'Glow Clinic' }, { l:'WhatsApp de agenda', v:'+506 6046-4569' }, { l:'Correo de contacto', v:'info@glowclinic.com' }, { l:'Nombre en app', v:'Glow Clinic', d:'Aparece como MEDTRACK by [nombre]' }].map((row,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>{row.l}</div>
                    {row.d && <div style={{ fontSize:11, color:'#999' }}>{row.d}</div>}
                  </div>
                  <input defaultValue={row.v} style={{ padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', width:200 }} />
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0' }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>Color principal</div>
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
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', specialty:'', doctorId:'', birthDate:'', height:'', sex:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>{type === 'doctor' ? 'Nuevo medico colaborador' : 'Nuevo paciente'}</div>
      {error && <div style={{ background:'#FAECE7', color:'#C24B2A', fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:12 }}>{error}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <Field label="Nombre" value={form.firstName} onChange={f('firstName')} placeholder="Maria" />
        <Field label="Apellido" value={form.lastName} onChange={f('lastName')} placeholder="Rodriguez" />
        <div style={{ gridColumn:'1/-1' }}><Field label="Correo electronico" value={form.email} onChange={f('email')} type="email" placeholder="correo@ejemplo.com" /></div>
        <div style={{ gridColumn:'1/-1' }}><Field label="Contrasena temporal" value={form.password} onChange={f('password')} type="password" placeholder="Minimo 6 caracteres" /></div>
        {type === 'doctor' && <div style={{ gridColumn:'1/-1' }}><Field label="Especialidad" value={form.specialty} onChange={f('specialty')} placeholder="Medicina estetica" /></div>}
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
              <label style={s.fieldLabel}>Medico asignado</label>
              <select value={form.doctorId} onChange={f('doctorId')} style={s.fieldInput}>
                <option value="">Sin asignar</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
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
      <div style={{ background:'#f8f8f8', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:12, color:'#444' }}>
        <strong>{name}</strong> - actualmente: {patient.doctor ? (patient.doctor.first_name + ' ' + patient.doctor.last_name) : 'Sin asignar'}
      </div>
      {doctors.map(d => (
        <div key={d.id} onClick={() => setSel(d.id)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:8, border: '1px solid ' + (sel === d.id ? '#1D9E75' : '#eee'), background: sel === d.id ? '#E1F5EE' : '#fff', marginBottom:6, cursor:'pointer' }}>
          <div style={{ fontSize:12, fontWeight:500, flex:1 }}>{d.first_name} {d.last_name}</div>
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

function ApptForm({ appt, patients, doctors, saving, error, defaultDate, onSave, onClose }) {
  const [form, setForm] = useState({ id:appt?.id||null, patientId:appt?.patient_id||'', doctorId:appt?.doctor_id||'', date:appt?.appointment_date||defaultDate||'', time:appt?.appointment_time?.substring(0,5)||'09:00', visitType:appt?.visit_type||'Consulta de seguimiento', duration:appt?.duration_min||30, notes:appt?.notes||'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))
  const pn = p => ((p.profile?.first_name || '') + ' ' + (p.profile?.last_name || '')).trim()
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>{appt ? 'Editar cita' : 'Nueva cita'}</div>
      {error && <div style={{ background:'#FAECE7', color:'#C24B2A', fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:12 }}>{error}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.fieldLabel}>Paciente</label>
          <select value={form.patientId} onChange={f('patientId')} style={s.fieldInput}>
            <option value="">Selecciona un paciente...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{pn(p)}</option>)}
          </select>
        </div>
        <Field label="Fecha" value={form.date} onChange={f('date')} type="date" />
        <Field label="Hora" value={form.time} onChange={f('time')} type="time" />
        <div>
          <label style={s.fieldLabel}>Tipo de consulta</label>
          <select value={form.visitType} onChange={f('visitType')} style={s.fieldInput}>
            {['Consulta de seguimiento','Primera consulta','Procedimiento estetico','Control de composicion corporal','Aplicacion de tratamiento','Control GLP-1'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={s.fieldLabel}>Duracion (min)</label>
          <select value={form.duration} onChange={f('duration')} style={s.fieldInput}>
            {[30,45,60,90].map(v => <option key={v} value={v}>{v} min</option>)}
          </select>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.fieldLabel}>Medico asignado</label>
          <select value={form.doctorId} onChange={f('doctorId')} style={s.fieldInput}>
            <option value="">Selecciona...</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
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
  btnPrimary: { background:'#1D9E75', color:'#fff', border:'none', fontSize:12, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' },
  btnCancel:  { background:'none', border:'1px solid #e0e0e0', fontSize:12, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  iconBtn:    { background:'#E6F1FB', color:'#185FA5', border:'none', cursor:'pointer', fontSize:11, fontWeight:500, padding:'4px 8px', borderRadius:6 },
  iconBtnDel: { background:'#FAECE7', color:'#D85A30', border:'none', cursor:'pointer', fontSize:11, fontWeight:500, padding:'4px 8px', borderRadius:6 },
  calNavBtn:  { background:'none', border:'1px solid #eee', borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#666' },
  fieldLabel: { display:'block', fontSize:11, color:'#666', marginBottom:4, fontWeight:500 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' },
}
