import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const G = '#0F6E56'

const MEALS = [
  { key:'desayuno', label:'Desayuno' },
  { key:'merienda_am', label:'Merienda AM' },
  { key:'almuerzo', label:'Almuerzo' },
  { key:'merienda_pm', label:'Merienda PM' },
  { key:'cena', label:'Cena' },
  { key:'snack', label:'Snack' },
]

const ANTH_URL = 'https://mdcqdigxbmfajlmaxrta.supabase.co/functions/v1/claude-proxy'

export default function NutritionModule({ patient, profile }) {
  const [logs, setLogs] = useState([])
  const [goals, setGoals] = useState(null)
  const [tab, setTab] = useState('diario')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeMeal, setActiveMeal] = useState('desayuno')
  const [foodSearch, setFoodSearch] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiAdvice, setAiAdvice] = useState('')
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({
    food_name:'', quantity:'1', unit:'porción',
    calories:'', protein_g:'', carbs_g:'', fat_g:'',
    fiber_g:'', sodium_mg:'', sugar_g:'',
    saturated_fat_g:'', cholesterol_mg:'',
    potassium_mg:'', calcium_mg:'', iron_mg:''
  })

  useEffect(() => { if (patient?.id) { loadLogs(); loadGoals(); loadHistory() } }, [patient, date])

  async function loadHistory() {
    const { data } = await supabase.from('nutrition_logs')
      .select('log_date, calories, protein_g, carbs_g, fat_g')
      .eq('patient_id', patient.id)
      .order('log_date', { ascending: true })
    if (!data) return
    // Agrupar por fecha
    const byDate = {}
    data.forEach(l => {
      if (!byDate[l.log_date]) byDate[l.log_date] = { fecha: l.log_date, calorias: 0, proteina: 0, carbos: 0, grasa: 0, count: 0 }
      byDate[l.log_date].calorias += l.calories || 0
      byDate[l.log_date].proteina += l.protein_g || 0
      byDate[l.log_date].carbos += l.carbs_g || 0
      byDate[l.log_date].grasa += l.fat_g || 0
      byDate[l.log_date].count++
    })
    setHistory(Object.values(byDate).map(d => ({
      ...d,
      calorias: Math.round(d.calorias),
      proteina: Math.round(d.proteina),
      carbos: Math.round(d.carbos),
      grasa: Math.round(d.grasa),
      fechaLabel: new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'short' })
    })))
  }

  async function loadLogs() {
    const { data } = await supabase.from('nutrition_logs')
      .select('*').eq('patient_id', patient.id).eq('log_date', date)
      .order('created_at')
    setLogs(data || [])
  }

  async function loadGoals() {
    const { data } = await supabase.from('nutrition_goals')
      .select('*').eq('patient_id', patient.id).single()
    if (data) {
      setGoals(data)
    } else {
      // Calcular metas automáticas con Harris-Benedict
      const age = patient.birth_date ? Math.floor((Date.now() - new Date(patient.birth_date + 'T12:00:00')) / (1000*60*60*24*365.25)) : 30
      const weight = 70 // default si no hay peso
      const height = patient.height_cm || 170
      const sex = patient.sex || 'male'
      let bmr = sex === 'female'
        ? 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age)
        : 88.36 + (13.4 * weight) + (4.8 * height) - (5.7 * age)
      const tdee = Math.round(bmr * 1.375) // actividad moderada
      const defaultGoals = {
        patient_id: patient.id,
        calories_goal: tdee,
        protein_goal_g: Math.round(weight * 1.6),
        carbs_goal_g: Math.round(tdee * 0.45 / 4),
        fat_goal_g: Math.round(tdee * 0.30 / 9),
        fiber_goal_g: sex === 'female' ? 25 : 38,
        sodium_goal_mg: 2300,
        sugar_goal_g: 50,
        saturated_fat_goal_g: Math.round(tdee * 0.07 / 9),
        cholesterol_goal_mg: 300,
        potassium_goal_mg: 4700,
        calcium_goal_mg: sex === 'female' ? 1200 : 1000,
        iron_goal_mg: sex === 'female' ? 18 : 8,
      }
      await supabase.from('nutrition_goals').insert(defaultGoals)
      setGoals(defaultGoals)
    }
  }

  async function analyzeWithAI() {
    if (!foodSearch.trim()) return
    setAiLoading(true); setAiResult(null)
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
            content: `Analiza el valor nutricional de: "${foodSearch}". Responde SOLO con un objeto JSON sin markdown con estos campos exactos: food_name (string), quantity (number), unit (string), calories (number), protein_g (number), carbs_g (number), fat_g (number), fiber_g (number), sodium_mg (number), sugar_g (number), saturated_fat_g (number), cholesterol_mg (number), potassium_mg (number), calcium_mg (number), iron_mg (number). Usa valores por porción estándar típica.`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setAiResult(parsed)
      setForm(p => ({ ...p, ...Object.fromEntries(Object.entries(parsed).map(([k,v]) => [k, String(v)])) }))
    } catch(e) {
      console.error('Error API:', e)
      alert('Error: ' + e.message)
    }
    setAiLoading(false)
  }

  async function addFood() {
    if (!form.food_name) return
    await supabase.from('nutrition_logs').insert({
      patient_id: patient.id,
      log_date: date,
      meal_type: activeMeal,
      food_name: form.food_name,
      quantity: parseFloat(form.quantity) || 1,
      unit: form.unit || 'porción',
      calories: parseFloat(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      fiber_g: parseFloat(form.fiber_g) || 0,
      sodium_mg: parseFloat(form.sodium_mg) || 0,
      sugar_g: parseFloat(form.sugar_g) || 0,
      saturated_fat_g: parseFloat(form.saturated_fat_g) || 0,
      cholesterol_mg: parseFloat(form.cholesterol_mg) || 0,
      potassium_mg: parseFloat(form.potassium_mg) || 0,
      calcium_mg: parseFloat(form.calcium_mg) || 0,
      iron_mg: parseFloat(form.iron_mg) || 0,
    })
    setForm({ food_name:'', quantity:'1', unit:'porción', calories:'', protein_g:'', carbs_g:'', fat_g:'', fiber_g:'', sodium_mg:'', sugar_g:'', saturated_fat_g:'', cholesterol_mg:'', potassium_mg:'', calcium_mg:'', iron_mg:'' })
    setFoodSearch(''); setAiResult(null); setShowAddForm(false)
    await loadLogs()
  }

  async function deleteLog(id) {
    await supabase.from('nutrition_logs').delete().eq('id', id)
    await loadLogs()
  }

  async function getAiAdvice() {
    if (!goals) return
    setAdviceLoading(true); setAiAdvice('')
    const totals = calcTotals()
    try {
      const { data: { session: session2 } } = await supabase.auth.getSession()
      const res = await fetch(ANTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session2?.access_token}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Soy un paciente. Hoy comí lo siguiente (totales del día): ${totals.calories} kcal, ${totals.protein_g}g proteína, ${totals.carbs_g}g carbohidratos, ${totals.fat_g}g grasa, ${totals.fiber_g}g fibra, ${totals.sodium_mg}mg sodio. Mis metas son: ${goals.calories_goal} kcal, ${goals.protein_goal_g}g proteína, ${goals.carbs_goal_g}g carbohidratos, ${goals.fat_goal_g}g grasa, ${goals.fiber_goal_g}g fibra, ${goals.sodium_goal_mg}mg sodio. Dame un análisis nutricional breve y 2-3 consejos prácticos para el resto del día en español. Sé conciso y amigable. Máximo 150 palabras.`
          }]
        })
      })
      const data = await res.json()
      setAiAdvice(data.content?.[0]?.text || '')
    } catch(e) {
      setAiAdvice('No se pudo obtener el consejo. Intentá de nuevo.')
    }
    setAdviceLoading(false)
  }

  function calcTotals() {
    return logs.reduce((acc, l) => ({
      calories: acc.calories + (l.calories || 0),
      protein_g: acc.protein_g + (l.protein_g || 0),
      carbs_g: acc.carbs_g + (l.carbs_g || 0),
      fat_g: acc.fat_g + (l.fat_g || 0),
      fiber_g: acc.fiber_g + (l.fiber_g || 0),
      sodium_mg: acc.sodium_mg + (l.sodium_mg || 0),
      sugar_g: acc.sugar_g + (l.sugar_g || 0),
      cholesterol_mg: acc.cholesterol_mg + (l.cholesterol_mg || 0),
      potassium_mg: acc.potassium_mg + (l.potassium_mg || 0),
      calcium_mg: acc.calcium_mg + (l.calcium_mg || 0),
      iron_mg: acc.iron_mg + (l.iron_mg || 0),
    }), { calories:0, protein_g:0, carbs_g:0, fat_g:0, fiber_g:0, sodium_mg:0, sugar_g:0, cholesterol_mg:0, potassium_mg:0, calcium_mg:0, iron_mg:0 })
  }

  function pct(val, goal) { return goal ? Math.min(100, Math.round(val / goal * 100)) : 0 }

  const totals = calcTotals()
  const inp = { width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:500, color:'#666', display:'block', marginBottom:3 }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[{ key:'diario', label:'Diario' }, { key:'ia', label:'Consejo IA' }, { key:'historial', label:'Historial' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? G : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ marginLeft:'auto', padding:'6px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none' }} />
      </div>

      {tab === 'diario' && (
        <div>
          {/* Resumen calórico */}
          {goals && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:24, fontWeight:700, color:G }}>{Math.round(totals.calories)}</div>
                  <div style={{ fontSize:11, color:'#888' }}>de {goals.calories_goal} kcal</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, color: totals.calories > goals.calories_goal ? '#c0392b' : '#0F6E56', fontWeight:500 }}>
                    {totals.calories > goals.calories_goal ? `+${Math.round(totals.calories - goals.calories_goal)} exceso` : `${Math.round(goals.calories_goal - totals.calories)} restantes`}
                  </div>
                </div>
              </div>
              <div style={{ background:'#f5f5f5', borderRadius:8, height:8, marginBottom:14, overflow:'hidden' }}>
                <div style={{ height:'100%', width: pct(totals.calories, goals.calories_goal) + '%', background: totals.calories > goals.calories_goal ? '#c0392b' : G, borderRadius:8, transition:'width 0.3s' }} />
              </div>
              {/* Macros */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { label:'Proteína', val: totals.protein_g, goal: goals.protein_goal_g, unit:'g', color:'#2a8a70' },
                  { label:'Carbos', val: totals.carbs_g, goal: goals.carbs_goal_g, unit:'g', color:'#3a9a80' },
                  { label:'Grasa', val: totals.fat_g, goal: goals.fat_goal_g, unit:'g', color:'#4aaa90' },
                ].map(m => (
                  <div key={m.label} style={{ background:'#f8f8f8', borderRadius:10, padding:'8px 10px' }}>
                    <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>{m.label}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:m.color }}>{Math.round(m.val)}g</div>
                    <div style={{ fontSize:10, color:'#bbb' }}>meta: {m.goal}g</div>
                    <div style={{ background:'#e0e0e0', borderRadius:4, height:4, marginTop:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width: pct(m.val, m.goal) + '%', background:m.color, borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agregar alimento */}
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>Registrar alimento</div>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
              {MEALS.map(m => (
                <button key={m.key} onClick={() => setActiveMeal(m.key)}
                  style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background: activeMeal === m.key ? G : '#f0f0f0', color: activeMeal === m.key ? '#fff' : '#666' }}>
                  {m.label}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') analyzeWithAI() }}
                placeholder="Ej: 1 taza de arroz blanco cocido..."
                style={{ ...inp, flex:1 }} />
              <button onClick={analyzeWithAI} disabled={aiLoading}
                style={{ padding:'7px 14px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, whiteSpace:'nowrap', opacity: aiLoading ? 0.7 : 1 }}>
                {aiLoading ? 'Analizando...' : 'Analizar con IA'}
              </button>
            </div>

            {aiResult && (
              <div style={{ background:'#E1F5EE', borderRadius:10, padding:'10px 14px', marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#0F6E56', marginBottom:6 }}>{aiResult.food_name} — {aiResult.calories} kcal</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:4, fontSize:12, color:'#555' }}>
                  <span>Proteína: {aiResult.protein_g}g</span>
                  <span>Carbos: {aiResult.carbs_g}g</span>
                  <span>Grasa: {aiResult.fat_g}g</span>
                  <span>Fibra: {aiResult.fiber_g}g</span>
                  <span>Sodio: {aiResult.sodium_mg}mg</span>
                  <span>Azúcar: {aiResult.sugar_g}g</span>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    style={{ width:70, padding:'5px 8px', fontSize:13, border:'1px solid #c8e6da', borderRadius:6, outline:'none' }} />
                  <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    style={{ width:90, padding:'5px 8px', fontSize:13, border:'1px solid #c8e6da', borderRadius:6, outline:'none' }} />
                  <button onClick={addFood}
                    style={{ flex:1, padding:'6px 12px', background:'#0F6E56', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                    Agregar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lista por comida */}
          {MEALS.map(meal => {
            const mealLogs = logs.filter(l => l.meal_type === meal.key)
            if (mealLogs.length === 0) return null
            const mealCals = mealLogs.reduce((a,l) => a + (l.calories||0), 0)
            return (
              <div key={meal.key} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px 16px', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>{meal.label}</div>
                  <div style={{ fontSize:12, color:'#888' }}>{Math.round(mealCals)} kcal</div>
                </div>
                {mealLogs.map(l => (
                  <div key={l.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderTop:'0.5px solid #f5f5f5' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:'#1a1a1a' }}>{l.food_name}</div>
                      <div style={{ fontSize:11, color:'#aaa' }}>{l.quantity} {l.unit} · P:{Math.round(l.protein_g)}g C:{Math.round(l.carbs_g)}g G:{Math.round(l.fat_g)}g</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#666' }}>{Math.round(l.calories)} kcal</div>
                    <button onClick={() => deleteLog(l.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#D85A30', fontSize:14, padding:'0 4px' }}>×</button>
                  </div>
                ))}
              </div>
            )
          })}

          {logs.length === 0 && (
            <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>
              No hay alimentos registrados hoy. Usá el buscador con IA para agregar.
            </div>
          )}
        </div>
      )}

      {tab === 'ia' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:500, marginBottom:8 }}>Análisis nutricional del día</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>
              Basado en lo que registraste hoy, la IA analiza tu ingesta y te da consejos personalizados.
            </div>
            <button onClick={getAiAdvice} disabled={adviceLoading || logs.length === 0}
              style={{ width:'100%', padding:'10px', background: logs.length === 0 ? '#f0f0f0' : G, color: logs.length === 0 ? '#bbb' : '#fff', border:'none', borderRadius:10, cursor: logs.length === 0 ? 'default' : 'pointer', fontSize:13, fontWeight:500 }}>
              {adviceLoading ? 'Analizando...' : logs.length === 0 ? 'Registrá alimentos primero' : 'Obtener consejo personalizado'}
            </button>
          </div>

          {aiAdvice && (
            <div style={{ background:'#E1F5EE', border:'1px solid #c8e6da', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#0F6E56', marginBottom:8 }}>Análisis de hoy</div>
              <div style={{ fontSize:13, color:'#1a1a1a', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{aiAdvice}</div>
            </div>
          )}

          {/* Resumen micronutrientes */}
          {goals && logs.length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Micronutrientes del día</div>
              {[
                { label:'Fibra', val: totals.fiber_g, goal: goals.fiber_goal_g, unit:'g' },
                { label:'Sodio', val: totals.sodium_mg, goal: goals.sodium_goal_mg, unit:'mg' },
                { label:'Azúcar', val: totals.sugar_g, goal: goals.sugar_goal_g, unit:'g' },
                { label:'Colesterol', val: totals.cholesterol_mg, goal: goals.cholesterol_goal_mg, unit:'mg' },
                { label:'Potasio', val: totals.potassium_mg, goal: goals.potassium_goal_mg, unit:'mg' },
                { label:'Calcio', val: totals.calcium_mg, goal: goals.calcium_goal_mg, unit:'mg' },
                { label:'Hierro', val: totals.iron_mg, goal: goals.iron_goal_mg, unit:'mg' },
              ].map(m => (
                <div key={m.label} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                    <span style={{ color:'#555', fontWeight:500 }}>{m.label}</span>
                    <span style={{ color:'#888' }}>{Math.round(m.val)} / {m.goal} {m.unit}</span>
                  </div>
                  <div style={{ background:'#f5f5f5', borderRadius:6, height:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', width: pct(m.val, m.goal) + '%', background: pct(m.val, m.goal) > 100 ? '#c0392b' : G, borderRadius:6, transition:'width 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'historial' && (
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>
              Aún no hay registros históricos. Empezá registrando lo que comés cada día.
            </div>
          ) : (
            <>
              {/* Gráfico calorías */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Calorías por día</div>
                <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>Consumido vs meta ({goals?.calories_goal || '--'} kcal)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={history} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fechaLabel" tick={{ fontSize:10, fill:'#999' }} />
                    <YAxis tick={{ fontSize:10, fill:'#999' }} />
                    <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v => v + ' kcal'} />
                    {goals?.calories_goal && <ReferenceLine y={goals.calories_goal} stroke="#c0392b" strokeDasharray="4 2" label={{ value:'Meta', fontSize:10, fill:'#c0392b' }} />}
                    <Line type="monotone" dataKey="calorias" stroke={G} strokeWidth={2} dot={{ r:3, fill:G }} name="Consumido" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico macros */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Macros por día (g)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={history} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fechaLabel" tick={{ fontSize:10, fill:'#999' }} />
                    <YAxis tick={{ fontSize:10, fill:'#999' }} />
                    <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v => v + 'g'} />
                    <Line type="monotone" dataKey="proteina" stroke="#2a8a70" strokeWidth={2} dot={{ r:2 }} name="Proteína" />
                    <Line type="monotone" dataKey="carbos" stroke="#3a9a80" strokeWidth={2} dot={{ r:2 }} name="Carbos" />
                    <Line type="monotone" dataKey="grasa" stroke="#4aaa90" strokeWidth={2} dot={{ r:2 }} name="Grasa" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla resumen */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Resumen por día</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:4, padding:'6px 0', borderBottom:'0.5px solid #eee', fontSize:11, fontWeight:600, color:'#888' }}>
                  <span>Fecha</span><span style={{ textAlign:'right' }}>Kcal</span><span style={{ textAlign:'right' }}>P(g)</span><span style={{ textAlign:'right' }}>C(g)</span><span style={{ textAlign:'right' }}>G(g)</span>
                </div>
                {[...history].reverse().map((d,i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:4, padding:'6px 0', borderBottom:'0.5px solid #f5f5f5', fontSize:12 }}>
                    <span style={{ color:'#555' }}>{d.fechaLabel}</span>
                    <span style={{ textAlign:'right', fontWeight:500, color: goals?.calories_goal && d.calorias > goals.calories_goal ? '#c0392b' : G }}>{d.calorias}</span>
                    <span style={{ textAlign:'right', color:'#666' }}>{d.proteina}</span>
                    <span style={{ textAlign:'right', color:'#666' }}>{d.carbos}</span>
                    <span style={{ textAlign:'right', color:'#666' }}>{d.grasa}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}
