import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ROUTES = [
  { value: 'VO', label: 'Oral (VO)' },
  { value: 'IV', label: 'Intravenoso (IV)' },
  { value: 'IM', label: 'Intramuscular (IM)' },
  { value: 'Sc', label: 'Subcutáneo (Sc)' },
  { value: 'IR', label: 'Intrarrectal (IR)' },
  { value: 'IN', label: 'Intranasal (IN)' },
  { value: 'IO', label: 'Intraocular (IO)' },
  { value: 'IA', label: 'Intraótico (IA)' },
  { value: 'IT', label: 'Intratecal (IT)' },
  { value: 'TOP', label: 'Tópico (TOP)' },
  { value: 'OF', label: 'Oftálmico (OF)' },
  { value: 'VG', label: 'Vaginal (VG)' },
  { value: 'SL', label: 'Sublingual (SL)' },
  { value: 'TD', label: 'Transdérmico (TD)' },
  { value: 'INH', label: 'Inhalatorio (INH)' },
]

const FREQUENCIES = [
  { value: 'una vez al día', label: 'Una vez al día (c/24h)', times: 1 },
  { value: 'dos veces al día', label: 'Dos veces al día - BID (c/12h)', times: 2 },
  { value: 'tres veces al día', label: 'Tres veces al día - TID (c/8h)', times: 3 },
  { value: 'cada 6 horas', label: 'Cada 6 horas', times: 4 },
  { value: 'cada 4 horas', label: 'Cada 4 horas', times: 6 },
  { value: 'día por medio', label: 'Día por medio', times: 0.5 },
  { value: 'cada 3 días', label: 'Cada 3 días', times: 0.33 },
  { value: 'una vez a la semana', label: 'Una vez a la semana', times: 0.14 },
  { value: 'una vez al mes', label: 'Una vez al mes', times: null },
  { value: 'cada 3 meses', label: 'Cada 3 meses', times: null },
  { value: 'cada 6 meses', label: 'Cada 6 meses', times: null },
  { value: 'PRN', label: 'Solo en caso necesario (PRN)', times: null },
]

const DURATIONS = [
  '3 días', '5 días', '7 días', '10 días', '14 días', '1 mes', '2 meses',
  '3 meses', '6 meses', '1 año', 'continuo', 'indefinido'
]

const FORMS = [
  'comprimido', 'cápsula', 'tableta', 'jarabe', 'suspensión', 'crema', 'gel',
  'parche', 'supositorio', 'ampolla', 'colirio', 'spray nasal', 'inhalador',
  'solución', 'pomada', 'sérum', 'loción'
]

const SPECIAL = [
  { value: 'HS', label: 'Hora sueño (HS) — antes de dormir' },
  { value: 'CC', label: 'Con comida (CC)' },
  { value: 'en ayunas', label: 'En ayunas' },
  { value: 'PRN', label: 'Solo en caso necesario (PRN)' },
  { value: 'agitar antes de usar', label: 'Agitar antes de usar' },
  { value: 'refrigerar', label: 'Refrigerar' },
  { value: 'evitar exposición solar', label: 'Evitar exposición solar' },
  { value: 'no partir ni masticar', label: 'No partir ni masticar' },
  { value: 'diluir en agua', label: 'Diluir en agua' },
]

const emptyRx = {
  medication_name: '', form: '', dose_mg: '', route: 'VO',
  frequency: 'una vez al día', duration: '1 mes',
  indication: '', special_indication: '', quantity: ''
}

function calcQuantity(frequency, duration, form) {
  if (frequency === 'PRN') return null
  const freq = FREQUENCIES.find(f => f.value === frequency)
  if (!freq || freq.times === null) return null
  const durationMap = {
    '3 días': 3, '5 días': 5, '7 días': 7, '10 días': 10, '14 días': 14,
    '1 mes': 30, '2 meses': 60, '3 meses': 90, '6 meses': 180, '1 año': 365,
  }
  const days = durationMap[duration]
  if (!days) return null
  return Math.ceil(days * freq.times)
}

function buildRxText(rx) {
  if (!rx.medication_name) return ''
  const qty = calcQuantity(rx.frequency, rx.duration, rx.form)
  const formStr = rx.form ? ` ${rx.form}` : ''
  const doseStr = rx.dose_mg ? ` ${rx.dose_mg}` : ''
  const routeStr = rx.route ? ` ${rx.route}` : ''
  const indicationStr = rx.indication ? `, ${rx.indication}` : ''
  const freqStr = rx.frequency === 'PRN' ? ' solo en caso necesario (PRN)' : ` ${rx.frequency}`
  const durationStr = rx.frequency !== 'PRN' && rx.duration && !['continuo','indefinido'].includes(rx.duration)
    ? ` por ${rx.duration}` : rx.duration === 'continuo' || rx.duration === 'indefinido' ? ` de forma ${rx.duration}` : ''
  const specialStr = rx.special_indication ? ` ${rx.special_indication}` : ''
  const qtyStr = qty ? `. #${qty} ${rx.form || 'unidades'}` : ''
  return `${rx.medication_name}${formStr}${doseStr}${routeStr}${indicationStr}${freqStr}${durationStr}${specialStr}${qtyStr}.`
}

