import { useState, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const G = '#1D9E75'
const BLUE = '#1a3a5c'
const BLUE2 = '#2c5282'
const BLUE3 = '#2b6cb0'
const BLUE4 = '#4a90a4'
const GRAY = '#4a5568'
const GRAY2 = '#718096'
const GRAY3 = '#a0aec0'

const REPORTES_DISPONIBLES = [
  { id: 'citas_por_mes', label: 'Citas por mes' },
  { id: 'citas_total', label: 'Resumen de citas' },
  { id: 'citas_confirmadas', label: 'Citas confirmadas' },
  { id: 'citas_ausentes', label: 'Ausencias (no-show)' },
  { id: 'citas_primera_vez', label: 'Primera vez vs seguimiento' },
  { id: 'citas_por_doctor', label: 'Citas por doctor' },
  { id: 'pacientes_provincia', label: 'Pacientes por provincia' },
  { id: 'hora_pico', label: 'Horas pico' },
  { id: 'tasa_noshow', label: 'Tasa no-show por doctor' },
  { id: 'nuevos_vs_recurrentes', label: 'Nuevos vs recurrentes' },
  { id: 'modulos_activos', label: 'Módulos más activos' },
  { id: 'pacientes_sexo_edad', label: 'Distribución pacientes' },
]

const ATAJOS = [
  { label: 'Esta semana', fn: () => { const now=new Date(),day=now.getDay(),diff=day===0?-6:1-day,start=new Date(now); start.setDate(now.getDate()+diff); start.setHours(0,0,0,0); const end=new Date(start); end.setDate(start.getDate()+6); return [start.toISOString().split('T')[0],end.toISOString().split('T')[0]] }},
  { label: 'Este mes', fn: () => { const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1),end=new Date(now.getFullYear(),now.getMonth()+1,0); return [start.toISOString().split('T')[0],end.toISOString().split('T')[0]] }},
  { label: 'Últimos 3 meses', fn: () => { const end=new Date(),start=new Date(); start.setMonth(start.getMonth()-3); return [start.toISOString().split('T')[0],end.toISOString().split('T')[0]] }},
  { label: 'Últimos 6 meses', fn: () => { const end=new Date(),start=new Date(); start.setMonth(start.getMonth()-6); return [start.toISOString().split('T')[0],end.toISOString().split('T')[0]] }},
  { label: 'Este año', fn: () => { const now=new Date(); return [now.getFullYear()+'-01-01',now.getFullYear()+'-12-31'] }},
]

const MODULE_LABELS = { integral:'Integral', metabolica:'Metabólica', estetica:'Estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería' }

const tbl = { width:'100%', borderCollapse:'collapse', fontSize:11, marginTop:10 }
const th = { background:'#edf2f7', color:BLUE, padding:'5px 8px', textAlign:'left', fontWeight:600, border:'1px solid #e2e8f0', fontSize:11 }
const td = { padding:'4px 8px', border:'1px solid #e2e8f0', color:GRAY, fontSize:11 }
const tdR = { ...td, textAlign:'right' }

const CHART_COLORS = [BLUE, BLUE3, BLUE4, GRAY, BLUE2, '#553c9a', '#2d3748', GRAY2]

