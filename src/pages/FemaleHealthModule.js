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
  { value:'ligero', label:'Ligero' },
  { value:'normal', label:'Normal' },
  { value:'abundante', label:'Abundante' },
]

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

export default function FemaleHealthModule({ patient, profile }) {
  const [tab, setTab] = useState('ciclo')
  const [cycles, setCycles] = useState([])
  const [todaySymptoms, setTodaySymptoms] = useState(null)
  const [symptomsHistory, setSymptomsHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const [cycleForm, setCycleForm] = useState({
    cycle_start_date: today,
    cycle_end_date: '',
    flow_intensity: 'normal',
    notes: ''
  })

  const [sympForm, setSympForm] = useState({
    symptoms: [],
    mood: '',
    notes: ''
  })

  useEffect(() => { if (patient?.id) { loadCycles(); loadTodaySymptoms(); loadSymptomsHistory() } }, [patient])

  async function loadCycles() {
    const { data } = await supabase.from('menstrual_cycles')
      .select('*').eq('patient_id', patient.id)
      .order('cycle_start_date', { ascending: false })
    setCycles(data || [])
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

  async function saveCycle() {
    setSaving(true)
    const payload = {
      patient_id: patient.id,
      cycle_start_date: cycleForm.cycle_start_date,
      cycle_end_date: cycleForm.cycle_end_date || null,
      period_duration_days: cycleForm.cycle_end_date ? diffDays(cycleForm.cycle_start_date, cycleForm.cycle_end_date) : null,
      flow_intensity: cycleForm.flow_intensity,
      notes: cycleForm.notes || null,
    }
    await supabase.from('menstrual_cycles').insert(payload)
    await loadCycles()
    setCycleForm({ cycle_start_date: today, cycle_end_date: '', flow_intensity: 'normal', notes: '' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
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
    setSympForm(p => ({
      ...p,
      symptoms: p.symptoms.includes(s) ? p.symptoms.filter(x => x !== s) : [...p.symptoms, s]
    }))
  }

  // Calcular predicciones
  function getPredictions() {
    if (cycles.length === 0) return null
    const last = cycles[0]
    const avgLength = cycles.length >= 2
      ? Math.round(cycles.slice(0, 5).reduce((acc, c, i, arr) => {
          if (i === 0) return acc
          return acc + diffDays(arr[i].cycle_start_date, arr[i-1].cycle_start_date)
        }, 0) / Math.min(cycles.length - 1, 4))
      : 28

    const nextStart = addDays(last.cycle_start_date, avgLength)
    const ovulation = addDays(nextStart, -(avgLength - 14))
    const fertileStart = addDays(ovulation, -5)
    const fertileEnd = addDays(ovulation, 1)

    const daysSinceLast = diffDays(last.cycle_start_date, today)
    let phase = ''
    const periodDuration = last.period_duration_days || 5
    if (daysSinceLast < periodDuration) phase = 'menstrual'
    else if (daysSinceLast < avgLength * 0.45) phase = 'folicular'
    else if (daysSinceLast < avgLength * 0.55) phase = 'ovulacion'
    else phase = 'lutea'

    const daysUntilNext = diffDays(today, nextStart)
    const isLate = daysUntilNext < -5

    return { nextStart, ovulation, fertileStart, fertileEnd, phase, daysUntilNext, avgLength, isLate, daysSinceLast }
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
            content: `Soy una paciente. Datos: fase actual del ciclo=${pred?.phase || 'desconocida'}, síntomas recientes=${uniqueSymptoms.join(', ') || 'ninguno'}, días desde último ciclo=${pred?.daysSinceLast || 'desconocido'}, duración promedio del ciclo=${pred?.avgLength || 28} días. Dame consejos prácticos y personalizados para mi fase actual del ciclo menstrual. Incluye recomendaciones de alimentación, ejercicio y autocuidado. Máximo 150 palabras. En español.`
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

  const pred = getPredictions()

  const phaseInfo = {
    menstrual: { label:'Fase menstrual', color:'#c0392b', desc:'Tu cuerpo está en su fase de menstruación. Es normal sentir más fatiga.' },
    folicular: { label:'Fase folicular', color:'#e67e22', desc:'Tu energía va aumentando. Buen momento para actividad física y proyectos.' },
    ovulacion: { label:'Fase de ovulación', color:G, desc:'Pico de energía y fertilidad. Tu cuerpo está en su punto más activo.' },
    lutea: { label:'Fase lútea', color:'#8e44ad', desc:'El cuerpo se prepara para el siguiente ciclo. Posibles cambios de humor.' },
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {[
          { key:'ciclo', label:'Mi ciclo' },
          { key:'sintomas', label:'Síntomas' },
          { key:'prediccion', label:'Predicción' },
          { key:'ia', label:'Consejo IA' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? G : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Mi ciclo */}
      {tab === 'ciclo' && (
        <div>
          {/* Fase actual */}
          {pred && (
            <div style={{ background: phaseInfo[pred.phase]?.color || G, borderRadius:12, padding:'14px 16px', color:'#fff', marginBottom:12 }}>
              <div style={{ fontSize:13, opacity:0.9, marginBottom:2 }}>Fase actual</div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{phaseInfo[pred.phase]?.label}</div>
              <div style={{ fontSize:12, opacity:0.85 }}>{phaseInfo[pred.phase]?.desc}</div>
              {pred.isLate && (
                <div style={{ marginTop:8, background:'rgba(255,255,255,0.2)', borderRadius:8, padding:'6px 10px', fontSize:12 }}>
                  Tu ciclo lleva {Math.abs(pred.daysUntilNext)} días de retraso. Si sospechás un embarazo, confirmalo con tu médico.
                </div>
              )}
            </div>
          )}

          {/* Registrar inicio de período */}
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Registrar período</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={lbl}>Inicio del período</label>
                <input type="date" value={cycleForm.cycle_start_date} onChange={e => setCycleForm(p => ({ ...p, cycle_start_date: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fin del período (opcional)</label>
                <input type="date" value={cycleForm.cycle_end_date} onChange={e => setCycleForm(p => ({ ...p, cycle_end_date: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={lbl}>Intensidad del flujo</label>
              <div style={{ display:'flex', gap:8 }}>
                {FLOW_OPTIONS.map(f => (
                  <button key={f.value} onClick={() => setCycleForm(p => ({ ...p, flow_intensity: f.value }))}
                    style={{ flex:1, padding:'7px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: cycleForm.flow_intensity === f.value ? G : '#f0f0f0', color: cycleForm.flow_intensity === f.value ? '#fff' : '#666' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Notas (opcional)</label>
              <textarea value={cycleForm.notes} onChange={e => setCycleForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="¿Cómo te sentiste? ¿Algo inusual?"
                style={{ ...inp, height:60, resize:'vertical' }} />
            </div>
            {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:G }}>✓ Período registrado correctamente</div>}
            <button onClick={saveCycle} disabled={saving}
              style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Registrar período'}
            </button>
          </div>

          {/* Historial de ciclos */}
          {cycles.length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Historial de ciclos</div>
              {cycles.slice(0,5).map((c, i) => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#c0392b', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{formatDate(c.cycle_start_date)}</div>
                    <div style={{ fontSize:11, color:'#888' }}>
                      {c.period_duration_days ? `${c.period_duration_days} días` : 'En curso'} · {c.flow_intensity || '--'}
                      {i > 0 && cycles[i-1] && ` · Ciclo: ${diffDays(c.cycle_start_date, cycles[i-1].cycle_start_date)} días`}
                    </div>
                  </div>
                </div>
              ))}
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
              <div style={{ display:'flex', gap:8 }}>
                {MOOD_OPTIONS.map(m => (
                  <div key={m.value} onClick={() => setSympForm(p => ({ ...p, mood: m.value }))}
                    style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'8px 4px', borderRadius:10, cursor:'pointer', border: sympForm.mood === m.value ? `2px solid ${G}` : '2px solid #eee', background: sympForm.mood === m.value ? '#E1F5EE' : '#f8f8f8' }}>
                    <span style={{ fontSize:20 }}>{m.emoji}</span>
                    <span style={{ fontSize:10, color: sympForm.mood === m.value ? G : '#888', fontWeight: sympForm.mood === m.value ? 600 : 400 }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Síntomas de hoy</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {SYMPTOMS_LIST.map(s => (
                  <button key={s} onClick={() => toggleSymptom(s)}
                    style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background: sympForm.symptoms.includes(s) ? '#fdecea' : '#f0f0f0', color: sympForm.symptoms.includes(s) ? '#c0392b' : '#666', border: sympForm.symptoms.includes(s) ? '1px solid #c0392b' : '1px solid transparent' }}>
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

          {/* Historial síntomas */}
          {symptomsHistory.length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Historial reciente</div>
              {symptomsHistory.slice(0,7).map(s => (
                <div key={s.id} style={{ padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:500, color:'#555' }}>{formatDate(s.log_date)}</span>
                    {s.mood && <span style={{ fontSize:14 }}>{MOOD_OPTIONS.find(m => m.value === s.mood)?.emoji}</span>}
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

      {/* Predicción */}
      {tab === 'prediccion' && (
        <div>
          {!pred ? (
            <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>
              Registrá al menos un ciclo para ver las predicciones.
            </div>
          ) : (
            <>
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Próximo ciclo</div>
                {[
                  { label:'Próximo período', value: pred.isLate ? 'Posible retraso' : formatDate(pred.nextStart), color: pred.isLate ? '#c0392b' : G },
                  { label:'Días para el próximo período', value: pred.isLate ? `${Math.abs(pred.daysUntilNext)} días de retraso` : `${pred.daysUntilNext} días`, color: pred.isLate ? '#c0392b' : '#1a1a1a' },
                  { label:'Ovulación estimada', value: formatDate(pred.ovulation), color:'#8e44ad' },
                  { label:'Ventana fértil', value: `${formatDate(pred.fertileStart)} – ${formatDate(pred.fertileEnd)}`, color:'#e67e22' },
                  { label:'Duración promedio del ciclo', value: `${pred.avgLength} días`, color:'#555' },
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                    <span style={{ fontSize:13, color:'#888' }}>{item.label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {pred.isLate && (
                <div style={{ background:'#fdecea', border:'1px solid #f5c6c6', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#c0392b', marginBottom:6 }}>Ciclo con posible retraso</div>
                  <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>
                    Tu ciclo lleva {Math.abs(pred.daysUntilNext)} días de retraso. Esto puede deberse a estrés, cambios de peso, enfermedad u otras causas. Si sospechás un embarazo, consultá con tu médico.
                  </div>
                </div>
              )}
            </>
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
              {aiLoading ? 'Generando consejo...' : !pred ? 'Registrá un ciclo primero' : aiAdvice ? 'Nuevo consejo' : 'Obtener consejo'}
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
