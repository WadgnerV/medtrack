import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const ANTH_URL = 'https://mdcqdigxbmfajlmaxrta.supabase.co/functions/v1/claude-proxy'

const CHRONIC_CONDITIONS = [
  'Diabetes','Hipertensión arterial','VIH','Enfermedad tiroidea',
  'Lupus','Epilepsia','Asma','Enfermedad renal','Anemia',
  'Cardiopatía','Ninguna'
]

const PRENATAL_STUDIES = [
  { key:'hemograma_1', label:'Hemograma completo', weeks:'6-13', trimester:1 },
  { key:'grupo_rh', label:'Grupo sanguíneo y Rh', weeks:'6-13', trimester:1 },
  { key:'vdrl', label:'VDRL/RPR (sífilis)', weeks:'6-13', trimester:1 },
  { key:'vih', label:'VIH', weeks:'6-13', trimester:1 },
  { key:'glucosa_1', label:'Glucosa en ayunas', weeks:'6-13', trimester:1 },
  { key:'urocultivo_1', label:'Urocultivo', weeks:'6-13', trimester:1 },
  { key:'toxoplasma', label:'Toxoplasma IgG/IgM', weeks:'6-13', trimester:1 },
  { key:'rubeola', label:'Rubéola IgG', weeks:'6-13', trimester:1 },
  { key:'hepatitis_b', label:'Hepatitis B (HBsAg)', weeks:'6-13', trimester:1 },
  { key:'tsh', label:'TSH (tiroides)', weeks:'6-13', trimester:1 },
  { key:'us_1', label:'Ultrasonido primer trimestre + translucencia nucal', weeks:'11-14', trimester:1 },
  { key:'us_morfologico', label:'Ultrasonido morfológico fetal', weeks:'18-22', trimester:2 },
  { key:'curva_glucosa', label:'Curva de glucosa', weeks:'24-28', trimester:2 },
  { key:'hemograma_2', label:'Hemograma de control', weeks:'24-28', trimester:2 },
  { key:'us_3', label:'Ultrasonido tercer trimestre', weeks:'28-32', trimester:3 },
  { key:'anti_d', label:'Inmunoglobulina anti-D (si Rh negativo)', weeks:'28-32', trimester:3, rhOnly:true },
  { key:'sgb', label:'Cultivo estreptococo grupo B', weeks:'35-37', trimester:3 },
  { key:'urocultivo_2', label:'Urocultivo de control', weeks:'35-37', trimester:3 },
  { key:'us_bienestar', label:'Ultrasonido de bienestar fetal', weeks:'36+', trimester:3 },
  { key:'nst', label:'Monitoreo fetal (NST)', weeks:'36+', trimester:3 },
]

const RESULTS_NORMAL = ['Normal', 'Negativo', 'Reactivo', 'No reactivo', 'Anormal', 'Pendiente']

function getCurrentWeek(startDate) {
  if (!startDate) return null
  const diff = Date.now() - new Date(startDate + 'T12:00:00').getTime()
  return Math.floor(diff / (1000*60*60*24*7))
}

function getCurrentExtraDays(startDate) {
  if (!startDate) return 0
  const totalDays = Math.floor((Date.now() - new Date(startDate + 'T12:00:00').getTime()) / (1000*60*60*24))
  return totalDays % 7
}

function getEDD(startDate) {
  if (!startDate) return null
  const d = new Date(startDate + 'T12:00:00')
  d.setDate(d.getDate() + 280)
  return d.toISOString().split('T')[0]
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })
}

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
    if (isH2 || isH3) return <div key={li} style={{ fontWeight:700, fontSize:13, color:'#1a1a1a', marginTop:8, marginBottom:2 }}>{rendered}</div>
    if (line.trim() === '') return <br key={li} />
    return <span key={li}>{rendered}<br/></span>
  })
}

