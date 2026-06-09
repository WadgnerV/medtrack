import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const BLUE = '#185FA5'
const BLUE_L = '#E6F1FB'
const DARK = '#1a3a5c'
const GREEN = '#0F6E56'
const GREEN_L = '#E1F5EE'
const LIGHT_BG = '#f4f7f6'

const STATUS_CONFIG = {
  available:   { label:'Disponible',    color:'#6b8f7e', bg:'#f4f7f6',  border:'#e2ede9', dot:'#9FE1CB'  },
  occupied:    { label:'Ocupada',       color:'#0C447C', bg:'#E6F1FB',  border:'#185FA5', dot:'#185FA5'  },
  closed:      { label:'Cerrada',       color:'#712B13', bg:'#FAECE7',  border:'#D85A30', dot:'#D85A30'  },
  maintenance: { label:'Mantenimiento', color:'#633806', bg:'#FAEEDA',  border:'#BA7517', dot:'#BA7517'  },
}

function getServiceIcon(name) {
  const lower = (name||'').toLowerCase()
  if (lower.includes('emergencia') || lower.includes('urgencia')) return 'ti-urgent'
  if (lower.includes('observacion') || lower.includes('observación')) return 'ti-eye'
  if (lower.includes('cirugia') || lower.includes('cirugía')) return 'ti-scalpel'
  if (lower.includes('pediatr')) return 'ti-baby-carriage'
  if (lower.includes('maternidad') || lower.includes('obstetr')) return 'ti-heart'
  if (lower.includes('uci') || lower.includes('intensivo')) return 'ti-activity-heartbeat'
  return 'ti-building-hospital'
}

function BedCard({ bed, onClick, canEdit }) {
  const cfg = STATUS_CONFIG[bed.status] || STATUS_CONFIG.available
  const hosp = bed.active_hospitalization
  const patient = hosp?.patient
  const doctor = hosp?.doctor

  function age(dob) {
    if (!dob) return ''
    return Math.floor((Date.now() - new Date(dob)) / (1000*60*60*24*365.25))
  }

  function fmt(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })
  }

  return (
    <div onClick={() => onClick(bed)}
      style={{ background: cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:12, padding:14, cursor: bed.status==='maintenance'?'default':'pointer', transition:'border-color 0.15s', minHeight:130 }}
      onMouseEnter={e => { if(bed.status!=='maintenance') e.currentTarget.style.borderColor=BLUE }}
      onMouseLeave={e => e.currentTarget.style.borderColor=cfg.border}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:700, color:cfg.color }}>Cama {bed.bed_number}</div>
        <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0, marginTop:3 }} />
      </div>
      {bed.status==='occupied' && patient && (
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'#1a3a5c', marginBottom:2 }}>{patient.last_name} {patient.first_name}</div>
          {patient.birth_date && <div style={{ fontSize:11, color:'#6b8f7e', marginBottom:2 }}>{fmt(patient.birth_date)} · {age(patient.birth_date)} años</div>}
          {doctor && <div style={{ fontSize:11, color:'#6b8f7e', marginBottom:8 }}>{doctor.prefix?doctor.prefix+' ':''}{doctor.first_name} {doctor.last_name}</div>}
          {hosp?.admission_date && <div style={{ fontSize:10, background:BLUE_L, color:'#0C447C', padding:'2px 8px', borderRadius:20, display:'inline-block', fontWeight:500 }}>Ingreso: {fmt(hosp.admission_date)}</div>}
        </div>
      )}
      {bed.status==='available' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:8 }}>
          <i className="ti ti-bed" style={{ fontSize:22, color:'#9FE1CB', marginBottom:6 }} aria-hidden="true"></i>
          <div style={{ fontSize:11, color:'#6b8f7e', marginBottom:8 }}>Disponible</div>
          {canEdit && <div style={{ fontSize:11, padding:'3px 10px', background:GREEN_L, color:GREEN, borderRadius:20, fontWeight:500 }}>Asignar paciente</div>}
        </div>
      )}
      {(bed.status==='closed'||bed.status==='maintenance') && (
        <div>
          <div style={{ fontSize:11, color:cfg.color }}>{cfg.label}</div>
          {bed.notes && <div style={{ fontSize:11, color:cfg.color, marginTop:4, opacity:0.7 }}>{bed.notes}</div>}
        </div>
      )}
    </div>
  )
}

