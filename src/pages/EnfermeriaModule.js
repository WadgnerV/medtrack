import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ClinicalNoteForm from '../components/ClinicalNoteForm'
import { TRATAMIENTOS_PREDEFINIDOS } from '../components/ListasPredefinidas'

const COLOR = '#c0392b'

export default function EnfermeriaModule({ patient, careModule, canEdit, profile, defaultTab })  {
  const [tab, setTab] = useState(defaultTab || (canEdit ? 'notas' : 'tratamientos'))
  useEffect(() => { if (defaultTab) setTab(defaultTab) }, [defaultTab])
  const [treatments, setTreatments] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [showTratForm, setShowTratForm] = useState(false)
  const [tratSeleccionado, setTratSeleccionado] = useState('')
  const [tratOtra, setTratOtra] = useState('')
  const [tratDosage, setTratDosage] = useState('')
  const [tratDescription, setTratDescription] = useState('')
  const [savingTrat, setSavingTrat] = useState(false)
  const [showDiagForm, setShowDiagForm] = useState(false)
  const [diagSearch, setDiagSearch] = useState('')
  const [diagResults, setDiagResults] = useState([])

  useEffect(() => { if (patient?.id) { loadTreatments(); loadDiagnoses() } }, [patient])

  async function loadTreatments() {
    const { data } = await supabase.from('treatments').select('*')
      .eq('patient_id', patient.id).eq('status', 'active')
      .order('created_at', { ascending: false })
    setTreatments(data || [])
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses').select('*')
      .eq('patient_id', patient.id).eq('is_active', true)
    setDiagnoses(data || [])
  }

  async function searchCie10(q) {
    if (!q || q.length < 2) { setDiagResults([]); return }
    const { data } = await supabase.from('cie10').select('code, description')
      .or(`description.ilike.%${q}%,code.ilike.%${q}%`).limit(8)
    setDiagResults(data || [])
  }

  async function addDiagnosis(item) {
    await supabase.from('patient_diagnoses').insert({
      patient_id: patient.id, cie10_code: item.code, cie10_description: item.description,
      diagnosis_date: new Date().toISOString().split('T')[0], is_active: true,
    })
    setDiagSearch(''); setDiagResults([]); setShowDiagForm(false)
    await loadDiagnoses()
  }

  async function deleteDiagnosis(id) {
    await supabase.from('patient_diagnoses').update({ is_active: false }).eq('id', id)
    await loadDiagnoses()
  }

  async function saveTratamiento() {
    const name = tratSeleccionado === 'otra' ? tratOtra.trim() : tratSeleccionado
    if (!name) return
    setSavingTrat(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('treatments').insert({
      patient_id: patient.id, name, description: tratDescription, dosage: tratDosage, status:'active', created_by: user.id
    })
    setTratSeleccionado(''); setTratOtra(''); setTratDosage(''); setTratDescription('')
    setShowTratForm(false); setSavingTrat(false)
    await loadTreatments()
  }

  async function deleteTratamiento(id) {
    await supabase.from('treatments').update({ status:'inactive' }).eq('id', id)
    await loadTreatments()
  }

  const TABS = [
    ...(canEdit ? [{ key:'notas', label:'Notas clínicas' }] : []),
    { key:'tratamientos', label:'Tratamientos' },
    { key:'diagnosticos', label:'Diagnósticos' },
  ]

  const inp = { padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', width:'100%' }

  return (
    <div>
      {!defaultTab && <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? COLOR : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>}

      {tab === 'notas' && (
        <ClinicalNoteForm patientId={patient?.id} moduleType="enfermeria" color={COLOR} patient={patient} profile={profile} />
      )}

      {tab === 'tratamientos' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Tratamientos activos</div>
            {canEdit && <button onClick={() => setShowTratForm(!showTratForm)} style={{ padding:'5px 12px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12 }}>+ Agregar</button>}
          </div>
          {canEdit && showTratForm && (
            <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px', marginBottom:12, maxWidth:480 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
                <select value={tratSeleccionado} onChange={e => setTratSeleccionado(e.target.value)}
                  style={{ padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', background:'#fff', fontFamily:'inherit' }}>
                  <option value="">Seleccioná un tratamiento...</option>
                  {TRATAMIENTOS_PREDEFINIDOS.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="otra">+ Otro tratamiento</option>
                </select>
                {tratSeleccionado === 'otra' && (
                  <input placeholder="Nombre del tratamiento *" value={tratOtra} onChange={e => setTratOtra(e.target.value)}
                    style={{ padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <input placeholder="Descripción (opcional)" value={tratDescription} onChange={e => setTratDescription(e.target.value)}
                    style={{ flex:1, padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                  <input placeholder="Dosis" value={tratDosage} onChange={e => setTratDosage(e.target.value)}
                    style={{ width:100, padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowTratForm(false)} style={{ padding:'6px 12px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>Cancelar</button>
                <button onClick={saveTratamiento} disabled={savingTrat} style={{ padding:'6px 16px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>{savingTrat ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          )}
          {treatments.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin tratamientos activos.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {treatments.map(t => (
                <div key={t.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px', position:'relative' }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a', marginBottom:2 }}>{t.name}</div>
                  {t.description && <div style={{ fontSize:11, color:'#888' }}>{t.description}</div>}
                  {t.dosage && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Dosis: {t.dosage}</div>}
                  {canEdit && <button onClick={() => deleteTratamiento(t.id)} style={{ position:'absolute', top:6, right:6, background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#ccc' }}>×</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'diagnosticos' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Diagnósticos activos</div>
            {canEdit && <button onClick={() => setShowDiagForm(!showDiagForm)} style={{ padding:'5px 12px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12 }}>+ Agregar</button>}
          </div>
          {canEdit && showDiagForm && (
            <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px', marginBottom:12 }}>
              <input placeholder="Buscar código o nombre CIE-10..." value={diagSearch}
                onChange={e => { setDiagSearch(e.target.value); searchCie10(e.target.value) }}
                style={{ ...inp, marginBottom:6 }} />
              {diagResults.map(r => (
                <div key={r.code} onClick={() => addDiagnosis(r)}
                  style={{ padding:'7px 10px', cursor:'pointer', borderRadius:8, fontSize:12, display:'flex', justifyContent:'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8d7d5'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <span>{r.description}</span>
                  <span style={{ color:COLOR, fontWeight:500 }}>{r.code}</span>
                </div>
              ))}
            </div>
          )}
          {diagnoses.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin diagnósticos registrados.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {diagnoses.map(d => (
                <div key={d.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px', position:'relative' }}>
                  <div style={{ fontSize:12, fontWeight:500, marginBottom:4 }}>{d.cie10_description}</div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#fde8e8', color:COLOR, fontWeight:500 }}>{d.cie10_code}</span>
                  {canEdit && <button onClick={() => deleteDiagnosis(d.id)} style={{ position:'absolute', top:6, right:6, background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#ccc' }}>×</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
