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
const ANTH_URL = 'https://mdcqdigxbmfajlmaxrta.supabase.co/functions/v1/claude-proxy'

const RISK_FACTORS = [
  { value:'family_history', label:'Historia familiar de cáncer de próstata' },
  { value:'afrodescendant', label:'Raza afrodescendiente' },
  { value:'obesity', label:'Obesidad' },
  { value:'chemicals', label:'Exposición a pesticidas o químicos' },
]

const HORMONE_SYMPTOMS = [
  'Fatiga constante','Disminución de libido','Pérdida de masa muscular',
  'Aumento de grasa abdominal','Cambios de humor','Dificultad para concentrarse',
  'Insomnio','Irritabilidad','Depresión','Sudoración excesiva',
  'Disfunción eréctil','Pérdida de vello corporal',
]

const MALE_STUDIES = [
  {
    key: 'psa',
    label: 'Antígeno prostático (PSA)',
    hasNumeric: true,
    numericLabel: 'Valor (ng/mL)',
    results: ['Normal (<4 ng/mL)', 'Levemente elevado (4-10 ng/mL)', 'Elevado (>10 ng/mL)', 'Anormal'],
    abnormal: ['Elevado (>10 ng/mL)', 'Anormal'],
    intervalMonths: 12,
  },
  {
    key: 'testosterona',
    label: 'Testosterona total',
    hasNumeric: true,
    numericLabel: 'Valor (ng/dL)',
    results: ['Normal', 'Baja', 'Muy baja', 'Elevada'],
    abnormal: ['Muy baja', 'Elevada'],
    intervalMonths: 12,
  },
  {
    key: 'perfil_lipidico',
    label: 'Perfil lipídico',
    hasNumeric: false,
    results: ['Normal', 'Colesterol elevado', 'Triglicéridos elevados', 'Alterado'],
    abnormal: ['Alterado'],
    intervalMonths: 12,
  },
  {
    key: 'glicemia',
    label: 'Glicemia en ayunas',
    hasNumeric: true,
    numericLabel: 'Valor (mg/dL)',
    results: ['Normal (<100 mg/dL)', 'Prediabetes (100-125 mg/dL)', 'Diabetes (>125 mg/dL)'],
    abnormal: ['Prediabetes (100-125 mg/dL)', 'Diabetes (>125 mg/dL)'],
    intervalMonths: 12,
  },
  {
    key: 'us_testicular',
    label: 'Ultrasonido testicular',
    hasNumeric: false,
    results: ['Normal', 'Varicocele', 'Quiste', 'Nódulo', 'Anormal'],
    abnormal: ['Nódulo', 'Anormal'],
    intervalMonths: 24,
  },
]

function monthsDiff(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })
}

