import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SpotifyBar from '../components/SpotifyBar'
import { useAuth } from '../context/AuthContext'

const G = '#1D9E75'

const s = {
  wrap: { display:'flex', height:'100vh', fontFamily:'"Inter", system-ui, sans-serif', background:'#f5f5f5' },
  sidebar: { width:220, background:'#fff', borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column', flexShrink:0 },
  sideHeader: { padding:'20px 20px 16px', borderBottom:'0.5px solid #f0f0f0' },
  logoWrap: { display:'flex', alignItems:'center', gap:10, marginBottom:2 },
  logoIcon: { width:30, height:30, borderRadius:8, background:G, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14 },
  logoTitle: { fontSize:15, fontWeight:700, color:'#1a1a1a' },
  logoSub: { fontSize:11, color:'#999' },
  menuSection: { padding:'12px 12px 4px', fontSize:10, fontWeight:600, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.08em' },
  menuItem: { margin:'1px 8px', padding:'9px 12px', fontSize:13, cursor:'pointer', borderRadius:8, display:'flex', alignItems:'center', gap:10 },
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar: { background:'#fff', borderBottom:'0.5px solid #eee', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  pageTitle: { fontSize:16, fontWeight:600, color:'#1a1a1a' },
  pageSub: { fontSize:13, color:'#999' },
  content: { flex:1, overflowY:'auto', padding:24 },
  btnPrimary: { background:G, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  btnCancel: { background:'none', border:'1px solid #e0e0e0', fontSize:13, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  btnDanger: { background:'none', border:'1px solid #D85A30', color:'#D85A30', fontSize:12, padding:'5px 10px', borderRadius:6, cursor:'pointer' },
  btnEdit: { background:'#f0f0f0', border:'none', color:'#555', fontSize:12, padding:'5px 10px', borderRadius:6, cursor:'pointer' },
  card: { background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' },
  fieldLabel: { fontSize:12, color:'#666', marginBottom:4, display:'block' },
  fieldInput: { width:'100%', padding:'8px 10px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 },
  modalBox: { background:'#fff', borderRadius:14, padding:28, width:480, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.12)' },
  badge: { fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 },
}

const MODULE_LABELS = { integral:'Atención Integral', metabolica:'Atención Metabólica', estetica:'Atención Estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }
const MODULE_COLORS = { integral:'#1D9E75', metabolica:'#185FA5', estetica:'#8e44ad', fisioterapia:'#BA7517', enfermeria:'#D85A30' }

export default function ReceptionistDashboard() {
  const { profile, signOut } = useAuth()
  const [view, setView] = useState(() => localStorage.getItem('recepView') || 'calendario')
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [appts, setAppts] = useState([])
  const [enabledModules, setEnabledModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selDate, setSelDate] = useState('')
  const [calView, setCalView] = useState('semana')
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date(); const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const start = new Date(now); start.setDate(now.getDate() + diff); start.setHours(0,0,0,0)
    return start
  })
  const [currentTime, setCurrentTime] = useState(new Date())

  function setViewPersist(v) { localStorage.setItem('recepView', v); setView(v) }

  useEffect(() => { if (profile?.clinic_id) loadAll() }, [profile?.clinic_id])
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(t) }, [])

  async function loadAll() {
    setLoading(true)
    const clinicId = profile.clinic_id
    const [{ data: pats }, { data: docs }, { data: apts }, { data: clinic }] = await Promise.all([
      supabase.from('patients').select('id, status, birth_date, sex, profile:profile_id(id, first_name, last_name, email, phone)').eq('clinic_id', clinicId),
      supabase.from('profiles').select('*').in('role', ['admin','doctor']).eq('clinic_id', clinicId).eq('is_active', true),
      supabase.from('appointments').select('*, patient:patient_id(id, profile:profile_id(first_name, last_name)), doctor:doctor_id(id, first_name, last_name)').eq('clinic_id', clinicId).order('appointment_date').order('appointment_time'),
      supabase.from('clinics').select('enabled_modules').eq('id', clinicId).single(),
    ])
    setPatients((pats||[]).sort((a,b) => (a.profile?.last_name||'').localeCompare(b.profile?.last_name||'')))
    setDoctors(docs||[])
    setAppts(apts||[])
    setEnabledModules(clinic?.enabled_modules || [])
    setLoading(false)
  }

  async function saveAppt(form) {
    setSaving(true)
    const payload = { patient_id: form.patientId, doctor_id: form.doctorId, appointment_date: form.date, appointment_time: form.time, visit_type: form.visitType || 'Consulta', duration_min: parseInt(form.duration)||30, notes: form.notes||'', status: form.status||'pending_confirmation', module_type: form.moduleType||null, clinic_id: profile.clinic_id, created_by: profile.id }
    
    const prevAppt = form.id ? appts.find(a => a.id === form.id) : null
    const prevStatus = prevAppt?.status || null

    if (form.id) {
      await supabase.from('appointments').update(payload).eq('id', form.id)
      const pat = patients.find(p => p.id === form.patientId)
      const doc = doctors.find(d => d.id === form.doctorId)
      // Correo reagendamiento
      const wasRescheduled = prevAppt && (
        prevAppt.appointment_date !== form.date ||
        prevAppt.appointment_time?.substring(0,5) !== form.time?.substring(0,5)
      )
      if (wasRescheduled && pat?.profile?.email) {
        await supabase.functions.invoke('appointment-rescheduled', {
          body: { patient_email: pat.profile.email, patient_name: `${pat.profile.first_name} ${pat.profile.last_name}`, doctor_name: `${doc?.prefix||'Dr.'} ${doc?.last_name} ${doc?.first_name}`, appointment_date: form.date, appointment_time: form.time }
        })
      }
      // Correo no-show
      if (form.status === 'no_show' && prevStatus !== 'no_show' && pat?.profile?.email) {
        await supabase.functions.invoke('appointment-noshow', {
          body: { patient_email: pat.profile.email, patient_name: `${pat.profile.first_name} ${pat.profile.last_name}`, doctor_name: `${doc?.prefix||'Dr.'} ${doc?.last_name} ${doc?.first_name}`, appointment_date: form.date, appointment_time: form.time }
        })
      }
    } else {
      await supabase.from('appointments').insert(payload)
      // Correo confirmación nueva cita
      const pat = patients.find(p => p.id === form.patientId)
      const doc = doctors.find(d => d.id === form.doctorId)
      if (pat?.profile?.email) {
        await supabase.functions.invoke('appointment-confirmation', {
          body: { patient_email: pat.profile.email, patient_name: `${pat.profile.first_name} ${pat.profile.last_name}`, doctor_name: `${doc?.prefix||'Dr.'} ${doc?.last_name} ${doc?.first_name}`, appointment_date: form.date, appointment_time: form.time }
        })
      }
    }

    const { data } = await supabase.from('appointments').select('*, patient:patient_id(id, profile:profile_id(first_name, last_name, email)), doctor:doctor_id(id, first_name, last_name, prefix)').eq('clinic_id', profile.clinic_id).order('appointment_date').order('appointment_time')
    setAppts(data||[]); setModal(null); setSaving(false)
  }

  async function cancelAppt(id) {
    if (!window.confirm('¿Cancelar esta cita?')) return
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
  }

  async function createPatient(form) {
    setSaving(true)
    const { data: authData } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { first_name: form.firstName, last_name: form.lastName, role: 'patient' } } })
    if (authData?.user?.id) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 600))
        const { data } = await supabase.from('patients').select('id').eq('profile_id', authData.user.id).single()
        if (data?.id) {
          await supabase.from('patients').update({ clinic_id: profile.clinic_id, status: 'active' }).eq('profile_id', authData.user.id)
          await supabase.from('profiles').update({ clinic_id: profile.clinic_id }).eq('id', authData.user.id)
          // Asignar módulo y doctor si se seleccionaron
          if (form.moduleType && form.doctorId) {
            await supabase.from('patient_care_modules').insert({ patient_id: data.id, module_type: form.moduleType, assigned_professional_id: form.doctorId, is_active: true, clinic_id: profile.clinic_id })
          }
          break
        }
      }
    }
    await loadAll(); setModal(null); setSaving(false)
  }

  async function deletePatient(id, profileId) {
    if (!window.confirm('¿Estás seguro que querés desactivar este paciente?')) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', profileId)
    await supabase.from('patients').update({ status: 'inactive' }).eq('id', id)
    await loadAll()
  }

  const pName = p => `${p.profile?.last_name||''} ${p.profile?.first_name||''}`
  const age = dob => { if (!dob) return '--'; const d = new Date(dob), n = new Date(); return n.getFullYear()-d.getFullYear()-(n<new Date(n.getFullYear(),d.getMonth(),d.getDate())?1:0) }
  const initials = n => n.trim().split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()
  const todayStr = () => { const n = new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0') }
  const apptsByDate = d => appts.filter(a => a.appointment_date === d && a.status !== 'cancelled')

  const SLOT_H = 80
  const HORA_INI = 0
  const HORA_FIN = 24
  const hours = Array.from({length: HORA_FIN - HORA_INI}, (_,i) => HORA_INI + i)

  const statusStyle = (st) => ({
    pending_confirmation: { bg:'#FFF7E6', color:'#854F0B', label:'Pendiente' },
    confirmed_patient: { bg:'#E1F5EE', color:'#0F6E56', label:'Confirmada' },
    confirmed_doctor: { bg:'#E6F1FB', color:'#185FA5', label:'Confirmada' },
    no_show: { bg:'#FAEEDA', color:'#854F0B', label:'No asistió' },
    cancelled: { bg:'#f5f5f5', color:'#999', label:'Cancelada' },
  }[st] || { bg:'#f5f5f5', color:'#999', label:st })

  const menuItems = [
    { key:'calendario', label:'Calendario', icon:'📅' },
    { key:'pacientes', label:'Pacientes', icon:'👥' },
  ]

  return (
    <div style={s.wrap}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.sideHeader}>
          <div style={s.logoWrap}>
            <div style={s.logoIcon}>M</div>
            <div>
              <div style={s.logoTitle}>MedTrack</div>
              <div style={s.logoSub}>Recepción</div>
            </div>
          </div>
        </div>
        <div style={{ flex:1, padding:'8px 0' }}>
          {menuItems.map(item => (
            <div key={item.key} onClick={() => setViewPersist(item.key)}
              style={{ ...s.menuItem, background: view===item.key ? '#f0fdf9' : 'transparent', color: view===item.key ? G : '#555', fontWeight: view===item.key ? 600 : 400 }}>
              <span>{item.icon}</span>{item.label}
            </div>
          ))}
        </div>
        <div style={{ padding:'16px 20px', borderTop:'0.5px solid #f0f0f0' }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:2 }}>{profile?.first_name} {profile?.last_name}</div>
          <div style={{ fontSize:11, color:'#999', marginBottom:8 }}>Recepcionista</div>
          <button onClick={signOut} style={{ fontSize:12, color:'#D85A30', background:'none', border:'none', cursor:'pointer', padding:0 }}>Cerrar sesión</button>
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.pageTitle}>{view === 'calendario' ? 'Calendario' : 'Pacientes'}</div>
            <div style={s.pageSub}>{profile?.clinic_id ? 'Glow Clinic' : ''}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {view === 'calendario' && <button style={s.btnPrimary} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Nueva cita</button>}
            {view === 'pacientes' && <button style={s.btnPrimary} onClick={() => { setModal('new-patient'); setModalData({}) }}>+ Nuevo paciente</button>}
          </div>
        </div>

        <div style={s.content}>
          {loading && <div style={{ textAlign:'center', padding:40, color:'#999', fontSize:14 }}>Cargando...</div>}

          {/* Vista Calendario */}
          {!loading && view === 'calendario' && (
            <div style={s.card}>
              {/* Controles calendario */}
              <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d) }} style={{ background:'none', border:'1px solid #eee', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:14 }}>‹</button>
                  <span style={{ fontSize:14, fontWeight:500, minWidth:160, textAlign:'center' }}>
                    {weekStart.toLocaleDateString('es-CR', { day:'numeric', month:'short' })} — {new Date(weekStart.getTime()+6*86400000).toLocaleDateString('es-CR', { day:'numeric', month:'short', year:'numeric' })}
                  </span>
                  <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d) }} style={{ background:'none', border:'1px solid #eee', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:14 }}>›</button>
                </div>
                <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
                  {['semana','dia'].map(v => (
                    <button key={v} onClick={() => setCalView(v)} style={{ padding:'4px 12px', fontSize:12, borderRadius:6, border:'none', cursor:'pointer', background: calView===v ? G : '#f0f0f0', color: calView===v ? '#fff' : '#666', fontWeight: calView===v ? 600 : 400, textTransform:'capitalize' }}>
                      {v === 'semana' ? 'Semana' : 'Día'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista Semana */}
              {calView === 'semana' && (() => {
                const today = todayStr()
                const nowOffsetPx = HORA_INI <= currentTime.getHours() && currentTime.getHours() < HORA_FIN
                  ? ((currentTime.getHours() - HORA_INI) * 60 + currentTime.getMinutes()) / 60 * SLOT_H : -1
                const weekDays = Array.from({length:7}, (_,i) => {
                  const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
                  const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
                  return { date: d, dateStr: ds, isToday: ds === today }
                })
                return (
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:`48px repeat(7,1fr)`, borderBottom:'0.5px solid #eee' }}>
                      <div />
                      {weekDays.map(({date, isToday}) => (
                        <div key={date.toISOString()} style={{ textAlign:'center', padding:'8px 4px', borderLeft:'0.5px solid #f0f0f0', background: isToday ? '#f0fdf9' : '#fff' }}>
                          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase' }}>{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][date.getDay()===0?6:date.getDay()-1]}</div>
                          <div style={{ fontSize:16, fontWeight: isToday?700:400, background: isToday?G:'transparent', color: isToday?'#fff':'#1a1a1a', borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0' }}>{date.getDate()}</div>
                        </div>
                      ))}
                    </div>
                    <div id="recep-semana-scroll" style={{ overflowY:'auto', maxHeight:'calc(100vh - 280px)', position:'relative' }}>
                      <div style={{ display:'grid', gridTemplateColumns:`48px repeat(7,1fr)`, position:'relative' }}>
                        <div>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, borderTop: h>0?'0.5px solid #f0f0f0':'none', position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:6, paddingTop:2 }}>
                              <span style={{ fontSize:10, color:'#bbb', marginTop:-7 }}>{h===0?'12 AM':h<12?h+' AM':h===12?'12 PM':(h-12)+' PM'}</span>
                              <div style={{ position:'absolute', top:SLOT_H/2, left:0, right:0, borderBottom:'0.5px dashed #f0f0f0' }} />
                            </div>
                          ))}
                        </div>
                        {weekDays.map(({dateStr, isToday}) => (
                          <div key={dateStr} style={{ borderLeft:'0.5px solid #f0f0f0', position:'relative', background: isToday?'#fafffe':'#fff' }}>
                            {hours.map(h => (
                              <div key={h} style={{ height:SLOT_H, borderBottom:'0.5px solid #f5f5f5', cursor:'pointer', position:'relative' }}
                                onClick={() => { setSelDate(dateStr); setModal('new-appt'); setModalData({ defaultTime: String(h).padStart(2,'0')+':00' }) }}>
                                <div style={{ position:'absolute', top:SLOT_H/2, left:0, right:0, borderBottom:'0.5px dashed #f0f0f0', pointerEvents:'none' }} />
                              </div>
                            ))}
                            {isToday && nowOffsetPx >= 0 && (
                              <div style={{ position:'absolute', left:0, right:0, top:nowOffsetPx, zIndex:10, display:'flex', alignItems:'center', pointerEvents:'none' }}>
                                <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', flexShrink:0 }} />
                                <div style={{ flex:1, height:1.5, background:'#D85A30' }} />
                              </div>
                            )}
                            {apptsByDate(dateStr).map(a => {
                              const [ah, am] = (a.appointment_time||'00:00').split(':').map(Number)
                              const top = ((ah - HORA_INI) * 60 + am) / 60 * SLOT_H
                              const height = Math.max((a.duration_min||30) / 60 * SLOT_H - 2, 20)
                              const ML = { integral:'Integral', metabolica:'Metabólica', estetica:'Estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }
                              const endMin = ah*60+am+(a.duration_min||30)
                              const fmt = (h,m) => { const p=h>=12?'pm':'am'; const h12=h%12||12; return h12+':'+(m<10?'0':'')+m+p }
                              const timeStr = fmt(ah,am)+' - '+fmt(Math.floor(endMin/60)%24,endMin%60)
                              return (
                                <div key={a.id} style={{ position:'absolute', left:2, right:2, top, height, background:G+'22', borderLeft:'3px solid '+G, borderRadius:4, padding:'3px 5px', overflow:'hidden', cursor:'pointer', zIndex:5 }}
                                  onClick={e => { e.stopPropagation(); setModal('edit-appt'); setModalData({appt:a}) }}>
                                  <div style={{ fontSize:10, fontWeight:600, color:G, lineHeight:1.3 }}>{timeStr}</div>
                                  <div style={{ fontSize:10, color:'#333', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.patient?.profile?.last_name} {a.patient?.profile?.first_name}</div>
                                  {a.module_type && <div style={{ fontSize:9, color:'#555' }}>{ML[a.module_type]}</div>}
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Vista Día */}
              {calView === 'dia' && (() => {
                const currentDate = selDate || todayStr()
                const today = todayStr()
                const isToday = currentDate === today
                const nowOffsetPx = isToday && HORA_INI <= currentTime.getHours() && currentTime.getHours() < HORA_FIN
                  ? ((currentTime.getHours() - HORA_INI) * 60 + currentTime.getMinutes()) / 60 * SLOT_H : -1
                const dayAppts = apptsByDate(currentDate)
                return (
                  <div>
                    <div style={{ padding:'8px 16px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', gap:8 }}>
                      <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()-1); setSelDate(d.toISOString().split('T')[0]) }} style={{ background:'none', border:'1px solid #eee', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>‹</button>
                      <span style={{ fontSize:14, fontWeight:500 }}>{new Date(currentDate+'T12:00:00').toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long' })}</span>
                      <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()+1); setSelDate(d.toISOString().split('T')[0]) }} style={{ background:'none', border:'1px solid #eee', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>›</button>
                    </div>
                    <div style={{ display:'flex', maxHeight:'calc(100vh - 320px)', overflowY:'auto' }}>
                      <div style={{ width:48, flexShrink:0 }}>
                        {hours.map(h => (
                          <div key={h} style={{ height:SLOT_H, borderTop:h>0?'0.5px solid #f0f0f0':'none', position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:6, paddingTop:2 }}>
                            <span style={{ fontSize:10, color:'#bbb', marginTop:-7 }}>{h===0?'12 AM':h<12?h+' AM':h===12?'12 PM':(h-12)+' PM'}</span>
                            <div style={{ position:'absolute', top:SLOT_H/2, left:0, right:0, borderBottom:'0.5px dashed #f0f0f0' }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ flex:1, position:'relative', background: isToday?'#fafffe':'#fff' }}>
                        {hours.map(h => (
                          <div key={h} style={{ height:SLOT_H, borderBottom:'0.5px solid #f5f5f5', borderLeft:'0.5px solid #f0f0f0', cursor:'pointer', position:'relative' }}
                            onClick={() => { setModal('new-appt'); setModalData({ defaultTime: String(h).padStart(2,'0')+':00' }) }}>
                            <div style={{ position:'absolute', top:SLOT_H/2, left:0, right:0, borderBottom:'0.5px dashed #f0f0f0', pointerEvents:'none' }} />
                          </div>
                        ))}
                        {isToday && nowOffsetPx >= 0 && (
                          <div style={{ position:'absolute', left:0, right:0, top:nowOffsetPx, zIndex:10, display:'flex', alignItems:'center', pointerEvents:'none' }}>
                            <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', flexShrink:0 }} />
                            <div style={{ flex:1, height:1.5, background:'#D85A30' }} />
                          </div>
                        )}
                        {dayAppts.map(a => {
                          const [ah, am] = (a.appointment_time||'00:00').split(':').map(Number)
                          const top = ((ah - HORA_INI) * 60 + am) / 60 * SLOT_H
                          const height = Math.max((a.duration_min||30) / 60 * SLOT_H - 2, 20)
                          const endMin = ah*60+am+(a.duration_min||30)
                          const fmt = (h,m) => { const p=h>=12?'pm':'am'; const h12=h%12||12; return h12+':'+(m<10?'0':'')+m+p }
                          const timeStr = fmt(ah,am)+' - '+fmt(Math.floor(endMin/60)%24,endMin%60)
                          const st = statusStyle(a.status)
                          return (
                            <div key={a.id} style={{ position:'absolute', left:4, right:4, top, height, background:G+'22', borderLeft:'3px solid '+G, borderRadius:6, padding:'5px 8px', overflow:'hidden', cursor:'pointer', zIndex:5 }}
                              onClick={() => { setModal('edit-appt'); setModalData({appt:a}) }}>
                              <div style={{ fontSize:11, fontWeight:700, color:G, display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                                <span>{timeStr}</span>
                                <span style={{ fontSize:10, padding:'0 5px', borderRadius:10, background:st.bg, color:st.color }}>{st.label}</span>
                              </div>
                              <div style={{ fontSize:11, fontWeight:600, color:'#1a1a1a' }}>{a.patient?.profile?.last_name} {a.patient?.profile?.first_name}</div>
                              {a.visit_type && <div style={{ fontSize:10, color:'#777' }}>{a.visit_type}</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Vista Pacientes */}
          {!loading && view === 'pacientes' && (
            <div style={s.card}>
              <div style={{ padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', position:'relative', display:'flex', alignItems:'center' }}>
                <span style={{ position:'absolute', left:24, fontSize:14, color:'#bbb' }}>🔍</span>
                <input type="text" placeholder="Buscar por nombre o email..." value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ width:'100%', padding:'8px 12px 8px 34px', border:'0.5px solid #eee', borderRadius:8, fontSize:14, outline:'none', background:'#f9f9f9', boxSizing:'border-box' }} />
              </div>
              {patients.filter(p => {
                if (p.profile?.role === 'admin' || p.profile?.role === 'doctor' || p.profile?.role === 'receptionist') return false
                const q = search.toLowerCase()
                if (!q) return true
                return `${p.profile?.first_name} ${p.profile?.last_name}`.toLowerCase().includes(q) || p.profile?.email?.toLowerCase().includes(q)
              }).map(p => (
                <div key={p.id} style={{ display:'flex', padding:'10px 14px', borderTop:'0.5px solid #f0f0f0', alignItems:'center', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:500, flexShrink:0 }}>
                    {initials(pName(p))}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{pName(p)}</div>
                    <div style={{ fontSize:12, color:'#999' }}>{p.profile?.email} · {age(p.birth_date)} años</div>
                  </div>
                  <span style={{ ...s.badge, background: p.status==='active'?'#E1F5EE':'#f5f5f5', color: p.status==='active'?'#0F6E56':'#999', flexShrink:0 }}>
                    {p.status === 'active' ? 'activo' : 'inactivo'}
                  </span>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <button style={s.btnEdit} onClick={() => { setModal('edit-patient'); setModalData({patient:p}) }}>Editar</button>
                    <button style={s.btnDanger} onClick={() => deletePatient(p.id, p.profile?.id)}>X</button>
                  </div>
                </div>
              ))}
              {patients.length === 0 && <div style={{ padding:30, textAlign:'center', fontSize:14, color:'#999' }}>No hay pacientes registrados</div>}
            </div>
          )}
        </div>
      </div>

      {/* Modal nueva/editar cita */}
      {(modal === 'new-appt' || modal === 'edit-appt') && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:'#1a1a1a', marginBottom:18 }}>{modal === 'edit-appt' ? 'Editar cita' : 'Nueva cita'}</div>
            {(() => {
              const appt = modalData.appt
              const [form, setForm] = useState({ id:appt?.id||null, patientId:appt?.patient_id||'', doctorId:appt?.doctor_id||'', date:appt?.appointment_date||selDate||'', time:appt?.appointment_time?.substring(0,5)||modalData.defaultTime||'09:00', visitType:appt?.visit_type||'Consulta de seguimiento', duration:appt?.duration_min||30, notes:appt?.notes||'', moduleType:appt?.module_type||'', status:appt?.status||'pending_confirmation' })
              const f = k => e => setForm(p => ({...p, [k]:e.target.value}))
              return (
                <>
                  <div style={{ marginBottom:12 }}>
                    <label style={s.fieldLabel}>Paciente</label>
                    <select value={form.patientId} onChange={f('patientId')} style={s.fieldInput}>
                      <option value="">Seleccioná un paciente...</option>
                      {patients.filter(p=>p.status==='active').map(p => <option key={p.id} value={p.id}>{pName(p)}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={s.fieldLabel}>Doctor</label>
                    <select value={form.doctorId} onChange={f('doctorId')} style={s.fieldInput}>
                      <option value="">Seleccioná un doctor...</option>
                      {doctors.filter(d=>d.role==='doctor').map(d => <option key={d.id} value={d.id}>{d.prefix||''} {d.last_name} {d.first_name}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    <div>
                      <label style={s.fieldLabel}>Fecha</label>
                      <input type="date" value={form.date} onChange={f('date')} style={s.fieldInput} />
                    </div>
                    <div>
                      <label style={s.fieldLabel}>Hora</label>
                      <input type="time" value={form.time} onChange={f('time')} style={s.fieldInput} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    <div>
                      <label style={s.fieldLabel}>Duración</label>
                      <select value={form.duration} onChange={f('duration')} style={s.fieldInput}>
                        {[15,30,45,60,75,90,105,120].map(v => <option key={v} value={v}>{v} min</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.fieldLabel}>Módulo</label>
                      <select value={form.moduleType} onChange={f('moduleType')} style={s.fieldInput}>
                        <option value="">Sin módulo</option>
                        {enabledModules.map(m => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={s.fieldLabel}>Tipo de consulta</label>
                    <select value={form.visitType} onChange={f('visitType')} style={s.fieldInput}>
                      <option value="Primera consulta">Primera consulta</option>
                      <option value="Consulta de seguimiento">Consulta de seguimiento</option>
                      <option value="Control">Control</option>
                      <option value="Procedimiento">Procedimiento</option>
                    </select>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={s.fieldLabel}>Estado</label>
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
                    <button style={s.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
                    {appt && <button style={{ ...s.btnDanger, fontSize:13, padding:'7px 12px' }} onClick={() => cancelAppt(appt.id)}>Cancelar cita</button>}
                    <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => saveAppt(form)}>{saving?'Guardando...': appt?'Guardar cambios':'Agendar cita'}</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Modal nuevo paciente */}
      {modal === 'new-patient' && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:'#1a1a1a', marginBottom:18 }}>Nuevo paciente</div>
            {(() => {
              const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', moduleType:'', doctorId:'', birthDate:'', sex:'' })
              const f = k => e => setForm(p => ({...p, [k]:e.target.value}))
              return (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    <div><label style={s.fieldLabel}>Nombre</label><input value={form.firstName} onChange={f('firstName')} style={s.fieldInput} /></div>
                    <div><label style={s.fieldLabel}>Apellido</label><input value={form.lastName} onChange={f('lastName')} style={s.fieldInput} /></div>
                  </div>
                  <div style={{ marginBottom:12 }}><label style={s.fieldLabel}>Correo electrónico</label><input type="email" value={form.email} onChange={f('email')} style={s.fieldInput} /></div>
                  <div style={{ marginBottom:12 }}><label style={s.fieldLabel}>Contraseña temporal</label><input type="password" value={form.password} onChange={f('password')} style={s.fieldInput} /></div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    <div>
                      <label style={s.fieldLabel}>Fecha de nacimiento</label>
                      <input type="date" value={form.birthDate} onChange={f('birthDate')} style={s.fieldInput} />
                    </div>
                    <div>
                      <label style={s.fieldLabel}>Sexo</label>
                      <select value={form.sex} onChange={f('sex')} style={s.fieldInput}>
                        <option value="">Seleccionar</option>
                        <option value="female">Femenino</option>
                        <option value="male">Masculino</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={s.fieldLabel}>Módulo de atención</label>
                    <select value={form.moduleType} onChange={f('moduleType')} style={s.fieldInput}>
                      <option value="">Sin módulo por ahora</option>
                      {enabledModules.map(m => <option key={m} value={m}>{MODULE_LABELS[m]}</option>)}
                    </select>
                  </div>
                  {form.moduleType && (
                    <div style={{ marginBottom:12 }}>
                      <label style={s.fieldLabel}>Doctor asignado al módulo</label>
                      <select value={form.doctorId} onChange={f('doctorId')} style={s.fieldInput}>
                        <option value="">Seleccioná un doctor...</option>
                        {doctors.filter(d=>d.role==='doctor').map(d => <option key={d.id} value={d.id}>{d.prefix||''} {d.last_name} {d.first_name}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <button style={s.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
                    <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => createPatient(form)}>{saving?'Creando...':'Crear paciente'}</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Modal editar paciente */}
      {modal === 'edit-patient' && modalData.patient && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:'#1a1a1a', marginBottom:18 }}>Editar paciente</div>
            {(() => {
              const p = modalData.patient
              const [form, setForm] = useState({ firstName: p.profile?.first_name||'', lastName: p.profile?.last_name||'', phone: p.profile?.phone||'', birthDate: p.birth_date||'', sex: p.sex||'' })
              const f = k => e => setForm(prev => ({...prev, [k]:e.target.value}))
              async function save() {
                setSaving(true)
                await supabase.from('profiles').update({ first_name: form.firstName, last_name: form.lastName, phone: form.phone }).eq('id', p.profile?.id)
                await supabase.from('patients').update({ birth_date: form.birthDate||null, sex: form.sex||null }).eq('id', p.id)
                await loadAll(); setModal(null); setSaving(false)
              }
              return (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    <div><label style={s.fieldLabel}>Nombre</label><input value={form.firstName} onChange={f('firstName')} style={s.fieldInput} /></div>
                    <div><label style={s.fieldLabel}>Apellido</label><input value={form.lastName} onChange={f('lastName')} style={s.fieldInput} /></div>
                  </div>
                  <div style={{ marginBottom:12 }}><label style={s.fieldLabel}>Teléfono</label><input value={form.phone} onChange={f('phone')} style={s.fieldInput} /></div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                    <div><label style={s.fieldLabel}>Fecha nacimiento</label><input type="date" value={form.birthDate} onChange={f('birthDate')} style={s.fieldInput} /></div>
                    <div>
                      <label style={s.fieldLabel}>Sexo</label>
                      <select value={form.sex} onChange={f('sex')} style={s.fieldInput}>
                        <option value="">Seleccionar</option>
                        <option value="female">Femenino</option>
                        <option value="male">Masculino</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button style={s.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
                    <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={save}>{saving?'Guardando...':'Guardar cambios'}</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
      <SpotifyBar returnTo='/recepcion' />
    </div>
  )
}
