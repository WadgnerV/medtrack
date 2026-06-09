import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import UserMenu from '../components/UserMenu'

const BLUE = '#185FA5'
const BLUE_L = '#E6F1FB'
const GREEN = '#0F6E56'
const GREEN_L = '#E1F5EE'

const STATUS_CONFIG = {
  available:   { label:'Disponible',   color:'#6b8f7e',  bg:'#f4f7f6',  border:'#e2ede9', dot:'#9FE1CB' },
  occupied:    { label:'Ocupada',      color:'#0C447C',  bg:'#E6F1FB',  border:'#185FA5', dot:'#185FA5' },
  closed:      { label:'Cerrada',      color:'#712B13',  bg:'#FAECE7',  border:'#D85A30', dot:'#D85A30' },
  maintenance: { label:'Mantenimiento',color:'#633806',  bg:'#FAEEDA',  border:'#BA7517', dot:'#BA7517' },
}

const SERVICE_ICONS = {
  default: 'ti-building-hospital',
  emergencias: 'ti-urgent',
  observacion: 'ti-eye',
  medicas: 'ti-heart-rate-monitor',
  cirugia: 'ti-scalpel',
  pediatria: 'ti-baby-carriage',
  maternidad: 'ti-heart',
  uci: 'ti-activity-heartbeat',
}

function getServiceIcon(name) {
  const lower = (name || '').toLowerCase()
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return SERVICE_ICONS.default
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

  function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })
  }

  return (
    <div onClick={() => onClick(bed)}
      style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius:12, padding:14, cursor: bed.status === 'occupied' || bed.status === 'available' ? 'pointer' : 'default', transition:'border-color 0.15s', minHeight:130 }}
      onMouseEnter={e => { if(bed.status !== 'maintenance') e.currentTarget.style.borderColor = BLUE }}
      onMouseLeave={e => e.currentTarget.style.borderColor = cfg.border}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:700, color: cfg.color }}>Cama {bed.bed_number}</div>
        <div style={{ width:8, height:8, borderRadius:'50%', background: cfg.dot, flexShrink:0, marginTop:3 }} />
      </div>

      {bed.status === 'occupied' && patient && (
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'#1a3a5c', marginBottom:2 }}>
            {patient.last_name} {patient.first_name}
          </div>
          {patient.birth_date && (
            <div style={{ fontSize:11, color:'#6b8f7e', marginBottom:2 }}>
              {formatDate(patient.birth_date)} · {age(patient.birth_date)} años
            </div>
          )}
          {doctor && (
            <div style={{ fontSize:11, color:'#6b8f7e', marginBottom:8 }}>
              {doctor.prefix ? doctor.prefix+' ' : ''}{doctor.first_name} {doctor.last_name}
            </div>
          )}
          {hosp?.admission_date && (
            <div style={{ fontSize:10, background: BLUE_L, color:'#0C447C', padding:'2px 8px', borderRadius:20, display:'inline-block', fontWeight:500 }}>
              Ingreso: {formatDate(hosp.admission_date)}
            </div>
          )}
        </div>
      )}

      {bed.status === 'available' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, paddingTop:8 }}>
          <i className="ti ti-bed" style={{ fontSize:22, color:'#9FE1CB', marginBottom:6 }} aria-hidden="true"></i>
          <div style={{ fontSize:11, color:'#6b8f7e', marginBottom:8 }}>Disponible</div>
          {canEdit && (
            <div style={{ fontSize:11, padding:'3px 10px', background: GREEN_L, color: GREEN, borderRadius:20, fontWeight:500 }}>
              Asignar paciente
            </div>
          )}
        </div>
      )}

      {(bed.status === 'closed' || bed.status === 'maintenance') && (
        <div>
          <div style={{ fontSize:11, color: cfg.color }}>{cfg.label}</div>
          {bed.notes && <div style={{ fontSize:11, color: cfg.color, marginTop:4, opacity:0.7 }}>{bed.notes}</div>}
        </div>
      )}
    </div>
  )
}