const cardStyle = { background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px', pageBreakInside:'avoid', breakInside:'avoid' }
const secTitle = { fontSize:12, fontWeight:700, color:BLUE, marginBottom:10, borderLeft:'3px solid '+BLUE, paddingLeft:8, letterSpacing:'0.02em', textTransform:'uppercase' }

export default function ReportesView({ appts, patients, doctors, profile, isMobile, branches=[], isClinicAdmin=false }) {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(todayStr)
  const [selectedReportes, setSelectedReportes] = useState(REPORTES_DISPONIBLES.map(r => r.id))
  const [dragging, setDragging] = useState(null)
  const [reporteOrder, setReporteOrder] = useState(REPORTES_DISPONIBLES.map(r => r.id))
  const [exporting, setExporting] = useState(false)
  const [selBranchR, setSelBranchR] = useState('')
  const reportRef = useRef(null)

  const filteredAppts = appts.filter(a => a.appointment_date >= dateFrom && a.appointment_date <= dateTo && (!selBranchR || a.branch_id === selBranchR))
  const totalCitas = filteredAppts.length
  const citasConfirmadas = filteredAppts.filter(a => a.status === 'confirmed_patient' || a.status === 'confirmed_doctor').length
  const citasAusentes = filteredAppts.filter(a => a.status === 'no_show').length
  const citasPrimeraVez = filteredAppts.filter(a => a.visit_type?.toLowerCase().includes('primera')).length
  const citasPendientes = filteredAppts.filter(a => a.status === 'pending_confirmation').length
  const citasCanceladas = filteredAppts.filter(a => a.status === 'cancelled').length

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const citasPorMes = (() => {
    const map = {}
    filteredAppts.forEach(a => {
      if (!a.appointment_date) return
      const d = new Date(a.appointment_date + 'T12:00:00')
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = MESES[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2)
      if (!map[key]) map[key] = { mes: label, total: 0, confirmadas: 0, ausentes: 0 }
      map[key].total++
      if (a.status === 'confirmed_patient' || a.status === 'confirmed_doctor') map[key].confirmadas++
      if (a.status === 'no_show') map[key].ausentes++
    })
    return Object.keys(map).sort().map(k => map[k])
  })()

  const citasPorDoctor = doctors.map(d => ({
    nombre: d.last_name?.split(' ')[0] || d.first_name,
    nombreCompleto: `${d.last_name} ${d.first_name}`,
    total: filteredAppts.filter(a => a.doctor_id === d.id).length,
    confirmadas: filteredAppts.filter(a => a.doctor_id === d.id && (a.status==='confirmed_patient'||a.status==='confirmed_doctor')).length,
    ausentes: filteredAppts.filter(a => a.doctor_id === d.id && a.status==='no_show').length,
    pendientes: filteredAppts.filter(a => a.doctor_id === d.id && a.status==='pending_confirmation').length,
  })).filter(d => d.total > 0).sort((a,b) => b.total-a.total)

  const provinciaMap = {}
  patients.forEach(p => { if(p.province) provinciaMap[p.province] = (provinciaMap[p.province]||0)+1 })
  const provincias = Object.entries(provinciaMap).sort((a,b) => b[1]-a[1]).map(([p,v])=>({provincia:p.replace('San José','S.José').replace('Guanacaste','Guanac.'),count:v}))

  const horaPicoMap = {}
  filteredAppts.forEach(a => {
    if (!a.appointment_time) return
    const h = parseInt(a.appointment_time.split(':')[0])
    const label = h<12?h+'am':h===12?'12pm':(h-12)+'pm'
    horaPicoMap[label] = (horaPicoMap[label]||0)+1
  })
  const horasPico = Object.entries(horaPicoMap).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([h,v])=>({hora:h,citas:v}))

  const tasaNoShow = doctors.map(d => {
    const total = filteredAppts.filter(a => a.doctor_id === d.id).length
    const noshow = filteredAppts.filter(a => a.doctor_id === d.id && a.status==='no_show').length
    return { nombre: d.last_name?.split(' ')[0]||d.first_name, nombreCompleto:`${d.last_name} ${d.first_name}`, total, noshow, tasa: total>0?Math.round(noshow/total*100):0 }
  }).filter(d => d.total > 0).sort((a,b)=>b.tasa-a.tasa)

  const patientApptCount = {}
  appts.forEach(a => { patientApptCount[a.patient_id]=(patientApptCount[a.patient_id]||0)+1 })
  const nuevos = filteredAppts.filter(a=>patientApptCount[a.patient_id]===1).length
  const recurrentes = filteredAppts.filter(a=>patientApptCount[a.patient_id]>1).length

  const moduloMap = {}
  filteredAppts.forEach(a => { if(a.module_type) moduloMap[a.module_type]=(moduloMap[a.module_type]||0)+1 })
  const modulos = Object.entries(moduloMap).sort((a,b)=>b[1]-a[1]).map(([m,v])=>({modulo:MODULE_LABELS[m]||m,citas:v}))

  const sexoData = [
    {nombre:'Femenino', pacientes:patients.filter(p=>p.sex==='female').length},
    {nombre:'Masculino', pacientes:patients.filter(p=>p.sex==='male').length},
    {nombre:'Otro', pacientes:patients.filter(p=>p.sex==='other').length},
  ].filter(s=>s.pacientes>0)

  const getAge = dob => { if(!dob) return null; const d=new Date(dob),n=new Date(); return n.getFullYear()-d.getFullYear()-(n<new Date(n.getFullYear(),d.getMonth(),d.getDate())?1:0) }
  const edadData = [{l:'18-25',min:18,max:25},{l:'26-35',min:26,max:35},{l:'36-45',min:36,max:45},{l:'46-55',min:46,max:55},{l:'56-65',min:56,max:65},{l:'65+',min:66,max:200}]
    .map(g=>({grupo:g.l,pacientes:patients.filter(p=>{const a=getAge(p.birth_date);return a!==null&&a>=g.min&&a<=g.max}).length}))

  function handleDragStart(id) { setDragging(id) }
  function handleDragOver(e,id) {
    e.preventDefault()
    if(!dragging||dragging===id) return
    const o=[...reporteOrder],from=o.indexOf(dragging),to=o.indexOf(id)
    o.splice(from,1); o.splice(to,0,dragging); setReporteOrder(o)
  }
  function handleDrop() { setDragging(null) }

  async function exportPDF() {
    setExporting(true)
    try {
      const el = reportRef.current
      const canvas = await html2canvas(el, { scale:2, useCORS:true, backgroundColor:'#fff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
      const margin = 25
      const pdfW = pdf.internal.pageSize.getWidth()-margin*2
      const pageH = pdf.internal.pageSize.getHeight()
      const contentH = pageH - margin*2
      const imgH = (canvas.height*pdfW)/canvas.width
      let y=0
      while(y<imgH) {
        if(y>0) pdf.addPage()
        pdf.addImage(imgData,'PNG',margin,margin-y,pdfW,imgH)
        y+=contentH
      }
      pdf.save(`Reporte_MedTrack_${dateFrom}_${dateTo}.pdf`)
    } catch(e){console.error(e)}
    setExporting(false)
  }

  const fmtDate = d => new Date(d+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})
  const nombrePerfil = `${profile?.first_name||''} ${profile?.last_name||''}`.trim()

  const kpiStyle = { background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px', textAlign:'center' }
  const kpiNum = { fontSize:26, fontWeight:700, color:BLUE }
  const kpiLbl = { fontSize:11, color:GRAY2, marginBottom:4 }

  const col2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }

  return (
    <div>
      {/* Controles */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'#1a1a1a' }}>Reportes y métricas</div>
          <button onClick={exportPDF} disabled={exporting}
            style={{ background:BLUE, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:exporting?0.7:1 }}>
            {exporting?'Generando PDF...':'⬇ Exportar PDF'}
          </button>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {ATAJOS.map(a=>(
            <button key={a.label} onClick={()=>{const[f,t]=a.fn();setDateFrom(f);setDateTo(t)}}
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
          {isClinicAdmin && branches.length > 1 && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <label style={{ fontSize:13, color:GRAY }}>Sucursal</label>
              <select value={selBranchR} onChange={e=>setSelBranchR(e.target.value)}
                style={{ padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', color: selBranchR ? BLUE : '#888' }}>
                <option value="">Todas</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Selector */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>Seleccionar reportes <span style={{ fontSize:11, color:GRAY2, fontWeight:400 }}>(arrastrá para reordenar)</span></div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setSelectedReportes(reporteOrder)} style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', background:'#f7fafc', color:GRAY }}>Todos</button>
            <button onClick={()=>setSelectedReportes([])} style={{ fontSize:12, padding:'3px 10px', borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', background:'#f7fafc', color:GRAY }}>Ninguno</button>
          </div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {reporteOrder.map(id=>{
            const r=REPORTES_DISPONIBLES.find(x=>x.id===id)
            const selected=selectedReportes.includes(id)
            return (
              <div key={id} draggable onDragStart={()=>handleDragStart(id)} onDragOver={e=>handleDragOver(e,id)} onDrop={handleDrop}
                onClick={()=>setSelectedReportes(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])}
                style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${selected?BLUE:'#e2e8f0'}`, background:selected?BLUE:'#f7fafc', color:selected?'#fff':GRAY, fontSize:12, fontWeight:selected?600:400, cursor:'grab', userSelect:'none', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:9, opacity:0.5 }}>⠿</span>{r?.label}{selected&&<span style={{fontSize:10}}>✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Reporte */}
      <div ref={reportRef} style={{ background:'#fff', padding:28, borderRadius:12, border:'0.5px solid #eee' }}>

        {/* Header */}
        <div style={{ borderBottom:'2px solid '+BLUE, paddingBottom:16, marginBottom:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:10, color:GRAY2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Glow Clinic · MedTrack</div>
              <div style={{ fontSize:18, fontWeight:700, color:BLUE, marginBottom:2 }}>Reporte de métricas</div>
              <div style={{ fontSize:12, color:GRAY }}>Período: {fmtDate(dateFrom)} — {fmtDate(dateTo)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, color:GRAY2 }}>Generado el {new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
              <div style={{ fontSize:11, color:GRAY, fontWeight:500, marginTop:2 }}>Exportado por {nombrePerfil}</div>
            </div>
          </div>
        </div>

        {/* Reportes en 2 columnas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {reporteOrder.filter(id=>selectedReportes.includes(id)).map(id=>{

            if (id==='citas_por_mes') return (
              <div key={id} style={{ ...cardStyle, gridColumn:'1/-1' }}>
                <div style={secTitle}>Citas por mes</div>
                {citasPorMes.length === 0 && <div style={{ textAlign:'center', color:GRAY3, fontSize:13, padding:20 }}>Sin datos en el período seleccionado</div>}
                {citasPorMes.length > 0 && (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={citasPorMes} margin={{ top:8, right:8, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize:11, fill:GRAY2 }} />
                      <YAxis tick={{ fontSize:11, fill:GRAY2 }} />
                      <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }} />
                      <Bar dataKey="total" name="Total" fill={BLUE} radius={[4,4,0,0]} />
                      <Bar dataKey="confirmadas" name="Confirmadas" fill={G} radius={[4,4,0,0]} />
                      <Bar dataKey="ausentes" name="No-show" fill="#e53e3e" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )

            if (id==='citas_total') return (
              <div key={id} style={{ ...cardStyle, gridColumn:'1/-1' }}>
                <div style={secTitle}>Resumen de citas</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:14 }}>
                  {[{l:'Total',v:totalCitas},{l:'Confirmadas',v:citasConfirmadas},{l:'Ausencias',v:citasAusentes},{l:'Pendientes',v:citasPendientes},{l:'Canceladas',v:citasCanceladas}].map((m,i)=>(
                    <div key={i} style={kpiStyle}><div style={kpiLbl}>{m.l}</div><div style={kpiNum}>{m.v}</div></div>
                  ))}
                </div>
                <table style={tbl}>
                  <thead><tr><th style={th}>Estado</th><th style={{...th,textAlign:'right'}}>Cantidad</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                  <tbody>
                    {[{l:'Total',v:totalCitas},{l:'Confirmadas',v:citasConfirmadas},{l:'Ausencias',v:citasAusentes},{l:'Pendientes',v:citasPendientes},{l:'Canceladas',v:citasCanceladas}].map((r,i)=>(
                      <tr key={i}><td style={td}>{r.l}</td><td style={tdR}>{r.v}</td><td style={tdR}>{totalCitas>0?Math.round(r.v/totalCitas*100):0}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

            if (id==='citas_confirmadas') return (
              <div key={id} style={cardStyle}>
                <div style={secTitle}>Citas confirmadas</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                  {[{l:'Por paciente',v:filteredAppts.filter(a=>a.status==='confirmed_patient').length},{l:'Por médico',v:filteredAppts.filter(a=>a.status==='confirmed_doctor').length}].map((m,i)=>(
                    <div key={i} style={kpiStyle}><div style={kpiLbl}>{m.l}</div><div style={kpiNum}>{m.v}</div></div>
                  ))}
                </div>
                <div style={{ background:'#edf2f7', borderRadius:8, padding:'8px 12px', fontSize:12, color:BLUE, fontWeight:600, marginBottom:10 }}>
                  Tasa de confirmación: {totalCitas>0?Math.round(citasConfirmadas/totalCitas*100):0}%
                </div>
                <table style={tbl}>
                  <thead><tr><th style={th}>Tipo</th><th style={{...th,textAlign:'right'}}>N°</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                  <tbody>
                    <tr><td style={td}>Por paciente</td><td style={tdR}>{filteredAppts.filter(a=>a.status==='confirmed_patient').length}</td><td style={tdR}>{totalCitas>0?Math.round(filteredAppts.filter(a=>a.status==='confirmed_patient').length/totalCitas*100):0}%</td></tr>
                    <tr><td style={td}>Por médico</td><td style={tdR}>{filteredAppts.filter(a=>a.status==='confirmed_doctor').length}</td><td style={tdR}>{totalCitas>0?Math.round(filteredAppts.filter(a=>a.status==='confirmed_doctor').length/totalCitas*100):0}%</td></tr>
                    <tr style={{fontWeight:600}}><td style={td}>Total</td><td style={tdR}>{citasConfirmadas}</td><td style={tdR}>{totalCitas>0?Math.round(citasConfirmadas/totalCitas*100):0}%</td></tr>
                  </tbody>
                </table>
              </div>
            )

            if (id==='citas_ausentes') return (
              <div key={id} style={cardStyle}>
                <div style={secTitle}>Ausencias (no-show)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                  <div style={kpiStyle}><div style={kpiLbl}>Total ausencias</div><div style={kpiNum}>{citasAusentes}</div></div>
                  <div style={kpiStyle}><div style={kpiLbl}>Tasa global</div><div style={kpiNum}>{totalCitas>0?Math.round(citasAusentes/totalCitas*100):0}%</div></div>
                </div>
                <table style={tbl}>
                  <thead><tr><th style={th}>Métrica</th><th style={{...th,textAlign:'right'}}>Valor</th></tr></thead>
                  <tbody>
                    <tr><td style={td}>Total citas</td><td style={tdR}>{totalCitas}</td></tr>
                    <tr><td style={td}>Ausencias</td><td style={tdR}>{citasAusentes}</td></tr>
                    <tr><td style={td}>Tasa no-show</td><td style={tdR}>{totalCitas>0?Math.round(citasAusentes/totalCitas*100):0}%</td></tr>
                    <tr><td style={td}>Citas atendidas</td><td style={tdR}>{totalCitas-citasAusentes}</td></tr>
                  </tbody>
                </table>
              </div>
            )

            if (id==='citas_primera_vez') return (
              <div key={id} style={cardStyle}>
                <div style={secTitle}>Primera vez vs seguimiento</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={[{tipo:'Primera vez',citas:citasPrimeraVez},{tipo:'Seguimiento',citas:totalCitas-citasPrimeraVez}]} margin={{top:5,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="tipo" tick={{fontSize:10,fill:GRAY2}} />
                    <YAxis tick={{fontSize:10,fill:GRAY2}} allowDecimals={false} />
                    <Tooltip contentStyle={{fontSize:11,borderRadius:6}} />
                    <Bar dataKey="citas" fill={BLUE} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <table style={tbl}>
                  <thead><tr><th style={th}>Tipo</th><th style={{...th,textAlign:'right'}}>N°</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                  <tbody>
                    <tr><td style={td}>Primera consulta</td><td style={tdR}>{citasPrimeraVez}</td><td style={tdR}>{totalCitas>0?Math.round(citasPrimeraVez/totalCitas*100):0}%</td></tr>
                    <tr><td style={td}>Seguimiento</td><td style={tdR}>{totalCitas-citasPrimeraVez}</td><td style={tdR}>{totalCitas>0?Math.round((totalCitas-citasPrimeraVez)/totalCitas*100):0}%</td></tr>
                  </tbody>
                </table>
              </div>
            )

            if (id==='citas_por_doctor') return (
              <div key={id} style={{ ...cardStyle, gridColumn:'1/-1' }}>
                <div style={secTitle}>Citas por doctor</div>
                {citasPorDoctor.length===0 && <div style={{fontSize:12,color:GRAY2}}>Sin datos en el período</div>}
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={citasPorDoctor} margin={{top:5,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="nombre" tick={{fontSize:10,fill:GRAY2}} />
                    <YAxis tick={{fontSize:10,fill:GRAY2}} allowDecimals={false} />
                    <Tooltip contentStyle={{fontSize:11,borderRadius:6}} />
                    <Bar dataKey="total" name="Total" fill={BLUE} radius={[4,4,0,0]} />
                    <Bar dataKey="confirmadas" name="Confirmadas" fill={BLUE4} radius={[4,4,0,0]} />
                    <Bar dataKey="ausentes" name="Ausencias" fill={GRAY3} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <table style={tbl}>
                  <thead><tr><th style={th}>Doctor</th><th style={{...th,textAlign:'right'}}>Total</th><th style={{...th,textAlign:'right'}}>Confirm.</th><th style={{...th,textAlign:'right'}}>Ausencias</th><th style={{...th,textAlign:'right'}}>Pendientes</th></tr></thead>
                  <tbody>
                    {citasPorDoctor.map((d,i)=>(
                      <tr key={i}><td style={td}>{d.nombreCompleto}</td><td style={tdR}>{d.total}</td><td style={tdR}>{d.confirmadas}</td><td style={tdR}>{d.ausentes}</td><td style={tdR}>{d.pendientes}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

            if (id==='pacientes_provincia') return (
              <div key={id} style={cardStyle}>
                <div style={secTitle}>Pacientes por provincia</div>
                {provincias.length===0 && <div style={{fontSize:12,color:GRAY2}}>Sin datos</div>}
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={provincias} margin={{top:5,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="provincia" tick={{fontSize:9,fill:GRAY2}} />
                    <YAxis tick={{fontSize:10,fill:GRAY2}} allowDecimals={false} />
                    <Tooltip contentStyle={{fontSize:11,borderRadius:6}} />
                    <Bar dataKey="count" name="Pacientes" fill={BLUE2} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <table style={tbl}>
                  <thead><tr><th style={th}>Provincia</th><th style={{...th,textAlign:'right'}}>Pacientes</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                  <tbody>
                    {provincias.map((p,i)=>(
                      <tr key={i}><td style={td}>{p.provincia}</td><td style={tdR}>{p.count}</td><td style={tdR}>{patients.length>0?Math.round(p.count/patients.length*100):0}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

            if (id==='hora_pico') return (
              <div key={id} style={cardStyle}>
                <div style={secTitle}>Horas pico</div>
                {horasPico.length===0 && <div style={{fontSize:12,color:GRAY2}}>Sin datos en el período</div>}
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={horasPico} margin={{top:5,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="hora" tick={{fontSize:9,fill:GRAY2}} />
                    <YAxis tick={{fontSize:10,fill:GRAY2}} allowDecimals={false} />
                    <Tooltip contentStyle={{fontSize:11,borderRadius:6}} />
                    <Line type="monotone" dataKey="citas" stroke={BLUE} strokeWidth={2} dot={{r:3,fill:BLUE}} />
                  </LineChart>
                </ResponsiveContainer>
                <table style={tbl}>
                  <thead><tr><th style={th}>Hora</th><th style={{...th,textAlign:'right'}}>Citas</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                  <tbody>
                    {horasPico.sort((a,b)=>b.citas-a.citas).slice(0,5).map((h,i)=>(
                      <tr key={i}><td style={td}>{h.hora}</td><td style={tdR}>{h.citas}</td><td style={tdR}>{totalCitas>0?Math.round(h.citas/totalCitas*100):0}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

            if (id==='tasa_noshow') return (
              <div key={id} style={cardStyle}>
                <div style={secTitle}>Tasa no-show por doctor</div>
                {tasaNoShow.length===0 && <div style={{fontSize:12,color:GRAY2}}>Sin datos en el período</div>}
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={tasaNoShow} margin={{top:5,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="nombre" tick={{fontSize:9,fill:GRAY2}} />
                    <YAxis tick={{fontSize:10,fill:GRAY2}} unit="%" />
                    <Tooltip contentStyle={{fontSize:11,borderRadius:6}} formatter={v=>v+'%'} />
                    <Bar dataKey="tasa" name="No-show %" fill={GRAY} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <table style={tbl}>
                  <thead><tr><th style={th}>Doctor</th><th style={{...th,textAlign:'right'}}>Total</th><th style={{...th,textAlign:'right'}}>Ausencias</th><th style={{...th,textAlign:'right'}}>Tasa</th></tr></thead>
                  <tbody>
                    {tasaNoShow.map((d,i)=>(
                      <tr key={i}><td style={td}>{d.nombreCompleto}</td><td style={tdR}>{d.total}</td><td style={tdR}>{d.noshow}</td><td style={tdR}>{d.tasa}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

            if (id==='nuevos_vs_recurrentes') return (
              <div key={id} style={cardStyle}>
                <div style={secTitle}>Nuevos vs recurrentes</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={[{tipo:'Nuevos',citas:nuevos},{tipo:'Recurrentes',citas:recurrentes}]} margin={{top:5,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="tipo" tick={{fontSize:10,fill:GRAY2}} />
                    <YAxis tick={{fontSize:10,fill:GRAY2}} allowDecimals={false} />
                    <Tooltip contentStyle={{fontSize:11,borderRadius:6}} />
                    <Bar dataKey="citas" fill={BLUE3} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <table style={tbl}>
                  <thead><tr><th style={th}>Tipo</th><th style={{...th,textAlign:'right'}}>Citas</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                  <tbody>
                    <tr><td style={td}>Nuevos pacientes</td><td style={tdR}>{nuevos}</td><td style={tdR}>{totalCitas>0?Math.round(nuevos/totalCitas*100):0}%</td></tr>
                    <tr><td style={td}>Pacientes recurrentes</td><td style={tdR}>{recurrentes}</td><td style={tdR}>{totalCitas>0?Math.round(recurrentes/totalCitas*100):0}%</td></tr>
                  </tbody>
                </table>
              </div>
            )

            if (id==='modulos_activos') return (
              <div key={id} style={cardStyle}>
                <div style={secTitle}>Módulos más activos</div>
                {modulos.length===0 && <div style={{fontSize:12,color:GRAY2}}>Sin datos en el período</div>}
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={modulos} margin={{top:5,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="modulo" tick={{fontSize:9,fill:GRAY2}} />
                    <YAxis tick={{fontSize:10,fill:GRAY2}} allowDecimals={false} />
                    <Tooltip contentStyle={{fontSize:11,borderRadius:6}} />
                    <Bar dataKey="citas" fill={BLUE4} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <table style={tbl}>
                  <thead><tr><th style={th}>Módulo</th><th style={{...th,textAlign:'right'}}>Citas</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                  <tbody>
                    {modulos.map((m,i)=>(
                      <tr key={i}><td style={td}>{m.modulo}</td><td style={tdR}>{m.citas}</td><td style={tdR}>{totalCitas>0?Math.round(m.citas/totalCitas*100):0}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

            if (id==='pacientes_sexo_edad') return (
              <div key={id} style={{ ...cardStyle, gridColumn:'1/-1' }}>
                <div style={secTitle}>Distribución de pacientes</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:11, color:GRAY2, marginBottom:6 }}>Por sexo</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={sexoData} margin={{top:5,right:10,left:-20,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                        <XAxis dataKey="nombre" tick={{fontSize:10,fill:GRAY2}} />
                        <YAxis tick={{fontSize:10,fill:GRAY2}} allowDecimals={false} />
                        <Tooltip contentStyle={{fontSize:11,borderRadius:6}} />
                        <Bar dataKey="pacientes" fill={BLUE} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:GRAY2, marginBottom:6 }}>Por grupo de edad</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={edadData} margin={{top:5,right:10,left:-20,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                        <XAxis dataKey="grupo" tick={{fontSize:9,fill:GRAY2}} />
                        <YAxis tick={{fontSize:10,fill:GRAY2}} allowDecimals={false} />
                        <Tooltip contentStyle={{fontSize:11,borderRadius:6}} />
                        <Bar dataKey="pacientes" fill={BLUE2} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <table style={tbl}>
                  <thead><tr><th style={th}>Categoría</th><th style={th}>Segmento</th><th style={{...th,textAlign:'right'}}>Pacientes</th><th style={{...th,textAlign:'right'}}>%</th></tr></thead>
                  <tbody>
                    {[{c:'Sexo',l:'Femenino',v:sexoData.find(s=>s.nombre==='Femenino')?.pacientes||0},{c:'Sexo',l:'Masculino',v:sexoData.find(s=>s.nombre==='Masculino')?.pacientes||0},{c:'Sexo',l:'Otro',v:sexoData.find(s=>s.nombre==='Otro')?.pacientes||0},...edadData.map(g=>({c:'Edad',l:g.grupo,v:g.pacientes}))].map((r,i)=>(
                      <tr key={i}><td style={td}>{r.c}</td><td style={td}>{r.l}</td><td style={tdR}>{r.v}</td><td style={tdR}>{patients.length>0?Math.round(r.v/patients.length*100):0}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
            return null
          })}
        </div>

        {/* Disclaimer */}
        <div style={{ borderTop:'1px solid #e2e8f0', marginTop:24, paddingTop:12 }}>
          <p style={{ fontSize:9, color:GRAY3, lineHeight:1.7, margin:0, fontStyle:'italic' }}>
            La información contenida en este reporte es de carácter estrictamente confidencial y de uso exclusivo del equipo administrativo de Glow Clinic. Queda prohibida su reproducción, distribución o divulgación a personas ajenas al proceso administrativo sin autorización expresa de la dirección. Generado automáticamente por MedTrack by Glow Clinic.
          </p>
        </div>
      </div>
    </div>
  )
}
