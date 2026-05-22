import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

const SLEEP_MOODS = [
  { value: 1, emoji: '😴', label: 'Muy mal' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Excelente' },
]

const EXERCISE_TYPES = ['Caminata', 'Trote/Carrera', 'Cardio', 'Fuerza/Pesas', 'Yoga/Pilates', 'Natación', 'Ciclismo', 'HIIT', 'Otro']

const MET = { 'Caminata':3.5, 'Trote/Carrera':8, 'Cardio':6, 'Fuerza/Pesas':4, 'Yoga/Pilates':2.5, 'Natación':7, 'Ciclismo':6, 'HIIT':9, 'Otro':4 }
const INTENSITY_MULT = { baja: 0.8, media: 1.0, alta: 1.3 }

const ANTH_URL = 'https://mdcqdigxbmfajlmaxrta.supabase.co/functions/v1/claude-proxy'

export default function WellnessModule({ patient, profile }) {
  const [log, setLog] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wellnessHistory, setWellnessHistory] = useState([])
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().substring(0,7))
  const [tip, setTip] = useState('')
  const [tipLoading, setTipLoading] = useState(false)
  const [section, setSection] = useState(() => localStorage.getItem('wellnessSection') || 'sueno')

  useEffect(() => { localStorage.setItem('wellnessSection', section) }, [section])

  const [form, setForm] = useState({
    sleep_hours: '', sleep_quality: '', sleep_start: '', sleep_end: '',
    stress_level: 5, stress_notes: '',
    exercise_type: '', exercise_duration_min: '', exercise_intensity: 'media',
  })

  useEffect(() => { if (patient?.id) { loadLog(); loadWellnessHistory() } }, [patient, date])

  async function loadWellnessHistory(month) {
    const m = month || historyMonth
    const startDate = m + '-01'
    const endDate = new Date(m.split('-')[0], parseInt(m.split('-')[1]), 0).toISOString().split('T')[0]
    const { data } = await supabase.from('wellness_logs')
      .select('log_date, sleep_hours, sleep_quality, stress_level, exercise_type, exercise_duration_min, calories_burned')
      .eq('patient_id', patient.id)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: false })
    setWellnessHistory(data || [])
  }

  async function loadLog() {
    const { data } = await supabase.from('wellness_logs')
      .select('*').eq('patient_id', patient.id).eq('log_date', date).single()
    if (data) {
      setLog(data)
      setForm({
        sleep_hours: data.sleep_hours || '',
        sleep_quality: data.sleep_quality || '',
        sleep_start: data.sleep_start?.substring(0,5) || '',
        sleep_end: data.sleep_end?.substring(0,5) || '',
        stress_level: data.stress_level || 5,
        stress_notes: data.stress_notes || '',
        exercise_type: data.exercise_type || '',
        exercise_duration_min: data.exercise_duration_min || '',
        exercise_intensity: data.exercise_intensity || 'media',
      })
    } else {
      setLog(null)
      setForm({ sleep_hours:'', sleep_quality:'', sleep_start:'', sleep_end:'', stress_level:5, stress_notes:'', exercise_type:'', exercise_duration_min:'', exercise_intensity:'media' })
    }
  }

  function calcCalories() {
    if (!form.exercise_type || !form.exercise_duration_min) return 0
    const weight = patient?.weight_kg || 70
    const met = MET[form.exercise_type] || 4
    const mult = INTENSITY_MULT[form.exercise_intensity] || 1
    return Math.round(met * mult * weight * (parseFloat(form.exercise_duration_min) / 60))
  }

  async function save() {
    setSaving(true)
    const calories_burned = calcCalories()
    const payload = {
      patient_id: patient.id,
      log_date: date,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
      sleep_quality: form.sleep_quality ? parseInt(form.sleep_quality) : null,
      sleep_start: form.sleep_start || null,
      sleep_end: form.sleep_end || null,
      stress_level: form.stress_level ? parseInt(form.stress_level) : null,
      stress_notes: form.stress_notes || null,
      exercise_type: form.exercise_type || null,
      exercise_duration_min: form.exercise_duration_min ? parseInt(form.exercise_duration_min) : null,
      exercise_intensity: form.exercise_intensity || null,
      calories_burned: calories_burned || null,
    }
    if (log?.id) {
      const { error } = await supabase.from('wellness_logs').update(payload).eq('id', log.id)
      if (error) { console.error('Update error:', error); setSaving(false); return }
    } else {
      const { error } = await supabase.from('wellness_logs').insert(payload)
      if (error) { console.error('Insert error:', error); setSaving(false); return }
    }
    await loadLog()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function getTip() {
    setTipLoading(true); setTip('')
    const sex = patient?.sex || 'other'
    const age = patient?.birth_date ? Math.floor((Date.now() - new Date(patient.birth_date + 'T12:00:00')) / (1000*60*60*24*365.25)) : 30
    const weight = patient?.weight_kg || 70
    const fat = patient?.body_fat_pct || null
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
            content: `Soy un paciente de medicina regenerativa. Datos: sexo=${sex === 'female' ? 'femenino' : sex === 'male' ? 'masculino' : 'otro'}, edad=${age} años, peso=${weight}kg${fat ? `, grasa corporal=${fat}%` : ''}. Dame UN consejo práctico y específico sobre actividad física o ejercicio, personalizado para mis características. Sé conciso (máximo 80 palabras), práctico y motivador. En español.`
          }]
        })
      })
      const data = await res.json()
      setTip(data.content?.[0]?.text || '')
    } catch(e) {
      setTip('No se pudo obtener el consejo. Intentá de nuevo.')
    }
    setTipLoading(false)
  }

  function calcSleepHours(start, end) {
    if (!start || !end) return ''
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let startMin = sh * 60 + sm
    let endMin = eh * 60 + em
    if (endMin <= startMin) endMin += 24 * 60 // cruza medianoche
    return ((endMin - startMin) / 60).toFixed(1)
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  const calories = calcCalories()

  return (
    <div>
      {/* Header con fecha y tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          {[
            { key:'sueno', label:'Sueño' },
            { key:'estres', label:'Estrés' },
            { key:'ejercicio', label:'Ejercicio' },
            { key:'tips', label:'Tips IA' },
            { key:'historial', label:'Historial' },
          ].map(t => (
            <button key={t.key} onClick={() => setSection(t.key)}
              style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background: section === t.key ? G : '#f0f0f0', color: section === t.key ? '#fff' : '#666', whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding:'6px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none' }} />
      </div>

      {/* Sueño */}
      {section === 'sueno' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Registro de sueño</div>

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>¿Cómo dormiste?</label>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {SLEEP_MOODS.map(m => (
                <div key={m.value} onClick={() => setForm(p => ({ ...p, sleep_quality: m.value }))}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'10px 14px', borderRadius:10, cursor:'pointer', border: form.sleep_quality === m.value ? `2px solid ${G}` : '2px solid #eee', background: form.sleep_quality === m.value ? '#E1F5EE' : '#f8f8f8', transition:'all 0.15s' }}>
                  <span style={{ fontSize:24 }}>{m.emoji}</span>
                  <span style={{ fontSize:11, color: form.sleep_quality === m.value ? G : '#888', fontWeight: form.sleep_quality === m.value ? 600 : 400 }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ minWidth:0 }}>
                <label style={lbl}>Me dormí</label>
                <input type="time" value={form.sleep_start} onChange={e => { const h = calcSleepHours(e.target.value, form.sleep_end); setForm(p => ({ ...p, sleep_start: e.target.value, sleep_hours: h || p.sleep_hours })) }} style={{ width:'100%', padding:'8px 6px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', minHeight:40 }} />
              </div>
              <div style={{ minWidth:0 }}>
                <label style={lbl}>Me desperté</label>
                <input type="time" value={form.sleep_end} onChange={e => { const h = calcSleepHours(form.sleep_start, e.target.value); setForm(p => ({ ...p, sleep_end: e.target.value, sleep_hours: h || p.sleep_hours })) }} style={{ width:'100%', padding:'8px 6px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', minHeight:40 }} />
              </div>
            </div>
            <div style={{ maxWidth:160 }}>
              <label style={lbl}>Horas dormidas</label>
              <input type="number" min="0" max="24" step="0.5" value={form.sleep_hours} onChange={e => setForm(p => ({ ...p, sleep_hours: e.target.value }))} placeholder="7.5" style={{ ...inp, background:'#f8f8f8', minHeight:40 }} readOnly={!!(form.sleep_start && form.sleep_end)} />
            </div>
          </div>

          {/* Gráfico de cuadritos de sueño */}
          {(form.sleep_hours || log?.sleep_hours) && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>
                Visualización: {form.sleep_hours || log?.sleep_hours}h de sueño
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {Array.from({ length: 18 }).map((_, i) => {
                  const hours = (form.sleep_hours || log?.sleep_hours || 0)
                  const filled = (i + 1) * 0.5 <= hours
                  const halfFilled = !filled && i * 0.5 < hours && (i + 1) * 0.5 > hours
                  return (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: filled ? G : halfFilled ? '#7dbeaa' : '#f0f0f0',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize: 9, color: filled || halfFilled ? '#fff' : '#ccc',
                      fontWeight: 500, transition:'all 0.2s'
                    }}>
                      {(i + 1) % 2 === 0 ? `${(i+1)/2}h` : ''}
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', gap:12, marginTop:6, fontSize:11, color:'#888' }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:3, background:G }} /> Dormido</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:3, background:'#7dbeaa' }} /> Parcial</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:3, background:'#f0f0f0', border:'1px solid #ddd' }} /> No dormido</span>
              </div>
            </div>
          )}

          {saved && (
            <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:G, fontWeight:500 }}>
              ✓ Registro guardado correctamente
            </div>
          )}

          <button onClick={save} disabled={saving}
            style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar registro de sueño'}
          </button>
        </div>
      )}

      {/* Estrés */}
      {section === 'estres' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Nivel de estrés</div>

          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color:'#888' }}>Sin estrés</span>
              <span style={{ fontSize:22, fontWeight:700, color: form.stress_level <= 3 ? G : form.stress_level <= 6 ? '#e67e22' : '#c0392b' }}>{form.stress_level}</span>
              <span style={{ fontSize:13, color:'#888' }}>Máximo estrés</span>
            </div>
            <input type="range" min="1" max="10" value={form.stress_level}
              onChange={e => setForm(p => ({ ...p, stress_level: parseInt(e.target.value) }))}
              onInput={e => setForm(p => ({ ...p, stress_level: parseInt(e.target.value) }))}
              style={{ width:'100%', accentColor: form.stress_level <= 3 ? G : form.stress_level <= 6 ? '#e67e22' : '#c0392b' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#bbb', marginTop:4 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Notas (opcional)</label>
            <textarea value={form.stress_notes} onChange={e => setForm(p => ({ ...p, stress_notes: e.target.value }))}
              placeholder="¿Qué causó el estrés hoy? ¿Cómo te sentiste?"
              style={{ ...inp, height:80, resize:'vertical' }} />
          </div>

          {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:G, fontWeight:500 }}>✓ Registro guardado correctamente</div>}
          <button onClick={save} disabled={saving}
            style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar nivel de estrés'}
          </button>
        </div>
      )}

      {/* Ejercicio */}
      {section === 'ejercicio' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Actividad física</div>

          <div style={{ marginBottom:12 }}>
            <label style={lbl}>Tipo de ejercicio</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {EXERCISE_TYPES.map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, exercise_type: t }))}
                  style={{ padding:'6px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background: form.exercise_type === t ? G : '#f0f0f0', color: form.exercise_type === t ? '#fff' : '#666' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div>
              <label style={lbl}>Duración (minutos)</label>
              <input type="number" min="1" value={form.exercise_duration_min} onChange={e => setForm(p => ({ ...p, exercise_duration_min: e.target.value }))} placeholder="30" style={inp} />
            </div>
            <div>
              <label style={lbl}>Intensidad</label>
              <select value={form.exercise_intensity} onChange={e => setForm(p => ({ ...p, exercise_intensity: e.target.value }))} style={inp}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          {calories > 0 && (
            <div style={{ background:'#E1F5EE', borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'#0F6E56' }}>Calorías estimadas a quemar</span>
              <span style={{ fontSize:18, fontWeight:700, color:G }}>{calories} kcal</span>
            </div>
          )}

          {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:G, fontWeight:500 }}>✓ Registro guardado correctamente</div>}
          <button onClick={save} disabled={saving}
            style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar actividad'}
          </button>
        </div>
      )}

      {/* Tips IA */}
      {section === 'tips' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Consejo personalizado</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>
              Basado en tu perfil, la IA genera recomendaciones de ejercicio adaptadas a ti.
            </div>
            <button onClick={getTip} disabled={tipLoading}
              style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: tipLoading ? 0.7 : 1 }}>
              {tipLoading ? 'Generando consejo...' : tip ? 'Nuevo consejo' : 'Obtener consejo'}
            </button>
          </div>

          {tip && (
            <div style={{ background:'#E1F5EE', border:'1px solid #c8e6da', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#0F6E56', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Tu consejo de hoy</div>
              <div style={{ fontSize:14, color:'#1a1a1a', lineHeight:1.7 }}>{renderMarkdown(tip)}</div>
            </div>
          )}

          {/* Resumen del día */}
          {log && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Resumen del día</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {log.sleep_hours && (
                  <div style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:11, color:'#888' }}>Sueño</div>
                    <div style={{ fontSize:16, fontWeight:700, color:G }}>{log.sleep_hours}h</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{SLEEP_MOODS.find(m => m.value === log.sleep_quality)?.label || '--'}</div>
                  </div>
                )}
                {log.stress_level && (
                  <div style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:11, color:'#888' }}>Estrés</div>
                    <div style={{ fontSize:16, fontWeight:700, color: log.stress_level <= 3 ? G : log.stress_level <= 6 ? '#e67e22' : '#c0392b' }}>{log.stress_level}/10</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{log.stress_level <= 3 ? 'Bajo' : log.stress_level <= 6 ? 'Moderado' : 'Alto'}</div>
                  </div>
                )}
                {log.exercise_type && (
                  <div style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:11, color:'#888' }}>Ejercicio</div>
                    <div style={{ fontSize:14, fontWeight:700, color:G }}>{log.exercise_duration_min} min</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{log.exercise_type}</div>
                  </div>
                )}
                {log.calories_burned && (
                  <div style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:11, color:'#888' }}>Calorías quemadas</div>
                    <div style={{ fontSize:16, fontWeight:700, color:G }}>{log.calories_burned}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>kcal</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Historial heatmap */}
      {section === 'historial' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <label style={{ fontSize:13, color:'#666', fontWeight:500 }}>Mes:</label>
            <input type="month" value={historyMonth}
              onChange={e => { setHistoryMonth(e.target.value); loadWellnessHistory(e.target.value) }}
              style={{ padding:'6px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none' }} />
          </div>

          {wellnessHistory.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>
              No hay registros para este mes.
            </div>
          ) : (
            <>
              {/* Heatmap Sueño */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Sueño por día</div>
                <div style={{ fontSize:11, color:'#888', marginBottom:12, display:'flex', gap:12 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:'#0F6E56' }} /> 7–9h óptimo</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:'#e67e22' }} /> 5–6.5h aceptable</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:'#c0392b' }} /> menos de 5h</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <div style={{ minWidth:400 }}>
                    {/* Header horas */}
                    <div style={{ display:'flex', marginBottom:4, paddingLeft:70 }}>
                      {Array.from({ length:18 }).map((_,i) => (
                        <div key={i} style={{ width:20, textAlign:'center', fontSize:9, color:'#bbb', flexShrink:0 }}>
                          {(i+1) % 2 === 0 ? `${(i+1)/2}h` : ''}
                        </div>
                      ))}
                    </div>
                    {wellnessHistory.filter(d => d.sleep_hours).map((d, idx) => {
                      const hours = d.sleep_hours || 0
                      const color = hours >= 7 && hours <= 9 ? '#0F6E56' : hours >= 5 ? '#e67e22' : '#c0392b'
                      const fecha = new Date(d.log_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'short' })
                      return (
                        <div key={idx} style={{ display:'flex', alignItems:'center', marginBottom:4 }}>
                          <div style={{ width:66, fontSize:11, color:'#666', flexShrink:0, textAlign:'right', paddingRight:4 }}>{fecha}</div>
                          {Array.from({ length:18 }).map((_,i) => {
                            const filled = (i+1) * 0.5 <= hours
                            const half = !filled && i * 0.5 < hours
                            return (
                              <div key={i} style={{ width:20, height:16, borderRadius:3, margin:'0 0.5px', flexShrink:0, background: filled ? color : half ? color + '88' : '#f0f0f0' }} />
                            )
                          })}
                          <div style={{ fontSize:10, color:'#888', marginLeft:6 }}>{hours}h</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Heatmap Estrés */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Estrés por día</div>
                <div style={{ fontSize:11, color:'#888', marginBottom:12, display:'flex', gap:12 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:'#0F6E56' }} /> 1–3 bajo</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:'#e67e22' }} /> 4–6 moderado</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:'#c0392b' }} /> 7–10 alto</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <div style={{ minWidth:300 }}>
                    {/* Header niveles */}
                    <div style={{ display:'flex', marginBottom:4, paddingLeft:70 }}>
                      {Array.from({ length:10 }).map((_,i) => (
                        <div key={i} style={{ width:24, textAlign:'center', fontSize:10, color:'#bbb', flexShrink:0 }}>{i+1}</div>
                      ))}
                    </div>
                    {wellnessHistory.filter(d => d.stress_level).map((d, idx) => {
                      const level = d.stress_level || 0
                      const color = level <= 3 ? '#0F6E56' : level <= 6 ? '#e67e22' : '#c0392b'
                      const fecha = new Date(d.log_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'short' })
                      return (
                        <div key={idx} style={{ display:'flex', alignItems:'center', marginBottom:4 }}>
                          <div style={{ width:66, fontSize:11, color:'#666', flexShrink:0, textAlign:'right', paddingRight:4 }}>{fecha}</div>
                          {Array.from({ length:10 }).map((_,i) => (
                            <div key={i} style={{ width:24, height:16, borderRadius:3, margin:'0 0.5px', flexShrink:0, background: i < level ? color : '#f0f0f0' }} />
                          ))}
                          <div style={{ fontSize:10, color:'#888', marginLeft:6 }}>{level}/10</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}