function AdmitPatientModal({ bed, patients, doctors, onClose, onSave }) {
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [reason, setReason] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = patients.filter(p => {
    const name = `${p.profile?.first_name||''} ${p.profile?.last_name||''}`.toLowerCase()
    const id = (p.id_number||'').toLowerCase()
    return name.includes(search.toLowerCase()) || id.includes(search.toLowerCase())
  })

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }

  async function save() {
    if (!patientId) return
    setSaving(true)
    await onSave({ patientId, doctorId, reason, diagnosis })
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
      onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:440, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a3a5c' }}>Admitir paciente — Cama {bed.bed_number}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa', lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={lbl}>Buscar paciente</label>
            <input style={inp} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o cédula..." />
          </div>
          <div>
            <label style={lbl}>Paciente</label>
            <select style={inp} value={patientId} onChange={e => setPatientId(e.target.value)}>
              <option value="">Seleccionar paciente...</option>
              {filtered.map(p => (
                <option key={p.id} value={p.profile?.id}>
                  {p.profile?.last_name} {p.profile?.first_name} {p.id_number ? `· ${p.id_number}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Médico tratante</label>
            <select style={inp} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
              <option value="">Sin asignar</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.prefix ? d.prefix+' ' : ''}{d.first_name} {d.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Motivo de ingreso</label>
            <textarea style={{ ...inp, minHeight:70, resize:'vertical' }} value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo de la hospitalización..." />
          </div>
          <div>
            <label style={lbl}>Diagnóstico de ingreso</label>
            <input style={inp} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Diagnóstico inicial..." />
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
          <button onClick={save} disabled={saving || !patientId}
            style={{ padding:'8px 22px', background: BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity: !patientId ? 0.5 : 1 }}>
            {saving ? 'Admitiendo...' : 'Admitir paciente'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ServiceModal({ service, onClose, onSave }) {
  const [name, setName] = useState(service?.name || '')
  const [description, setDescription] = useState(service?.description || '')
  const [color, setColor] = useState(service?.color || '#185FA5')
  const [saving, setSaving] = useState(false)

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), description, color })
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
      onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:380, maxWidth:'95vw' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a3a5c' }}>{service ? 'Editar servicio' : 'Nuevo servicio'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa', lineHeight:1 }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={lbl}>Nombre del servicio</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Servicio de emergencias" />
          </div>
          <div>
            <label style={lbl}>Descripción (opcional)</label>
            <input style={inp} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción del servicio..." />
          </div>
          <div>
            <label style={lbl}>Color identificador</label>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width:40, height:36, border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', padding:2 }} />
              <span style={{ fontSize:13, color:'#666' }}>{color}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
          <button onClick={save} disabled={saving || !name.trim()}
            style={{ padding:'8px 22px', background: BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity: !name.trim() ? 0.5 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BedModal({ bed, service, onClose, onSave }) {
  const [number, setNumber] = useState(bed?.bed_number || '')
  const [status, setStatus] = useState(bed?.status || 'available')
  const [notes, setNotes] = useState(bed?.notes || '')
  const [saving, setSaving] = useState(false)

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }

  async function save() {
    if (!number.trim()) return
    setSaving(true)
    await onSave({ bed_number: number.trim(), status, notes })
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
      onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:360, maxWidth:'95vw' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1a3a5c' }}>{bed ? 'Editar cama' : `Nueva cama — ${service?.name}`}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa', lineHeight:1 }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={lbl}>Número de cama</label>
            <input style={inp} value={number} onChange={e => setNumber(e.target.value)} placeholder="Ej: 1, 2A, UCI-3..." />
          </div>
          <div>
            <label style={lbl}>Estado</label>
            <select style={inp} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="available">Disponible</option>
              <option value="closed">Cerrada</option>
              <option value="maintenance">En mantenimiento</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Notas (opcional)</label>
            <input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: En mantenimiento hasta el lunes..." />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cancelar</button>
          <button onClick={save} disabled={saving || !number.trim()}
            style={{ padding:'8px 22px', background: BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity: !number.trim() ? 0.5 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HospitalizacionDashboard() {
  const { profile, setActiveContext } = useAuth()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [beds, setBeds] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [staffAssignment, setStaffAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState({})

  const isAdmin = profile?.role === 'clinic_admin' || profile?.role === 'superadmin' ||
    staffAssignment?.hospital_role === 'hospitalization_admin'

  useEffect(() => { if (profile?.id) loadAll() }, [profile?.id])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadServices(), loadPatients(), loadDoctors(), loadStaffAssignment()])
    setLoading(false)
  }

  async function loadStaffAssignment() {
    const { data } = await supabase.from('hospital_staff_assignments')
      .select('*').eq('profile_id', profile.id).single()
    setStaffAssignment(data)
  }

  async function loadServices() {
    const { data: servicesData } = await supabase.from('hospital_services')
      .select('*').eq('clinic_id', profile.clinic_id).eq('is_active', true).order('order_index')

    if (!servicesData) return setServices([])

    const { data: bedsData } = await supabase.from('hospital_beds')
      .select(`*, active_hospitalization:hospitalizations!inner(
        id, admission_date, admission_reason,
        patient:patient_id(id, first_name, last_name, birth_date),
        doctor:attending_doctor_id(id, first_name, last_name, prefix)
      )`)
      .eq('clinic_id', profile.clinic_id)
      .eq('hospitalizations.status', 'active')

    const { data: allBeds } = await supabase.from('hospital_beds')
      .select('*').eq('clinic_id', profile.clinic_id)

    const bedsWithHosp = (allBeds || []).map(bed => {
      const hosp = (bedsData || []).find(b => b.id === bed.id)
      return { ...bed, active_hospitalization: hosp?.active_hospitalization || null }
    })

    setBeds(bedsWithHosp)
    setServices(servicesData)
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
      .eq('is_health_professional', true)
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
      setModalData({ bed })
      setModal('admit')
    }
  }

  async function admitPatient({ patientId, doctorId, reason, diagnosis }) {
    const bed = modalData.bed
    const { data: hosp } = await supabase.from('hospitalizations').insert({
      clinic_id: profile.clinic_id,
      patient_id: patientId,
      bed_id: bed.id,
      service_id: bed.service_id,
      attending_doctor_id: doctorId || null,
      admission_date: new Date().toISOString(),
      admission_reason: reason || null,
      admission_diagnosis: diagnosis || null,
      status: 'active',
      created_by: profile.id,
    }).select().single()

    await supabase.from('hospital_beds').update({ status: 'occupied' }).eq('id', bed.id)
    setModal(null)
    await loadServices()
    if (hosp) navigate(`/hospitalizacion/expediente/${hosp.id}`)
  }

  async function saveService(data) {
    const svc = modalData.service
    if (svc) {
      await supabase.from('hospital_services').update(data).eq('id', svc.id)
    } else {
      await supabase.from('hospital_services').insert({
        ...data, clinic_id: profile.clinic_id, order_index: services.length
      })
    }
    setModal(null)
    await loadServices()
  }

  async function saveBed(data) {
    const bed = modalData.bed
    const svc = modalData.service
    if (bed && !bed.active_hospitalization) {
      await supabase.from('hospital_beds').update(data).eq('id', bed.id)
    } else {
      await supabase.from('hospital_beds').insert({
        ...data, clinic_id: profile.clinic_id, service_id: svc.id
      })
    }
    setModal(null)
    await loadServices()
  }

  const totalOccupied = beds.filter(b => b.status === 'occupied').length
  const totalAvailable = beds.filter(b => b.status === 'available').length
  const totalClosed = beds.filter(b => b.status === 'closed' || b.status === 'maintenance').length

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f4f7f6', fontSize:14, color:'#888' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f4f7f6', fontFamily:'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ background:'#1a3a5c', padding:'0 24px', display:'flex', alignItems:'center', gap:14, height:56 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <i className="ti ti-building-hospital" style={{ fontSize:20, color:'#fff' }} aria-hidden="true"></i>
          <span style={{ fontSize:15, fontWeight:600, color:'#fff' }}>Hospitalización</span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => { setActiveContext('outpatient'); navigate('/admin') }}
            style={{ fontSize:12, color:'rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, padding:'5px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-arrow-left" style={{ fontSize:13 }} aria-hidden="true"></i>
            Consulta externa
          </button>
          <UserMenu profile={profile} onSignOut={() => {}} />
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:24 }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:12, marginBottom:24 }}>
          {[
            { label:'Camas ocupadas',    valor: totalOccupied,  color: BLUE,     bg: BLUE_L   },
            { label:'Camas disponibles', valor: totalAvailable, color: GREEN,    bg: GREEN_L  },
            { label:'Cerradas',          valor: totalClosed,    color:'#854F0B', bg:'#FAEEDA' },
            { label:'Total de camas',    valor: beds.length,    color:'#1a3a5c', bg:'#fff'    },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: kpi.bg, border:'0.5px solid #e2ede9', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:10, color: kpi.color, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, opacity:0.8 }}>{kpi.label}</div>
              <div style={{ fontSize:28, fontWeight:700, color: kpi.color, marginTop:4 }}>{kpi.valor}</div>
            </div>
          ))}
        </div>

        {/* Header acciones */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#1a3a5c' }}>Panel de camas</div>
          {isAdmin && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setModalData({}); setModal('service') }}
                style={{ padding:'7px 14px', background:'#fff', border:'0.5px solid #e2ede9', borderRadius:8, cursor:'pointer', fontSize:13, color:'#1a3a5c', display:'flex', alignItems:'center', gap:6 }}>
                <i className="ti ti-plus" style={{ fontSize:14 }} aria-hidden="true"></i> Nuevo servicio
              </button>
            </div>
          )}
        </div>

        {/* Servicios y camas */}
        {services.filter(canSeeService).length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'#aaa', fontSize:14 }}>
            {isAdmin ? 'No hay servicios creados aún. Comenzá creando uno.' : 'No tenés servicios asignados.'}
          </div>
        ) : (
          services.filter(canSeeService).map(service => {
            const serviceBeds = bedsForService(service.id)
            const occupied = serviceBeds.filter(b => b.status === 'occupied').length
            const available = serviceBeds.filter(b => b.status === 'available').length
            const icon = getServiceIcon(service.name)

            return (
              <div key={service.id} style={{ marginBottom:28 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <i className={`ti ${icon}`} style={{ fontSize:18, color: service.color || BLUE }} aria-hidden="true"></i>
                    <span style={{ fontSize:15, fontWeight:700, color:'#1a3a5c' }}>{service.name}</span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: BLUE_L, color:'#0C447C', fontWeight:500 }}>
                      {serviceBeds.length} camas · {occupied} ocupadas · {available} disponibles
                    </span>
                  </div>
                  {isAdmin && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => { setModalData({ service, bed: null }); setModal('bed') }}
                        style={{ fontSize:12, padding:'4px 10px', border:'0.5px solid #e2ede9', borderRadius:6, cursor:'pointer', background:'#fff', color:'#1a3a5c', display:'flex', alignItems:'center', gap:4 }}>
                        <i className="ti ti-plus" style={{ fontSize:12 }} aria-hidden="true"></i> Cama
                      </button>
                      <button onClick={() => { setModalData({ service }); setModal('service') }}
                        style={{ fontSize:12, padding:'4px 10px', border:'0.5px solid #e2ede9', borderRadius:6, cursor:'pointer', background:'#fff', color:'#555', display:'flex', alignItems:'center', gap:4 }}>
                        <i className="ti ti-settings" style={{ fontSize:12 }} aria-hidden="true"></i> Gestionar
                      </button>
                    </div>
                  )}
                </div>

                {serviceBeds.length === 0 ? (
                  <div style={{ padding:20, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, textAlign:'center', fontSize:13, color:'#aaa' }}>
                    Sin camas registradas en este servicio
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:10 }}>
                    {serviceBeds.map(bed => (
                      <BedCard key={bed.id} bed={bed} onClick={handleBedClick} canEdit={isAdmin} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Footer */}
        <div style={{ textAlign:'right', fontSize:12, color:'#aaa', marginTop:16 }}>
          Actualizado: {new Date().toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })} · {new Date().toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' })}
        </div>
      </div>

      {/* Modales */}
      {modal === 'admit' && (
        <AdmitPatientModal bed={modalData.bed} patients={patients} doctors={doctors} onClose={() => setModal(null)} onSave={admitPatient} />
      )}
      {modal === 'service' && (
        <ServiceModal service={modalData.service} onClose={() => setModal(null)} onSave={saveService} />
      )}
      {modal === 'bed' && (
        <BedModal bed={modalData.bed} service={modalData.service} onClose={() => setModal(null)} onSave={saveBed} />
      )}
    </div>
  )
}