export default function PrescriptionForm({ value, onChange, color }) {
  const [medications, setMedications] = useState([])
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [rxList, setRxList] = useState([])
  const [currentRx, setCurrentRx] = useState(emptyRx)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    supabase.from('medications').select('*').order('name').then(({ data }) => setMedications(data || []))
  }, [])

  useEffect(() => {
    // Parsear valor inicial
    if (value && rxList.length === 0) {
      const lines = value.split('\n').filter(l => l.startsWith('• '))
      if (lines.length > 0) setRxList(lines.map((l, i) => ({ id: i, text: l.replace('• ', '') })))
    }
  }, [value])

  function handleSearch(val) {
    setSearch(val)
    setCurrentRx(p => ({ ...p, medication_name: val }))
    if (val.length < 2) { setSuggestions([]); return }
    setSuggestions(medications.filter(m => m.name.toLowerCase().includes(val.toLowerCase())).slice(0, 8))
  }

  function selectMed(med) {
    setCurrentRx(p => ({ ...p, medication_name: med.name }))
    setSearch(med.name)
    setSuggestions([])
  }

  function addRx() {
    if (!currentRx.medication_name) return
    const text = buildRxText(currentRx)
    const newList = [...rxList, { id: Date.now(), text }]
    setRxList(newList)
    onChange(newList.map(r => `• ${r.text}`).join('\n'))
    setCurrentRx(emptyRx)
    setSearch('')
    setShowForm(false)
  }

  function removeRx(id) {
    const newList = rxList.filter(r => r.id !== id)
    setRxList(newList)
    onChange(newList.map(r => `• ${r.text}`).join('\n'))
  }

  const qty = calcQuantity(currentRx.frequency, currentRx.duration, currentRx.form)
  const isPRN = currentRx.frequency === 'PRN'

  const inp = { padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', background:'#fff', width:'100%', boxSizing:'border-box' }

  return (
    <div>
      {/* Lista de medicamentos agregados */}
      {rxList.length > 0 && (
        <div style={{ marginBottom:10 }}>
          {rxList.map(rx => (
            <div key={rx.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', background:'#f0f7f4', border:`1px solid ${color}30`, borderRadius:8, padding:'8px 10px', marginBottom:6, gap:8 }}>
              <div style={{ fontSize:13, color:'#333', lineHeight:1.6 }}>• {rx.text}</div>
              <button onClick={() => removeRx(rx.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:16, flexShrink:0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Botón agregar */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ padding:'6px 14px', background:color, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>
          + Agregar medicamento
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <div style={{ background:'#f8f8f8', borderRadius:10, padding:14, marginTop:8 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
            {/* Medicamento con búsqueda */}
            <div style={{ position:'relative', gridColumn:'1/-1' }}>
              <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Medicamento *</label>
              <input value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar medicamento..." style={inp} />
              {suggestions.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, zIndex:10, maxHeight:200, overflowY:'auto', boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
                  {suggestions.map(m => (
                    <div key={m.id} onClick={() => selectMed(m)}
                      style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, borderBottom:'0.5px solid #f0f0f0' }}
                      onMouseEnter={e => e.target.style.background='#f0f7f4'}
                      onMouseLeave={e => e.target.style.background='#fff'}>
                      <span style={{ fontWeight:500 }}>{m.name}</span>
                      <span style={{ fontSize:11, color:'#999', marginLeft:8 }}>{m.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Forma farmacéutica */}
            <div>
              <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Forma farmacéutica</label>
              <select value={currentRx.form} onChange={e => setCurrentRx(p=>({...p, form:e.target.value}))} style={inp}>
                <option value="">Seleccionar...</option>
                {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Dosis */}
            <div>
              <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Dosis</label>
              <input value={currentRx.dose_mg} onChange={e => setCurrentRx(p=>({...p, dose_mg:e.target.value}))}
                placeholder="ej: 10mg, 500mg/5ml..." style={inp} />
            </div>

            {/* Vía */}
            <div>
              <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Vía de administración</label>
              <select value={currentRx.route} onChange={e => setCurrentRx(p=>({...p, route:e.target.value}))} style={inp}>
                {ROUTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Frecuencia */}
            <div>
              <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Frecuencia</label>
              <select value={currentRx.frequency} onChange={e => setCurrentRx(p=>({...p, frequency:e.target.value}))} style={inp}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            {/* Duración */}
            {!isPRN && (
              <div>
                <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Duración</label>
                <select value={currentRx.duration} onChange={e => setCurrentRx(p=>({...p, duration:e.target.value}))} style={inp}>
                  {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}

            {/* Indicación médica */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Indicación médica</label>
              <input value={currentRx.indication} onChange={e => setCurrentRx(p=>({...p, indication:e.target.value}))}
                placeholder="ej: tomar 1 comprimido, aplicar 2 gotas..." style={inp} />
            </div>

            {/* Indicación especial */}
            <div>
              <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Indicación especial</label>
              <select value={currentRx.special_indication} onChange={e => setCurrentRx(p=>({...p, special_indication:e.target.value}))} style={inp}>
                <option value="">Ninguna</option>
                {SPECIAL.map(s => <option key={s.value} value={s.label}>{s.label}</option>)}
              </select>
            </div>

            {/* Cantidad calculada */}
            <div>
              <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:3 }}>Cantidad a dispensar</label>
              <div style={{ ...inp, background:'#f0f0f0', color: qty ? '#333' : '#999' }}>
                {isPRN ? 'N/A (PRN)' : qty ? `#${qty} ${currentRx.form || 'unidades'}` : 'Se calculará automáticamente'}
              </div>
            </div>
          </div>

          {/* Preview */}
          {currentRx.medication_name && (
            <div style={{ background:'#e8f5f0', border:`1px solid ${color}40`, borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:'#333' }}>
              <span style={{ fontSize:11, color:color, fontWeight:600, display:'block', marginBottom:2 }}>Vista previa:</span>
              • {buildRxText(currentRx)}
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setShowForm(false); setCurrentRx(emptyRx); setSearch('') }}
              style={{ padding:'6px 12px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>
              Cancelar
            </button>
            <button onClick={addRx} disabled={!currentRx.medication_name}
              style={{ padding:'6px 16px', background:color, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500, opacity:!currentRx.medication_name?0.6:1 }}>
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
