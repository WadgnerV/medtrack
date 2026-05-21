import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import FemaleControlModule from './FemaleControlModule'
import ContraceptiveModule from './ContraceptiveModule'
import PregnancyModule from './PregnancyModule'

const G = '#0F6E56'

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, li) => {
    const isH2 = line.startsWith('## ')
    const isH3 = line.startsWith('### ')
    const cleanLine = line.replace(/^##+ /, '')
    const parts = cleanLine.split(/(\*\*[^*]+\*\*)/)
    const rendered = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2,-2)}</strong>
      }
      return part
    })
    if (isH2 || isH3) {
      return <div key={li} style={{ fontWeight:700, fontSize: isH2 ? 14 : 13, color:'#1a1a1a', marginTop:8, marginBottom:2 }}>{rendered}</div>
    }
    if (line.trim() === '') return <br key={li} />
    return <span key={li}>{rendered}<br/></span>
  })
}
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

const BLEEDING_TYPES = [
  { value:'normal', label:'Menstruación normal', desc:'Ciclo regular', color:'#c0392b' },
  { value:'irregular', label:'Sangrado irregular', desc:'Manchado o sangrado fuera de ciclo', color:'#e67e22' },
]

const PHASE_COLORS = {
  period:    '#c0392b',
  irregular: '#e67e22',
  lutea:     '#e8a0b4',
  folicular: '#d4b0e8',
  ovulation: '#0F6E56',
  fertile:   '#7dbeaa',
  none:      'transparent',
}

