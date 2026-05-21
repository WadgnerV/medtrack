import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLOR = '#1a5c8a'

export default function IntegralModule({ patient, careModule }) {
  const [clinicalNotes, setClinicalNotes] = useState([])
  const [treatments, setTreatments] = useState([])
  const [tasks, setTasks] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [tab, setTab] = useState(() => localStorage.getItem('integralTab') || 'signos')

  useEffect(() => { localStorage.setItem('integralTab', tab) }, [tab])
  useEffect(() => { if (patient?.id) { loadClinicalNotes(); loadTreatments(); loadTasks(); loadDiagnoses() } }, [patient])

  async function loadClinicalNotes() {
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', patient.id).order('note_date', { ascending: false })
    setClinicalNotes(data || [])
  }

  async function loadTreatments() {
    const { data } = await supabase.from('treatments').select('*').eq('patient_id', patient.id).eq('status', 'active').order('created_at', { ascending: false })
    setTreatments(data || [])
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('patient_id', patient.id).eq('status', 'pending').order('due_date', { ascending: true })
    setTasks(data || [])
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses').select('*').eq('patient_id', patient.id).eq('is_active', true).order('diagnosis_date', { ascending: false })
    setDiagnoses(data || [])
  }

  const TABS = [
    { key:'signos', label:'Signos clínicos' },
    { key:'tratamientos', label:'Tratamientos' },
    { key:'diagnosticos', label:'Diagnósticos' },
    { key:'tareas', label:'Tareas' },
  ]

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? COLOR : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Signos clínicos */}
      {tab === 'signos' && (
        <div>
          {clinicalNotes.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>Sin registros de signos clínicos aún.</div>
          ) : (
            <div>
              {/* Gráficos */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                {clinicalNotes.filter(n => n.pas && n.pad).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Presión arterial (mmHg)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.pas).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), sistolica: n.pas, diastolica: n.pad }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={(v,n) => [v + ' mmHg', n === 'sistolica' ? 'Sistólica' : 'Diastólica']} />
                        <Line type="monotone" dataKey="sistolica" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                        <Line type="monotone" dataKey="diastolica" stroke="#5b8ab8" strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {clinicalNotes.filter(n=>n.glucose).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Glicemia (mg/dL)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.glucose).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), glicemia: n.glucose }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+' mg/dL','Glicemia']} />
                        <Line type="monotone" dataKey="glicemia" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {clinicalNotes.filter(n=>n.heart_rate).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Frecuencia cardíaca (lpm)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.heart_rate).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), fc: n.heart_rate }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+' lpm','FC']} />
                        <Line type="monotone" dataKey="fc" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {clinicalNotes.filter(n=>n.spo2).length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Saturación de oxígeno (%)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={[...clinicalNotes].reverse().filter(n=>n.spo2).map(n=>({ fecha: new Date(n.note_date).toLocaleDateString('es-CR',{day:'numeric',month:'short'}), spo2: n.spo2 }))} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#999' }} />
                        <YAxis tick={{ fontSize:10, fill:'#999' }} domain={[90, 100]} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={v=>[v+'%','SpO₂']} />
                        <Line type="monotone" dataKey="spo2" stroke={COLOR} strokeWidth={2} dot={{ r:2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Historial */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Historial de signos clínicos</div>
                {clinicalNotes.map((n, i) => (
                  <div key={i} style={{ borderBottom:'0.5px solid #f5f5f5', paddingBottom:10, marginBottom:10 }}>
                    <div style={{ fontSize:12, color:'#999', marginBottom:6 }}>
                      {new Date(n.note_date).toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {n.pas && n.pad && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Presión arterial</div><div style={{ fontSize:13, fontWeight:600 }}>{n.pas}/{n.pad} mmHg</div></div>}
                      {n.glucose && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Glicemia</div><div style={{ fontSize:13, fontWeight:600 }}>{n.glucose} mg/dL</div></div>}
                      {n.heart_rate && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Frec. cardíaca</div><div style={{ fontSize:13, fontWeight:600 }}>{n.heart_rate} lpm</div></div>}
                      {n.spo2 && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>SpO₂</div><div style={{ fontSize:13, fontWeight:600 }}>{n.spo2}%</div></div>}
                      {n.weight_kg && <div style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}><div style={{ fontSize:11, color:'#999' }}>Peso</div><div style={{ fontSize:13, fontWeight:600 }}>{n.weight_kg} kg</div></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tratamientos */}
      {tab === 'tratamientos' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Tratamientos activos</div>
          {treatments.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin tratamientos activos.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {treatments.map(t => (
                <div key={t.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:2 }}>{t.name}</div>
                  {t.description && <div style={{ fontSize:12, color:'#888' }}>{t.description}</div>}
                  {t.dosage && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Dosis: {t.dosage}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diagnósticos */}
      {tab === 'diagnosticos' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Diagnósticos activos</div>
          {diagnoses.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin diagnósticos registrados.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {diagnoses.map(d => (
                <div key={d.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a', marginBottom:4 }}>{d.cie10_description}</div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:COLOR, fontWeight:500 }}>{d.cie10_code}</span>
                  {d.diagnosis_date && <div style={{ fontSize:10, color:'#aaa', marginTop:4 }}>{new Date(d.diagnosis_date).toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tareas */}
      {tab === 'tareas' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Tareas pendientes</div>
          {tasks.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin tareas pendientes.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {tasks.map(t => (
                <div key={t.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:2 }}>{t.title}</div>
                  {t.description && <div style={{ fontSize:12, color:'#888' }}>{t.description}</div>}
                  {t.due_date && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Vence: {new Date(t.due_date).toLocaleDateString('es-CR', { day:'numeric', month:'long' })}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