export default function PregnancyModule({ patient, onDeactivate }) {
  const [tab, setTab] = useState(() => localStorage.getItem('pregnancyTab') || 'semana')
  const [pregnancyInfo, setPregnancyInfo] = useState(null)
  const [controls, setControls] = useState([])
  const [showInfoForm, setShowInfoForm] = useState(false)
  const [showControlForm, setShowControlForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [editingControlId, setEditingControlId] = useState(null)

  useEffect(() => { localStorage.setItem('pregnancyTab', tab) }, [tab])

  const currentWeek = getCurrentWeek(patient?.pregnancy_start_date)
  const currentExtraDays = getCurrentExtraDays(patient?.pregnancy_start_date)
  const edd = getEDD(patient?.pregnancy_start_date)

  const [infoForm, setInfoForm] = useState({
    is_first_pregnancy: true,
    previous_rh_negative: false,
    mother_rh_negative: false,
    father_rh_negative: false,
    is_multiple: false,
    multiple_type: '',
    chronic_conditions: [],
    previous_complicated_birth: false,
    previous_birth_notes: '',
    mother_height_cm: '',
    father_height_cm: '',
  })

  const [controlForm, setControlForm] = useState({
    study_type: '', study_date: new Date().toISOString().split('T')[0],
    result: '', numeric_value: '', notes: '', week_done: currentWeek || ''
  })

  useEffect(() => { if (patient?.id) { loadPregnancyInfo(); loadControls() } }, [patient])

  async function loadPregnancyInfo() {
    const { data } = await supabase.from('pregnancy_info')
      .select('*').eq('patient_id', patient.id).single()
    if (data) {
      setPregnancyInfo(data)
      setInfoForm({
        is_first_pregnancy: data.is_first_pregnancy ?? true,
        previous_rh_negative: data.previous_rh_negative ?? false,
        mother_rh_negative: data.mother_rh_negative ?? false,
        father_rh_negative: data.father_rh_negative ?? false,
        is_multiple: data.is_multiple ?? false,
        multiple_type: data.multiple_type || '',
        chronic_conditions: data.chronic_conditions || [],
        previous_complicated_birth: data.previous_complicated_birth ?? false,
        previous_birth_notes: data.previous_birth_notes || '',
        mother_height_cm: data.mother_height_cm || '',
        father_height_cm: data.father_height_cm || '',
      })
    } else {
      setShowInfoForm(true)
    }
  }

  async function loadControls() {
    const { data } = await supabase.from('pregnancy_controls')
      .select('*').eq('patient_id', patient.id)
      .order('study_date', { ascending: false })
    setControls(data || [])
  }

  async function saveInfo() {
    setSaving(true)
    const payload = { patient_id: patient.id, ...infoForm,
      mother_height_cm: infoForm.mother_height_cm ? parseInt(infoForm.mother_height_cm) : null,
      father_height_cm: infoForm.father_height_cm ? parseInt(infoForm.father_height_cm) : null,
      updated_at: new Date().toISOString()
    }
    if (pregnancyInfo?.id) {
      await supabase.from('pregnancy_info').update(payload).eq('id', pregnancyInfo.id)
    } else {
      await supabase.from('pregnancy_info').insert(payload)
    }
    await loadPregnancyInfo()
    setShowInfoForm(false); setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function saveControl() {
    if (!controlForm.study_type || !controlForm.study_date) return
    setSaving(true)
    const payload = {
      patient_id: patient.id,
      study_type: controlForm.study_type,
      study_date: controlForm.study_date,
      result: controlForm.result || null,
      numeric_value: controlForm.numeric_value ? parseFloat(controlForm.numeric_value) : null,
      notes: controlForm.notes || null,
      week_done: controlForm.week_done ? parseInt(controlForm.week_done) : null,
    }
    if (editingControlId) {
      await supabase.from('pregnancy_controls').update(payload).eq('id', editingControlId)
    } else {
      await supabase.from('pregnancy_controls').insert(payload)
    }
    await loadControls()
    setControlForm({ study_type:'', study_date: new Date().toISOString().split('T')[0], result:'', numeric_value:'', notes:'', week_done: currentWeek || '' })
    setEditingControlId(null); setSaving(false); setSaved(true); setShowControlForm(false)
    setTimeout(() => setSaved(false), 3000)
  }

  function startEditControl(c) {
    setControlForm({ study_type:c.study_type, study_date:c.study_date, result:c.result||'', numeric_value:c.numeric_value||'', notes:c.notes||'', week_done:c.week_done||'' })
    setEditingControlId(c.id); setShowControlForm(true); setShowHistory(true)
  }

  function toggleCondition(val) {
    if (val === 'Ninguna') { setInfoForm(p => ({ ...p, chronic_conditions: ['Ninguna'] })); return }
    setInfoForm(p => {
      const without = p.chronic_conditions.filter(x => x !== 'Ninguna')
      return { ...p, chronic_conditions: without.includes(val) ? without.filter(x => x !== val) : [...without, val] }
    })
  }

  async function getAiAdvice() {
    setAiLoading(true); setAiAdvice('')
    const conditions = pregnancyInfo?.chronic_conditions?.filter(c => c !== 'Ninguna').join(', ') || 'ninguna'
    const isMultiple = pregnancyInfo?.is_multiple ? `embarazo ${pregnancyInfo.multiple_type || 'múltiple'}` : 'embarazo único'
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
            content: `Soy una paciente embarazada. Semana de gestación: ${currentWeek || 'desconocida'}. Tipo: ${isMultiple}. Condiciones crónicas: ${conditions}. Dame consejos prácticos y seguros para esta semana del embarazo: alimentación, actividad física permitida, señales de alarma a vigilar y cuidados generales. Máximo 150 palabras. En español. Sin diagnósticos. Siempre recordar consultar al médico.`
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

  // Estudios visibles según Rh
  const visibleStudies = PRENATAL_STUDIES.filter(s => {
    if (s.rhOnly && !pregnancyInfo?.mother_rh_negative) return false
    return true
  })

  // Estudios pendientes según semana actual
  function getUpcomingStudies() {
    if (!currentWeek) return []
    return visibleStudies.filter(s => {
      const done = getLastControl(s.key)
      if (done) return false
      const [minW] = s.weeks.split('-').map(w => parseInt(w))
      return minW <= (currentWeek + 4)
    })
  }

  const upcomingStudies = getUpcomingStudies()
  const selectedStudy = PRENATAL_STUDIES.find(s => s.key === controlForm.study_type)

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  // Calcular trimestre actual
  const trimester = currentWeek ? (currentWeek <= 13 ? 1 : currentWeek <= 27 ? 2 : 3) : null
  const trimesterLabel = trimester ? `${trimester}er trimestre` : ''

  return (
    <div>
      {/* Header semana */}
      {currentWeek && (
        <div style={{ background:'linear-gradient(135deg, #0F6E56, #1D9E75)', borderRadius:12, padding:'14px 16px', color:'#fff', marginBottom:12 }}>
          <div style={{ fontSize:12, opacity:0.85 }}>{trimesterLabel}</div>
          <div style={{ fontSize:22, fontWeight:700 }}>Semana {currentWeek}{currentExtraDays > 0 ? ` + ${currentExtraDays}d` : ''}</div>
          <div style={{ fontSize:12, opacity:0.85, marginTop:2 }}>
            FUR: {formatDate(patient.pregnancy_start_date)}
          </div>
          {edd && (
            <div style={{ fontSize:12, opacity:0.85, marginTop:2 }}>
              Fecha probable de parto (FUR): {formatDate(edd)}
            </div>
          )}
          {pregnancyInfo?.is_multiple && (
            <div style={{ fontSize:12, marginTop:4, background:'rgba(255,255,255,0.2)', borderRadius:6, padding:'3px 8px', display:'inline-block' }}>
              {pregnancyInfo.multiple_type || 'Embarazo múltiple'}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {[
          { key:'semana', label:'Mi semana' },
          { key:'control', label:'Control prenatal' },
          { key:'info', label:'Mi información' },
          { key:'ia', label:'Consejo IA' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? G : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Mi semana */}
      {tab === 'semana' && (
        <div>
          {!currentWeek ? (
            <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>
              No se puede calcular la semana. Verificá la fecha de inicio del embarazo con tu médico.
            </div>
          ) : (
            <>
              {/* Estudios próximos */}
              {upcomingStudies.length > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Estudios próximos o pendientes</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {upcomingStudies.map(s => (
                    <div key={s.key} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 10px', background:'#f8f8f8', borderRadius:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'#e67e22', flexShrink:0, marginTop:3 }} />
                      <div>
                        <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>{s.label}</div>
                        <div style={{ fontSize:11, color:'#aaa' }}>Sem {s.weeks}</div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}

              {/* Cambios esta semana con IA */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>¿Qué pasa en la semana {currentWeek}?</div>
                <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>Desarrollo del bebé y cambios en tu cuerpo esta semana.</div>
                <button onClick={async () => {
                  setAiLoading(true)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const isMultiple = pregnancyInfo?.is_multiple ? `embarazo ${pregnancyInfo.multiple_type || 'múltiple'}` : 'embarazo único'
                    const res = await fetch(ANTH_URL, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                      body: JSON.stringify({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 1000,
                        messages: [{
                          role: 'user',
                          content: `Embarazo semana ${currentWeek}, ${isMultiple}. Describe de forma breve y amigable: 1) Cómo está el bebé esta semana (tamaño, desarrollo), 2) Cambios que puede sentir la mamá. Máximo 120 palabras. En español. Sin diagnósticos médicos.`
                        }]
                      })
                    })
                    const data = await res.json()
                    setAiAdvice(data.content?.[0]?.text || '')
                  } catch(e) { setAiAdvice('No se pudo obtener la información.') }
                  setAiLoading(false)
                }} disabled={aiLoading}
                  style={{ width:'100%', padding:'9px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, opacity: aiLoading ? 0.7 : 1 }}>
                  {aiLoading ? 'Cargando...' : aiAdvice ? 'Actualizar información' : 'Ver información de esta semana'}
                </button>
                {aiAdvice && (
                  <div style={{ marginTop:12, fontSize:13, color:'#444', lineHeight:1.7 }}>
                    {renderMarkdown(aiAdvice)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Control prenatal */}
      {tab === 'control' && (
        <div>
          {/* Alertas anormales */}
          {controls.filter(c => c.result === 'Anormal').map(c => {
            const study = PRENATAL_STUDIES.find(s => s.key === c.study_type)
            return (
              <div key={c.id} style={{ background:'#fdecea', border:'1px solid #f5c6c6', borderRadius:10, padding:'10px 14px', marginBottom:10, fontSize:12 }}>
                <strong style={{ color:'#c0392b' }}>Atención — {study?.label}</strong>
                <div style={{ color:'#555', marginTop:2 }}>Tu resultado fue anormal. Consultá con tu médico a la brevedad.</div>
              </div>
            )
          })}

          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>Estudios prenatales</div>
              <button onClick={() => setShowControlForm(!showControlForm)}
                style={{ padding:'6px 14px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                + Registrar
              </button>
            </div>

            {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:13, color:G }}>✓ Guardado correctamente</div>}

            {showControlForm && (
              <div style={{ background:'#f8f8f8', borderRadius:10, padding:'14px', marginBottom:14, border:'1px solid #eee' }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{editingControlId ? 'Editar registro' : 'Nuevo registro'}</div>
                <div style={{ marginBottom:10 }}>
                  <label style={lbl}>Estudio</label>
                  <select style={inp} value={controlForm.study_type} onChange={e => setControlForm(p => ({ ...p, study_type: e.target.value, result:'' }))}>
                    <option value="">Seleccionar...</option>
                    {['1er trimestre (sem 6-13)','2do trimestre (sem 14-27)','3er trimestre (sem 28+)'].map((group, gi) => (
                      <optgroup key={gi} label={group}>
                        {visibleStudies.filter(s => s.trimester === gi+1).map(s => (
                          <option key={s.key} value={s.key}>{s.label} (sem {s.weeks})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div>
                    <label style={lbl}>Fecha</label>
                    <input type="date" style={inp} value={controlForm.study_date} onChange={e => setControlForm(p => ({ ...p, study_date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Semana en que se realizó</label>
                    <input type="number" style={inp} value={controlForm.week_done} onChange={e => setControlForm(p => ({ ...p, week_done: e.target.value }))} placeholder="Ej: 12" />
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={lbl}>Resultado</label>
                  <select style={inp} value={controlForm.result} onChange={e => setControlForm(p => ({ ...p, result: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {RESULTS_NORMAL.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={lbl}>Notas (opcional)</label>
                  <textarea style={{ ...inp, height:50, resize:'vertical' }} value={controlForm.notes} onChange={e => setControlForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setShowControlForm(false); setEditingControlId(null) }}
                    style={{ padding:'7px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                    Cancelar
                  </button>
                  <button onClick={saveControl} disabled={saving || !controlForm.study_type}
                    style={{ flex:1, padding:'7px', background: !controlForm.study_type ? '#f0f0f0' : G, color: !controlForm.study_type ? '#bbb' : '#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                    {saving ? 'Guardando...' : editingControlId ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista estudios por trimestre */}
            {[1,2,3].map(tri => (
              <div key={tri}>
                <div style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.05em', padding:'8px 0 4px', marginTop:4 }}>
                  {tri === 1 ? '1er' : tri === 2 ? '2do' : '3er'} trimestre
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {visibleStudies.filter(s => s.trimester === tri).map(study => {
                    const last = getLastControl(study.key)
                    const isAnormal = last?.result === 'Anormal'
                    return (
                      <div key={study.key} style={{ background:'#f8f8f8', borderRadius:8, padding:'8px 10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background: isAnormal ? '#c0392b' : !last ? '#bbb' : G }} />
                          <div style={{ fontSize:11, fontWeight:600, color:'#1a1a1a', lineHeight:1.3 }}>{study.label}</div>
                        </div>
                        <div style={{ fontSize:10, color:'#aaa', marginBottom:4 }}>
                          {last ? `${formatDate(last.study_date)}${last.week_done ? ` · sem ${last.week_done}` : ''}` : `Sem ${study.weeks}`}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          {last ? (
                            <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background: isAnormal ? '#fdecea' : '#E1F5EE', color: isAnormal ? '#c0392b' : G, fontWeight:500 }}>
                              {last.result || 'Sin resultado'}
                            </span>
                          ) : (
                            <span style={{ fontSize:10, color:'#ccc' }}>Sin registro</span>
                          )}
                          {last && (
                            <button onClick={() => startEditControl(last)}
                              style={{ background:'none', border:'1px solid #e0e0e0', borderRadius:6, padding:'1px 6px', cursor:'pointer', fontSize:10, color:'#666' }}>
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
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
            {showHistory && controls.map(c => {
              const study = PRENATAL_STUDIES.find(s => s.key === c.study_type)
              return (
                <div key={c.id} style={{ padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{study?.label || c.study_type}</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {c.result && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: c.result === 'Anormal' ? '#fdecea' : '#E1F5EE', color: c.result === 'Anormal' ? '#c0392b' : G, fontWeight:500 }}>{c.result}</span>}
                      <button onClick={() => startEditControl(c)}
                        style={{ background:'none', border:'1px solid #e0e0e0', borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:11, color:'#666' }}>
                        Editar
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{formatDate(c.study_date)}{c.week_done ? ` · sem ${c.week_done}` : ''}{c.notes ? ` · ${c.notes}` : ''}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mi información */}
      {tab === 'info' && (
        <div>
          {!showInfoForm && pregnancyInfo ? (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>Información del embarazo</div>
                <button onClick={() => setShowInfoForm(true)}
                  style={{ padding:'5px 12px', background:'none', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666' }}>
                  Editar
                </button>
              </div>
              {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:13, color:G }}>✓ Información actualizada</div>}
              {[
                { label:'Primer embarazo', value: pregnancyInfo.is_first_pregnancy ? 'Sí' : 'No' },
                { label:'Embarazo múltiple', value: pregnancyInfo.is_multiple ? (pregnancyInfo.multiple_type || 'Sí') : 'No' },
                { label:'Rh mamá negativo', value: pregnancyInfo.mother_rh_negative ? 'Sí' : 'No' },
                { label:'Rh papá negativo', value: pregnancyInfo.father_rh_negative ? 'Sí' : 'No' },
                { label:'Condiciones crónicas', value: pregnancyInfo.chronic_conditions?.join(', ') || 'Ninguna' },
                { label:'Parto anterior complicado', value: !pregnancyInfo.is_first_pregnancy ? (pregnancyInfo.previous_complicated_birth ? 'Sí' : 'No') : 'N/A' },
                { label:'Estatura mamá', value: pregnancyInfo.mother_height_cm ? `${pregnancyInfo.mother_height_cm} cm` : '--' },
                { label:'Estatura papá', value: pregnancyInfo.father_height_cm ? `${pregnancyInfo.father_height_cm} cm` : '--' },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <span style={{ fontSize:13, color:'#888' }}>{item.label}</span>
                  <span style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{item.value}</span>
                </div>
              ))}
              {pregnancyInfo.previous_birth_notes && (
                <div style={{ marginTop:8, fontSize:12, color:'#888' }}>Notas parto anterior: {pregnancyInfo.previous_birth_notes}</div>
              )}
            </div>
          ) : (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>
                {pregnancyInfo ? 'Editar información' : 'Información del embarazo'}
              </div>

              {/* Primer embarazo */}
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>¿Es tu primer embarazo?</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[{v:true,l:'Sí'},{v:false,l:'No'}].map(o => (
                    <button key={String(o.v)} onClick={() => setInfoForm(p => ({ ...p, is_first_pregnancy: o.v }))}
                      style={{ flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: infoForm.is_first_pregnancy === o.v ? G : '#f0f0f0', color: infoForm.is_first_pregnancy === o.v ? '#fff' : '#666' }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parto anterior complicado */}
              {!infoForm.is_first_pregnancy && (
                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>¿El parto anterior fue complicado?</label>
                  <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                    {[{v:true,l:'Sí'},{v:false,l:'No'}].map(o => (
                      <button key={String(o.v)} onClick={() => setInfoForm(p => ({ ...p, previous_complicated_birth: o.v }))}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: infoForm.previous_complicated_birth === o.v ? G : '#f0f0f0', color: infoForm.previous_complicated_birth === o.v ? '#fff' : '#666' }}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                  {infoForm.previous_complicated_birth && (
                    <textarea style={{ ...inp, height:50 }} value={infoForm.previous_birth_notes}
                      onChange={e => setInfoForm(p => ({ ...p, previous_birth_notes: e.target.value }))}
                      placeholder="Describí brevemente qué ocurrió..." />
                  )}
                </div>
              )}

              {/* Rh */}
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>Rh sanguíneo</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    { key:'mother_rh_negative', label:'La mamá tiene Rh negativo' },
                    { key:'father_rh_negative', label:'El papá tiene Rh negativo' },
                  ].map(r => (
                    <div key={r.key} onClick={() => setInfoForm(p => ({ ...p, [r.key]: !p[r.key] }))}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:8, cursor:'pointer', border: infoForm[r.key] ? `2px solid ${G}` : '2px solid #eee', background: infoForm[r.key] ? '#E1F5EE' : '#f8f8f8' }}>
                      <div style={{ width:16, height:16, borderRadius:4, border: infoForm[r.key] ? `2px solid ${G}` : '2px solid #ccc', background: infoForm[r.key] ? G : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {infoForm[r.key] && <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:13 }}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Embarazo múltiple */}
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>¿Es un embarazo múltiple?</label>
                <div style={{ display:'flex', gap:8, marginBottom:6 }}>
                  {[{v:false,l:'No, único'},{v:true,l:'Sí, múltiple'}].map(o => (
                    <button key={String(o.v)} onClick={() => setInfoForm(p => ({ ...p, is_multiple: o.v }))}
                      style={{ flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: infoForm.is_multiple === o.v ? G : '#f0f0f0', color: infoForm.is_multiple === o.v ? '#fff' : '#666' }}>
                      {o.l}
                    </button>
                  ))}
                </div>
                {infoForm.is_multiple && (
                  <select style={inp} value={infoForm.multiple_type} onChange={e => setInfoForm(p => ({ ...p, multiple_type: e.target.value }))}>
                    <option value="">Seleccionar tipo...</option>
                    <option value="Embarazo gemelar (gemelos)">Embarazo gemelar (gemelos)</option>
                    <option value="Embarazo triple (trillizos)">Embarazo triple (trillizos)</option>
                    <option value="Embarazo múltiple (4 o más)">Embarazo múltiple (4 o más)</option>
                  </select>
                )}
              </div>

              {/* Condiciones crónicas */}
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>¿Tenés alguna condición crónica de fondo?</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {CHRONIC_CONDITIONS.map(c => (
                    <button key={c} onClick={() => toggleCondition(c)}
                      style={{ padding:'6px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background: infoForm.chronic_conditions.includes(c) ? (c === 'Ninguna' ? '#555' : '#fdecea') : '#f0f0f0', color: infoForm.chronic_conditions.includes(c) ? (c === 'Ninguna' ? '#fff' : '#c0392b') : '#666' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estaturas */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <div>
                  <label style={lbl}>Estatura de la mamá (cm)</label>
                  <input type="number" style={inp} value={infoForm.mother_height_cm} onChange={e => setInfoForm(p => ({ ...p, mother_height_cm: e.target.value }))} placeholder="165" />
                </div>
                <div>
                  <label style={lbl}>Estatura del papá (cm)</label>
                  <input type="number" style={inp} value={infoForm.father_height_cm} onChange={e => setInfoForm(p => ({ ...p, father_height_cm: e.target.value }))} placeholder="175" />
                </div>
              </div>

              <div style={{ display:'flex', gap:8 }}>
                {pregnancyInfo && (
                  <button onClick={() => setShowInfoForm(false)}
                    style={{ padding:'8px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                    Cancelar
                  </button>
                )}
                <button onClick={saveInfo} disabled={saving}
                  style={{ flex:1, padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : 'Guardar información'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consejo IA */}
      {tab === 'ia' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Consejo personalizado</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>
              Consejos según tu semana de gestación, tipo de embarazo y condiciones de salud.
            </div>
            <button onClick={getAiAdvice} disabled={aiLoading}
              style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? 'Generando consejo...' : aiAdvice ? 'Nuevo consejo' : 'Obtener consejo'}
            </button>
          </div>
          {aiAdvice && (
            <div style={{ background:'#E1F5EE', border:'1px solid #c8e6da', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:12, fontWeight:600, color:G, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Tu consejo de hoy</div>
              <div style={{ fontSize:13, color:'#1a1a1a', lineHeight:1.7 }}>{renderMarkdown(aiAdvice)}</div>
            </div>
          )}

          {/* Botón desactivar embarazo */}
          <div style={{ marginTop:16, background:'#f8f8f8', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#555', marginBottom:6 }}>¿Ya nació tu bebé?</div>
            <div style={{ fontSize:12, color:'#888', marginBottom:10 }}>Si ya tuviste a tu bebé, podés desactivar el modo embarazo.</div>
            <button onClick={() => { if(window.confirm('¿Confirmar que ya nació tu bebé y desactivar el modo embarazo?')) onDeactivate() }}
              style={{ width:'100%', padding:'9px', background:'none', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#888' }}>
              Desactivar modo embarazo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
