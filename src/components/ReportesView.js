import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import * as XLSX from 'xlsx'

const G = '#1D9E75'
const BLUE = '#1a3a5c'
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DOCTOR_COLORS = ['#185FA5','#0F6E56','#8e44ad','#e67e22','#c0392b','#2980b9','#16a085','#d35400']
const STATUS_LABELS = { all:'Todas', pending_confirmation:'Pendientes', confirmed_patient:'Confirmadas (paciente)', confirmed_doctor:'Confirmadas (médico)', no_show:'No asistió', cancelled:'Canceladas', scheduled:'Agendadas' }

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight: active?600:400, background: active?BLUE:'#f0f4f8', color: active?'#fff':'#555', fontFamily:'inherit', transition:'all 0.15s' }}>
      {children}
    </button>
  )
}

function KpiCard({ label, valor, color='#1a3a5c', bg='#f4f7f6' }) {
  return (
    <div style={{ background:bg, border:'0.5px solid #e2ede9', borderRadius:12, padding:'14px 18px' }}>
      <div style={{ fontSize:10, color, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, opacity:0.8 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color, marginTop:4 }}>{valor}</div>
    </div>
  )
}

function exportXLSX(rows, headers, filename) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
  XLSX.writeFile(wb, filename + '.xlsx')
}

