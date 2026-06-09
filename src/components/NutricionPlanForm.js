import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Sun, Apple, UtensilsCrossed, Coffee, Moon, Zap,
  Plus, Printer, Trash2, ChevronDown, ChevronUp, X
} from 'lucide-react'

const COLOR = '#2e7d32'
const COLOR_L = '#e8f5e9'

const MEAL_TIMES = [
  { key: 'desayuno',     label: 'Desayuno',      Icon: Sun,            color: '#f59e0b' },
  { key: 'media_manana', label: 'Media mañana',  Icon: Apple,          color: '#10b981' },
  { key: 'almuerzo',     label: 'Almuerzo',       Icon: UtensilsCrossed,color: '#3b82f6' },
  { key: 'merienda',     label: 'Merienda',       Icon: Coffee,         color: '#8b5cf6' },
  { key: 'cena',         label: 'Cena',           Icon: Moon,           color: '#6366f1' },
  { key: 'post_entreno', label: 'Post entreno',   Icon: Zap,            color: '#ef4444' },
]

const DAYS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DAY_LABELS = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo' }
const UNITS = ['g','ml','taza','cdta','cdas','unidad','porción','rebanada','filete','puño']

function FoodRow({ food, onUpdate, onDelete, canEdit }) {
  const inp = { fontSize:12, border:'1px solid #e0e0e0', borderRadius:6, padding:'5px 7px', fontFamily:'inherit', outline:'none', background:'#fff' }
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:5 }}>
      <input style={{ ...inp, flex:2 }} value={food.name} placeholder="Alimento..."
        onChange={e => onUpdate({ ...food, name: e.target.value })} disabled={!canEdit} />
      <input style={{ ...inp, width:60 }} type="number" value={food.amount} placeholder="Cant."
        onChange={e => onUpdate({ ...food, amount: e.target.value })} disabled={!canEdit} />
      <select style={{ ...inp, width:80 }} value={food.unit}
        onChange={e => onUpdate({ ...food, unit: e.target.value })} disabled={!canEdit}>
        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <input style={{ ...inp, width:65 }} type="number" value={food.kcal} placeholder="kcal"
        onChange={e => onUpdate({ ...food, kcal: e.target.value })} disabled={!canEdit} />
      {canEdit && (
        <button onClick={onDelete} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', lineHeight:1, display:'flex', alignItems:'center' }}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function MealBlock({ mealTime, foods, mealNotes, onFoodsChange, onNotesChange, canEdit }) {
  const mt = MEAL_TIMES.find(m => m.key === mealTime) || MEAL_TIMES[0]
  const { Icon } = mt
  const totalKcal = foods.reduce((s, f) => s + (parseFloat(f.kcal) || 0), 0)

  function addFood() {
    onFoodsChange([...foods, { id: Date.now().toString(), name:'', amount:'', unit:'g', kcal:'' }])
  }
  function updateFood(id, updated) { onFoodsChange(foods.map(f => f.id === id ? updated : f)) }
  function deleteFood(id) { onFoodsChange(foods.filter(f => f.id !== id)) }

  return (
    <div style={{ background:'#fff', border:`1.5px solid ${mt.color}33`, borderRadius:12, overflow:'hidden', marginBottom:10 }}>
      <div style={{ background:`${mt.color}12`, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Icon size={16} color={mt.color} />
          <span style={{ fontWeight:700, fontSize:13, color: mt.color }}>{mt.label}</span>
        </div>
        {totalKcal > 0 && (
          <span style={{ fontSize:11, fontWeight:600, color: mt.color, background:`${mt.color}18`, padding:'2px 8px', borderRadius:20 }}>
            {Math.round(totalKcal)} kcal
          </span>
        )}
      </div>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', gap:6, marginBottom:4 }}>
          <span style={{ fontSize:11, fontWeight:600, color:'#aaa', flex:2 }}>Alimento</span>
          <span style={{ fontSize:11, fontWeight:600, color:'#aaa', width:60 }}>Cant.</span>
          <span style={{ fontSize:11, fontWeight:600, color:'#aaa', width:80 }}>Unidad</span>
          <span style={{ fontSize:11, fontWeight:600, color:'#aaa', width:65 }}>kcal</span>
          {canEdit && <span style={{ width:20 }} />}
        </div>
        {foods.map(food => (
          <FoodRow key={food.id} food={food} canEdit={canEdit}
            onUpdate={updated => updateFood(food.id, updated)}
            onDelete={() => deleteFood(food.id)} />
        ))}
        {canEdit && (
          <button onClick={addFood}
            style={{ fontSize:12, color: mt.color, background:'none', border:`1px dashed ${mt.color}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
            <Plus size={12} /> Agregar alimento
          </button>
        )}
        {canEdit && (
          <input type="text" value={mealNotes} onChange={e => onNotesChange(e.target.value)}
            placeholder="Notas de este tiempo de comida (opcional)..."
            style={{ marginTop:8, width:'100%', fontSize:12, border:'none', borderTop:'1px solid #f0f0f0', padding:'6px 0', outline:'none', fontFamily:'inherit', color:'#666', boxSizing:'border-box' }} />
        )}
        {!canEdit && mealNotes && (
          <div style={{ marginTop:6, fontSize:12, color:'#888', fontStyle:'italic' }}>{mealNotes}</div>
        )}
      </div>
    </div>
  )
}

function buildEmptyMeals(mode, selectedMeals) {
  if (mode === 'general') {
    return { general: Object.fromEntries(selectedMeals.map(m => [m, { foods:[], notes:'' }])) }
  }
  return Object.fromEntries(DAYS.map(d => [d, Object.fromEntries(selectedMeals.map(m => [m, { foods:[], notes:'' }]))]))
}

export default function NutricionPlanForm({ patientId, profile, patient }) {
  const [plans, setPlans] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedPlan, setExpandedPlan] = useState(null)
  const [mode, setMode] = useState('general')
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  const [selectedMeals, setSelectedMeals] = useState(['desayuno','almuerzo','cena'])
  const [selectedDays, setSelectedDays] = useState(DAYS)
  const [meals, setMeals] = useState({})

  useEffect(() => { if (patientId) load() }, [patientId])

  async function load() {
    const { data } = await supabase.from('nutrition_plans')
      .select('*, meals:nutrition_plan_meals(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setLoaded(true)
  }

  function initMeals() { setMeals(buildEmptyMeals(mode, selectedMeals)) }
  useEffect(() => { initMeals() }, [mode, selectedMeals, selectedDays])

  function toggleMeal(key) {
    setSelectedMeals(p => p.includes(key) ? p.filter(m => m !== key) : [...p, key])
  }
  function toggleDay(day) {
    setSelectedDays(p => p.includes(day) ? p.filter(d => d !== day) : [...p, day])
  }
  function updateMealFoods(day, mealKey, foods) {
    if (mode === 'general') setMeals(p => ({ ...p, general: { ...p.general, [mealKey]: { ...p.general?.[mealKey], foods } } }))
    else setMeals(p => ({ ...p, [day]: { ...p[day], [mealKey]: { ...p[day]?.[mealKey], foods } } }))
  }
  function updateMealNotes(day, mealKey, notes) {
    if (mode === 'general') setMeals(p => ({ ...p, general: { ...p.general, [mealKey]: { ...p.general?.[mealKey], notes } } }))
    else setMeals(p => ({ ...p, [day]: { ...p[day], [mealKey]: { ...p[day]?.[mealKey], notes } } }))
  }
  function getMealData(day, mealKey) {
    if (mode === 'general') return meals.general?.[mealKey] || { foods:[], notes:'' }
    return meals[day]?.[mealKey] || { foods:[], notes:'' }
  }

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const { data: plan } = await supabase.from('nutrition_plans').insert({
      patient_id: patientId, clinic_id: profile?.clinic_id,
      title: title.trim(), mode,
      start_date: startDate || null, end_date: endDate || null,
      notes: planNotes || null, created_by: profile?.id,
    }).select().single()

    if (plan) {
      const rows = []
      if (mode === 'general') {
        selectedMeals.forEach(mt => {
          const d = meals.general?.[mt]
          rows.push({ plan_id:plan.id, day:null, meal_time:mt, foods:d?.foods||[], notes:d?.notes||null })
        })
      } else {
        selectedDays.forEach(day => {
          selectedMeals.forEach(mt => {
            const d = meals[day]?.[mt]
            rows.push({ plan_id:plan.id, day, meal_time:mt, foods:d?.foods||[], notes:d?.notes||null })
          })
        })
      }
      if (rows.length) await supabase.from('nutrition_plan_meals').insert(rows)
    }

    setShowForm(false); setTitle(''); setMode('general'); setPlanNotes(''); setEndDate('')
    setSelectedMeals(['desayuno','almuerzo','cena']); setSelectedDays(DAYS)
    await load(); setSaving(false)
  }

  async function deletePlan(id) {
    if (!window.confirm('¿Eliminar este plan nutricional?')) return
    await supabase.from('nutrition_plans').delete().eq('id', id)
    await load()
  }

  function printPlan(plan) {
    const clinicName = profile?.clinic_name || 'MedTrack'
    const patientName = `${patient?.profile?.first_name||''} ${patient?.profile?.last_name||''}`.trim()
    const professionalName = `${profile?.prefix?profile.prefix+' ':''}${profile?.first_name||''} ${profile?.last_name||''}`.trim()

    const MEAL_COLORS = { desayuno:'#f59e0b', media_manana:'#10b981', almuerzo:'#3b82f6', merienda:'#8b5cf6', cena:'#6366f1', post_entreno:'#ef4444' }
    const MEAL_LABELS = { desayuno:'Desayuno', media_manana:'Media mañana', almuerzo:'Almuerzo', merienda:'Merienda', cena:'Cena', post_entreno:'Post entreno' }
    // SVG icons for PDF (inline, no external dependency)
    const MEAL_SVG = {
      desayuno:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
      media_manana:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>`,
      almuerzo:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
      merienda:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
      cena:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
      post_entreno:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    }

    function renderMealBlock(mealTime, foods, notes) {
      if (!foods || foods.length === 0) return ''
      const color = MEAL_COLORS[mealTime]
      const label = MEAL_LABELS[mealTime]
      const svg = MEAL_SVG[mealTime] || ''
      const totalKcal = foods.reduce((s,f) => s+(parseFloat(f.kcal)||0),0)
      return `
        <div style="break-inside:avoid;margin-bottom:14px;border-radius:12px;overflow:hidden;border:1.5px solid ${color}33;">
          <div style="background:${color}15;padding:9px 14px;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;color:${color};">
              ${svg}
              <span style="font-weight:700;font-size:12pt;">${label}</span>
            </div>
            ${totalKcal>0?`<span style="font-size:10pt;font-weight:700;color:${color};background:${color}22;padding:2px 10px;border-radius:20px;">${Math.round(totalKcal)} kcal</span>`:''}
          </div>
          <div style="padding:10px 14px;">
            ${foods.map(f=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f5f5f5;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;"></div>
                  <span style="font-size:11pt;color:#1a1a1a;">${f.name}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:10pt;color:#555;background:#f5f5f5;padding:2px 8px;border-radius:6px;">${f.amount} ${f.unit}</span>
                  ${f.kcal?`<span style="font-size:10pt;color:#888;">${f.kcal} kcal</span>`:''}
                </div>
              </div>`).join('')}
            ${notes?`<div style="font-size:10pt;color:#888;font-style:italic;margin-top:6px;padding-top:6px;border-top:1px dashed #eee;">${notes}</div>`:''}
          </div>
        </div>`
    }

    let bodyContent = ''
    if (plan.mode === 'general') {
      bodyContent = MEAL_TIMES.filter(mt => (plan.meals||[]).some(m => m.meal_time===mt.key)).map(mt => {
        const m = (plan.meals||[]).find(x => x.meal_time===mt.key)
        return renderMealBlock(mt.key, m?.foods||[], m?.notes||'')
      }).join('')
    } else {
      bodyContent = DAYS.filter(d => (plan.meals||[]).some(m => m.day===d)).map(day => {
        const dayMeals = (plan.meals||[]).filter(m => m.day===day)
        const blocks = MEAL_TIMES.filter(mt => dayMeals.some(m => m.meal_time===mt.key)).map(mt => {
          const m = dayMeals.find(x => x.meal_time===mt.key)
          return renderMealBlock(mt.key, m?.foods||[], m?.notes||'')
        }).join('')
        if (!blocks) return ''
        return `<div style="margin-bottom:20px;"><div style="font-size:13pt;font-weight:700;color:#2e7d32;margin-bottom:10px;padding:6px 12px;background:#e8f5e9;border-radius:8px;display:inline-block;">${DAY_LABELS[day]}</div>${blocks}</div>`
      }).join('')
    }

    const totalKcal = (plan.meals||[]).reduce((s,m) => s+(m.foods||[]).reduce((ss,f) => ss+(parseFloat(f.kcal)||0),0),0)
    const periodText = plan.start_date
      ? `${new Date(plan.start_date+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'long'})}${plan.end_date?' — '+new Date(plan.end_date+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'}):''}`
      : ''

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Plan Nutricional — ${patientName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',sans-serif;color:#1a1a1a;background:#fff;}
      .page{max-width:780px;margin:0 auto;}
      .header{background:linear-gradient(135deg,#1b5e20,#2e7d32,#43a047);padding:28px 36px 22px;color:#fff;}
      .clinic{font-size:11pt;opacity:0.8;margin-bottom:4px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;}
      .plan-title{font-size:22pt;font-weight:800;margin-bottom:10px;letter-spacing:-0.02em;}
      .patient-row{display:flex;align-items:center;gap:12px;}
      .avatar{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:15pt;font-weight:700;flex-shrink:0;}
      .patient-name{font-size:13pt;font-weight:700;}
      .patient-period{font-size:10pt;opacity:0.8;margin-top:2px;}
      .meta-bar{background:#f1f8e9;padding:10px 36px;display:flex;gap:24px;flex-wrap:wrap;border-bottom:2px solid #c8e6c9;}
      .meta-item{display:flex;align-items:center;gap:6px;font-size:11pt;color:#2e7d32;font-weight:500;}
      .body{padding:22px 36px 28px;}
      .total-box{background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:1.5px solid #a5d6a7;border-radius:12px;padding:14px 20px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;}
      .notes-box{background:#fffde7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:16px;font-size:11pt;color:#555;}
      .footer{background:#f9f9f9;border-top:1px solid #eee;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;}
      .footer-text{font-size:9pt;color:#aaa;}
      .sig-line{border-top:1px solid #2e7d32;width:180px;margin:28px 0 4px auto;}
      .sig-name{font-size:10pt;font-weight:700;color:#2e7d32;text-align:right;}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    </style></head><body>
    <div class="page">
      <div class="header">
        <div class="clinic">${clinicName}</div>
        <div class="plan-title">${plan.title}</div>
        <div class="patient-row">
          <div class="avatar">${(patientName[0]||'P').toUpperCase()}</div>
          <div>
            <div class="patient-name">${patientName}</div>
            <div class="patient-period">${periodText}</div>
          </div>
        </div>
      </div>
      <div class="meta-bar">
        <div class="meta-item"><span style="font-size:9pt;">MODO</span> &nbsp; ${plan.mode==='general'?'Plan general':'Plan por día'}</div>
        ${totalKcal>0?`<div class="meta-item"><span style="font-size:9pt;">CALORIAS</span> &nbsp; ${Math.round(totalKcal)} kcal totales</div>`:''}
        <div class="meta-item"><span style="font-size:9pt;">PROFESIONAL</span> &nbsp; ${professionalName}</div>
      </div>
      <div class="body">
        ${totalKcal>0?`<div class="total-box"><div style="font-size:11pt;color:#388e3c;font-weight:600;">Total de calorías del plan</div><div style="font-size:22pt;font-weight:800;color:#1b5e20;">${Math.round(totalKcal)} kcal</div></div>`:''}
        ${plan.notes?`<div class="notes-box">${plan.notes}</div>`:''}
        ${bodyContent}
        <div class="sig-line"></div>
        <div class="sig-name">${professionalName}</div>
        <div style="font-size:9pt;color:#aaa;text-align:right;margin-top:2px;">Firma y sello</div>
      </div>
      <div class="footer">
        <div class="footer-text">Plan generado por MedTrack · ${new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
        <div class="footer-text">${clinicName}</div>
      </div>
    </div></body></html>`

    const w = window.open('','_blank')
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(()=>{ w.print(); w.close() }, 600)
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }

  return (
    <div>
      {!showForm && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
          <button onClick={() => { setShowForm(true); initMeals() }}
            style={{ padding:'7px 16px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={14} /> Nuevo plan
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:14, padding:18, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#1a3a5c' }}>Nuevo plan nutricional</div>
            <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#aaa', display:'flex' }}><X size={18} /></button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Título del plan</label>
              <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Plan hipocalórico semana 1..." />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Modo</label>
              <div style={{ display:'flex', gap:8 }}>
                {[{key:'general',label:'Plan general (toda la semana igual)'},{key:'daily',label:'Plan por día (varía cada día)'}].map(m => (
                  <div key={m.key} onClick={() => setMode(m.key)}
                    style={{ flex:1, padding:'10px 14px', borderRadius:10, cursor:'pointer',
                      border: mode===m.key ? `2px solid ${COLOR}` : '1px solid #e0e0e0',
                      background: mode===m.key ? COLOR_L : '#fff' }}>
                    <div style={{ fontSize:13, fontWeight:600, color: mode===m.key ? COLOR : '#555' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Fecha inicio</label>
              <input type="date" style={inp} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Fecha fin (opcional)</label>
              <input type="date" style={inp} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Tiempos de comida</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {MEAL_TIMES.map(mt => {
                  const { Icon } = mt
                  const sel = selectedMeals.includes(mt.key)
                  return (
                    <div key={mt.key} onClick={() => toggleMeal(mt.key)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:20, cursor:'pointer',
                        border: sel ? `2px solid ${mt.color}` : '1px solid #e0e0e0',
                        background: sel ? `${mt.color}15` : '#fff' }}>
                      <Icon size={13} color={sel ? mt.color : '#aaa'} />
                      <span style={{ fontSize:12, fontWeight:sel?700:400, color: sel?mt.color:'#666' }}>{mt.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {mode === 'daily' && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Días a incluir</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {DAYS.map(day => {
                    const sel = selectedDays.includes(day)
                    return (
                      <div key={day} onClick={() => toggleDay(day)}
                        style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:sel?700:400,
                          border: sel ? `2px solid ${COLOR}` : '1px solid #e0e0e0',
                          background: sel ? COLOR_L : '#fff', color: sel ? COLOR : '#666' }}>
                        {DAY_LABELS[day].slice(0,3)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Notas generales</label>
              <input style={inp} value={planNotes} onChange={e => setPlanNotes(e.target.value)} placeholder="Ej: Evitar azúcar refinada, hidratación 2L/día..." />
            </div>
          </div>

          {mode === 'general' ? (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:10 }}>Alimentos por tiempo de comida</div>
              {selectedMeals.map(mt => {
                const data = getMealData(null, mt)
                return <MealBlock key={mt} mealTime={mt} foods={data.foods} mealNotes={data.notes} canEdit={true}
                  onFoodsChange={foods => updateMealFoods(null, mt, foods)}
                  onNotesChange={notes => updateMealNotes(null, mt, notes)} />
              })}
            </div>
          ) : (
            <div>
              {selectedDays.map(day => (
                <div key={day} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:COLOR, marginBottom:8, padding:'6px 12px', background:COLOR_L, borderRadius:8, display:'inline-block' }}>
                    {DAY_LABELS[day]}
                  </div>
                  {selectedMeals.map(mt => {
                    const data = getMealData(day, mt)
                    return <MealBlock key={mt} mealTime={mt} foods={data.foods} mealNotes={data.notes} canEdit={true}
                      onFoodsChange={foods => updateMealFoods(day, mt, foods)}
                      onNotesChange={notes => updateMealNotes(day, mt, notes)} />
                  })}
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
            <button onClick={() => setShowForm(false)}
              style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving||!title.trim()}
              style={{ padding:'8px 24px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity:!title.trim()?0.5:1 }}>
              {saving ? 'Guardando...' : 'Guardar plan'}
            </button>
          </div>
        </div>
      )}

      {!loaded ? (
        <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Sin planes nutricionales registrados.</div>
      ) : plans.map(plan => {
        const isExp = expandedPlan === plan.id
        const totalKcal = (plan.meals||[]).reduce((s,m) => s+(m.foods||[]).reduce((ss,f) => ss+(parseFloat(f.kcal)||0),0),0)
        return (
          <div key={plan.id} style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, marginBottom:8, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
              onClick={() => setExpandedPlan(isExp ? null : plan.id)}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#1a3a5c' }}>{plan.title}</div>
                <div style={{ fontSize:12, color:'#8aab9a', marginTop:2 }}>
                  {plan.mode==='general'?'Plan general':'Plan por día'}
                  {plan.start_date ? ` · ${new Date(plan.start_date+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'short'})}` : ''}
                  {plan.end_date ? ` — ${new Date(plan.end_date+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'short',year:'numeric'})}` : ''}
                  {totalKcal>0 ? ` · ${Math.round(totalKcal)} kcal` : ''}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={e => { e.stopPropagation(); printPlan(plan) }}
                  style={{ padding:'4px 10px', border:`1px solid ${COLOR}`, borderRadius:8, cursor:'pointer', fontSize:12, color:COLOR, background:'#fff', display:'flex', alignItems:'center', gap:5 }}>
                  <Printer size={13} /> Imprimir
                </button>
                <button onClick={e => { e.stopPropagation(); deletePlan(plan.id) }}
                  style={{ padding:'4px 8px', border:'1px solid #D85A30', borderRadius:8, cursor:'pointer', color:'#D85A30', background:'#fff', display:'flex', alignItems:'center' }}>
                  <Trash2 size={13} />
                </button>
                {isExp ? <ChevronUp size={16} color='#bbb' /> : <ChevronDown size={16} color='#bbb' />}
              </div>
            </div>
            {isExp && (
              <div style={{ background:'#f8fbf8', borderTop:'0.5px solid #e2ede9', padding:'14px 16px' }}>
                {plan.mode === 'general' ? (
                  MEAL_TIMES.filter(mt => (plan.meals||[]).some(m => m.meal_time===mt.key)).map(mt => {
                    const m = (plan.meals||[]).find(x => x.meal_time===mt.key)
                    return <MealBlock key={mt.key} mealTime={mt.key} foods={m?.foods||[]} mealNotes={m?.notes||''} canEdit={false} onFoodsChange={()=>{}} onNotesChange={()=>{}} />
                  })
                ) : (
                  DAYS.filter(d => (plan.meals||[]).some(m => m.day===d)).map(day => (
                    <div key={day} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:COLOR, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>{DAY_LABELS[day]}</div>
                      {MEAL_TIMES.filter(mt => (plan.meals||[]).some(m => m.day===day && m.meal_time===mt.key)).map(mt => {
                        const m = (plan.meals||[]).find(x => x.day===day && x.meal_time===mt.key)
                        return <MealBlock key={mt.key} mealTime={mt.key} foods={m?.foods||[]} mealNotes={m?.notes||''} canEdit={false} onFoodsChange={()=>{}} onNotesChange={()=>{}} />
                      })}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
