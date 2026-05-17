import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'

const STUDIES = [
  {
    key: 'pap',
    label: 'PAP / Citología',
    intervalMonths: 12,
    results: ['Normal', 'Cambios inflamatorios', 'Displasia leve', 'Displasia moderada/severa', 'Anormal'],
    abnormal: ['Displasia leve', 'Displasia moderada/severa', 'Anormal'],
  },
  {
    key: 'vph',
    label: 'VPH',
    intervalMonths: 36,
    results: ['Negativo', 'Positivo de bajo riesgo', 'Positivo de alto riesgo', 'Anormal'],
    abnormal: ['Positivo de alto riesgo', 'Anormal'],
  },
  {
    key: 'us_mamas',
    label: 'Ultrasonido de mamas',
    intervalMonths: 12,
    results: ['Normal', 'Quistes simples', 'Nódulo a seguimiento', 'Anormal'],
    abnormal: ['Nódulo a seguimiento', 'Anormal'],
  },
  {
    key: 'mamografia',
    label: 'Mamografía',
    intervalMonths: 12,
    results: ['Normal', 'Cambios benignos', 'Requiere seguimiento', 'Anormal'],
    abnormal: ['Requiere seguimiento', 'Anormal'],
    ageFrom: 40,
  },
  {
    key: 'us_pelvico',
    label: 'Ultrasonido pélvico',
    intervalMonths: 12,
    results: ['Normal', 'Quistes ováricos', 'Miomas', 'Anormal'],
    abnormal: ['Anormal'],
  },
  {
    key: 'densitometria',
    label: 'Densitometría ósea',
    intervalMonths: 24,
    results: ['Normal', 'Osteopenia', 'Osteoporosis'],
    abnormal: ['Osteoporosis'],
    ageFrom: 50,
  },
  {
    key: 'perfil_hormonal',
    label: 'Perfil hormonal',
    intervalMonths: 12,
    results: ['Normal', 'Alterado'],
    abnormal: ['Alterado'],
  },
  {
    key: 'colposcopia',
    label: 'Colposcopia',
    intervalMonths: 12,
    results: ['Normal', 'Cambios leves', 'Requiere biopsia', 'Anormal'],
    abnormal: ['Requiere biopsia', 'Anormal'],
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

export default function FemaleControlModule({ patient }) {
  const [controls, setControls] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ study_type: '', study_date: new Date().toISOString().split('T')[0], result: '', notes: '' })

  const age = patient?.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date + 'T12:00:00')) / (1000*60*60*24*365.25))
    : 0

  useEffect(() => { if (patient?.id) loadControls() }, [patient])

  async function loadControls() {
    const { data } = await supabase.from('female_medical_controls')
      .select('*').eq('patient_id', patient.id)
      .order('study_date', { ascending: false })
    setControls(data || [])
  }

  async function saveControl() {
    if (!form.study_type || !form.result || !form.study_date) return
    setSaving(true)
    await supabase.from('female_medical_controls').insert({
      patient_id: patient.id,
      study_type: form.study_type,
      study_date: form.study_date,
      result: form.result,
      notes: form.notes || null,
    })
    await loadControls()
    setForm({ study_type: '', study_date: new Date().toISOString().split('T')[0], result: '', notes: '' })
    setSaving(false); setSaved(true); setShowForm(false)
    setTimeout(() => setSaved(false), 3000)
  }

  // Obtener último resultado por estudio
  function getLastControl(studyKey) {
    return controls.find(c => c.study_type === studyKey)
  }

  const selectedStudy = STUDIES.find(s => s.key === form.study_type)
  const visibleStudies = STUDIES.filter(s => !s.ageFrom || age >= s.ageFrom)

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  return (
    <div>
      {/* Alertas de resultados anormales */}
      {visibleStudies.map(study => {
        const last = getLastControl(study.key)
        if (!last) return null
        const isAbnormal = study.abnormal.includes(last.result)
        if (!isAbnormal) return null
        return (
          <div key={study.key} style={{ background:'#fdecea', border:'1px solid #f5c6c6', borderRadius:10, padding:'10px 14px', marginBottom:10, fontSize:12 }}>
            <div style={{ fontWeight:600, color:'#c0392b', marginBottom:2 }}>Atención — {study.label}</div>
            <div style={{ color:'#555' }}>Tu último resultado fue <strong>{last.result}</strong>. Este resultado requiere evaluación médica. Contactá a tu médico a la brevedad.</div>
          </div>
        )
      })}

      {/* Lista de estudios con estado */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:600 }}>Mis estudios preventivos</div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding:'6px 14px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
            + Registrar
          </button>
        </div>

        {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:13, color:G }}>✓ Estudio registrado correctamente</div>}

        {/* Formulario */}
        {showForm && (
          <div style={{ background:'#f8f8f8', borderRadius:10, padding:'14px', marginBottom:14, border:'1px solid #eee' }}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>Nuevo registro</div>
            <div style={{ marginBottom:10 }}>
              <label style={lbl}>Estudio</label>
              <select style={inp} value={form.study_type} onChange={e => setForm(p => ({ ...p, study_type: e.target.value, result: '' }))}>
                <option value="">Seleccionar...</option>
                {visibleStudies.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={lbl}>Fecha del estudio</label>
                <input type="date" style={inp} value={form.study_date} onChange={e => setForm(p => ({ ...p, study_date: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Resultado</label>
                <select style={inp} value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} disabled={!form.study_type}>
                  <option value="">Seleccionar...</option>
                  {selectedStudy?.results.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={lbl}>Notas adicionales (opcional)</label>
              <textarea style={{ ...inp, height:50, resize:'vertical' }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones del médico, institución, etc." />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding:'7px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                Cancelar
              </button>
              <button onClick={saveControl} disabled={saving || !form.study_type || !form.result}
                style={{ flex:1, padding:'7px', background: (!form.study_type || !form.result) ? '#f0f0f0' : G, color: (!form.study_type || !form.result) ? '#bbb' : '#fff', border:'none', borderRadius:8, cursor: (!form.study_type || !form.result) ? 'default' : 'pointer', fontSize:13, fontWeight:500 }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* Estado de cada estudio */}
        {visibleStudies.map(study => {
          const last = getLastControl(study.key)
          const months = last ? monthsDiff(last.study_date) : null
          const isOverdue = last && months >= study.intervalMonths
          const isAbnormal = last && study.abnormal.includes(last.result)
          const noRecord = !last

          return (
            <div key={study.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'0.5px solid #f5f5f5' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, background: isAbnormal ? '#c0392b' : isOverdue ? '#e67e22' : noRecord ? '#bbb' : G }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{study.label}</div>
                {last ? (
                  <div style={{ fontSize:11, color: isAbnormal ? '#c0392b' : isOverdue ? '#e67e22' : '#888' }}>
                    {formatDate(last.study_date)} · {last.result}
                    {isOverdue && !isAbnormal && ' · Pendiente de repetir'}
                    {isAbnormal && ' · Requiere atención médica'}
                  </div>
                ) : (
                  <div style={{ fontSize:11, color:'#bbb' }}>Sin registro</div>
                )}
              </div>
              {isOverdue && !isAbnormal && (
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#fff3e0', color:'#e67e22', fontWeight:500, whiteSpace:'nowrap' }}>Vencido</span>
              )}
              {isAbnormal && (
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#fdecea', color:'#c0392b', fontWeight:500, whiteSpace:'nowrap' }}>Atención</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Historial */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showHistory ? 12 : 0 }}>
          <div style={{ fontSize:14, fontWeight:600 }}>Historial de estudios</div>
          <button onClick={() => setShowHistory(!showHistory)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:G, fontWeight:500 }}>
            {showHistory ? 'Ocultar' : 'Ver historial'}
          </button>
        </div>
        {showHistory && (
          controls.length === 0 ? (
            <div style={{ fontSize:13, color:'#bbb', textAlign:'center', padding:16 }}>Sin registros aún</div>
          ) : (
            controls.map(c => {
              const study = STUDIES.find(s => s.key === c.study_type)
              const isAbnormal = study?.abnormal.includes(c.result)
              return (
                <div key={c.id} style={{ padding:'8px 0', borderBottom:'0.5px solid #f5f5f5' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{study?.label || c.study_type}</div>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: isAbnormal ? '#fdecea' : '#E1F5EE', color: isAbnormal ? '#c0392b' : G, fontWeight:500 }}>{c.result}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{formatDate(c.study_date)}{c.notes ? ` · ${c.notes}` : ''}</div>
                </div>
              )
            })
          )
        )}
      </div>
    </div>
  )
}
