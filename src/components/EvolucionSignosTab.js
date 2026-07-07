import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'

const PERIODOS = [
  { label: 'Últimos 3 meses', months: 3 },
  { label: 'Últimos 6 meses', months: 6 },
  { label: 'Último año', months: 12 },
  { label: 'Todo el historial', months: 0 },
]

const SIGNOS_CONFIG = [
  { key: ['pas','pad'], label: 'Presión arterial', unit: 'mmHg', color: ['#2a78d6','#1baf7a'], multi: true, normal: { pas:[90,140], pad:[60,90] } },
  { key: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm', color: '#2a78d6', normal: [60,100] },
  { key: 'frecuencia_respiratoria', label: 'Frecuencia respiratoria', unit: 'rpm', color: '#eda100', normal: [12,20] },
  { key: 'spo2', label: 'SpO2', unit: '%', color: '#1baf7a', normal: [95,100], yMin: 90 },
  { key: 'peso_kg', label: 'Peso', unit: 'kg', color: '#4a3aa7' },
  { key: 'glicemia', label: 'Glicemia', unit: 'mg/dL', color: '#e34948', normal: [70,140] },
  { key: 'grasa_pct', label: 'Grasa corporal', unit: '%', color: '#eb6834' },
  { key: 'masa_muscular_kg', label: 'Masa muscular', unit: 'kg', color: '#1baf7a' },
  { key: 'grasa_visceral_pt', label: 'Grasa visceral', unit: 'pt', color: '#e34948' },
  { key: 'ancho_cintura_cm', label: 'Cintura', unit: 'cm', color: '#4a3aa7' },
  { key: 'fcf_lpm', label: 'FCF', unit: 'lpm', color: '#e87ba4', normal: [110,160] },
  { key: 'altura_uterina_cm', label: 'Altura uterina', unit: 'cm', color: '#e87ba4' },
]

function MiniChart({ signo, records }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  const getData = () => {
    if (signo.multi) {
      const filtered = records.filter(r => r[signo.key[0]] !== null && r[signo.key[1]] !== null)
      return {
        labels: filtered.map(r => new Date(r.recorded_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short' })),
        datasets: [
          { label: 'Sistólica', data: filtered.map(r => r[signo.key[0]]), borderColor: signo.color[0], backgroundColor: signo.color[0]+'15', fill:true, borderWidth:2, pointRadius:3, tension:0.3 },
          { label: 'Diastólica', data: filtered.map(r => r[signo.key[1]]), borderColor: signo.color[1], backgroundColor: signo.color[1]+'15', fill:true, borderWidth:2, pointRadius:3, tension:0.3 },
        ]
      }
    }
    const filtered = records.filter(r => r[signo.key] !== null && r[signo.key] !== undefined)
    return {
      labels: filtered.map(r => new Date(r.recorded_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short' })),
      datasets: [{ label: signo.label, data: filtered.map(r => r[signo.key]), borderColor: signo.color, backgroundColor: signo.color+'15', fill:true, borderWidth:2, pointRadius:3, tension:0.3 }]
    }
  }

  const getLatest = () => {
    if (signo.multi) {
      const last = records.filter(r => r[signo.key[0]] !== null).slice(-1)[0]
      return last ? `${last[signo.key[0]]}/${last[signo.key[1]]}` : null
    }
    const last = records.filter(r => r[signo.key] !== null && r[signo.key] !== undefined).slice(-1)[0]
    return last ? last[signo.key] : null
  }

  const hasData = () => {
    if (signo.multi) return records.some(r => r[signo.key[0]] !== null)
    return records.some(r => r[signo.key] !== null && r[signo.key] !== undefined)
  }

  useEffect(() => {
    if (!canvasRef.current || !hasData()) return
    if (chartRef.current) chartRef.current.destroy()
    const { Chart } = window
    if (!Chart) return
    const data = getData()
    if (!data.labels.length) return

    const yOpts = { grid:{ color:'#e1e0d9' }, ticks:{ font:{ size:9 }, color:'#898781' }, border:{ display:false } }
    if (signo.yMin !== undefined) yOpts.min = signo.yMin

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data,
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: signo.multi },
          tooltip: { mode:'index', intersect:false, callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} ${signo.unit}` } }
        },
        scales: {
          x: { grid:{ display:false }, ticks:{ font:{ size:9 }, color:'#898781', maxRotation:45, maxTicksLimit:8 } },
          y: yOpts
        },
        elements: { point:{ radius:3, hoverRadius:5 }, line:{ borderWidth:2, tension:0.3 } }
      }
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [records])

  if (!hasData()) return null

  const latest = getLatest()

  return (
    <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:14 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{signo.label}</div>
      {latest && (
        <div style={{ fontSize:18, fontWeight:500, color:BLUE, marginBottom:8 }}>
          {latest} <span style={{ fontSize:11, color:'#aaa', fontWeight:400 }}>{signo.unit}</span>
        </div>
      )}
      {signo.multi && (
        <div style={{ display:'flex', gap:10, marginBottom:6 }}>
          <span style={{ fontSize:10, display:'flex', alignItems:'center', gap:3, color:'#555' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:signo.color[0], display:'inline-block' }}></span>Sistólica
          </span>
          <span style={{ fontSize:10, display:'flex', alignItems:'center', gap:3, color:'#555' }}>
            <span style={{ width:8, height:8, borderRadius:2, background:signo.color[1], display:'inline-block' }}></span>Diastólica
          </span>
        </div>
      )}
      <div style={{ position:'relative', height:90 }}>
        <canvas ref={canvasRef} role="img" aria-label={`Evolución de ${signo.label}`}>{signo.label} en el tiempo.</canvas>
      </div>
    </div>
  )
}

export default function EvolucionSignosTab({ patient }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(6)
  const [chartLoaded, setChartLoaded] = useState(false)

  const patientId = patient.profile?.id || patient.id

  useEffect(() => {
    if (!window.Chart) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      script.onload = () => setChartLoaded(true)
      document.head.appendChild(script)
    } else {
      setChartLoaded(true)
    }
  }, [])

  useEffect(() => { if (chartLoaded) load() }, [chartLoaded, periodo, patientId])

  async function load() {
    setLoading(true)
    let q = supabase.from('preconsult_records')
      .select('recorded_at, pas, pad, frecuencia_cardiaca, frecuencia_respiratoria, spo2, peso_kg, estatura_cm, glicemia, grasa_pct, masa_muscular_kg, grasa_visceral_pt, ancho_cintura_cm, fcf_lpm, altura_uterina_cm')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: true })

    if (periodo > 0) {
      const desde = new Date()
      desde.setMonth(desde.getMonth() - periodo)
      q = q.gte('recorded_at', desde.toISOString())
    }

    const { data } = await q
    setRecords(data || [])
    setLoading(false)
  }

  const signosConDatos = SIGNOS_CONFIG.filter(s => {
    if (s.multi) return records.some(r => r[s.key[0]] !== null)
    return records.some(r => r[s.key] !== null && r[s.key] !== undefined)
  })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:BLUE }}>Evolución de signos</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'#888' }}>Período:</span>
          <select style={{ fontSize:12, padding:'5px 10px', border:'0.5px solid #e2ede9', borderRadius:8, outline:'none', fontFamily:'inherit', color:BLUE }}
            value={periodo} onChange={e => setPeriodo(parseInt(e.target.value))}>
            {PERIODOS.map(p => <option key={p.months} value={p.months}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>Cargando datos...</div>
      ) : records.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>Sin registros de signos vitales en este período.</div>
      ) : signosConDatos.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>No hay datos suficientes para mostrar gráficas.</div>
      ) : (
        <>
          <div style={{ fontSize:11, color:'#aaa', marginBottom:12 }}>
            {records.length} medición{records.length !== 1 ? 'es' : ''} encontrada{records.length !== 1 ? 's' : ''} · Solo se muestran signos con datos registrados
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
            {signosConDatos.map(s => (
              <MiniChart key={s.multi ? s.key.join('-') : s.key} signo={s} records={records} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
