import { useState, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const G = '#1D9E75'
const BLUE = '#1a3a5c'
const BLUE2 = '#2c5282'
const BLUE3 = '#2b6cb0'
const BLUE4 = '#4a90a4'
const GRAY = '#4a5568'
const GRAY2 = '#718096'
const GRAY3 = '#a0aec0'

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
  { label: 'Esta semana', fn: () => { const now=new Date(),day=now.getDay(),diff=day===0?-6:1-day,start=new Date(now); start.setDate(now.getDate()+diff); start.setHours(0,0,0,0); const end=new Date(start); end.setDate(start.getDate()+6); return [start.toISOString().split('T')[0],end.toISOString().split('T')[0]] }},
  { label: 'Este mes', fn: () => { const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1),end=new Date(now.getFullYear(),now.getMonth()+1,0); return [start.toISOString().split('T')[0],end.toISOString().split('T')[0]] }},
  { label: 'Últimos 3 meses', fn: () => { const end=new Date(),start=new Date(); start.setMonth(start.getMonth()-3); return [start.toISOString().split('T')[0],end.toISOString().split('T')[0]] }},
  { label: 'Últimos 6 meses', fn: () => { const end=new Date(),start=new Date(); start.setMonth(start.getMonth()-6); return [start.toISOString().split('T')[0],end.toISOString().split('T')[0]] }},
  { label: 'Este año', fn: () => { const now=new Date(); return [now.getFullYear()+'-01-01',now.getFullYear()+'-12-31'] }},
]

const MODULE_LABELS = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }

const BAR_COLORS = [BLUE, BLUE2, BLUE3, BLUE4, GRAY, GRAY2, '#2d3748', '#553c9a']