export default function ReportesView({ appts, patients, doctors, profile, branches=[], isClinicAdmin=false }) {
  const [tab, setTab] = useState('dashboard')
  const [reporteTab, setReporteTab] = useState('citas_doctor')
  const [year, setYear] = useState(new Date().getFullYear())
  const [allAppts, setAllAppts] = useState([])
  const [allPatients, setAllPatients] = useState([])
  const [allModules, setAllModules] = useState([])
  const [loading, setLoading] = useState(false)
  const [citasFilter, setCitasFilter] = useState({ statuses:[], doctorIds:[] })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [citasDateRange, setCitasDateRange] = useState({ from:'', to:'' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: ap } = await supabase.from('appointments')
      .select('*, patient:patient_id(id, id_number, phone, province, canton, profile:profile_id(first_name, last_name, email)), doctor:doctor_id(id, first_name, last_name, prefix, specialty), tags:appointment_tag_links(tag:tag_id(name, color)), branch:branch_id(name)')
      .eq('clinic_id', profile.clinic_id)
      .order('appointment_date')
    setAllAppts(ap || [])

    const { data: pt } = await supabase.from('patients')
      .select('id, id_number, phone, birth_date, sex, province, canton, height_cm, clinic_id, profile:profile_id(id, first_name, last_name, email)')
      .eq('clinic_id', profile.clinic_id)
      .neq('status', 'inactive')
    setAllPatients(pt || [])

    const { data: mod } = await supabase.from('patient_care_modules')
      .select('module_type, patient_id, patient:patient_id(sex)')
      .eq('clinic_id', profile.clinic_id)
      .eq('is_active', true)
    setAllModules(mod || [])

    setLoading(false)
  }

  // ── DATOS PARA GRÁFICAS ──────────────────────────────────────────────────
  function getMonthlyData(targetYear) {
    const prevYear = targetYear - 1
    return MONTHS.map((m, i) => {
      const curr = allAppts.filter(a => {
        const d = new Date(a.appointment_date + 'T12:00:00')
        return d.getFullYear() === targetYear && d.getMonth() === i && a.status !== 'cancelled'
      }).length
      const prev = allAppts.filter(a => {
        const d = new Date(a.appointment_date + 'T12:00:00')
        return d.getFullYear() === prevYear && d.getMonth() === i && a.status !== 'cancelled'
      }).length
      return { mes: m, actual: curr, anterior: prev }
    })
  }

  function getDoctorMonthlyData(targetYear) {
    const activeDoctors = doctors.filter(d => allAppts.some(a => a.doctor_id === d.id))
    return MONTHS.map((m, i) => {
      const row = { mes: m }
      activeDoctors.forEach(d => {
        const curr = allAppts.filter(a => {
          const date = new Date(a.appointment_date + 'T12:00:00')
          return date.getFullYear() === targetYear && date.getMonth() === i && a.doctor_id === d.id && a.status !== 'cancelled'
        }).length
        const prev = allAppts.filter(a => {
          const date = new Date(a.appointment_date + 'T12:00:00')
          return date.getFullYear() === targetYear - 1 && date.getMonth() === i && a.doctor_id === d.id && a.status !== 'cancelled'
        }).length
        row[d.id + '_curr'] = curr
        row[d.id + '_prev'] = prev
      })
      return row
    })
  }

  function getNoshowMonthlyData(targetYear) {
    return MONTHS.map((m, i) => {
      const curr = allAppts.filter(a => {
        const d = new Date(a.appointment_date + 'T12:00:00')
        return d.getFullYear() === targetYear && d.getMonth() === i && a.status === 'no_show'
      }).length
      const prev = allAppts.filter(a => {
        const d = new Date(a.appointment_date + 'T12:00:00')
        return d.getFullYear() === targetYear - 1 && d.getMonth() === i && a.status === 'no_show'
      }).length
      return { mes: m, actual: curr, anterior: prev }
    })
  }

  const monthlyData = getMonthlyData(year)
  const doctorMonthlyData = getDoctorMonthlyData(year)
  const noshowData = getNoshowMonthlyData(year)
  const activeDoctors = doctors.filter(d => allAppts.some(a => a.doctor_id === d.id))

  // ── REPORTE 1: CITAS POR DOCTOR ──────────────────────────────────────────
  function exportCitasDoctor() {
    let filtered = allAppts
    if (citasFilter.statuses.length > 0 && !citasFilter.statuses.includes('all')) filtered = filtered.filter(a => citasFilter.statuses.includes(a.status))
    if (citasFilter.doctorIds.length > 0) filtered = filtered.filter(a => citasFilter.doctorIds.includes(a.doctor_id))
    if (citasDateRange.from) filtered = filtered.filter(a => a.appointment_date >= citasDateRange.from)
    if (citasDateRange.to) filtered = filtered.filter(a => a.appointment_date <= citasDateRange.to)

    const rows = filtered.map(a => {
      const d = doctors.find(x => x.id === a.doctor_id)
      const doctorName = d ? `${d.prefix ? d.prefix + ' ' : ''}${d.first_name} ${d.last_name}` : ''
      const branch = branches.find(b => b.id === a.branch_id)
      const tags = (a.tags || []).map(t => t.tag?.name).filter(Boolean).join(', ')
      return [
        doctorName,
        branch?.name || '',
        'Glow Clinic',
        a.appointment_date + ' ' + (a.appointment_time?.substring(0,5)||''),
        a.patient?.profile?.first_name || '',
        a.patient?.profile?.last_name || '',
        a.patient?.profile?.email || '',
        a.patient?.phone || '',
        STATUS_LABELS[a.status] || a.status,
        a.patient?.province || '',
        a.patient?.canton || '',
        tags,
      ]
    })

    const headers = ['Doctor','Sede','Clínica','Fecha y hora','Nombre paciente','Apellidos paciente','Correo','Teléfono','Estado','Provincia','Cantón','Etiquetas']
    exportXLSX(rows, headers, `citas_por_doctor_${new Date().toISOString().split('T')[0]}`)
  }

  // ── REPORTE 2: PERSONAL POR SEDE ─────────────────────────────────────────
  function exportPersonalSede() {
    const rows = doctors.map(d => [
      'Glow Clinic',
      branches.find(b => b.id === d.branch_id)?.name || 'Sin sede',
      d.first_name || '',
      d.last_name || '',
      d.specialty || '',
      d.medical_code || '',
      d.phone || '',
      d.email || '',
      d.role === 'clinic_admin' ? 'Admin clínica' : d.role === 'receptionist' ? 'Recepcionista' : 'Médico',
    ])
    const headers = ['Clínica','Sucursal','Nombre','Apellidos','Especialidad/Profesión','Código profesional','Teléfono','Correo','Cargo']
    exportXLSX(rows, headers, `personal_por_sede_${new Date().toISOString().split('T')[0]}`)
  }

  // ── REPORTE 3: PACIENTES POR MÓDULO ──────────────────────────────────────
  function exportPacientesModulo() {
    const MODULE_LABELS = { integral:'Atención Integral', metabolica:'Atención Metabólica', estetica:'Atención Estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería', odontologia:'Odontología', nutricion:'Nutrición' }
    const grouped = {}
    allModules.forEach(m => {
      if (!grouped[m.module_type]) grouped[m.module_type] = { total:0, hombres:0, mujeres:0 }
      grouped[m.module_type].total++
      if (m.patient?.sex === 'male') grouped[m.module_type].hombres++
      if (m.patient?.sex === 'female') grouped[m.module_type].mujeres++
    })
    const rows = Object.entries(grouped).map(([key, val]) => [
      MODULE_LABELS[key] || key, val.total, val.hombres, val.mujeres
    ])
    const headers = ['Módulo','Total pacientes','Hombres','Mujeres']
    exportXLSX(rows, headers, `pacientes_por_modulo_${new Date().toISOString().split('T')[0]}`)
  }

  const inp = { padding:'7px 10px', fontSize:13, border:'0.5px solid #e2ede9', borderRadius:8, outline:'none', fontFamily:'inherit' }

  if (loading) return <div style={{ textAlign:'center', padding:60, color:'#aaa', fontSize:14 }}>Cargando datos...</div>

  return (
    <div style={{ fontFamily:'Inter, sans-serif' }}>

      {/* Tabs principales */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <TabBtn active={tab==='dashboard'} onClick={() => setTab('dashboard')}>Dashboard</TabBtn>
        <TabBtn active={tab==='reportes'} onClick={() => setTab('reportes')}>Reportes</TabBtn>
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:28 }}>
            <KpiCard label="Total citas" valor={allAppts.filter(a=>a.status!=='cancelled').length} color={BLUE} bg="#E6F1FB" />
            <KpiCard label="Confirmadas" valor={allAppts.filter(a=>a.status==='confirmed_patient'||a.status==='confirmed_doctor').length} color="#0F6E56" bg="#E1F5EE" />
            <KpiCard label="No asistió" valor={allAppts.filter(a=>a.status==='no_show').length} color="#D85A30" bg="#FAECE7" />
            <KpiCard label="Pacientes" valor={allPatients.length} color="#1a3a5c" bg="#f4f7f6" />
          </div>

          {/* Selector de año */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <button onClick={() => setYear(p=>p-1)} style={{ ...inp, padding:'6px 12px', cursor:'pointer', background:'#fff' }}>‹</button>
            <span style={{ fontSize:15, fontWeight:600, color:BLUE }}>{year}</span>
            <button onClick={() => setYear(p=>p+1)} style={{ ...inp, padding:'6px 12px', cursor:'pointer', background:'#fff' }}>›</button>
          </div>

          {/* Gráfica 1: Citas por mes */}
          <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:BLUE, marginBottom:16 }}>Citas por mes — {year} vs {year-1}</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize:12 }} />
                <YAxis tick={{ fontSize:12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke={BLUE} strokeWidth={2} dot={{ r:4 }} name={String(year)} />
                <Line type="monotone" dataKey="anterior" stroke="#aaa" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r:3 }} name={String(year-1)} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica 2: Citas por doctor por mes */}
          <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:BLUE, marginBottom:16 }}>Citas por doctor — {year}</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={doctorMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize:12 }} />
                <YAxis tick={{ fontSize:12 }} />
                <Tooltip />
                <Legend />
                {activeDoctors.map((d, i) => (
                  <Line key={d.id} type="monotone" dataKey={d.id + '_curr'} stroke={DOCTOR_COLORS[i % DOCTOR_COLORS.length]} strokeWidth={2} dot={{ r:3 }}
                    name={`${d.prefix?d.prefix+' ':''}${d.first_name} ${d.last_name}`} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica 3: No-show por mes */}
          <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:BLUE, marginBottom:16 }}>Ausencias (no-show) — {year} vs {year-1}</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={noshowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize:12 }} />
                <YAxis tick={{ fontSize:12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#D85A30" strokeWidth={2} dot={{ r:4 }} name={String(year)} />
                <Line type="monotone" dataKey="anterior" stroke="#aaa" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r:3 }} name={String(year-1)} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── REPORTES ── */}
      {tab === 'reportes' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            <TabBtn active={reporteTab==='citas_doctor'} onClick={() => setReporteTab('citas_doctor')}>Citas por doctor</TabBtn>
            <TabBtn active={reporteTab==='personal_sede'} onClick={() => setReporteTab('personal_sede')}>Personal por sede</TabBtn>
            <TabBtn active={reporteTab==='pacientes_modulo'} onClick={() => setReporteTab('pacientes_modulo')}>Pacientes por módulo</TabBtn>
          </div>

          {/* Reporte 1: Citas por doctor */}
          {reporteTab === 'citas_doctor' && (
            <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'18px 20px' }}>
              <div style={{ fontSize:14, fontWeight:600, color:BLUE, marginBottom:16 }}>Citas por doctor</div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div style={{ position:'relative' }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', display:'block', marginBottom:5 }}>Estado de citas</label>
                  <div onClick={() => setStatusDropdownOpen(p=>!p)}
                    style={{ ...inp, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', userSelect:'none' }}>
                    <span style={{ fontSize:13, color:'#555' }}>
                      {citasFilter.statuses.length === 0 ? 'Todas' : citasFilter.statuses.length === 1 ? STATUS_LABELS[citasFilter.statuses[0]] : `${citasFilter.statuses.length} estados`}
                    </span>
                    <span style={{ fontSize:10, color:'#aaa' }}>{statusDropdownOpen ? '▲' : '▼'}</span>
                  </div>
                  {statusDropdownOpen && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:8, zIndex:50, boxShadow:'0 4px 12px rgba(0,0,0,0.08)', marginTop:4 }}>
                      {Object.entries(STATUS_LABELS).map(([k,v]) => {
                        const isAll = k === 'all'
                        const allSel = citasFilter.statuses.length === 0
                        const sel = isAll ? allSel : citasFilter.statuses.includes(k)
                        return (
                          <div key={k} onClick={() => {
                            if (isAll) { setCitasFilter(p=>({...p, statuses:[]})); setStatusDropdownOpen(false); return }
                            setCitasFilter(p => {
                              const next = p.statuses.includes(k) ? p.statuses.filter(x=>x!==k) : [...p.statuses, k]
                              return { ...p, statuses: next }
                            })
                          }}
                            style={{ padding:'9px 12px', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:8,
                              background: sel?'#E6F1FB':'#fff', color: sel?BLUE:'#555',
                              borderBottom:'0.5px solid #f0f5f3', fontWeight: sel?600:400 }}>
                            <div style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${sel?BLUE:'#ccc'}`, background:sel?BLUE:'#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {sel && <div style={{ width:8, height:8, background:'#fff', borderRadius:1 }} />}
                            </div>
                            {v}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', display:'block', marginBottom:5 }}>Desde (mes/año)</label>
                  <input type="month" style={{ ...inp, width:'100%', boxSizing:'border-box' }} value={citasDateRange.from ? citasDateRange.from.substring(0,7) : ''} onChange={e => setCitasDateRange(p=>({...p, from:e.target.value ? e.target.value+'-01' : ''}))} />
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', display:'block', marginBottom:5 }}>Hasta (mes/año)</label>
                  <input type="month" style={{ ...inp, width:'100%', boxSizing:'border-box' }} value={citasDateRange.to ? citasDateRange.to.substring(0,7) : ''} onChange={e => {
                    if (e.target.value) {
                      const [y,m] = e.target.value.split('-')
                      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
                      setCitasDateRange(p=>({...p, to:`${e.target.value}-${lastDay}`}))
                    } else { setCitasDateRange(p=>({...p, to:''})) }
                  }} />
                </div>
                <div style={{ position:'relative' }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', display:'block', marginBottom:5 }}>Profesionales</label>
                  <div onClick={() => setDropdownOpen(p=>!p)}
                    style={{ ...inp, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', userSelect:'none' }}>
                    <span style={{ fontSize:13, color:'#555' }}>
                      {citasFilter.doctorIds.length === 0 ? 'Todos' : citasFilter.doctorIds.length === 1
                        ? (() => { const d = doctors.find(x=>x.id===citasFilter.doctorIds[0]); return d ? `${d.prefix?d.prefix+' ':''}${d.first_name} ${d.last_name}` : '' })()
                        : `${citasFilter.doctorIds.length} profesionales`}
                    </span>
                    <span style={{ fontSize:10, color:'#aaa' }}>{dropdownOpen ? '▲' : '▼'}</span>
                  </div>
                  {dropdownOpen && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:8, zIndex:50, boxShadow:'0 4px 12px rgba(0,0,0,0.08)', maxHeight:200, overflowY:'auto', marginTop:4 }}>
                      {[{ id:'all', first_name:'Todos', last_name:'', prefix:'' }, ...[...doctors].sort((a,b) => a.first_name.localeCompare(b.first_name))].map(d => {
                        const isAll = d.id === 'all'
                        const allSel = citasFilter.doctorIds.length === 0
                        const sel = isAll ? allSel : citasFilter.doctorIds.includes(d.id)
                        return (
                          <div key={d.id} onClick={() => {
                            if (isAll) { setCitasFilter(p=>({...p, doctorIds:[]})); setDropdownOpen(false); return }
                            setCitasFilter(p => {
                              const next = p.doctorIds.includes(d.id) ? p.doctorIds.filter(x=>x!==d.id) : [...p.doctorIds, d.id]
                              return { ...p, doctorIds: next }
                            })
                          }}
                            style={{ padding:'9px 12px', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:8,
                              background: sel?'#E6F1FB':'#fff', color: sel?BLUE:'#555',
                              borderBottom:'0.5px solid #f0f5f3', fontWeight: sel?600:400 }}>
                            <div style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${sel?BLUE:'#ccc'}`, background:sel?BLUE:'#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {sel && <div style={{ width:8, height:8, background:'#fff', borderRadius:1 }} />}
                            </div>
                            {isAll ? 'Todos' : `${d.prefix?d.prefix+' ':''}${d.first_name} ${d.last_name}`}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {(() => {
                let filtered = allAppts
                if (citasFilter.statuses.length > 0 && !citasFilter.statuses.includes('all')) filtered = filtered.filter(a => citasFilter.statuses.includes(a.status))
                if (citasFilter.doctorIds.length > 0) filtered = filtered.filter(a => citasFilter.doctorIds.includes(a.doctor_id))
                if (citasDateRange.from) filtered = filtered.filter(a => a.appointment_date >= citasDateRange.from)
                if (citasDateRange.to) filtered = filtered.filter(a => a.appointment_date <= citasDateRange.to)
                return (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontSize:13, color:'#555' }}><strong>{filtered.length}</strong> citas en el reporte</div>
                      <button onClick={exportCitasDoctor}
                        style={{ padding:'8px 18px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
                        Descargar XLSX
                      </button>
                    </div>
                    <div style={{ overflowX:'auto', maxHeight:320, overflowY:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead style={{ position:'sticky', top:0 }}>
                          <tr style={{ background:'#f4f7f6' }}>
                            {['Doctor','Fecha','Paciente','Estado','Etiquetas'].map(h => (
                              <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, fontSize:11, color:'#6b8f7e', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.slice(0,50).map((a,i) => {
                            const d = doctors.find(x=>x.id===a.doctor_id)
                            const tags = (a.tags||[]).map(t=>t.tag?.name).filter(Boolean).join(', ')
                            return (
                              <tr key={a.id} style={{ borderTop:'0.5px solid #f0f5f3', background:i%2===0?'#fff':'#fafdfb' }}>
                                <td style={{ padding:'7px 10px', color:'#1a3a5c' }}>{d?`${d.prefix?d.prefix+' ':''}${d.first_name} ${d.last_name}`:'-'}</td>
                                <td style={{ padding:'7px 10px', color:'#555', whiteSpace:'nowrap' }}>{a.appointment_date}</td>
                                <td style={{ padding:'7px 10px', color:'#333' }}>{a.patient?.profile?.first_name} {a.patient?.profile?.last_name}</td>
                                <td style={{ padding:'7px 10px' }}>
                                  <span style={{ fontSize:11, padding:'2px 7px', borderRadius:20, background: a.status==='no_show'?'#FAECE7':a.status.includes('confirmed')?'#E1F5EE':'#f4f7f6', color: a.status==='no_show'?'#D85A30':a.status.includes('confirmed')?'#0F6E56':'#555' }}>
                                    {STATUS_LABELS[a.status]||a.status}
                                  </span>
                                </td>
                                <td style={{ padding:'7px 10px', color:'#888', fontSize:11 }}>{tags}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {filtered.length > 50 && <div style={{ textAlign:'center', padding:'10px 0', fontSize:12, color:'#aaa' }}>Mostrando 50 de {filtered.length} — descargá el XLSX para ver todos</div>}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Reporte 2: Personal por sede */}
          {reporteTab === 'personal_sede' && (
            <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'18px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:BLUE, marginBottom:4 }}>Personal por sede</div>
                  <div style={{ fontSize:12, color:'#8aab9a' }}>{doctors.length} profesionales registrados</div>
                </div>
                <button onClick={exportPersonalSede}
                  style={{ padding:'8px 18px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                  Descargar XLSX
                </button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f4f7f6' }}>
                      {['Nombre','Especialidad','Código','Sede','Cargo'].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, fontSize:11, color:'#6b8f7e', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((d,i) => (
                      <tr key={d.id} style={{ borderTop:'0.5px solid #f0f5f3', background:i%2===0?'#fff':'#fafdfb' }}>
                        <td style={{ padding:'7px 10px', color:'#1a3a5c', fontWeight:500 }}>{d.prefix?d.prefix+' ':''}{d.first_name} {d.last_name}</td>
                        <td style={{ padding:'7px 10px', color:'#555' }}>{d.specialty||'-'}</td>
                        <td style={{ padding:'7px 10px', color:'#555' }}>{d.medical_code||'-'}</td>
                        <td style={{ padding:'7px 10px', color:'#555' }}>{branches.find(b=>b.id===d.branch_id)?.name||'Principal'}</td>
                        <td style={{ padding:'7px 10px', color:'#555' }}>{d.role==='clinic_admin'?'Admin clínica':d.role==='receptionist'?'Recepcionista':'Médico'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reporte 3: Pacientes por módulo */}
          {reporteTab === 'pacientes_modulo' && (
            <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'18px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, color:BLUE }}>Pacientes por módulo</div>
                <button onClick={exportPacientesModulo}
                  style={{ padding:'8px 18px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                  Descargar XLSX
                </button>
              </div>
              {(() => {
                const MODULE_LABELS = { integral:'Atención Integral', metabolica:'Atención Metabólica', estetica:'Atención Estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería', odontologia:'Odontología', nutricion:'Nutrición' }
                const grouped = {}
                allModules.forEach(m => {
                  if (!grouped[m.module_type]) grouped[m.module_type] = { total:0, hombres:0, mujeres:0 }
                  grouped[m.module_type].total++
                  if (m.patient?.sex === 'male') grouped[m.module_type].hombres++
                  if (m.patient?.sex === 'female') grouped[m.module_type].mujeres++
                })
                return (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:'#f4f7f6' }}>
                        {['Módulo','Total pacientes','Hombres','Mujeres'].map(h => (
                          <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontWeight:600, fontSize:11, color:'#6b8f7e', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(grouped).map(([key, val], i) => (
                        <tr key={key} style={{ borderTop:'0.5px solid #f0f5f3', background:i%2===0?'#fff':'#fafdfb' }}>
                          <td style={{ padding:'7px 10px', color:'#1a3a5c', fontWeight:500 }}>{MODULE_LABELS[key]||key}</td>
                          <td style={{ padding:'7px 10px', color:'#333', fontWeight:600 }}>{val.total}</td>
                          <td style={{ padding:'7px 10px', color:'#185FA5' }}>{val.hombres}</td>
                          <td style={{ padding:'7px 10px', color:'#D4537E' }}>{val.mujeres}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