const PHASE_LABELS = {
  period:    'Menstruación',
  lutea:     'Fase lútea',
  folicular: 'Fase folicular',
  ovulation: 'Ovulación',
  fertile:   'Ventana fértil',
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

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

export default function FemaleHealthModule({ patient }) {
  const [tab, setTab] = useState(() => localStorage.getItem('femaleHealthTab') || 'calendario')

  useEffect(() => { localStorage.setItem('femaleHealthTab', tab) }, [tab])
  const [cycles, setCycles] = useState([])
  const [periodDays, setPeriodDays] = useState({})
  const [todaySymptoms, setTodaySymptoms] = useState(null)
  const [symptomsHistory, setSymptomsHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Selección de rango
  const [rangeStart, setRangeStart] = useState(null)
  const [rangeHover, setRangeHover] = useState(null)
  const [showFlowPicker, setShowFlowPicker] = useState(false)
  const [pendingRange, setPendingRange] = useState(null)
  const [pendingType, setPendingType] = useState('normal')

  const today = new Date().toISOString().split('T')[0]
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())

  const [hasControls, setHasControls] = useState(true)
  const [showPregnancyConfirm, setShowPregnancyConfirm] = useState(false)
  const [sympForm, setSympForm] = useState({ symptoms: [], mood: '', notes: '' })

  useEffect(() => { if (patient?.id) { loadCycles(); loadPeriodDays(); loadTodaySymptoms(); loadSymptomsHistory(); checkControls() } }, [patient])

  async function checkControls() {
    const { data } = await supabase.from('female_medical_controls').select('id').eq('patient_id', patient.id).limit(1)
    setHasControls(data && data.length > 0)
  }

  async function deactivatePregnancy() {
    await supabase.from('patients').update({ is_pregnant: false, pregnancy_start_date: null }).eq('id', patient.id)
    window.location.reload()
  }

  async function loadCycles() {
    const { data } = await supabase.from('menstrual_cycles')
      .select('*').eq('patient_id', patient.id)
      .order('cycle_start_date', { ascending: false })
    setCycles(data || [])
  }

  async function loadPeriodDays() {
    const { data } = await supabase.from('menstrual_cycles')
      .select('cycle_start_date, cycle_end_date, flow_intensity')
      .eq('patient_id', patient.id)
    if (!data) return
    const days = {}
    data.forEach(c => {
      if (!c.cycle_start_date) return
      const end = c.cycle_end_date || c.cycle_start_date
      const isIrregular = c.notes === 'sangrado_irregular'
      let cur = c.cycle_start_date
      while (cur <= end) {
        days[cur] = isIrregular ? '__irregular__' : (c.flow_intensity || 'normal')
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

  function handleDayClick(dateStr) {
    if (periodDays[dateStr] && !rangeStart) {
      // Toque en día ya marcado sin rango iniciado → quitar
      deletePeriodDay(dateStr)
      return
    }
    if (!rangeStart) {
      setRangeStart(dateStr)
    } else {
      const start = rangeStart <= dateStr ? rangeStart : dateStr
      const end = rangeStart <= dateStr ? dateStr : rangeStart
      setPendingRange({ start, end })
      setRangeStart(null)
      setRangeHover(null)
      setShowFlowPicker(true)
    }
  }

  async function deletePeriodDay(dateStr) {
    // Eliminar ciclos que contengan este día
    await supabase.from('menstrual_cycles')
      .delete()
      .eq('patient_id', patient.id)
      .eq('cycle_start_date', dateStr)
    await loadPeriodDays()
    await loadCycles()
  }

  async function savePeriodRange(flow) {
    if (!pendingRange) return
    const { start, end } = pendingRange
    const durationDays = diffDays(start, end) + 1
    await supabase.from('menstrual_cycles').insert({
      patient_id: patient.id,
      cycle_start_date: start,
      cycle_end_date: end,
      period_duration_days: durationDays,
      flow_intensity: flow,
      notes: pendingType === 'irregular' ? 'sangrado_irregular' : null,
    })
    await loadPeriodDays()
    await loadCycles()
    setShowFlowPicker(false)
    setPendingRange(null)
    setPendingType('normal')
  }

  function getPredictions() {
    const normalCycles = cycles.filter(c => c.notes !== 'sangrado_irregular')
    const sorted = [...normalCycles].sort((a,b) => a.cycle_start_date > b.cycle_start_date ? -1 : 1)
    if (sorted.length === 0) return null
    const last = sorted[0]
    const avgLength = sorted.length >= 2
      ? Math.round(sorted.slice(0,5).reduce((acc,c,i,arr) => {
          if (i===0) return acc
          return acc + diffDays(arr[i].cycle_start_date, arr[i-1].cycle_start_date)
        }, 0) / Math.min(sorted.length-1, 4))
      : 28
    const periodDur = last.period_duration_days || 5
    const nextStart = addDays(last.cycle_start_date, avgLength)
    const ovulation = addDays(last.cycle_start_date, avgLength - 14)
    const fertileStart = addDays(ovulation, -5)
    const fertileEnd = addDays(ovulation, 1)
    const daysUntilNext = diffDays(today, nextStart)
    const isLate = daysUntilNext < -5
    const daysSinceLast = diffDays(last.cycle_start_date, today)
    let currentPhase = 'none'
    if (daysSinceLast < periodDur) currentPhase = 'period'
    else if (today >= fertileStart && today <= fertileEnd) currentPhase = 'fertile'
    else if (today === ovulation) currentPhase = 'ovulation'
    else if (daysSinceLast < avgLength * 0.45) currentPhase = 'folicular'
    else currentPhase = 'lutea'
    return { nextStart, ovulation, fertileStart, fertileEnd, daysUntilNext, avgLength, isLate, daysSinceLast, currentPhase, periodDur, lastStart: last.cycle_start_date }
  }

  function getDayPhase(dateStr, pred) {
    if (periodDays[dateStr] === '__irregular__') return 'irregular'
    if (periodDays[dateStr]) return 'period'
    if (!pred) return 'none'
    // Calcular fase para cualquier fecha basada en ciclos
    const daysSince = diffDays(pred.lastStart, dateStr)
    if (daysSince < 0) {
      // Fechas anteriores — calcular ciclos pasados
      const cyclesBack = Math.ceil(Math.abs(daysSince) / pred.avgLength)
      const prevStart = addDays(pred.lastStart, -cyclesBack * pred.avgLength)
      const daysSincePrev = diffDays(prevStart, dateStr)
      return getPhaseFromDay(daysSincePrev, pred)
    }
    return getPhaseFromDay(daysSince % pred.avgLength, pred)
  }

  function getPhaseFromDay(cycleDay, pred) {
    const ovulationDay = pred.avgLength - 14
    const fertileWindowStart = ovulationDay - 5
    const fertileWindowEnd = ovulationDay + 1
    if (cycleDay < pred.periodDur) return 'none'
    if (cycleDay < fertileWindowStart) return 'folicular'
    if (cycleDay === ovulationDay) return 'ovulation'
    if (cycleDay >= fertileWindowStart && cycleDay <= fertileWindowEnd) return 'fertile'
    return 'lutea'
  }

  function getWeekPhases(weekDates, pred) {
    // Detectar qué fases hay en la semana y sus rangos
    const phases = []
    let currentPhase = null
    let phaseStart = 0

    weekDates.forEach((dateStr, idx) => {
      const phase = dateStr ? getDayPhase(dateStr, pred) : 'none'
      if (phase !== currentPhase) {
        if (currentPhase && currentPhase !== 'none') {
          phases.push({ phase: currentPhase, start: phaseStart, end: idx - 1 })
        }
        currentPhase = phase
        phaseStart = idx
      }
    })
    if (currentPhase && currentPhase !== 'none') {
      phases.push({ phase: currentPhase, start: phaseStart, end: weekDates.length - 1 })
    }
    return phases
  }

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
    const pred = getPredictions()
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
            content: `Soy una paciente de medicina regenerativa. Fase actual: ${pred ? PHASE_LABELS[pred.currentPhase] || 'desconocida' : 'desconocida'}. Síntomas recientes: ${uniqueSymptoms.join(', ') || 'ninguno'}. Ciclo promedio: ${pred?.avgLength || 28} días. Dame consejos de alimentación, ejercicio y autocuidado para mi fase actual. Máximo 150 palabras. En español.`
          }]
        })
      })
      const data = await res.json()
      setAiAdvice(data.content?.[0]?.text || '')
    } catch(e) {
      setAiAdvice('No se pudo obtener el consejo.')
    }
    setAiLoading(false)
  }

  const pred = getPredictions()
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  // Construir semanas
  const allCells = []
  for (let i = 0; i < firstDay; i++) allCells.push(null)
  for (let i = 1; i <= daysInMonth; i++) {
    allCells.push(`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`)
  }
  while (allCells.length % 7 !== 0) allCells.push(null)
  const weeks = []
  for (let i = 0; i < allCells.length; i += 7) weeks.push(allCells.slice(i, i+7))

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[
          { key:'calendario', label:'Calendario' },
          { key:'sintomas', label:'Síntomas' },
          { key:'control', label:'Control médico', badge: true },
          { key:'anticonceptivo', label:'Anticonceptivo' },
          { key:'ia', label:'Consejo IA' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? G : '#f0f0f0', color: tab === t.key ? '#fff' : '#666', position:'relative' }}>
            {t.label}
            {t.badge && cycles.length === 0 && tab !== t.key && (
              <span style={{ position:'absolute', top:-4, right:-4, width:8, height:8, borderRadius:'50%', background:'#c0392b' }} />
            )}
          </button>
        ))}
      </div>

      {tab === 'calendario' && (
        <div>
          {/* Fase actual */}
          {pred && pred.currentPhase !== 'none' && (
            <div style={{ background: PHASE_COLORS[pred.currentPhase], borderRadius:12, padding:'12px 16px', marginBottom:12, color: ['folicular','lutea'].includes(pred.currentPhase) ? '#1a1a1a' : '#fff' }}>
              <div style={{ fontSize:12, opacity:0.8 }}>Fase actual</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:2 }}>{PHASE_LABELS[pred.currentPhase]}</div>
              {pred.isLate
                ? <div style={{ fontSize:12, opacity:0.9 }}>Tu ciclo lleva {Math.abs(pred.daysUntilNext)} días de retraso</div>
                : <div style={{ fontSize:12, opacity:0.85 }}>Próximo período en {pred.daysUntilNext} días · {formatDate(pred.nextStart)}</div>
              }
            </div>
          )}

          {/* Instrucciones */}
          <div style={{ fontSize:12, color:'#888', marginBottom:10, background:'#f8f8f8', borderRadius:8, padding:'8px 12px' }}>
            {rangeStart
              ? `Inicio seleccionado: ${formatDate(rangeStart)}. Ahora tocá el día en que terminó tu período.`
              : 'Tocá el primer día de tu período, luego el último para marcar el rango.'}
          </div>

          {/* Leyenda */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
            {Object.entries(PHASE_LABELS).map(([key, label]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#555' }}>
                <div style={{ width:12, height:12, borderRadius:3, background: PHASE_COLORS[key] }} />
                {label}
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#555' }}>
              <div style={{ width:12, height:12, borderRadius:3, background: PHASE_COLORS.irregular }} />
              Sangrado irregular
            </div>
          </div>

          {/* Calendario */}
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button onClick={() => { if (calMonth===0) { setCalMonth(11); setCalYear(y=>y-1) } else setCalMonth(m=>m-1) }}
                style={{ background:'none', border:'1px solid #eee', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:16 }}>‹</button>
              <div style={{ fontSize:14, fontWeight:600 }}>{MONTHS_ES[calMonth]} {calYear}</div>
              <button onClick={() => { if (calMonth===11) { setCalMonth(0); setCalYear(y=>y+1) } else setCalMonth(m=>m+1) }}
                style={{ background:'none', border:'1px solid #eee', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:16 }}>›</button>
            </div>

            {/* Header días */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, marginBottom:4 }}>
              {DAYS_ES.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, color:'#aaa', fontWeight:500, padding:'2px 0' }}>{d}</div>)}
            </div>

            {/* Semanas con barras de fase */}
            {weeks.map((week, wi) => {
              const weekPhases = getWeekPhases(week, pred)
              return (
                <div key={wi} style={{ marginBottom:4 }}>
                  {/* Días */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, marginBottom:1 }}>
                    {week.map((dateStr, di) => {
                      if (!dateStr) return <div key={di} />
                      const day = parseInt(dateStr.split('-')[2])
                      const isPeriod = !!periodDays[dateStr]
                      const isToday = dateStr === today
                      const isRangeStart = rangeStart === dateStr
                      const isHoverRange = rangeStart && rangeHover && dateStr >= Math.min(rangeStart, rangeHover) && dateStr <= Math.max(rangeStart, rangeHover)
                      const isPending = pendingRange && dateStr >= pendingRange.start && dateStr <= pendingRange.end

                      let bg = '#f8f8f8'
                      if (isPeriod) bg = FLOW_OPTIONS.find(f => f.value === periodDays[dateStr])?.color || '#c0392b'
                      else if (isHoverRange || isPending) bg = '#fdecea'
                      else if (isRangeStart) bg = '#c0392b'

                      return (
                        <div key={di}
                          onClick={() => handleDayClick(dateStr)}
                          onMouseEnter={() => rangeStart && setRangeHover(dateStr)}
                          onMouseLeave={() => setRangeHover(null)}
                          style={{
                            height:36, display:'flex', alignItems:'center', justifyContent:'center',
                            borderRadius:6, cursor:'pointer', fontSize:12,
                            fontWeight: isToday ? 700 : 400,
                            background: bg,
                            color: isPeriod || isRangeStart ? '#fff' : '#1a1a1a',
                            border: isToday ? `2px solid ${G}` : isRangeStart ? '2px solid #c0392b' : '2px solid transparent',
                            transition:'all 0.1s'
                          }}>
                          {day}
                        </div>
                      )
                    })}
                  </div>

                  {/* Barras de fase de la semana */}
                  {weekPhases.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, marginBottom:1 }}>
                      {(() => {
                        const bars = Array(7).fill(null)
                        weekPhases.forEach(({ phase, start, end }) => {
                          for (let i = start; i <= end; i++) bars[i] = { phase, isStart: i === start, isEnd: i === end, label: i === Math.floor((start+end)/2) ? PHASE_LABELS[phase] : '' }
                        })
                        return bars.map((bar, i) => (
                          <div key={i} style={{
                            height: 18,
                            background: bar ? PHASE_COLORS[bar.phase] : 'transparent',
                            borderRadius: bar ? `${bar.isStart ? '6px' : '0'} ${bar.isEnd ? '6px' : '0'} ${bar.isEnd ? '6px' : '0'} ${bar.isStart ? '6px' : '0'}` : 0,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            overflow:'hidden',
                          }}>
                            {bar?.label && (
                              <span style={{ fontSize:9, color: ['folicular','lutea'].includes(bar.phase) ? '#555' : '#fff', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', padding:'0 2px' }}>
                                {bar.label}
                              </span>
                            )}
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Flow picker modal */}
          {showFlowPicker && pendingRange && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}
              onClick={() => { setShowFlowPicker(false); setPendingRange(null); setPendingType('normal') }}>
              <div style={{ background:'#fff', borderRadius:16, padding:24, width:320, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Registrar sangrado</div>
                <div style={{ fontSize:13, color:'#888', marginBottom:14 }}>
                  {formatDate(pendingRange.start)} → {formatDate(pendingRange.end)} · {diffDays(pendingRange.start, pendingRange.end)+1} días
                </div>

                {/* Alerta menopausia */}
                {patient?.is_menopause && (
                  <div style={{ background:'#fdecea', border:'1px solid #f5c6c6', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:12, color:'#c0392b' }}>
                    <strong>Importante:</strong> Tenés registrada menopausia. Un sangrado genital en menopausia requiere evaluación médica. Consultá con tu médico a la brevedad.
                  </div>
                )}

                {/* Tipo de sangrado */}
                {!patient?.is_menopause && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'#555', marginBottom:8 }}>Tipo de sangrado</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {BLEEDING_TYPES.map(t => (
                        <div key={t.value} onClick={() => setPendingType(t.value)}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', border: pendingType === t.value ? `2px solid ${t.color}` : '2px solid #eee', background: pendingType === t.value ? '#fff8f8' : '#f8f8f8' }}>
                          <div style={{ width:12, height:12, borderRadius:'50%', background: t.color, flexShrink:0 }} />
                          <div>
                            <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{t.label}</div>
                            <div style={{ fontSize:11, color:'#888' }}>{t.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Intensidad */}
                <div style={{ fontSize:12, fontWeight:500, color:'#555', marginBottom:8 }}>Intensidad del flujo</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                  {FLOW_OPTIONS.map(f => (
                    <button key={f.value} onClick={() => savePeriodRange(f.value)}
                      style={{ padding:'10px 14px', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: f.color, color:'#fff', textAlign:'left' }}>
                      {f.label}
                    </button>
                  ))}
                </div>

                <button onClick={() => { setShowFlowPicker(false); setPendingRange(null); setPendingType('normal') }}
                  style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #eee', cursor:'pointer', fontSize:12, color:'#888', background:'#f8f8f8' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Predicciones */}
          {pred && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Predicciones del ciclo</div>
              {[
                { label:'Próximo período', value: pred.isLate ? `${Math.abs(pred.daysUntilNext)} días de retraso` : formatDate(pred.nextStart), color: pred.isLate ? '#c0392b' : G },
                { label:'Ovulación estimada', value: formatDate(pred.ovulation), color: PHASE_COLORS.ovulation },
                { label:'Ventana fértil', value: `${formatDate(pred.fertileStart)} – ${formatDate(pred.fertileEnd)}`, color: PHASE_COLORS.fertile },
                { label:'Duración promedio del ciclo', value: `${pred.avgLength} días`, color:'#555' },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <span style={{ fontSize:12, color:'#888' }}>{item.label}</span>
                  <span style={{ fontSize:12, fontWeight:600, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Alerta edad menopausia */}
          {(() => {
            const age = patient?.birth_date ? Math.floor((Date.now() - new Date(patient.birth_date + 'T12:00:00')) / (1000*60*60*24*365.25)) : 0
            if (age >= 40 && !patient?.is_menopause) {
              return (
                <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#795548' }}>
                  Recordá actualizar tu perfil si ya iniciaste la menopausia.
                </div>
              )
            }
            return null
          })()}

          {/* Alerta ciclo prolongado */}
          {pred && cycles.filter(c => c.notes !== 'sangrado_irregular').some(c => c.period_duration_days > 8) && (
            <div style={{ background:'#fff3e0', border:'1px solid #ffcc80', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#e65100' }}>
              Se detectó un sangrado de más de 8 días. Te recomendamos comentarlo con tu médico en tu próxima consulta.
            </div>
          )}

          {/* Alerta sangrado irregular */}
          {cycles.some(c => c.notes === 'sangrado_irregular') && (
            <div style={{ background:'#fff3e0', border:'1px solid #ffcc80', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#e65100' }}>
              Tenés registrado sangrado irregular. Tu médico puede verlo en tu historial durante la consulta.
            </div>
          )}

          {/* Botón activar embarazo si hay retraso */}
          {pred && pred.isLate && !patient?.is_pregnant && (
            <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#795548', marginBottom:6 }}>
                Tu ciclo lleva {Math.abs(pred.daysUntilNext)} días de retraso
              </div>
              <div style={{ fontSize:12, color:'#888', marginBottom:10 }}>
                Si creés que podrías estar embarazada, podés activar el modo embarazo. Tu médico también puede activarlo desde su panel.
              </div>
              <button onClick={() => setShowPregnancyConfirm(true)}
                style={{ width:'100%', padding:'9px', background:'#795548', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                Activar modo embarazo
              </button>
            </div>
          )}

          {/* Modal confirmacion embarazo */}
          {showPregnancyConfirm && pred && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}
              onClick={() => setShowPregnancyConfirm(false)}>
              <div style={{ background:'#fff', borderRadius:16, padding:24, width:300, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Activar modo embarazo</div>
                <div style={{ fontSize:13, color:'#555', marginBottom:16, lineHeight:1.6 }}>
                  ¿Confirmás que estás embarazada? Tu médico podrá ver esta información en tu historial.
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setShowPregnancyConfirm(false)}
                    style={{ flex:1, padding:'9px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                    Cancelar
                  </button>
                  <button onClick={async () => {
                    const { error } = await supabase.from('patients').update({ is_pregnant: true, pregnancy_start_date: pred.lastStart }).eq('id', patient.id)
                    if (error) { console.error('Error:', error); setShowPregnancyConfirm(false); return }
                    setShowPregnancyConfirm(false)
                    window.location.reload()
                  }}
                    style={{ flex:1, padding:'9px', background:'#795548', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {cycles.length === 0 && (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>
              Tocá el primer día de tu período para comenzar.
            </div>
          )}
        </div>
      )}

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

      {tab === 'control' && (
        <FemaleControlModule patient={patient} />
      )}

      {tab === 'anticonceptivo' && (
        <ContraceptiveModule patient={patient} />
      )}

      {tab === 'ia' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Consejo personalizado según tu ciclo</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>
              La IA analiza tu fase actual y síntomas recientes para darte recomendaciones personalizadas.
            </div>
            <button onClick={getAiAdvice} disabled={aiLoading || !pred}
              style={{ width:'100%', padding:'10px', background: !pred ? '#f0f0f0' : G, color: !pred ? '#bbb' : '#fff', border:'none', borderRadius:10, cursor: !pred ? 'default' : 'pointer', fontSize:13, fontWeight:500, opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? 'Generando consejo...' : !pred ? 'Marcá tu período primero' : aiAdvice ? 'Nuevo consejo' : 'Obtener consejo'}
            </button>
          </div>
          {aiAdvice && (
            <div style={{ background:'#E1F5EE', border:'1px solid #c8e6da', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:12, fontWeight:600, color:G, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Tu consejo de hoy</div>
              <div style={{ fontSize:13, color:'#1a1a1a', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{renderMarkdown(aiAdvice)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
