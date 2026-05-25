import { useState, useRef, useCallback } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const G = '#1D9E75'

const REPORTES_DISPONIBLES = [
  { id: 'citas_total', label: 'Total de citas' },
  { id: 'citas_confirmadas', label: 'Citas confirmadas' },
  { id: 'citas_ausentes', label: 'Citas con ausencia' },
  { id: 'citas_primera_vez', label: 'Citas de primera vez' },
  { id: 'citas_por_doctor', label: 'Citas por doctor' },
  { id: 'pacientes_provincia', label: 'Pacientes por provincia' },
  { id: 'hora_pico', label: 'Horas de mayor ocupación' },
  { id: 'tasa_noshow', label: 'Tasa de no-show por doctor' },
  { id: 'nuevos_vs_recurrentes', label: 'Nuevos vs recurrentes' },
  { id: 'modulos_activos', label: 'Módulos más activos' },
  { id: 'pacientes_sexo_edad', label: 'Pacientes por sexo y edad' },
]

const ATAJOS = [
  { label: 'Esta semana', fn: () => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const start = new Date(now); start.setDate(now.getDate() + diff); start.setHours(0,0,0,0)
    const end = new Date(start); end.setDate(start.getDate() + 6)
    return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
  }},
  { label: 'Este mes', fn: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth()+1, 0)
    return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
  }},
  { label: 'Últimos 3 meses', fn: () => {
    const end = new Date()
    const start = new Date(); start.setMonth(start.getMonth() - 3)
    return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
  }},
  { label: 'Últimos 6 meses', fn: () => {
    const end = new Date()
    const start = new Date(); start.setMonth(start.getMonth() - 6)
    return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
  }},
  { label: 'Este año', fn: () => {
    const now = new Date()
    return [now.getFullYear()+'-01-01', now.getFullYear()+'-12-31']
  }},
]

const MODULE_LABELS = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }

export default function ReportesView({ appts, patients, doctors, profile, isMobile }) {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(todayStr)
  const [selectedReportes, setSelectedReportes] = useState(REPORTES_DISPONIBLES.map(r => r.id))
  const [dragging, setDragging] = useState(null)
  const [reporteOrder, setReporteOrder] = useState(REPORTES_DISPONIBLES.map(r => r.id))
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef(null)

  // Filtrar citas por rango
  const filteredAppts = appts.filter(a => a.appointment_date >= dateFrom && a.appointment_date <= dateTo)

  // Métricas
  const totalCitas = filteredAppts.length
  const citasConfirmadas = filteredAppts.filter(a => a.status === 'confirmed_patient' || a.status === 'confirmed_doctor').length
  const citasAusentes = filteredAppts.filter(a => a.status === 'no_show').length
  const citasPrimeraVez = filteredAppts.filter(a => a.visit_type?.toLowerCase().includes('primera')).length

  // Citas por doctor
  const citasPorDoctor = doctors.map(d => ({
    nombre: `${d.first_name} ${d.last_name}`,
    total: filteredAppts.filter(a => a.doctor_id === d.id).length,
    confirmadas: filteredAppts.filter(a => a.doctor_id === d.id && (a.status === 'confirmed_patient' || a.status === 'confirmed_doctor')).length,
    ausentes: filteredAppts.filter(a => a.doctor_id === d.id && a.status === 'no_show').length,
  })).filter(d => d.total > 0).sort((a,b) => b.total - a.total)

  // Pacientes por provincia
  const provinciaMap = {}
  patients.forEach(p => { if(p.province) provinciaMap[p.province] = (provinciaMap[p.province]||0)+1 })
  const provincias = Object.entries(provinciaMap).sort((a,b) => b[1]-a[1])

  // Horas pico
  const horaPico = {}
  filteredAppts.forEach(a => {
    if (!a.appointment_time) return
    const h = parseInt(a.appointment_time.split(':')[0])
    const day = new Date(a.appointment_date+'T12:00:00').getDay()
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const key = `${days[day]} ${h}:00`
    horaPico[key] = (horaPico[key]||0)+1
  })
  const horasPico = Object.entries(horaPico).sort((a,b) => b[1]-a[1]).slice(0,5)

  // Tasa no-show por doctor
  const tasaNoShow = doctors.map(d => {
    const total = filteredAppts.filter(a => a.doctor_id === d.id).length
    const noshow = filteredAppts.filter(a => a.doctor_id === d.id && a.status === 'no_show').length
    return { nombre: `${d.first_name} ${d.last_name}`, total, noshow, tasa: total > 0 ? Math.round(noshow/total*100) : 0 }
  }).filter(d => d.total > 0).sort((a,b) => b.tasa-a.tasa)

  // Nuevos vs recurrentes
  const patientApptCount = {}
  appts.forEach(a => { patientApptCount[a.patient_id] = (patientApptCount[a.patient_id]||0)+1 })
  const nuevos = filteredAppts.filter(a => patientApptCount[a.patient_id] === 1).length
  const recurrentes = filteredAppts.filter(a => patientApptCount[a.patient_id] > 1).length

  // Módulos activos
  const moduloMap = {}
  filteredAppts.forEach(a => { if(a.module_type) moduloMap[a.module_type] = (moduloMap[a.module_type]||0)+1 })
  const modulos = Object.entries(moduloMap).sort((a,b) => b[1]-a[1])

  // Sexo y edad
  const sexoMap = { female: patients.filter(p=>p.sex==='female').length, male: patients.filter(p=>p.sex==='male').length, other: patients.filter(p=>p.sex==='other').length }
  const getAge = dob => { if(!dob) return null; const d = new Date(dob); const n = new Date(); return n.getFullYear()-d.getFullYear()-(n<new Date(n.getFullYear(),d.getMonth(),d.getDate())?1:0) }
  const grupos = [{l:'18-25',min:18,max:25},{l:'26-35',min:26,max:35},{l:'36-45',min:36,max:45},{l:'46-55',min:46,max:55},{l:'56-65',min:56,max:65},{l:'65+',min:66,max:200}]
  const edades = grupos.map(g => ({ label:g.l, count: patients.filter(p=>{ const a=getAge(p.birth_date); return a!==null&&a>=g.min&&a<=g.max }).length }))

  // Drag and drop
  function handleDragStart(id) { setDragging(id) }
  function handleDragOver(e, id) {
    e.preventDefault()
    if (!dragging || dragging === id) return
    const newOrder = [...reporteOrder]
    const from = newOrder.indexOf(dragging)
    const to = newOrder.indexOf(id)
    newOrder.splice(from, 1)
    newOrder.splice(to, 0, dragging)
    setReporteOrder(newOrder)
  }
  function handleDrop() { setDragging(null) }

  // Export PDF
  async function exportPDF() {
    setExporting(true)
    try {
      const el = reportRef.current
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height * pdfW) / canvas.width
      let y = 0
      while (y < imgH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -y, pdfW, imgH)
        y += pdfH
      }
      const fechaGen = new Date().toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
      pdf.save(`Reporte_MedTrack_${dateFrom}_${dateTo}.pdf`)
    } catch(e) {
      console.error(e)
    }
    setExporting(false)
  }

  const fmtDate = d => new Date(d+'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
  const nombrePerfil = `${profile?.first_name||''} ${profile?.last_name||''}`.trim()

  const maxCitasDoctor = Math.max(...citasPorDoctor.map(d=>d.total), 1)
  const maxHora = Math.max(...horasPico.map(h=>h[1]), 1)

  return (
    <div>
      {/* Controles */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'#1a1a1a' }}>Reportes y métricas</div>
          <button onClick={exportPDF} disabled={exporting}
            style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:exporting?0.7:1 }}>
            {exporting ? 'Generando PDF...' : '⬇ Exportar PDF'}
          </button>
        </div>

        {/* Atajos de fecha */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {ATAJOS.map(a => (
            <button key={a.label} onClick={() => { const [f,t]=a.fn(); setDateFrom(f); setDateTo(t) }}
              style={{ padding:'4px 12px', borderRadius:20, border:'1px solid #eee', background:'#f8f8f8', fontSize:12, cursor:'pointer', color:'#555' }}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Rango personalizado */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:'#666' }}>Desde</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              style={{ padding:'6px 10px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:'#666' }}>Hasta</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              style={{ padding:'6px 10px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none' }} />
          </div>
        </div>
      </div>

      {/* Selector de reportes con drag & drop */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>Seleccionar reportes a exportar</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setSelectedReportes(reporteOrder)} style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:'1px solid #eee', cursor:'pointer', background:'#f8f8f8', color:'#555' }}>Todos</button>
            <button onClick={() => setSelectedReportes([])} style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:'1px solid #eee', cursor:'pointer', background:'#f8f8f8', color:'#555' }}>Ninguno</button>
          </div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {reporteOrder.map(id => {
            const r = REPORTES_DISPONIBLES.find(x=>x.id===id)
            const selected = selectedReportes.includes(id)
            return (
              <div key={id} draggable
                onDragStart={() => handleDragStart(id)}
                onDragOver={e => handleDragOver(e, id)}
                onDrop={handleDrop}
                onClick={() => setSelectedReportes(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])}
                style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${selected?G:'#eee'}`, background: selected?G+'15':'#f8f8f8', color: selected?G:'#666', fontSize:12, fontWeight: selected?600:400, cursor:'grab', userSelect:'none', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:10, color:'#bbb' }}>⠿</span>
                {r?.label}
                {selected && <span style={{ fontSize:10 }}>✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Área de reporte */}
      <div ref={reportRef} style={{ background:'#fff', padding:24, borderRadius:12, border:'0.5px solid #eee' }}>
        {/* Encabezado PDF */}
        <div style={{ borderBottom:'2px solid '+G, paddingBottom:16, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.1em' }}>Glow Clinic · MedTrack</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#1a1a1a', marginTop:4 }}>Reporte de métricas</div>
              <div style={{ fontSize:13, color:'#555', marginTop:2 }}>{fmtDate(dateFrom)} — {fmtDate(dateTo)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:'#888' }}>Generado el {new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Exportado por {nombrePerfil}</div>
            </div>
          </div>
        </div>

        {/* Reportes seleccionados en orden */}
        {reporteOrder.filter(id => selectedReportes.includes(id)).map(id => {
          if (id === 'citas_total') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid '+G, paddingLeft:10 }}>Total de citas</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[{l:'Total citas',v:totalCitas,c:G},{l:'Pendientes',v:filteredAppts.filter(a=>a.status==='pending_confirmation').length,c:'#F59E0B'},{l:'Canceladas',v:filteredAppts.filter(a=>a.status==='cancelled').length,c:'#D85A30'},{l:'Completadas',v:citasConfirmadas+citasAusentes,c:'#185FA5'}].map((m,i)=>(
                  <div key={i} style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:24, fontWeight:700, color:m.c }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )
          if (id === 'citas_confirmadas') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid '+G, paddingLeft:10 }}>Citas confirmadas</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>Confirmadas por paciente</div>
                  <div style={{ fontSize:24, fontWeight:700, color:G }}>{filteredAppts.filter(a=>a.status==='confirmed_patient').length}</div>
                </div>
                <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>Confirmadas por médico</div>
                  <div style={{ fontSize:24, fontWeight:700, color:'#185FA5' }}>{filteredAppts.filter(a=>a.status==='confirmed_doctor').length}</div>
                </div>
              </div>
              <div style={{ marginTop:8, background:'#E1F5EE', borderRadius:8, padding:'8px 12px', fontSize:13, color:G }}>
                Tasa de confirmación: {totalCitas > 0 ? Math.round(citasConfirmadas/totalCitas*100) : 0}%
              </div>
            </div>
          )
          if (id === 'citas_ausentes') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #F59E0B', paddingLeft:10 }}>Citas con ausencia</div>
              <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ fontSize:32, fontWeight:700, color:'#F59E0B' }}>{citasAusentes}</div>
                <div>
                  <div style={{ fontSize:13, color:'#555' }}>Tasa de no-show global</div>
                  <div style={{ fontSize:18, fontWeight:600, color:'#854F0B' }}>{totalCitas > 0 ? Math.round(citasAusentes/totalCitas*100) : 0}%</div>
                </div>
              </div>
            </div>
          )
          if (id === 'citas_primera_vez') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #8e44ad', paddingLeft:10 }}>Citas de primera vez</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>Primera vez</div>
                  <div style={{ fontSize:24, fontWeight:700, color:'#8e44ad' }}>{citasPrimeraVez}</div>
                </div>
                <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>% del total</div>
                  <div style={{ fontSize:24, fontWeight:700, color:'#8e44ad' }}>{totalCitas>0?Math.round(citasPrimeraVez/totalCitas*100):0}%</div>
                </div>
              </div>
            </div>
          )
          if (id === 'citas_por_doctor') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #1a5c8a', paddingLeft:10 }}>Citas por doctor</div>
              {citasPorDoctor.length === 0 && <div style={{ fontSize:13, color:'#999', padding:12 }}>Sin datos en el período</div>}
              {citasPorDoctor.map((d,i) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                    <span style={{ fontWeight:500 }}>{d.nombre}</span>
                    <span style={{ color:'#666' }}>{d.total} citas · {d.confirmadas} conf. · {d.ausentes} ausentes</span>
                  </div>
                  <div style={{ height:8, background:'#f0f0f0', borderRadius:4 }}>
                    <div style={{ height:'100%', background:'#1a5c8a', borderRadius:4, width:(d.total/maxCitasDoctor*100)+'%' }} />
                  </div>
                </div>
              ))}
            </div>
          )
          if (id === 'pacientes_provincia') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #e67e22', paddingLeft:10 }}>Pacientes por provincia</div>
              {provincias.length === 0 && <div style={{ fontSize:13, color:'#999', padding:12 }}>Sin datos</div>}
              {provincias.map(([prov,count],i) => (
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
                    <span>{prov}</span><span style={{ fontWeight:600 }}>{count} ({Math.round(count/patients.length*100)}%)</span>
                  </div>
                  <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                    <div style={{ height:'100%', background:'#e67e22', borderRadius:3, width:(count/patients.length*100)+'%' }} />
                  </div>
                </div>
              ))}
            </div>
          )
          if (id === 'hora_pico') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #c0392b', paddingLeft:10 }}>Horas de mayor ocupación</div>
              {horasPico.length === 0 && <div style={{ fontSize:13, color:'#999', padding:12 }}>Sin datos en el período</div>}
              {horasPico.map(([hora,count],i) => (
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
                    <span style={{ fontWeight:500 }}>{hora}</span><span>{count} citas</span>
                  </div>
                  <div style={{ height:6, background:'#f0f0f0', borderRadius:3 }}>
                    <div style={{ height:'100%', background:'#c0392b', borderRadius:3, width:(count/maxHora*100)+'%' }} />
                  </div>
                </div>
              ))}
            </div>
          )
          if (id === 'tasa_noshow') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #854F0B', paddingLeft:10 }}>Tasa de no-show por doctor</div>
              {tasaNoShow.length === 0 && <div style={{ fontSize:13, color:'#999', padding:12 }}>Sin datos en el período</div>}
              {tasaNoShow.map((d,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid #f5f5f5', fontSize:13 }}>
                  <span>{d.nombre}</span>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <span style={{ color:'#888' }}>{d.noshow}/{d.total} citas</span>
                    <span style={{ fontWeight:700, color: d.tasa>20?'#D85A30':d.tasa>10?'#F59E0B':G }}>{d.tasa}%</span>
                  </div>
                </div>
              ))}
            </div>
          )
          if (id === 'nuevos_vs_recurrentes') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #2980b9', paddingLeft:10 }}>Nuevos vs recurrentes</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'#E6F1FB', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:'#185FA5', marginBottom:4 }}>Nuevos pacientes</div>
                  <div style={{ fontSize:24, fontWeight:700, color:'#185FA5' }}>{nuevos}</div>
                </div>
                <div style={{ background:'#E1F5EE', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:G, marginBottom:4 }}>Pacientes recurrentes</div>
                  <div style={{ fontSize:24, fontWeight:700, color:G }}>{recurrentes}</div>
                </div>
              </div>
            </div>
          )
          if (id === 'modulos_activos') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #16a085', paddingLeft:10 }}>Módulos más activos</div>
              {modulos.length === 0 && <div style={{ fontSize:13, color:'#999', padding:12 }}>Sin datos en el período</div>}
              {modulos.map(([mod,count],i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <span>{MODULE_LABELS[mod]||mod}</span>
                  <span style={{ fontWeight:600, color:'#16a085' }}>{count} citas</span>
                </div>
              ))}
            </div>
          )
          if (id === 'pacientes_sexo_edad') return (
            <div key={id} style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a', marginBottom:10, borderLeft:'3px solid #8e44ad', paddingLeft:10 }}>Pacientes por sexo y edad</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>Por sexo</div>
                  {[{l:'Femenino',v:sexoMap.female,c:'#e91e8c'},{l:'Masculino',v:sexoMap.male,c:'#1a5c8a'},{l:'Otro',v:sexoMap.other,c:'#7a4000'}].map((s,i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0' }}>
                      <span style={{ color:s.c }}>{s.l}</span><span style={{ fontWeight:600 }}>{s.v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>Por grupo de edad</div>
                  {edades.map((g,i)=>(
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0' }}>
                      <span>{g.label}</span><span style={{ fontWeight:600 }}>{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
          return null
        })}

        {/* Disclaimer */}
        <div style={{ borderTop:'1px solid #eee', marginTop:24, paddingTop:12 }}>
          <p style={{ fontSize:10, color:'#aaa', lineHeight:1.6, margin:0 }}>
            La información contenida en este reporte es de carácter estrictamente confidencial y de uso exclusivo del equipo administrativo de Glow Clinic. Queda prohibida su reproducción, distribución o divulgación a personas ajenas al proceso administrativo sin autorización expresa. MedTrack by Glow Clinic.
          </p>
        </div>
      </div>
    </div>
  )
}