function AdmitModal({ bed, patients, doctors, onClose, onSave }) {
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [reason, setReason] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = patients.filter(p => {
    const name = `${p.profile?.first_name||''} ${p.profile?.last_name||''}`.toLowerCase()
    return name.includes(search.toLowerCase()) || (p.id_number||'').includes(search)
  })
  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }
  async function save() {
    if (!patientId) return
    setSaving(true); await onSave({ patientId, doctorId, reason, diagnosis }); setSaving(false)
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:440, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:DARK }}>Admitir paciente — Cama {bed.bed_number}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={lbl}>Buscar paciente</label><input style={inp} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o cédula..." /></div>
          <div><label style={lbl}>Paciente</label>
            <select style={inp} value={patientId} onChange={e => setPatientId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {filtered.map(p => <option key={p.id} value={p.profile?.id}>{p.profile?.last_name} {p.profile?.first_name}{p.id_number?` · ${p.id_number}`:''}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Médico tratante</label>
            <select style={inp} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
              <option value="">Sin asignar</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.prefix?d.prefix+' ':''}{d.first_name} {d.last_name}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Motivo de ingreso</label><textarea style={{ ...inp, minHeight:70, resize:'vertical' }} value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo de la hospitalización..." /></div>
          <div><label style={lbl}>Diagnóstico de ingreso</label><input style={inp} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Diagnóstico inicial..." /></div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
          <button onClick={save} disabled={saving||!patientId} style={{ padding:'8px 22px', background:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity:!patientId?0.5:1 }}>{saving?'Admitiendo...':'Admitir'}</button>
        </div>
      </div>
    </div>
  )
}