export default function MaleHealthModule({ patient }) {
  const [tab, setTab] = useState(() => localStorage.getItem('maleHealthTab') || 'hormonal')

  useEffect(() => { localStorage.setItem('maleHealthTab', tab) }, [tab])
  const [logs, setLogs] = useState([])
  const [controls, setControls] = useState([])
  const [todayLog, setTodayLog] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [riskFactors, setRiskFactors] = useState([])
  const [savingRisk, setSavingRisk] = useState(false)
  const [riskSaved, setRiskSaved] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const [logForm, setLogForm] = useState({
    energy_level: 5, libido_level: 5, mood_level: 5,
    muscle_strength: 5, sleep_quality: 5, symptoms: [], notes: ''
  })

  const [controlForm, setControlForm] = useState({
    study_type: '', study_date: today, result: '', numeric_value: '', notes: ''
  })

  const age = patient?.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date + 'T12:00:00')) / (1000*60*60*24*365.25))
    : 0

  const hasRiskFactors = riskFactors.length > 0 && !riskFactors.includes('none')

  useEffect(() => { if (patient?.id) { loadLogs(); loadControls(); loadRiskFactors() } }, [patient])

  async function loadLogs() {
    const { data } = await supabase.from('male_health_logs')
      .select('*').eq('patient_id', patient.id)
      .order('log_date', { ascending: false }).limit(30)
    setLogs(data || [])
    const td = data?.find(l => l.log_date === today)
    if (td) {
      setTodayLog(td)
      setLogForm({
        energy_level: td.energy_level || 5,
        libido_level: td.libido_level || 5,
        mood_level: td.mood_level || 5,
        muscle_strength: td.muscle_strength || 5,
        sleep_quality: td.sleep_quality || 5,
        symptoms: td.symptoms || [],
        notes: td.notes || ''
      })
    }
  }

  async function loadControls() {
    const { data } = await supabase.from('male_medical_controls')
      .select('*').eq('patient_id', patient.id)
      .order('study_date', { ascending: false })
    setControls(data || [])
  }

  async function loadRiskFactors() {
    const { data } = await supabase.from('patients')
      .select('prostate_risk_factors').eq('id', patient.id).single()
    if (data?.prostate_risk_factors) setRiskFactors(data.prostate_risk_factors)
  }

  async function saveRiskFactors() {
    setSavingRisk(true)
    await supabase.from('patients').update({ prostate_risk_factors: riskFactors }).eq('id', patient.id)
    setSavingRisk(false); setRiskSaved(true)
    setTimeout(() => setRiskSaved(false), 3000)
  }

  function toggleRiskFactor(val) {
    if (val === 'none') {
      setRiskFactors(['none'])
    } else {
      setRiskFactors(p => {
        const without = p.filter(x => x !== 'none')
        return without.includes(val) ? without.filter(x => x !== val) : [...without, val]
      })
    }
  }

  async function saveLog() {
    setSaving(true)
    const payload = {
      patient_id: patient.id, log_date: today,
      energy_level: logForm.energy_level,
      libido_level: logForm.libido_level,
      mood_level: logForm.mood_level,
      muscle_strength: logForm.muscle_strength,
      sleep_quality: logForm.sleep_quality,
      symptoms: logForm.symptoms,
      notes: logForm.notes || null,
    }
    if (todayLog?.id) {
      await supabase.from('male_health_logs').update(payload).eq('id', todayLog.id)
    } else {
      await supabase.from('male_health_logs').insert(payload)
    }
    await loadLogs()
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  async function saveControl() {
    if (!controlForm.study_type || !controlForm.result || !controlForm.study_date) return
    setSaving(true)
    const payload = {
      patient_id: patient.id,
      study_type: controlForm.study_type,
      study_date: controlForm.study_date,
      result: controlForm.result,
      numeric_value: controlForm.numeric_value ? parseFloat(controlForm.numeric_value) : null,
      notes: controlForm.notes || null,
    }
    if (editingId) {
      await supabase.from('male_medical_controls').update(payload).eq('id', editingId)
    } else {
      await supabase.from('male_medical_controls').insert(payload)
    }
    await loadControls()
    setControlForm({ study_type:'', study_date:today, result:'', numeric_value:'', notes:'' })
    setEditingId(null); setSaving(false); setSaved(true); setShowForm(false)
    setTimeout(() => setSaved(false), 3000)
  }

  function startEdit(c) {
    setControlForm({ study_type:c.study_type, study_date:c.study_date, result:c.result, numeric_value:c.numeric_value || '', notes:c.notes || '' })
    setEditingId(c.id); setShowForm(true); setShowHistory(true)
  }

  function toggleSymptom(s) {
    setLogForm(p => ({ ...p, symptoms: p.symptoms.includes(s) ? p.symptoms.filter(x => x !== s) : [...p.symptoms, s] }))
  }

  async function getAiAdvice() {
    setAiLoading(true); setAiAdvice('')
    const recentSymptoms = logs.slice(0,3).flatMap(l => l.symptoms || [])
    const unique = [...new Set(recentSymptoms)]
    const avgEnergy = logs.slice(0,7).reduce((a,l) => a + (l.energy_level||5), 0) / Math.min(logs.length||1, 7)
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
            content: `Soy un paciente masculino de medicina regenerativa. Edad: ${age} años. Síntomas recientes: ${unique.join(', ') || 'ninguno'}. Nivel de energía promedio: ${Math.round(avgEnergy)}/10. Dame recomendaciones prácticas para optimizar mi salud hormonal masculina: alimentación, ejercicio, hábitos de sueño. Máximo 150 palabras. En español. Sin diagnósticos.`
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

  function getLastControl(studyKey) {
    return controls.find(c => c.study_type === studyKey)
  }

  const selectedStudy = MALE_STUDIES.find(s => s.key === controlForm.study_type)

  const SliderInput = ({ label, field, value }) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <label style={{ fontSize:12, fontWeight:500, color:'#666' }}>{label}</label>
        <span style={{ fontSize:13, fontWeight:700, color: value <= 3 ? '#c0392b' : value <= 6 ? '#e67e22' : G }}>{value}/10</span>
      </div>
      <input type="range" min="1" max="10" value={value}
        onChange={e => setLogForm(p => ({ ...p, [field]: parseInt(e.target.value) }))}
        onInput={e => setLogForm(p => ({ ...p, [field]: parseInt(e.target.value) }))}
        style={{ width:'100%', accentColor: value <= 3 ? '#c0392b' : value <= 6 ? '#e67e22' : G }} />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#ccc' }}>
        <span>Muy bajo</span><span>Óptimo</span>
      </div>
    </div>
  )

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {[
          { key:'hormonal', label:'Salud hormonal' },
          { key:'prostata', label:'Próstata' },
          { key:'estudios', label:'Mis estudios' },
          { key:'ia', label:'Consejo IA' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? G : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Salud hormonal */}
      {tab === 'hormonal' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>¿Cómo te sentís hoy?</div>
            <SliderInput label="Nivel de energía" field="energy_level" value={logForm.energy_level} />
            <SliderInput label="Libido" field="libido_level" value={logForm.libido_level} />
            <SliderInput label="Estado de ánimo" field="mood_level" value={logForm.mood_level} />
            <SliderInput label="Fuerza muscular" field="muscle_strength" value={logForm.muscle_strength} />
            <SliderInput label="Calidad del sueño" field="sleep_quality" value={logForm.sleep_quality} />

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Síntomas de hoy</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {HORMONE_SYMPTOMS.map(s => (
                  <button key={s} onClick={() => toggleSymptom(s)}
                    style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border: logForm.symptoms.includes(s) ? '1px solid #c0392b' : '1px solid transparent', background: logForm.symptoms.includes(s) ? '#fdecea' : '#f0f0f0', color: logForm.symptoms.includes(s) ? '#c0392b' : '#666' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Notas adicionales</label>
              <textarea value={logForm.notes} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="¿Algo más que quieras registrar?"
                style={{ ...inp, height:50, resize:'vertical' }} />
            </div>

            {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:G }}>✓ Registro guardado</div>}
            <button onClick={saveLog} disabled={saving}
              style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar registro de hoy'}
            </button>
          </div>

          {/* Historial de niveles */}
          {logs.length > 1 && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Tendencia reciente</div>
              {logs.slice(0,5).map(l => (
                <div key={l.id} style={{ padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>{formatDate(l.log_date)}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
                    {[
                      { label:'Energía', val: l.energy_level },
                      { label:'Libido', val: l.libido_level },
                      { label:'Ánimo', val: l.mood_level },
                      { label:'Fuerza', val: l.muscle_strength },
                      { label:'Sueño', val: l.sleep_quality },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign:'center', background:'#f8f8f8', borderRadius:8, padding:'4px' }}>
                        <div style={{ fontSize:10, color:'#aaa' }}>{m.label}</div>
                        <div style={{ fontSize:13, fontWeight:700, color: m.val <= 3 ? '#c0392b' : m.val <= 6 ? '#e67e22' : G }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Próstata */}
      {tab === 'prostata' && (
        <div>
          {/* Factores de riesgo */}
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Factores de riesgo prostático</div>
            <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>Seleccioná los que aplican. Esto se guarda una sola vez.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
              {RISK_FACTORS.map(r => (
                <div key={r.value} onClick={() => toggleRiskFactor(r.value)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', border: riskFactors.includes(r.value) ? `2px solid ${G}` : '2px solid #eee', background: riskFactors.includes(r.value) ? '#E1F5EE' : '#f8f8f8' }}>
                  <div style={{ width:18, height:18, borderRadius:4, border: riskFactors.includes(r.value) ? `2px solid ${G}` : '2px solid #ccc', background: riskFactors.includes(r.value) ? G : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {riskFactors.includes(r.value) && <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:13, color:'#1a1a1a' }}>{r.label}</span>
                </div>
              ))}
              <div onClick={() => toggleRiskFactor('none')}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', border: riskFactors.includes('none') ? `2px solid #888` : '2px solid #eee', background: riskFactors.includes('none') ? '#f0f0f0' : '#f8f8f8' }}>
                <div style={{ width:18, height:18, borderRadius:4, border: riskFactors.includes('none') ? '2px solid #888' : '2px solid #ccc', background: riskFactors.includes('none') ? '#888' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {riskFactors.includes('none') && <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, color:'#1a1a1a' }}>Ninguno de los anteriores</span>
              </div>
            </div>
            {riskSaved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:13, color:G }}>✓ Factores guardados</div>}
            <button onClick={saveRiskFactors} disabled={savingRisk || riskFactors.length === 0}
              style={{ width:'100%', padding:'9px', background: riskFactors.length === 0 ? '#f0f0f0' : G, color: riskFactors.length === 0 ? '#bbb' : '#fff', border:'none', borderRadius:8, cursor: riskFactors.length === 0 ? 'default' : 'pointer', fontSize:13, fontWeight:500 }}>
              {savingRisk ? 'Guardando...' : 'Guardar factores de riesgo'}
            </button>
          </div>

          {/* Alertas según edad y factores */}
          {riskFactors.length > 0 && (
            <div>
              {hasRiskFactors && age < 40 && (
                <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:10, padding:'12px 14px', marginBottom:12, fontSize:13, color:'#795548' }}>
                  <strong>Recordatorio:</strong> Tenés factores de riesgo prostático. A partir de los 40 años deberías solicitar una medición del Antígeno Prostático a tu médico tratante.
                </div>
              )}
              {hasRiskFactors && age >= 40 && !getLastControl('psa') && (
                <div style={{ background:'#fdecea', border:'1px solid #f5c6c6', borderRadius:10, padding:'12px 14px', marginBottom:12, fontSize:13, color:'#c0392b' }}>
                  <strong>Importante:</strong> Tenés factores de riesgo y más de 40 años. Debés registrar una medición del Antígeno Prostático o solicitar a tu médico que te lo indique.
                </div>
              )}
              {riskFactors.includes('none') && age < 45 && (
                <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:10, padding:'12px 14px', marginBottom:12, fontSize:13, color:'#795548' }}>
                  <strong>Recordatorio:</strong> A partir de los 45 años deberías solicitar una medición del Antígeno Prostático a tu médico tratante.
                </div>
              )}
              {riskFactors.includes('none') && age >= 45 && !getLastControl('psa') && (
                <div style={{ background:'#fdecea', border:'1px solid #f5c6c6', borderRadius:10, padding:'12px 14px', marginBottom:12, fontSize:13, color:'#c0392b' }}>
                  <strong>Importante:</strong> Tenés más de 45 años y no tenés ningún registro del Antígeno Prostático. Debés registrarlo o solicitar a tu médico que te lo indique.
                </div>
              )}
            </div>
          )}

          {/* Historial PSA */}
          {controls.filter(c => c.study_type === 'psa').length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Historial de Antígeno Prostático</div>
              {controls.filter(c => c.study_type === 'psa').map(c => (
                <div key={c.id} style={{ padding:'8px 0', borderBottom:'0.5px solid #f5f5f5', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{formatDate(c.study_date)}</div>
                    <div style={{ fontSize:12, color:'#888' }}>
                      {c.numeric_value ? `${c.numeric_value} ng/mL · ` : ''}{c.result}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: MALE_STUDIES[0].abnormal.includes(c.result) ? '#fdecea' : '#E1F5EE', color: MALE_STUDIES[0].abnormal.includes(c.result) ? '#c0392b' : G, fontWeight:500 }}>
                      {c.result}
                    </span>
                    <button onClick={() => { setTab('estudios'); startEdit(c) }}
                      style={{ background:'none', border:'1px solid #e0e0e0', borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:11, color:'#666' }}>
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mis estudios */}
      {tab === 'estudios' && (
        <div>
          {/* Alertas anormales */}
          {MALE_STUDIES.map(study => {
            const last = getLastControl(study.key)
            if (!last || !study.abnormal.includes(last.result)) return null
            return (
              <div key={study.key} style={{ background:'#fdecea', border:'1px solid #f5c6c6', borderRadius:10, padding:'10px 14px', marginBottom:10, fontSize:12 }}>
                <div style={{ fontWeight:600, color:'#c0392b', marginBottom:2 }}>Atención — {study.label}</div>
                <div style={{ color:'#555' }}>Tu último resultado fue <strong>{last.result}</strong>. Este resultado requiere evaluación médica. Contactá a tu médico a la brevedad.</div>
              </div>
            )
          })}

          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>Mis estudios</div>
              <button onClick={() => setShowForm(!showForm)}
                style={{ padding:'6px 14px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                + Registrar
              </button>
            </div>

            {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:13, color:G }}>✓ Estudio registrado</div>}

            {showForm && (
              <div style={{ background:'#f8f8f8', borderRadius:10, padding:'14px', marginBottom:14, border:'1px solid #eee' }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{editingId ? 'Editar registro' : 'Nuevo registro'}</div>
                <div style={{ marginBottom:10 }}>
                  <label style={lbl}>Estudio</label>
                  <select style={inp} value={controlForm.study_type} onChange={e => setControlForm(p => ({ ...p, study_type: e.target.value, result:'' }))}>
                    <option value="">Seleccionar...</option>
                    {MALE_STUDIES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div>
                    <label style={lbl}>Fecha</label>
                    <input type="date" style={inp} value={controlForm.study_date} onChange={e => setControlForm(p => ({ ...p, study_date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Resultado</label>
                    <select style={inp} value={controlForm.result} onChange={e => setControlForm(p => ({ ...p, result: e.target.value }))} disabled={!controlForm.study_type}>
                      <option value="">Seleccionar...</option>
                      {selectedStudy?.results.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                {selectedStudy?.hasNumeric && (
                  <div style={{ marginBottom:10 }}>
                    <label style={lbl}>{selectedStudy.numericLabel}</label>
                    <input type="number" step="0.01" style={inp} value={controlForm.numeric_value} onChange={e => setControlForm(p => ({ ...p, numeric_value: e.target.value }))} placeholder="0.0" />
                  </div>
                )}
                <div style={{ marginBottom:10 }}>
                  <label style={lbl}>Notas (opcional)</label>
                  <textarea style={{ ...inp, height:50, resize:'vertical' }} value={controlForm.notes} onChange={e => setControlForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setShowForm(false); setEditingId(null); setControlForm({ study_type:'', study_date:today, result:'', numeric_value:'', notes:'' }) }}
                    style={{ padding:'7px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                    Cancelar
                  </button>
                  <button onClick={saveControl} disabled={saving || !controlForm.study_type || !controlForm.result}
                    style={{ flex:1, padding:'7px', background: (!controlForm.study_type || !controlForm.result) ? '#f0f0f0' : G, color: (!controlForm.study_type || !controlForm.result) ? '#bbb' : '#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                    {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de estudios */}
            {MALE_STUDIES.map(study => {
              const last = getLastControl(study.key)
              const isOverdue = last && monthsDiff(last.study_date) >= study.intervalMonths
              const isAbnormal = last && study.abnormal.includes(last.result)
              return (
                <div key={study.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, background: isAbnormal ? '#c0392b' : isOverdue ? '#e67e22' : !last ? '#bbb' : G }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{study.label}</div>
                    {last ? (
                      <div style={{ fontSize:11, color: isAbnormal ? '#c0392b' : isOverdue ? '#e67e22' : '#888' }}>
                        {formatDate(last.study_date)} · {last.result}
                        {last.numeric_value ? ` · ${last.numeric_value}` : ''}
                        {isOverdue && !isAbnormal && ' · Pendiente repetir'}
                      </div>
                    ) : <div style={{ fontSize:11, color:'#bbb' }}>Sin registro</div>}
                  </div>
                  {isAbnormal && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#fdecea', color:'#c0392b', fontWeight:500 }}>Atención</span>}
                  {isOverdue && !isAbnormal && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#fff3e0', color:'#e67e22', fontWeight:500 }}>Vencido</span>}
                </div>
              )
            })}
          </div>

          {/* Historial */}
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showHistory ? 12 : 0 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>Historial</div>
              <button onClick={() => setShowHistory(!showHistory)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:G, fontWeight:500 }}>
                {showHistory ? 'Ocultar' : 'Ver historial'}
              </button>
            </div>
            {showHistory && (
              controls.length === 0
                ? <div style={{ fontSize:13, color:'#bbb', textAlign:'center', padding:16 }}>Sin registros aún</div>
                : controls.map(c => {
                    const study = MALE_STUDIES.find(s => s.key === c.study_type)
                    const isAbnormal = study?.abnormal.includes(c.result)
                    return (
                      <div key={c.id} style={{ padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontSize:13, fontWeight:500 }}>{study?.label || c.study_type}</div>
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: isAbnormal ? '#fdecea' : '#E1F5EE', color: isAbnormal ? '#c0392b' : G, fontWeight:500 }}>{c.result}</span>
                            <button onClick={() => startEdit(c)}
                              style={{ background:'none', border:'1px solid #e0e0e0', borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:11, color:'#666' }}>
                              Editar
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                          {formatDate(c.study_date)}{c.numeric_value ? ` · ${c.numeric_value}` : ''}{c.notes ? ` · ${c.notes}` : ''}
                        </div>
                      </div>
                    )
                  })
            )}
          </div>
        </div>
      )}

      {/* Consejo IA */}
      {tab === 'ia' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Consejo personalizado</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>
              La IA analiza tus registros recientes para darte recomendaciones de salud hormonal masculina.
            </div>
            <button onClick={getAiAdvice} disabled={aiLoading}
              style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? 'Generando consejo...' : aiAdvice ? 'Nuevo consejo' : 'Obtener consejo'}
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
