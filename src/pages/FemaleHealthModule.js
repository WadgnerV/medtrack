import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const ANTH_URL = 'https://mdcqdigxbmfajlmaxrta.supabase.co/functions/v1/claude-proxy'

const SYMPTOMS_LIST = [
  'Cólicos','Hinchazón','Sensibilidad mamaria','Cambios de humor',
  'Fatiga','Acné','Dolor de cabeza','Náuseas','Dolor de espalda',
  'Ansiedad','Irritabilidad','Insomnio','Antojos','Retención de líquidos'
]

const MOOD_OPTIONS = [
  { value:1, emoji:'😔', label:'Muy mal' },
  { value:2, emoji:'😕', label:'Mal' },
  { value:3, emoji:'😐', label:'Regular' },
  { value:4, emoji:'🙂', label:'Bien' },
  { value:5, emoji:'😄', label:'Excelente' },
]

const FLOW_OPTIONS = [
  { value:'ligero', label:'Ligero', color:'#f5a0a0' },
  { value:'normal', label:'Normal', color:'#e05555' },
  { value:'abundante', label:'Abundante', color:'#c0392b' },
]

const PHASE_COLORS = {
  period:    '#c0392b',
  lutea:     '#e8a0b4',
  folicular: '#d4b0e8',
  ovulation: '#0F6E56',
  fertile:   '#7dbeaa',
  none:      '#f0f0f0',
}

