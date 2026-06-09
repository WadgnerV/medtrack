import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ClinicalNoteForm from '../components/ClinicalNoteForm'
import NutricionPlanForm from '../components/NutricionPlanForm'
import { TrendingDown, TrendingUp, Plus, Trash2 } from 'lucide-react'

const COLOR = '#2e7d32'
const COLOR_L = '#e8f5e9'

const emptyMeasurement = {
  measured_at: new Date().toISOString().split('T')[0],
  weight_kg: '', height_cm: '', waist_cm: '', hip_cm: '',
  neck_cm: '', body_fat_pct: '', muscle_mass_kg: '', notes: ''
}

function calcIMC(weight, height) {
  if (!weight || !height) return null
  const h = parseFloat(height) / 100
  return (parseFloat(weight) / (h * h)).toFixed(1)
}

function calcICCintura(waist, hip) {
  if (!waist || !hip) return null
  return (parseFloat(waist) / parseFloat(hip)).toFixed(2)
}

function DeltaBadge({ delta, unit }) {
  if (delta === null || delta === undefined) return null
  const positive = delta < 0
  const color = positive ? COLOR : '#D85A30'
  const bg = positive ? COLOR_L : '#FAECE7'
  const sign = delta > 0 ? '+' : ''
  return (
    <span style={{ fontSize:11, fontWeight:600, color, background:bg, padding:'2px 7px', borderRadius:20, display:'inline-flex', alignItems:'center', gap:3 }}>
      {delta < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
      {sign}{delta} {unit}
    </span>
  )
}

function calcDelta(data, key) {
  const sorted = [...data].filter(m => m[key]).sort((a,b) => new Date(a.measured_at) - new Date(b.measured_at))
  if (sorted.length < 2) return null
  return +(parseFloat(sorted[sorted.length-1][key]) - parseFloat(sorted[0][key])).toFixed(1)
}

export default function NutricionModule({ patient, careModule, canEdit, profile, defaultTab }) {
  const [tab, setTab] = useState(defaultTab || (canEdit ? 'notas' : 'plan'))
  const [measurements, setMeasurements] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [showMeasForm, setShowMeasForm] = useState(false)
  const [measForm, setMeasForm] = useState(emptyMeasurement)
  const [savingMeas, setSavingMeas] = useState(false)
  const [showDiagForm, setShowDiagForm] = useState(false)
  const [diagSearch, setDiagSearch] = useState('')
  const [diagResults, setDiagResults] = useState([])

  useEffect(() => { if (defaultTab) setTab(defaultTab) }, [defaultTab])
  useEffect(() => { if (patient?.id) { loadMeasurements(); loadDiagnoses() } }, [patient])

  async function loadMeasurements() {
    const { data } = await supabase.from('nutrition_measurements')
      .select('*').eq('patient_id', patient.id)
      .order('measured_at', { ascending: false })
    setMeasurements(data || [])
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses')
      .select('*').eq('patient_id', patient.id).eq('is_active', true)
    setDiagnoses(data || [])
  }

  async function saveMeasurement() {
    if (!measForm.weight_kg && !measForm.height_cm) return
    setSavingMeas(true)
    await supabase.from('nutrition_measurements').insert({
      patient_id: patient.id,
      measured_at: measForm.measured_at,
      weight_kg: measForm.weight_kg ? parseFloat(measForm.weight_kg) : null,
      height_cm: measForm.height_cm ? parseFloat(measForm.height_cm) : null,
      waist_cm: measForm.waist_cm ? parseFloat(measForm.waist_cm) : null,
      hip_cm: measForm.hip_cm ? parseFloat(measForm.hip_cm) : null,
      neck_cm: measForm.neck_cm ? parseFloat(measForm.neck_cm) : null,
      body_fat_pct: measForm.body_fat_pct ? parseFloat(measForm.body_fat_pct) : null,
      muscle_mass_kg: measForm.muscle_mass_kg ? parseFloat(measForm.muscle_mass_kg) : null,
      notes: measForm.notes || null,
      recorded_by: profile?.id,
    })
    setMeasForm(emptyMeasurement)
    setShowMeasForm(false)
    await loadMeasurements()
    setSavingMeas(false)
  }

  async function deleteMeasurement(id) {
    await supabase.from('nutrition_measurements').delete().eq('id', id)
    setMeasurements(p => p.filter(m => m.id !== id))
  }

  async function searchCie10(q) {
    if (!q || q.length < 2) { setDiagResults([]); return }
    const { data } = await supabase.from('cie10').select('code, description')
      .or(`description.ilike.%${q}%,code.ilike.%${q}%`).limit(8)
    setDiagResults(data || [])
  }

  async function addDiagnosis(item) {
    await supabase.from('patient_diagnoses').insert({
      patient_id: patient.id, cie10_code: item.code,
      cie10_description: item.description,
      diagnosis_date: new Date().toISOString().split('T')[0], is_active: true,
    })
    setDiagSearch(''); setDiagResults([]); setShowDiagForm(false)
    await loadDiagnoses()
  }

  async function deleteDiagnosis(id) {
    await supabase.from('patient_diagnoses').update({ is_active: false }).eq('id', id)
    await loadDiagnoses()
  }

  const latest = measurements[0] || null
  const imc = latest ? calcIMC(latest.weight_kg, latest.height_cm) : null
  const icc = latest ? calcICCintura(latest.waist_cm, latest.hip_cm) : null

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }
  const f = k => e => setMeasForm(p => ({ ...p, [k]: e.target.value }))

  const TABS = [
    ...(canEdit ? [{ key:'notas', label:'Notas clínicas' }] : []),
    { key:'plan',           label:'Plan nutricional'   },
    { key:'antropometria',  label:'Antropometría'      },
    { key:'diagnosticos',   label:'Diagnósticos'       },
  ]

  return (
    <div>
      {!defaultTab && (
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                background: tab===t.key ? COLOR : '#f0f0f0', color: tab===t.key ? '#fff' : '#666' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'notas' && (
        <ClinicalNoteForm patientId={patient?.id} moduleType='nutricion' color={COLOR} patient={patient} profile={profile} />
      )}

      {tab === 'plan' && (
        <NutricionPlanForm patientId={patient?.id} profile={profile} patient={patient} />
      )}

      {tab === 'antropometria' && (
        <div>
          {/* KPIs última medición */}
          {latest && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px,1fr))', gap:12, marginBottom:16 }}>
              {[
                { label:'Peso', valor: latest.weight_kg ? latest.weight_kg+' kg' : '--', delta: calcDelta(measurements,'weight_kg'), unit:'kg' },
                { label:'IMC', valor: imc || '--', delta: null, unit:'' },
                { label:'% Grasa', valor: latest.body_fat_pct ? latest.body_fat_pct+'%' : '--', delta: calcDelta(measurements,'body_fat_pct'), unit:'%' },
                { label:'Cintura', valor: latest.waist_cm ? latest.waist_cm+' cm' : '--', delta: calcDelta(measurements,'waist_cm'), unit:'cm' },
                { label:'Cadera', valor: latest.hip_cm ? latest.hip_cm+' cm' : '--', delta: calcDelta(measurements,'hip_cm'), unit:'cm' },
                { label:'ICC', valor: icc || '--', delta: null, unit:'' },
              ].map(kpi => (
                <div key={kpi.label} style={{ background:'#fff', border:'1px solid #e2ede9', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, color:'#8aab9a', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>{kpi.label}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:'#1a3a5c', marginTop:2 }}>{kpi.valor}</div>
                  {kpi.delta !== null && <div style={{ marginTop:4 }}><DeltaBadge delta={kpi.delta} unit={kpi.unit} /></div>}
                </div>
              ))}
            </div>
          )}

          {/* Botón nueva medición */}
          {canEdit && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
              <button onClick={() => setShowMeasForm(!showMeasForm)}
                style={{ padding:'7px 16px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
                <Plus size={14} /> Nueva medición
              </button>
            </div>
          )}

          {/* Formulario nueva medición */}
          {canEdit && showMeasForm && (
            <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', marginBottom:12 }}>Nueva medición antropométrica</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Fecha</label>
                  <input type="date" style={inp} value={measForm.measured_at} onChange={f('measured_at')} />
                </div>
                <div><label style={lbl}>Peso (kg)</label><input type="number" style={inp} value={measForm.weight_kg} onChange={f('weight_kg')} placeholder="68.5" /></div>
                <div><label style={lbl}>Talla (cm)</label><input type="number" style={inp} value={measForm.height_cm} onChange={f('height_cm')} placeholder="165" /></div>
                <div><label style={lbl}>Cintura (cm)</label><input type="number" style={inp} value={measForm.waist_cm} onChange={f('waist_cm')} placeholder="82" /></div>
                <div><label style={lbl}>Cadera (cm)</label><input type="number" style={inp} value={measForm.hip_cm} onChange={f('hip_cm')} placeholder="98" /></div>
                <div><label style={lbl}>Cuello (cm)</label><input type="number" style={inp} value={measForm.neck_cm} onChange={f('neck_cm')} placeholder="34" /></div>
                <div><label style={lbl}>% Grasa corporal</label><input type="number" style={inp} value={measForm.body_fat_pct} onChange={f('body_fat_pct')} placeholder="28.3" /></div>
                <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Masa muscular (kg)</label><input type="number" style={inp} value={measForm.muscle_mass_kg} onChange={f('muscle_mass_kg')} placeholder="42.1" /></div>
                <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Notas</label><input type="text" style={inp} value={measForm.notes} onChange={f('notes')} placeholder="Observaciones..." /></div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
                <button onClick={() => setShowMeasForm(false)}
                  style={{ padding:'7px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                  Cancelar
                </button>
                <button onClick={saveMeasurement} disabled={savingMeas}
                  style={{ padding:'7px 20px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity:savingMeas?0.7:1 }}>
                  {savingMeas ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* Historial */}
          {measurements.length === 0 ? (
            <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Sin mediciones registradas.</div>
          ) : (
            <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#f4f7f6' }}>
                      {['Fecha','Peso','Talla','IMC','Cintura','Cadera','ICC','% Grasa','Músculo',''].map(h => (
                        <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, fontSize:11, color:'#6b8f7e', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m,i) => {
                      const mimc = calcIMC(m.weight_kg, m.height_cm)
                      const micc = calcICCintura(m.waist_cm, m.hip_cm)
                      return (
                        <tr key={m.id} style={{ borderTop:'1px solid #f0f5f3', background: i===0?'#f9fdfb':'#fff' }}>
                          <td style={{ padding:'9px 12px', color:'#6b8f7e', whiteSpace:'nowrap' }}>{new Date(m.measured_at+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'short',year:'numeric'})}</td>
                          <td style={{ padding:'9px 12px', fontWeight:600, color:'#1a3a5c' }}>{m.weight_kg ? m.weight_kg+' kg' : '--'}</td>
                          <td style={{ padding:'9px 12px', color:'#1a3a5c' }}>{m.height_cm ? m.height_cm+' cm' : '--'}</td>
                          <td style={{ padding:'9px 12px', color:'#1a3a5c' }}>{mimc || '--'}</td>
                          <td style={{ padding:'9px 12px', color:'#1a3a5c' }}>{m.waist_cm ? m.waist_cm+' cm' : '--'}</td>
                          <td style={{ padding:'9px 12px', color:'#1a3a5c' }}>{m.hip_cm ? m.hip_cm+' cm' : '--'}</td>
                          <td style={{ padding:'9px 12px', color:'#1a3a5c' }}>{micc || '--'}</td>
                          <td style={{ padding:'9px 12px', color:'#1a3a5c' }}>{m.body_fat_pct ? m.body_fat_pct+'%' : '--'}</td>
                          <td style={{ padding:'9px 12px', color:'#1a3a5c' }}>{m.muscle_mass_kg ? m.muscle_mass_kg+' kg' : '--'}</td>
                          <td style={{ padding:'9px 12px' }}>
                            {canEdit && (
                              <button onClick={() => deleteMeasurement(m.id)}
                                style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', display:'flex', alignItems:'center' }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'diagnosticos' && (
        <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#1a3a5c' }}>Diagnósticos activos</div>
            {canEdit && (
              <button onClick={() => setShowDiagForm(!showDiagForm)}
                style={{ padding:'5px 12px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                <Plus size={12} /> Agregar
              </button>
            )}
          </div>
          {canEdit && showDiagForm && (
            <div style={{ background:'#f8f8f8', borderRadius:10, padding:12, marginBottom:12, position:'relative' }}>
              <input placeholder="Buscar código o nombre CIE-10..." value={diagSearch}
                onChange={e => { setDiagSearch(e.target.value); searchCie10(e.target.value) }}
                style={{ ...inp, marginBottom:6 }} />
              {diagResults.map(r => (
                <div key={r.code} onClick={() => addDiagnosis(r)}
                  style={{ padding:'7px 10px', cursor:'pointer', borderRadius:8, fontSize:12, display:'flex', justifyContent:'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.background='#e8f5e9'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <span>{r.description}</span>
                  <span style={{ color:COLOR, fontWeight:600 }}>{r.code}</span>
                </div>
              ))}
            </div>
          )}
          {diagnoses.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin diagnósticos registrados.</div>
          ) : diagnoses.map((d,i) => (
            <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i<diagnoses.length-1?'1px solid #f0f5f3':'none' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ background:'#e8f5ef', color:'#0F6E56', fontSize:11, borderRadius:4, padding:'2px 7px', fontWeight:700 }}>{d.cie10_code}</span>
                  <span style={{ fontWeight:600, color:'#1a3a5c', fontSize:13 }}>{d.cie10_description}</span>
                </div>
                <div style={{ fontSize:11, color:'#8aab9a', marginTop:3 }}>{d.diagnosis_date}</div>
              </div>
              {canEdit && (
                <button onClick={() => deleteDiagnosis(d.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', display:'flex', alignItems:'center' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