const tbl = { width:'100%', borderCollapse:'collapse', fontSize:12, marginTop:10 }
const th = { background:'#edf2f7', color:BLUE, padding:'6px 10px', textAlign:'left', fontWeight:600, border:'1px solid #e2e8f0' }
const td = { padding:'5px 10px', border:'1px solid #e2e8f0', color:GRAY, fontSize:12 }
const tdR = { ...td, textAlign:'right' }

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

  const filteredAppts = appts.filter(a => a.appointment_date >= dateFrom && a.appointment_date <= dateTo)
  const totalCitas = filteredAppts.length
  const citasConfirmadas = filteredAppts.filter(a => a.status === 'confirmed_patient' || a.status === 'confirmed_doctor').length
  const citasAusentes = filteredAppts.filter(a => a.status === 'no_show').length
  const citasPrimeraVez = filteredAppts.filter(a => a.visit_type?.toLowerCase().includes('primera')).length
  const citasPendientes = filteredAppts.filter(a => a.status === 'pending_confirmation').length
  const citasCanceladas = filteredAppts.filter(a => a.status === 'cancelled').length

  const citasPorDoctor = doctors.map(d => ({
    nombre: `${d.last_name} ${d.first_name}`,
    total: filteredAppts.filter(a => a.doctor_id === d.id).length,
    confirmadas: filteredAppts.filter(a => a.doctor_id === d.id && (a.status === 'confirmed_patient' || a.status === 'confirmed_doctor')).length,
    ausentes: filteredAppts.filter(a => a.doctor_id === d.id && a.status === 'no_show').length,
    pendientes: filteredAppts.filter(a => a.doctor_id === d.id && a.status === 'pending_confirmation').length,
  })).filter(d => d.total > 0).sort((a,b) => b.total - a.total)

  const provinciaMap = {}
  patients.forEach(p => { if(p.province) provinciaMap[p.province] = (provinciaMap[p.province]||0)+1 })
  const provincias = Object.entries(provinciaMap).sort((a,b) => b[1]-a[1])

  const horaPico = {}
  filteredAppts.forEach(a => {
    if (!a.appointment_time) return
    const h = parseInt(a.appointment_time.split(':')[0])
    const day = new Date(a.appointment_date+'T12:00:00').getDay()
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const key = `${days[day]} ${h < 12 ? h+'am' : h===12?'12pm':(h-12)+'pm'}`
    horaPico[key] = (horaPico[key]||0)+1
  })
  const horasPico = Object.entries(horaPico).sort((a,b) => b[1]-a[1]).slice(0,8)

  const tasaNoShow = doctors.map(d => {
    const total = filteredAppts.filter(a => a.doctor_id === d.id).length
    const noshow = filteredAppts.filter(a => a.doctor_id === d.id && a.status === 'no_show').length
    return { nombre: `${d.last_name} ${d.first_name}`, total, noshow, tasa: total > 0 ? Math.round(noshow/total*100) : 0 }
  }).filter(d => d.total > 0).sort((a,b) => b.tasa-a.tasa)

  const patientApptCount = {}
  appts.forEach(a => { patientApptCount[a.patient_id] = (patientApptCount[a.patient_id]||0)+1 })
  const nuevos = filteredAppts.filter(a => patientApptCount[a.patient_id] === 1).length
  const recurrentes = filteredAppts.filter(a => patientApptCount[a.patient_id] > 1).length

  const moduloMap = {}
  filteredAppts.forEach(a => { if(a.module_type) moduloMap[a.module_type] = (moduloMap[a.module_type]||0)+1 })
  const modulos = Object.entries(moduloMap).sort((a,b) => b[1]-a[1])

  const sexoMap = { female: patients.filter(p=>p.sex==='female').length, male: patients.filter(p=>p.sex==='male').length, other: patients.filter(p=>p.sex==='other').length }
  const getAge = dob => { if(!dob) return null; const d=new Date(dob),n=new Date(); return n.getFullYear()-d.getFullYear()-(n<new Date(n.getFullYear(),d.getMonth(),d.getDate())?1:0) }
  const grupos = [{l:'18-25',min:18,max:25},{l:'26-35',min:26,max:35},{l:'36-45',min:36,max:45},{l:'46-55',min:46,max:55},{l:'56-65',min:56,max:65},{l:'65+',min:66,max:200}]
  const edades = grupos.map(g => ({ label:g.l, count: patients.filter(p=>{ const a=getAge(p.birth_date); return a!==null&&a>=g.min&&a<=g.max }).length }))

  const maxCitasDoctor = Math.max(...citasPorDoctor.map(d=>d.total), 1)
  const maxHora = Math.max(...horasPico.map(h=>h[1]), 1)
  const maxProv = Math.max(...provincias.map(p=>p[1]), 1)

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

  async function exportPDF() {
    setExporting(true)
    try {
      const el = reportRef.current
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 25 // 2.5cm
      const pdfW = pdf.internal.pageSize.getWidth() - margin * 2
      const pdfH = pdf.internal.pageSize.getHeight() - margin * 2
      const imgH = (canvas.height * pdfW) / canvas.width
      let y = 0
      while (y < imgH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, margin - y, pdfW, imgH)
        y += pdfH
      }
      pdf.save(`Reporte_MedTrack_${dateFrom}_${dateTo}.pdf`)
    } catch(e) { console.error(e) }
    setExporting(false)
  }

  const fmtDate = d => new Date(d+'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
  const nombrePerfil = `${profile?.first_name||''} ${profile?.last_name||''}`.trim()

  const secStyle = { marginBottom:24, pageBreakInside:'avoid' }
  const secTitle = { fontSize:13, fontWeight:700, color:BLUE, marginBottom:10, borderLeft:'3px solid '+BLUE, paddingLeft:10, letterSpacing:'0.02em' }
  const barWrap = { marginBottom:6 }
  const barLabel = { display:'flex', justifyContent:'space-between', fontSize:12, color:GRAY, marginBottom:3 }
  const barTrack = { height:8, background:'#edf2f7', borderRadius:4 }

  return (
    <div>
      {/* Controles */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'#1a1a1a' }}>Reportes y métricas</div>
          <button onClick={exportPDF} disabled={exporting}
            style={{ background:BLUE, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:exporting?0.7:1 }}>
            {exporting ? 'Generando PDF...' : '⬇ Exportar PDF'}
          </button>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {ATAJOS.map(a => (
            <button key={a.label} onClick={() => { const [f,t]=a.fn(); setDateFrom(f); setDateTo(t) }}
              style={{ padding:'4px 12px', borderRadius:20, border:'1px solid #e2e8f0', background:'#f7fafc', fontSize:12, cursor:'pointer', color:GRAY }}>
              {a.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:GRAY }}>Desde</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:GRAY }}>Hasta</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none' }} />
          </div>
        </div>
      </div>

      {/* Selector drag & drop */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>Seleccionar reportes a exportar <span style={{ fontSize:11, color:GRAY2, fontWeight:400 }}>(arrastrá para reordenar)</span></div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setSelectedReportes(reporteOrder)} style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', background:'#f7fafc', color:GRAY }}>Todos</button>
            <button onClick={() => setSelectedReportes([])} style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', background:'#f7fafc', color:GRAY }}>Ninguno</button>
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
                style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${selected?BLUE:'#e2e8f0'}`, background: selected?BLUE:'#f7fafc', color: selected?'#fff':GRAY, fontSize:12, fontWeight: selected?600:400, cursor:'grab', userSelect:'none', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:10, opacity:0.6 }}>⠿</span>
                {r?.label}
                {selected && <span style={{ fontSize:10 }}>✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Área del reporte */}
      <div ref={reportRef} style={{ background:'#fff', padding:32, borderRadius:12, border:'0.5px solid #eee', fontFamily:'"Inter", system-ui, sans-serif' }}>

        {/* Encabezado */}
        <div style={{ borderBottom:'2px solid '+BLUE, paddingBottom:20, marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:10, color:GRAY2, textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>Glow Clinic · MedTrack</div>
              <div style={{ fontSize:20, fontWeight:700, color:BLUE, marginBottom:4 }}>Reporte de métricas</div>
              <div style={{ fontSize:13, color:GRAY }}>Período: {fmtDate(dateFrom)} — {fmtDate(dateTo)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:GRAY2 }}>Fecha de generación</div>
              <div style={{ fontSize:12, color:GRAY, fontWeight:500, marginBottom:4 }}>{new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
              <div style={{ fontSize:11, color:GRAY2 }}>Exportado por</div>
              <div style={{ fontSize:12, color:GRAY, fontWeight:500 }}>{nombrePerfil}</div>
            </div>
          </div>
        </div>

        {/* Reportes */}
        {reporteOrder.filter(id => selectedReportes.includes(id)).map(id => {

          if (id === 'citas_total') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Total de citas</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
                {[{l:'Total',v:totalCitas,c:BLUE},{l:'Pendientes',v:citasPendientes,c:GRAY},{l:'Canceladas',v:citasCanceladas,c:'#c0392b'},{l:'Completadas',v:citasConfirmadas+citasAusentes,c:BLUE3}].map((m,i)=>(
                  <div key={i} style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:GRAY2, marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:m.c }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <table style={tbl}>
                <thead><tr><th style={th}>Estado</th><th style={{...th,textAlign:'right'}}>Cantidad</th><th style={{...th,textAlign:'right'}}>% del total</th></tr></thead>
                <tbody>
                  {[{l:'Total citas',v:totalCitas},{l:'Pendientes',v:citasPendientes},{l:'Confirmadas',v:citasConfirmadas},{l:'Ausencias',v:citasAusentes},{l:'Canceladas',v:citasCanceladas}].map((r,i)=>(
                    <tr key={i}><td style={td}>{r.l}</td><td style={tdR}>{r.v}</td><td style={tdR}>{totalCitas>0?Math.round(r.v/totalCitas*100):0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

          if (id === 'citas_confirmadas') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Citas confirmadas</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
                {[{l:'Confirmadas por paciente',v:filteredAppts.filter(a=>a.status==='confirmed_patient').length},{l:'Confirmadas por médico',v:filteredAppts.filter(a=>a.status==='confirmed_doctor').length},{l:'Tasa de confirmación',v:(totalCitas>0?Math.round(citasConfirmadas/totalCitas*100):0)+'%'}].map((m,i)=>(
                  <div key={i} style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:GRAY2, marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:BLUE }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <table style={tbl}>
                <thead><tr><th style={th}>Tipo de confirmación</th><th style={{...th,textAlign:'right'}}>Cantidad</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                <tbody>
                  <tr><td style={td}>Confirmada por paciente</td><td style={tdR}>{filteredAppts.filter(a=>a.status==='confirmed_patient').length}</td><td style={tdR}>{totalCitas>0?Math.round(filteredAppts.filter(a=>a.status==='confirmed_patient').length/totalCitas*100):0}%</td></tr>
                  <tr><td style={td}>Confirmada por médico</td><td style={tdR}>{filteredAppts.filter(a=>a.status==='confirmed_doctor').length}</td><td style={tdR}>{totalCitas>0?Math.round(filteredAppts.filter(a=>a.status==='confirmed_doctor').length/totalCitas*100):0}%</td></tr>
                  <tr><td style={td}><strong>Total confirmadas</strong></td><td style={tdR}><strong>{citasConfirmadas}</strong></td><td style={tdR}><strong>{totalCitas>0?Math.round(citasConfirmadas/totalCitas*100):0}%</strong></td></tr>
                </tbody>
              </table>
            </div>
          )

          if (id === 'citas_ausentes') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Citas con ausencia (no-show)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:GRAY2, marginBottom:4 }}>Total ausencias</div>
                  <div style={{ fontSize:24, fontWeight:700, color:BLUE }}>{citasAusentes}</div>
                </div>
                <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:GRAY2, marginBottom:4 }}>Tasa global de no-show</div>
                  <div style={{ fontSize:24, fontWeight:700, color:BLUE2 }}>{totalCitas>0?Math.round(citasAusentes/totalCitas*100):0}%</div>
                </div>
              </div>
              <table style={tbl}>
                <thead><tr><th style={th}>Métrica</th><th style={{...th,textAlign:'right'}}>Valor</th></tr></thead>
                <tbody>
                  <tr><td style={td}>Total citas en el período</td><td style={tdR}>{totalCitas}</td></tr>
                  <tr><td style={td}>Total ausencias registradas</td><td style={tdR}>{citasAusentes}</td></tr>
                  <tr><td style={td}>Tasa de no-show</td><td style={tdR}>{totalCitas>0?Math.round(citasAusentes/totalCitas*100):0}%</td></tr>
                  <tr><td style={td}>Citas atendidas</td><td style={tdR}>{totalCitas-citasAusentes}</td></tr>
                </tbody>
              </table>
            </div>
          )

          if (id === 'citas_primera_vez') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Citas de primera vez</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:GRAY2, marginBottom:4 }}>Primera consulta</div>
                  <div style={{ fontSize:24, fontWeight:700, color:BLUE }}>{citasPrimeraVez}</div>
                </div>
                <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:GRAY2, marginBottom:4 }}>% del total de citas</div>
                  <div style={{ fontSize:24, fontWeight:700, color:BLUE2 }}>{totalCitas>0?Math.round(citasPrimeraVez/totalCitas*100):0}%</div>
                </div>
              </div>
              <table style={tbl}>
                <thead><tr><th style={th}>Tipo</th><th style={{...th,textAlign:'right'}}>Cantidad</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                <tbody>
                  <tr><td style={td}>Primera consulta</td><td style={tdR}>{citasPrimeraVez}</td><td style={tdR}>{totalCitas>0?Math.round(citasPrimeraVez/totalCitas*100):0}%</td></tr>
                  <tr><td style={td}>Citas de seguimiento</td><td style={tdR}>{totalCitas-citasPrimeraVez}</td><td style={tdR}>{totalCitas>0?Math.round((totalCitas-citasPrimeraVez)/totalCitas*100):0}%</td></tr>
                </tbody>
              </table>
            </div>
          )

          if (id === 'citas_por_doctor') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Citas por doctor</div>
              {citasPorDoctor.map((d,i) => (
                <div key={i} style={barWrap}>
                  <div style={barLabel}><span>{d.nombre}</span><span>{d.total}</span></div>
                  <div style={barTrack}><div style={{ height:8, background:BAR_COLORS[i%BAR_COLORS.length], borderRadius:4, width:(d.total/maxCitasDoctor*100)+'%' }} /></div>
                </div>
              ))}
              {citasPorDoctor.length === 0 && <div style={{ fontSize:13, color:GRAY2 }}>Sin datos en el período</div>}
              <table style={tbl}>
                <thead><tr><th style={th}>Doctor</th><th style={{...th,textAlign:'right'}}>Total</th><th style={{...th,textAlign:'right'}}>Confirmadas</th><th style={{...th,textAlign:'right'}}>Ausencias</th><th style={{...th,textAlign:'right'}}>Pendientes</th></tr></thead>
                <tbody>
                  {citasPorDoctor.map((d,i)=>(
                    <tr key={i}><td style={td}>{d.nombre}</td><td style={tdR}>{d.total}</td><td style={tdR}>{d.confirmadas}</td><td style={tdR}>{d.ausentes}</td><td style={tdR}>{d.pendientes}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

          if (id === 'pacientes_provincia') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Pacientes por provincia</div>
              {provincias.map(([prov,count],i) => (
                <div key={i} style={barWrap}>
                  <div style={barLabel}><span>{prov}</span><span>{count}</span></div>
                  <div style={barTrack}><div style={{ height:8, background:BAR_COLORS[i%BAR_COLORS.length], borderRadius:4, width:(count/maxProv*100)+'%' }} /></div>
                </div>
              ))}
              {provincias.length === 0 && <div style={{ fontSize:13, color:GRAY2 }}>Sin datos</div>}
              <table style={tbl}>
                <thead><tr><th style={th}>Provincia</th><th style={{...th,textAlign:'right'}}>Pacientes</th><th style={{...th,textAlign:'right'}}>% del total</th></tr></thead>
                <tbody>
                  {provincias.map(([prov,count],i)=>(
                    <tr key={i}><td style={td}>{prov}</td><td style={tdR}>{count}</td><td style={tdR}>{patients.length>0?Math.round(count/patients.length*100):0}%</td></tr>
                  ))}
                  {patients.filter(p=>!p.province).length > 0 && <tr><td style={td}>Sin provincia registrada</td><td style={tdR}>{patients.filter(p=>!p.province).length}</td><td style={tdR}>{Math.round(patients.filter(p=>!p.province).length/patients.length*100)}%</td></tr>}
                </tbody>
              </table>
            </div>
          )

          if (id === 'hora_pico') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Horas de mayor ocupación</div>
              {horasPico.map(([hora,count],i) => (
                <div key={i} style={barWrap}>
                  <div style={barLabel}><span>{hora}</span><span>{count} citas</span></div>
                  <div style={barTrack}><div style={{ height:8, background:BAR_COLORS[i%BAR_COLORS.length], borderRadius:4, width:(count/maxHora*100)+'%' }} /></div>
                </div>
              ))}
              {horasPico.length === 0 && <div style={{ fontSize:13, color:GRAY2 }}>Sin datos en el período</div>}
              <table style={tbl}>
                <thead><tr><th style={th}>Día y hora</th><th style={{...th,textAlign:'right'}}>Citas</th><th style={{...th,textAlign:'right'}}>% del total</th></tr></thead>
                <tbody>
                  {horasPico.map(([hora,count],i)=>(
                    <tr key={i}><td style={td}>{hora}</td><td style={tdR}>{count}</td><td style={tdR}>{totalCitas>0?Math.round(count/totalCitas*100):0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

          if (id === 'tasa_noshow') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Tasa de no-show por doctor</div>
              {tasaNoShow.map((d,i) => (
                <div key={i} style={barWrap}>
                  <div style={barLabel}><span>{d.nombre}</span><span>{d.tasa}%</span></div>
                  <div style={barTrack}><div style={{ height:8, background: d.tasa>20?'#c0392b':d.tasa>10?GRAY:BLUE3, borderRadius:4, width:d.tasa+'%' }} /></div>
                </div>
              ))}
              {tasaNoShow.length === 0 && <div style={{ fontSize:13, color:GRAY2 }}>Sin datos en el período</div>}
              <table style={tbl}>
                <thead><tr><th style={th}>Doctor</th><th style={{...th,textAlign:'right'}}>Total citas</th><th style={{...th,textAlign:'right'}}>Ausencias</th><th style={{...th,textAlign:'right'}}>Tasa</th></tr></thead>
                <tbody>
                  {tasaNoShow.map((d,i)=>(
                    <tr key={i}><td style={td}>{d.nombre}</td><td style={tdR}>{d.total}</td><td style={tdR}>{d.noshow}</td><td style={tdR}>{d.tasa}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

          if (id === 'nuevos_vs_recurrentes') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Pacientes nuevos vs recurrentes</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:GRAY2, marginBottom:4 }}>Nuevos pacientes</div>
                  <div style={{ fontSize:24, fontWeight:700, color:BLUE }}>{nuevos}</div>
                </div>
                <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:GRAY2, marginBottom:4 }}>Pacientes recurrentes</div>
                  <div style={{ fontSize:24, fontWeight:700, color:BLUE3 }}>{recurrentes}</div>
                </div>
              </div>
              <table style={tbl}>
                <thead><tr><th style={th}>Tipo</th><th style={{...th,textAlign:'right'}}>Citas</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                <tbody>
                  <tr><td style={td}>Nuevos pacientes</td><td style={tdR}>{nuevos}</td><td style={tdR}>{totalCitas>0?Math.round(nuevos/totalCitas*100):0}%</td></tr>
                  <tr><td style={td}>Pacientes recurrentes</td><td style={tdR}>{recurrentes}</td><td style={tdR}>{totalCitas>0?Math.round(recurrentes/totalCitas*100):0}%</td></tr>
                </tbody>
              </table>
            </div>
          )

          if (id === 'modulos_activos') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Módulos más activos</div>
              {modulos.length === 0 && <div style={{ fontSize:13, color:GRAY2 }}>Sin datos en el período</div>}
              {modulos.map(([mod,count],i) => (
                <div key={i} style={barWrap}>
                  <div style={barLabel}><span>{MODULE_LABELS[mod]||mod}</span><span>{count} citas</span></div>
                  <div style={barTrack}><div style={{ height:8, background:BAR_COLORS[i%BAR_COLORS.length], borderRadius:4, width:(count/Math.max(...modulos.map(m=>m[1]),1)*100)+'%' }} /></div>
                </div>
              ))}
              <table style={tbl}>
                <thead><tr><th style={th}>Módulo</th><th style={{...th,textAlign:'right'}}>Citas</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                <tbody>
                  {modulos.map(([mod,count],i)=>(
                    <tr key={i}><td style={td}>{MODULE_LABELS[mod]||mod}</td><td style={tdR}>{count}</td><td style={tdR}>{totalCitas>0?Math.round(count/totalCitas*100):0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

          if (id === 'pacientes_sexo_edad') return (
            <div key={id} style={secStyle}>
              <div style={secTitle}>Pacientes por sexo y grupo de edad</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:11, color:GRAY2, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Por sexo</div>
                  {[{l:'Femenino',v:sexoMap.female},{l:'Masculino',v:sexoMap.male},{l:'Otro',v:sexoMap.other}].map((s,i)=>(
                    <div key={i} style={barWrap}>
                      <div style={barLabel}><span>{s.l}</span><span>{s.v}</span></div>
                      <div style={barTrack}><div style={{ height:8, background:BAR_COLORS[i], borderRadius:4, width:patients.length>0?(s.v/patients.length*100)+'%':'0%' }} /></div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:11, color:GRAY2, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Por grupo de edad</div>
                  {edades.map((g,i)=>(
                    <div key={i} style={barWrap}>
                      <div style={barLabel}><span>{g.label}</span><span>{g.count}</span></div>
                      <div style={barTrack}><div style={{ height:8, background:BAR_COLORS[i%BAR_COLORS.length], borderRadius:4, width:patients.length>0?(g.count/patients.length*100)+'%':'0%' }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <table style={tbl}>
                <thead><tr><th style={th}>Categoría</th><th style={th}>Segmento</th><th style={{...th,textAlign:'right'}}>Pacientes</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                <tbody>
                  {[{c:'Sexo',l:'Femenino',v:sexoMap.female},{c:'Sexo',l:'Masculino',v:sexoMap.male},{c:'Sexo',l:'Otro',v:sexoMap.other},...edades.map(g=>({c:'Edad',l:g.label,v:g.count}))].map((r,i)=>(
                    <tr key={i}><td style={td}>{r.c}</td><td style={td}>{r.l}</td><td style={tdR}>{r.v}</td><td style={tdR}>{patients.length>0?Math.round(r.v/patients.length*100):0}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          return null
        })}

        {/* Disclaimer */}
        <div style={{ borderTop:'1px solid #e2e8f0', marginTop:28, paddingTop:14 }}>
          <p style={{ fontSize:9, color:GRAY3, lineHeight:1.7, margin:0, fontStyle:'italic' }}>
            La información contenida en este reporte es de carácter estrictamente confidencial y de uso exclusivo del equipo administrativo de Glow Clinic. Queda prohibida su reproducción, distribución o divulgación a personas ajenas al proceso administrativo sin autorización expresa de la dirección. Este documento fue generado automáticamente por MedTrack by Glow Clinic.
          </p>
        </div>
      </div>
    </div>
  )
}