const PHASE_LABELS = {
  period:    'Menstruación',
  lutea:     'Fase lútea',
  folicular: 'Fase folicular',
  ovulation: 'Ovulación',
  fertile:   'Ventana fértil',
  none:      '',
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function diffDays(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / (1000*60*60*24))
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long' })
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function FemaleHealthModule({ patient, profile }) {
  const [tab, setTab] = useState('calendario')
  const [cycles, setCycles] = useState([])
  const [periodDays, setPeriodDays] = useState({}) // { 'YYYY-MM-DD': 'ligero'|'normal'|'abundante' }
  const [todaySymptoms, setTodaySymptoms] = useState(null)
  const [symptomsHistory, setSymptomsHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showFlowPicker, setShowFlowPicker] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())

  const [sympForm, setSympForm] = useState({ symptoms: [], mood: '', notes: '' })

  useEffect(() => { if (patient?.id) { loadCycles(); loadPeriodDays(); loadTodaySymptoms(); loadSymptomsHistory() } }, [patient])

  async function loadCycles() {
    const { data } = await supabase.from('menstrual_cycles')
      .select('*').eq('patient_id', patient.id)
      .order('cycle_start_date', { ascending: false })
    setCycles(data || [])
  }

  async function loadPeriodDays() {
    // Cargar todos los días marcados como período
    const { data } = await supabase.from('menstrual_cycles')
      .select('cycle_start_date, cycle_end_date, flow_intensity')
      .eq('patient_id', patient.id)
    if (!data) return
    const days = {}
    data.forEach(c => {
      if (!c.cycle_start_date) return
      const start = c.cycle_start_date
      const end = c.cycle_end_date || start
      let cur = start
      while (cur <= end) {
        days[cur] = c.flow_intensity || 'normal'
        cur = addDays(cur, 1)
      }
    })
    setPeriodDays(days)
  }

  async function loadTodaySymptoms() {
    const { data } = await supabase.from('menstrual_symptoms')
      .select('*').eq('patient_id', patient.id).eq('log_date', today).single()
    if (data) {
      setTodaySymptoms(data)
      setSympForm({ symptoms: data.symptoms || [], mood: data.mood || '', notes: data.notes || '' })
    }
  }

  async function loadSymptomsHistory() {
    const { data } = await supabase.from('menstrual_symptoms')
      .select('*').eq('patient_id', patient.id)
      .order('log_date', { ascending: false }).limit(30)
    setSymptomsHistory(data || [])
  }

  async function togglePeriodDay(dateStr, flow) {
    if (periodDays[dateStr]) {
      // Quitar día — buscar y actualizar el ciclo
      await supabase.from('menstrual_cycles')
        .delete()
        .eq('patient_id', patient.id)
        .eq('cycle_start_date', dateStr)
      setPeriodDays(p => { const n = { ...p }; delete n[dateStr]; return n })
    } else {
      // Agregar día
      await supabase.from('menstrual_cycles').insert({
        patient_id: patient.id,
        cycle_start_date: dateStr,
        cycle_end_date: dateStr,
        flow_intensity: flow || 'normal',
      })
      setPeriodDays(p => ({ ...p, [dateStr]: flow || 'normal' }))
    }
    await loadCycles()
    setShowFlowPicker(false)
    setSelectedDay(null)
  }

  // Calcular predicciones
  function getPredictions() {
    const sortedCycles = [...cycles].sort((a,b) => a.cycle_start_date > b.cycle_start_date ? -1 : 1)
    if (sortedCycles.length === 0) return null
    const last = sortedCycles[0]

    const avgLength = sortedCycles.length >= 2
      ? Math.round(sortedCycles.slice(0, 5).reduce((acc, c, i, arr) => {
          if (i === 0) return acc
          return acc + diffDays(arr[i].cycle_start_date, arr[i-1].cycle_start_date)
        }, 0) / Math.min(sortedCycles.length - 1, 4))
      : 28

    const periodDuration = last.period_duration_days || 5
    const nextStart = addDays(last.cycle_start_date, avgLength)
    const ovulation = addDays(last.cycle_start_date, avgLength - 14)
    const fertileStart = addDays(ovulation, -5)
    const fertileEnd = addDays(ovulation, 1)
    const daysUntilNext = diffDays(today, nextStart)
    const isLate = daysUntilNext < -5
    const daysSinceLast = diffDays(last.cycle_start_date, today)

    let currentPhase = 'none'
    if (daysSinceLast < periodDuration) currentPhase = 'period'
    else if (daysSinceLast < avgLength * 0.45) currentPhase = 'folicular'
    else if (today >= fertileStart && today <= fertileEnd) currentPhase = 'fertile'
    else if (today === ovulation) currentPhase = 'ovulation'
    else currentPhase = 'lutea'

    return { nextStart, ovulation, fertileStart, fertileEnd, daysUntilNext, avgLength, isLate, daysSinceLast, currentPhase, periodDuration, lastStart: last.cycle_start_date }
  }

  function getDayPhase(dateStr, pred) {
    if (periodDays[dateStr]) return 'period'
    if (!pred) return 'none'
    if (dateStr >= pred.fertileStart && dateStr <= pred.fertileEnd) return 'fertile'
    if (dateStr === pred.ovulation) return 'ovulation'

    // Calcular para meses futuros/pasados basado en ciclos
    const daysSince = diffDays(pred.lastStart, dateStr)
    if (daysSince < 0) return 'none'
    const cycleDay = daysSince % pred.avgLength
    const periodDur = pred.periodDuration
    if (cycleDay < periodDur) return 'none' // ya cubierto por periodDays
    if (cycleDay < pred.avgLength * 0.45) return 'folicular'
    if (cycleDay >= pred.avgLength - 14 - 5 && cycleDay <= pred.avgLength - 14 + 1) return 'fertile'
    if (cycleDay === pred.avgLength - 14) return 'ovulation'
    return 'lutea'
  }

  const pred = getPredictions()
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DAYS_ES = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

  async function saveSymptoms() {
    setSaving(true)
    const payload = { patient_id: patient.id, log_date: today, symptoms: sympForm.symptoms, mood: sympForm.mood || null, notes: sympForm.notes || null }
    if (todaySymptoms?.id) {
      await supabase.from('menstrual_symptoms').update(payload).eq('id', todaySymptoms.id)
    } else {
      await supabase.from('menstrual_symptoms').insert(payload)
    }
    await loadTodaySymptoms()
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  function toggleSymptom(s) {
    setSympForm(p => ({ ...p, symptoms: p.symptoms.includes(s) ? p.symptoms.filter(x => x !== s) : [...p.symptoms, s] }))
  }

  async function getAiAdvice() {
    setAiLoading(true); setAiAdvice('')
    const recentSymptoms = symptomsHistory.slice(0,3).flatMap(s => s.symptoms || [])
    const uniqueSymptoms = [...new Set(recentSymptoms)]
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(ANTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Soy una paciente de medicina regenerativa. Fase actual del ciclo: ${pred ? PHASE_LABELS[pred.currentPhase] : 'desconocida'}. Síntomas recientes: ${uniqueSymptoms.join(', ') || 'ninguno'}. Duración promedio del ciclo: ${pred?.avgLength || 28} días. Dame consejos personalizados para mi fase actual: alimentación, ejercicio y autocuidado. Máximo 150 palabras. En español.`
          }]
        })
      })
      const data = await res.json()
      setAiAdvice(data.content?.[0]?.text || '')
    } catch(e) {
      setAiAdvice('No se pudo obtener el consejo. Intentá de nuevo.')
    }
    setAiLoading(false)
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[
          { key:'calendario', label:'Calendario' },
          { key:'sintomas', label:'Síntomas' },
          { key:'ia', label:'Consejo IA' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? G : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Calendario */}
      {tab === 'calendario' && (
        <div>
          {/* Fase actual */}
          {pred && pred.currentPhase !== 'none' && (
            <div style={{ background: PHASE_COLORS[pred.currentPhase], borderRadius:12, padding:'12px 16px', color: pred.currentPhase === 'folicular' || pred.currentPhase === 'lutea' ? '#1a1a1a' : '#fff', marginBottom:12 }}>
              <div style={{ fontSize:12, opacity:0.8, marginBottom:2 }}>Fase actual</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:2 }}>{PHASE_LABELS[pred.currentPhase]}</div>
              {pred.isLate && <div style={{ fontSize:12, marginTop:4, opacity:0.9 }}>Tu ciclo lleva {Math.abs(pred.daysUntilNext)} días de retraso</div>}
              {!pred.isLate && <div style={{ fontSize:12, opacity:0.85 }}>Próximo período en {pred.daysUntilNext} días · {formatDate(pred.nextStart)}</div>}
            </div>
          )}

          {/* Leyenda */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
            {Object.entries(PHASE_LABELS).filter(([k]) => k !== 'none').map(([key, label]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#555' }}>
                <div style={{ width:12, height:12, borderRadius:3, background: PHASE_COLORS[key] }} />
                {label}
              </div>
            ))}
          </div>

          {/* Navegación mes */}
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}
                style={{ background:'none', border:'1px solid #eee', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontSize:14 }}>‹</button>
              <div style={{ fontSize:14, fontWeight:600 }}>{MONTHS_ES[calMonth]} {calYear}</div>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}
                style={{ background:'none', border:'1px solid #eee', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontSize:14 }}>›</button>
            </div>

            {/* Días de semana */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
              {DAYS_ES.map(d => <div key={d} style={{ textAlign:'center', fontSize:11, color:'#aaa', fontWeight:500, padding:'2px 0' }}>{d}</div>)}
            </div>

            {/* Días del mes */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const phase = getDayPhase(dateStr, pred)
                const isPeriod = !!periodDays[dateStr]
                const isToday = dateStr === today
                const isSelected = selectedDay === dateStr
                const bgColor = isPeriod ? (FLOW_OPTIONS.find(f => f.value === periodDays[dateStr])?.color || '#c0392b') : PHASE_COLORS[phase]

                return (
                  <div key={day} onClick={() => { setSelectedDay(isSelected ? null : dateStr); setShowFlowPicker(!isSelected) }}
                    style={{
                      aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
                      borderRadius:8, cursor:'pointer', fontSize:12, fontWeight: isToday ? 700 : 400,
                      background: bgColor,
                      color: isPeriod || phase === 'ovulation' || phase === 'fertile' ? '#fff' : '#1a1a1a',
                      border: isToday ? '2px solid #0F6E56' : isSelected ? '2px solid #333' : '2px solid transparent',
                      transition:'all 0.15s'
                    }}>
                    {day}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Flow picker */}
          {showFlowPicker && selectedDay && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>
                {periodDays[selectedDay] ? 'Quitar período de este día' : `Marcar ${formatDate(selectedDay)} como período`}
              </div>
              {!periodDays[selectedDay] ? (
                <div>
                  <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>Intensidad del flujo:</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {FLOW_OPTIONS.map(f => (
                      <button key={f.value} onClick={() => togglePeriodDay(selectedDay, f.value)}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: f.color, color:'#fff' }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button onClick={() => togglePeriodDay(selectedDay)}
                  style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e0e0e0', cursor:'pointer', fontSize:13, color:'#c0392b', background:'#fdecea' }}>
                  Quitar marca de período
                </button>
              )}
            </div>
          )}

          {/* Resumen predicciones */}
          {pred && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Predicciones del ciclo</div>
              {[
                { label:'Próximo período', value: pred.isLate ? `${Math.abs(pred.daysUntilNext)} días de retraso` : formatDate(pred.nextStart), color: pred.isLate ? '#c0392b' : G },
                { label:'Ovulación estimada', value: formatDate(pred.ovulation), color:'#0F6E56' },
                { label:'Ventana fértil', value: `${formatDate(pred.fertileStart)} – ${formatDate(pred.fertileEnd)}`, color:'#7dbeaa' },
                { label:'Duración promedio', value: `${pred.avgLength} días`, color:'#555' },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <span style={{ fontSize:12, color:'#888' }}>{item.label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {cycles.length === 0 && (
            <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>
              Tocá cualquier día del calendario para marcar tu período.
            </div>
          )}
        </div>
      )}

      {/* Síntomas */}
      {tab === 'sintomas' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>¿Cómo te sentís hoy?</div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Estado de ánimo</label>
              <div style={{ display:'flex', gap:6 }}>
                {MOOD_OPTIONS.map(m => (
                  <div key={m.value} onClick={() => setSympForm(p => ({ ...p, mood: m.value }))}
                    style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'8px 4px', borderRadius:10, cursor:'pointer', border: sympForm.mood === m.value ? `2px solid ${G}` : '2px solid #eee', background: sympForm.mood === m.value ? '#E1F5EE' : '#f8f8f8' }}>
                    <span style={{ fontSize:20 }}>{m.emoji}</span>
                    <span style={{ fontSize:10, color: sympForm.mood === m.value ? G : '#888' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Síntomas de hoy</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {SYMPTOMS_LIST.map(s => (
                  <button key={s} onClick={() => toggleSymptom(s)}
                    style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border: sympForm.symptoms.includes(s) ? '1px solid #c0392b' : '1px solid transparent', background: sympForm.symptoms.includes(s) ? '#fdecea' : '#f0f0f0', color: sympForm.symptoms.includes(s) ? '#c0392b' : '#666' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Notas adicionales</label>
              <textarea value={sympForm.notes} onChange={e => setSympForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="¿Algo más que quieras registrar?"
                style={{ ...inp, height:60, resize:'vertical' }} />
            </div>
            {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:G }}>✓ Síntomas guardados</div>}
            <button onClick={saveSymptoms} disabled={saving}
              style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar síntomas de hoy'}
            </button>
          </div>

          {symptomsHistory.length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Historial reciente</div>
              {symptomsHistory.slice(0,7).map(s => (
                <div key={s.id} style={{ padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:500, color:'#555' }}>{formatDate(s.log_date)}</span>
                    {s.mood && <span style={{ fontSize:16 }}>{MOOD_OPTIONS.find(m => m.value === s.mood)?.emoji}</span>}
                  </div>
                  {s.symptoms?.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {s.symptoms.map(sym => (
                        <span key={sym} style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#fdecea', color:'#c0392b' }}>{sym}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Consejo IA */}
      {tab === 'ia' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Consejo personalizado según tu ciclo</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>
              La IA analiza tu fase actual y síntomas para darte recomendaciones de alimentación, ejercicio y autocuidado.
            </div>
            <button onClick={getAiAdvice} disabled={aiLoading || !pred}
              style={{ width:'100%', padding:'10px', background: !pred ? '#f0f0f0' : G, color: !pred ? '#bbb' : '#fff', border:'none', borderRadius:10, cursor: !pred ? 'default' : 'pointer', fontSize:13, fontWeight:500, opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? 'Generando consejo...' : !pred ? 'Marcá tu período primero' : aiAdvice ? 'Nuevo consejo' : 'Obtener consejo'}
            </button>
          </div>
          {aiAdvice && (
            <div style={{ background:'#E1F5EE', border:'1px solid #c8e6da', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:12, fontWeight:600, color:G, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Tu consejo de hoy</div>
              <div style={{ fontSize:13, color:'#1a1a1a', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{aiAdvice}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