function ServiceModal({ service, onClose, onSave }) {
  const [name, setName] = useState(service?.name||'')
  const [description, setDescription] = useState(service?.description||'')
  const [color, setColor] = useState(service?.color||'#185FA5')
  const [saving, setSaving] = useState(false)
  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:380, maxWidth:'95vw' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:DARK }}>{service?'Editar servicio':'Nuevo servicio'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={lbl}>Nombre</label><input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Servicio de emergencias" /></div>
          <div><label style={lbl}>Descripción (opcional)</label><input style={inp} value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div><label style={lbl}>Color</label>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width:40, height:36, border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', padding:2 }} />
              <span style={{ fontSize:13, color:'#666' }}>{color}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
          <button onClick={async () => { if(!name.trim()) return; setSaving(true); await onSave({ name:name.trim(), description, color }); setSaving(false) }} disabled={saving||!name.trim()} style={{ padding:'8px 22px', background:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>{saving?'Guardando...':'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

function BedModal({ bed, service, onClose, onSave }) {
  const [number, setNumber] = useState(bed?.bed_number||'')
  const [status, setStatus] = useState(bed?.status||'available')
  const [notes, setNotes] = useState(bed?.notes||'')
  const [saving, setSaving] = useState(false)
  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:360, maxWidth:'95vw' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:DARK }}>{bed?'Editar cama':`Nueva cama — ${service?.name}`}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={lbl}>Número de cama</label><input style={inp} value={number} onChange={e => setNumber(e.target.value)} placeholder="Ej: 1, 2A, UCI-3..." /></div>
          <div><label style={lbl}>Estado inicial</label>
            <select style={inp} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="available">Disponible</option>
              <option value="closed">Cerrada</option>
              <option value="maintenance">En mantenimiento</option>
            </select>
          </div>
          <div><label style={lbl}>Notas (opcional)</label><input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: En mantenimiento hasta el lunes..." /></div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
          <button onClick={async () => { if(!number.trim()) return; setSaving(true); await onSave({ bed_number:number.trim(), status, notes }); setSaving(false) }} disabled={saving||!number.trim()} style={{ padding:'8px 22px', background:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>{saving?'Guardando...':'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

export default function HospitalizacionDashboard() {
  const { profile, setActiveContext } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('camas')
  const [services, setServices] = useState([])
  const [beds, setBeds] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [staffList, setStaffList] = useState([])
  const [staffAssignment, setStaffAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const isAdmin = ['clinic_admin','superadmin'].includes(profile?.role) ||
    staffAssignment?.hospital_role === 'hospitalization_admin'
  const isNurse = staffAssignment?.hospital_role === 'hospital_nurse'

  useEffect(() => { if (profile?.id) loadAll() }, [profile?.id])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadServices(), loadPatients(), loadDoctors(), loadStaffAssignment(), loadStaff()])
    setLoading(false)
  }

  async function loadStaffAssignment() {
    const { data } = await supabase.from('hospital_staff_assignments').select('*').eq('profile_id', profile.id).single()
    setStaffAssignment(data)
  }

  async function loadStaff() {
    const { data } = await supabase.from('hospital_staff_assignments')
      .select('*, profile:profile_id(id, first_name, last_name, email, role)')
      .eq('clinic_id', profile.clinic_id)
    setStaffList(data || [])
  }

  async function loadServices() {
    const { data: svcs } = await supabase.from('hospital_services')
      .select('*').eq('clinic_id', profile.clinic_id).eq('is_active', true).order('order_index')
    if (!svcs) return setServices([])

    const { data: allBeds } = await supabase.from('hospital_beds')
      .select('*')
      .eq('clinic_id', profile.clinic_id)

    const { data: activeHosps } = await supabase.from('hospitalizations')
      .select('id, admission_date, status, bed_id, patient_id, attending_doctor_id, patient:patient_id(id, first_name, last_name, birth_date), doctor:attending_doctor_id(id, first_name, last_name, prefix)')
      .eq('clinic_id', profile.clinic_id)
      .eq('status', 'active')

    const bedsProcessed = (allBeds || []).map(bed => {
      const activeHosp = (activeHosps || []).find(h => h.bed_id === bed.id)
      return { ...bed, active_hospitalization: activeHosp || null }
    })

    setBeds(bedsProcessed)
    setServices(svcs)
  }

  async function loadPatients() {
    const { data } = await supabase.from('patients')
      .select('id, id_number, birth_date, sex, profile:profile_id(id, first_name, last_name, email)')
      .eq('clinic_id', profile.clinic_id).neq('status', 'inactive')
    setPatients(data || [])
  }

  async function loadDoctors() {
    const { data } = await supabase.from('profiles')
      .select('id, first_name, last_name, prefix, specialty')
      .eq('clinic_id', profile.clinic_id)
      .in('role', ['doctor','clinic_admin'])
    setDoctors(data || [])
  }

  function bedsForService(serviceId) {
    return beds.filter(b => b.service_id === serviceId)
  }

  function canSeeService(service) {
    if (isAdmin) return true
    if (!staffAssignment?.service_ids) return false
    return staffAssignment.service_ids.includes(service.id)
  }

  async function handleBedClick(bed) {
    if (bed.status === 'occupied' && bed.active_hospitalization) {
      navigate(`/hospitalizacion/expediente/${bed.active_hospitalization.id}`)
    } else if (bed.status === 'available' && isAdmin) {
      setModalData({ bed }); setModal('admit')
    }
  }

  async function admitPatient({ patientId, doctorId, reason, diagnosis }) {
    const bed = modalData.bed
    const { data: hosp } = await supabase.from('hospitalizations').insert({
      clinic_id: profile.clinic_id, patient_id: patientId, bed_id: bed.id,
      service_id: bed.service_id, attending_doctor_id: doctorId || null,
      admission_date: new Date().toISOString(), admission_reason: reason || null,
      admission_diagnosis: diagnosis || null, status: 'active', created_by: profile.id,
    }).select().single()
    await supabase.from('hospital_beds').update({ status: 'occupied' }).eq('id', bed.id)
    setModal(null)
    await loadServices()
    if (hosp) navigate(`/hospitalizacion/expediente/${hosp.id}`)
  }

  async function saveService(data) {
    const svc = modalData.service
    if (svc) await supabase.from('hospital_services').update(data).eq('id', svc.id)
    else await supabase.from('hospital_services').insert({ ...data, clinic_id: profile.clinic_id, order_index: services.length })
    setModal(null); await loadServices()
  }

  async function saveBed(data) {
    const bed = modalData.bed
    const svc = modalData.service
    if (bed && !bed.active_hospitalization) {
      await supabase.from('hospital_beds').update(data).eq('id', bed.id)
    } else {
      // Verificar que no exista ya ese número en el servicio
      const exists = beds.some(b => b.service_id === svc.id && b.bed_number === data.bed_number)
      if (exists) {
        alert(`Ya existe una cama con el número "${data.bed_number}" en este servicio.`)
        return
      }
      await supabase.from('hospital_beds').insert({ ...data, clinic_id: profile.clinic_id, service_id: svc.id })
    }
    setModal(null); await loadServices()
  }

  const totalOccupied = beds.filter(b => b.status === 'occupied').length
  const totalAvailable = beds.filter(b => b.status === 'available').length
  const totalClosed = beds.filter(b => b.status === 'closed' || b.status === 'maintenance').length

  const SIDEBAR_W = sidebarCollapsed ? 56 : 220

  const navItems = [
    { key:'camas', icon:'ti-layout-grid', label:'Panel de camas' },
    ...(isAdmin ? [
      { key:'pacientes', icon:'ti-users', label:'Pacientes' },
      { key:'personal', icon:'ti-user-check', label:'Personal' },
      { key:'servicios', icon:'ti-building-hospital', label:'Servicios y camas' },
    ] : []),
    ...(!isAdmin && !isNurse ? [{ key:'mis_pacientes', icon:'ti-user-heart', label:'Mis pacientes' }] : []),
    ...(isNurse ? [{ key:'ordenes', icon:'ti-clipboard-check', label:'Órdenes pendientes' }] : []),
  ]

  const nombre = `${profile?.first_name||''} ${profile?.last_name||''}`.trim()
  const initials = nombre.split(' ').filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('')

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:LIGHT_BG, fontSize:14, color:'#888' }}>Cargando...</div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:LIGHT_BG, fontFamily:'Inter, sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width:SIDEBAR_W, minWidth:SIDEBAR_W, background:DARK, display:'flex', flexDirection:'column', transition:'width 0.2s', overflow:'hidden', position:'relative', zIndex:10 }}>

        {/* Logo */}
        <div style={{ padding:'16px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:10, minHeight:56 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:BLUE, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className="ti ti-building-hospital" style={{ fontSize:16, color:'#fff' }} aria-hidden="true"></i>
          </div>
          {!sidebarCollapsed && <span style={{ fontSize:14, fontWeight:600, color:'#fff', whiteSpace:'nowrap' }}>Hospitalización</span>}
          <button onClick={() => setSidebarCollapsed(p=>!p)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', flexShrink:0, padding:2 }}>
            <i className={`ti ${sidebarCollapsed?'ti-chevron-right':'ti-chevron-left'}`} style={{ fontSize:14 }} aria-hidden="true"></i>
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:'10px 0', overflowY:'auto' }}>
          {navItems.map(item => {
            const active = view === item.key
            return (
              <button key={item.key} onClick={() => setView(item.key)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background: active ? 'rgba(255,255,255,0.1)' : 'none', border:'none', borderLeft: active ? `3px solid ${BLUE}` : '3px solid transparent', cursor:'pointer', color: active ? '#fff' : 'rgba(255,255,255,0.6)', fontSize:13, fontWeight: active ? 600 : 400, fontFamily:'inherit', textAlign:'left', transition:'all 0.15s', whiteSpace:'nowrap' }}>
                <i className={`ti ${item.icon}`} style={{ fontSize:16, flexShrink:0 }} aria-hidden="true"></i>
                {!sidebarCollapsed && item.label}
              </button>
            )
          })}
        </nav>

        {/* Switch contexto */}
        {!sidebarCollapsed && (
          <button onClick={() => { setActiveContext('outpatient'); navigate('/admin') }}
            style={{ margin:'0 10px 8px', padding:'8px 12px', background:'rgba(255,255,255,0.08)', border:'0.5px solid rgba(255,255,255,0.15)', borderRadius:8, cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:12, fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-arrow-left" style={{ fontSize:13 }} aria-hidden="true"></i>
            Consulta externa
          </button>
        )}

        {/* User */}
        <div style={{ padding:'10px 14px', borderTop:'0.5px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:BLUE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials}</div>
          {!sidebarCollapsed && (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nombre}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:1 }}>
                {staffAssignment?.hospital_role === 'hospital_nurse' ? 'Enfermería' : staffAssignment?.hospital_role === 'hospitalization_admin' ? 'Admin hospitalización' : 'Médico'}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, overflowY:'auto', padding:24, minWidth:0 }}>

        {/* Vista: Panel de camas */}
        {view === 'camas' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:DARK }}>Panel de camas</h2>
                <div style={{ fontSize:12, color:'#8aab9a', marginTop:2 }}>{new Date().toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
              </div>

            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
              {[
                { label:'Camas ocupadas',    valor:totalOccupied,  color:BLUE,     bg:BLUE_L   },
                { label:'Camas disponibles', valor:totalAvailable, color:GREEN,    bg:GREEN_L  },
                { label:'Cerradas',          valor:totalClosed,    color:'#854F0B',bg:'#FAEEDA'},
                { label:'Total de camas',    valor:beds.length,    color:DARK,     bg:'#fff'   },
              ].map(kpi => (
                <div key={kpi.label} style={{ background:kpi.bg, border:'0.5px solid #e2ede9', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:10, color:kpi.color, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, opacity:0.8 }}>{kpi.label}</div>
                  <div style={{ fontSize:28, fontWeight:700, color:kpi.color, marginTop:4 }}>{kpi.valor}</div>
                </div>
              ))}
            </div>

            {services.filter(canSeeService).length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#aaa', fontSize:14 }}>
                {isAdmin ? 'No hay servicios creados aún. Creá uno con el botón de arriba.' : 'No tenés servicios asignados.'}
              </div>
            ) : services.filter(canSeeService).map(service => {
              const serviceBeds = bedsForService(service.id)
              const occ = serviceBeds.filter(b=>b.status==='occupied').length
              const avail = serviceBeds.filter(b=>b.status==='available').length
              return (
                <div key={service.id} style={{ marginBottom:28 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <i className={`ti ${getServiceIcon(service.name)}`} style={{ fontSize:18, color:service.color||BLUE }} aria-hidden="true"></i>
                      <span style={{ fontSize:15, fontWeight:700, color:DARK }}>{service.name}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:BLUE_L, color:'#0C447C', fontWeight:500 }}>
                        {serviceBeds.length} camas · {occ} ocupadas · {avail} disponibles
                      </span>
                    </div>
                    {isAdmin && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { setModalData({ service, bed:null }); setModal('bed') }}
                          style={{ fontSize:12, padding:'4px 10px', border:'0.5px solid #e2ede9', borderRadius:6, cursor:'pointer', background:'#fff', color:DARK, display:'flex', alignItems:'center', gap:4 }}>
                          <i className="ti ti-plus" style={{ fontSize:12 }} aria-hidden="true"></i> Cama
                        </button>
                        <button onClick={() => { setModalData({ service }); setModal('service') }}
                          style={{ fontSize:12, padding:'4px 10px', border:'0.5px solid #e2ede9', borderRadius:6, cursor:'pointer', background:'#fff', color:'#555', display:'flex', alignItems:'center', gap:4 }}>
                          <i className="ti ti-edit" style={{ fontSize:12 }} aria-hidden="true"></i> Editar
                        </button>
                      </div>
                    )}
                  </div>
                  {serviceBeds.length === 0 ? (
                    <div style={{ padding:20, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, textAlign:'center', fontSize:13, color:'#aaa' }}>
                      Sin camas en este servicio
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
                      {serviceBeds.map(bed => <BedCard key={bed.id} bed={bed} onClick={handleBedClick} canEdit={isAdmin} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Vista: Pacientes hospitalizados */}
        {view === 'pacientes' && (
          <div>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:700, color:DARK }}>Pacientes hospitalizados</h2>
            <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #e2ede9', fontSize:13, color:'#8aab9a' }}>
                {beds.filter(b=>b.status==='occupied').length} pacientes activos
              </div>
              {beds.filter(b=>b.status==='occupied' && b.active_hospitalization).map((bed,i) => {
                const h = bed.active_hospitalization
                const p = h?.patient
                const d = h?.doctor
                return (
                  <div key={bed.id} style={{ padding:'12px 16px', borderBottom: i<beds.filter(b=>b.status==='occupied').length-1?'0.5px solid #f0f5f3':'none', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
                    onClick={() => navigate(`/hospitalizacion/expediente/${h.id}`)}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:BLUE_L, color:BLUE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
                        {(p?.first_name||'?')[0]}{(p?.last_name||'?')[0]}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:DARK }}>{p?.last_name} {p?.first_name}</div>
                        <div style={{ fontSize:11, color:'#8aab9a' }}>
                          Cama {bed.bed_number} · {services.find(s=>s.id===bed.service_id)?.name||''}
                          {d ? ` · ${d.prefix?d.prefix+' ':''}${d.first_name} ${d.last_name}` : ''}
                        </div>
                      </div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ fontSize:16, color:'#ccc' }} aria-hidden="true"></i>
                  </div>
                )
              })}
              {beds.filter(b=>b.status==='occupied').length === 0 && (
                <div style={{ padding:40, textAlign:'center', fontSize:13, color:'#bbb' }}>Sin pacientes hospitalizados actualmente</div>
              )}
            </div>
          </div>
        )}

        {/* Vista: Personal */}
        {view === 'personal' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:DARK }}>Personal de hospitalización</h2>
              <button onClick={() => setModal('new-staff')}
                style={{ padding:'8px 16px', background:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
                <i className="ti ti-plus" style={{ fontSize:14 }} aria-hidden="true"></i> Agregar personal
              </button>
            </div>
            <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, overflow:'hidden' }}>
              {staffList.length === 0 ? (
                <div style={{ padding:40, textAlign:'center', fontSize:13, color:'#bbb' }}>Sin personal registrado</div>
              ) : staffList.map((s,i) => (
                <div key={s.id} style={{ padding:'12px 16px', borderBottom: i<staffList.length-1?'0.5px solid #f0f5f3':'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:BLUE_L, color:BLUE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
                      {(s.profile?.first_name||'?')[0]}{(s.profile?.last_name||'?')[0]}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:DARK }}>{s.profile?.first_name} {s.profile?.last_name}</div>
                      <div style={{ fontSize:11, color:'#8aab9a' }}>
                        {s.hospital_role==='hospital_nurse'?'Enfermería':s.hospital_role==='hospitalization_admin'?'Admin hospitalización':'Médico'}
                        {' · '}{s.profile?.email}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: s.is_active?GREEN_L:'#f0f0f0', color: s.is_active?GREEN:'#888', fontWeight:500 }}>
                    {s.is_active?'Activo':'Inactivo'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vista: Servicios y camas */}
        {view === 'servicios' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:DARK }}>Servicios y camas</h2>
              <button onClick={() => { setModalData({}); setModal('service') }}
                style={{ padding:'8px 16px', background:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
                <i className="ti ti-plus" style={{ fontSize:14 }} aria-hidden="true"></i> Nuevo servicio
              </button>
            </div>
            {services.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#aaa', fontSize:14 }}>Sin servicios creados</div>
            ) : services.map(service => {
              const serviceBeds = bedsForService(service.id)
              return (
                <div key={service.id} style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
                  <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #e2ede9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:service.color||BLUE }} />
                      <span style={{ fontSize:14, fontWeight:700, color:DARK }}>{service.name}</span>
                      <span style={{ fontSize:11, color:'#8aab9a' }}>{serviceBeds.length} camas</span>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => { setModalData({ service, bed:null }); setModal('bed') }}
                        style={{ fontSize:12, padding:'4px 10px', border:'0.5px solid #e2ede9', borderRadius:6, cursor:'pointer', background:'#fff', color:DARK, display:'flex', alignItems:'center', gap:4 }}>
                        <i className="ti ti-plus" style={{ fontSize:12 }} aria-hidden="true"></i> Cama
                      </button>
                      <button onClick={() => { setModalData({ service }); setModal('service') }}
                        style={{ fontSize:12, padding:'4px 10px', border:'0.5px solid #e2ede9', borderRadius:6, cursor:'pointer', background:'#fff', color:'#555', display:'flex', alignItems:'center', gap:4 }}>
                        <i className="ti ti-edit" style={{ fontSize:12 }} aria-hidden="true"></i> Editar
                      </button>
                    </div>
                  </div>
                  <div style={{ padding:'10px 16px' }}>
                    {serviceBeds.length === 0 ? (
                      <div style={{ fontSize:13, color:'#bbb', textAlign:'center', padding:'10px 0' }}>Sin camas</div>
                    ) : (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                        {serviceBeds.map(bed => (
                          <div key={bed.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background: STATUS_CONFIG[bed.status]?.bg||'#f4f7f6', border:`0.5px solid ${STATUS_CONFIG[bed.status]?.border||'#e2ede9'}` }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background:STATUS_CONFIG[bed.status]?.dot||'#aaa' }} />
                            <span style={{ fontSize:12, fontWeight:500, color:STATUS_CONFIG[bed.status]?.color||'#555' }}>Cama {bed.bed_number}</span>
                            <button onClick={() => { setModalData({ bed, service }); setModal('bed') }}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:12, padding:0, display:'flex', alignItems:'center' }}>
                              <i className="ti ti-edit" style={{ fontSize:11 }} aria-hidden="true"></i>
                            </button>
                            {bed.status !== 'occupied' && (
                              <button onClick={async () => { if(window.confirm('¿Eliminar esta cama?')) { await supabase.from('hospital_beds').delete().eq('id', bed.id); await loadServices() } }}
                                style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:12, padding:0, display:'flex', alignItems:'center' }}>
                                <i className="ti ti-trash" style={{ fontSize:11 }} aria-hidden="true"></i>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>

      {/* Modales */}
      {modal==='admit' && <AdmitModal bed={modalData.bed} patients={patients} doctors={doctors} onClose={() => setModal(null)} onSave={admitPatient} />}
      {modal==='service' && <ServiceModal service={modalData.service} onClose={() => setModal(null)} onSave={saveService} />}
      {modal==='bed' && <BedModal bed={modalData.bed} service={modalData.service} onClose={() => setModal(null)} onSave={saveBed} />}
    </div>
  )
}
