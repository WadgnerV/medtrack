import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'

const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }

export default function DiagnosticosTab({ patient, profile }) {
  const [diagnoses, setDiagnoses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const patientId = patient.id
  const canEdit = ['clinic_admin', 'admin', 'branch_admin', 'doctor'].includes(profile?.role)

  useEffect(() => { loadDiagnoses() }, [patientId])

  async function loadDiagnoses() {
    setLoading(true)
    const { data } = await supabase.from('patient_diagnoses')
      .select('*, diagnoser:diagnosed_by(first_name, last_name, prefix)')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('diagnosis_date', { ascending: false })
    setDiagnoses(data || [])
    setLoading(false)
  }

  async function searchCie10(term) {
    setSearch(term)
    if (!term || term.length < 2) { setResults([]); return }
    setSearching(true)
    const { data } = await supabase.from('cie10')
      .select('code, description')
      .or(`code.ilike.%${term}%,description.ilike.%${term}%`)
      .limit(10)
    setResults(data || [])
    setSearching(false)
  }

  async function addDiagnosis(code, description) {
    await supabase.from('patient_diagnoses').insert({
      patient_id: patientId,
      cie10_code: code,
      cie10_description: description,
      diagnosed_by: profile?.id,
      diagnosis_date: new Date().toISOString().split('T')[0],
      module_type: 'general',
    })
    setSearch(''); setResults([])
    await loadDiagnoses()
  }

  async function removeDiagnosis(id) {
    if (!window.confirm('¿Desactivar este diagnóstico?')) return
    await supabase.from('patient_diagnoses').update({ is_active: false }).eq('id', id)
    await loadDiagnoses()
  }

  return (
    <div style={{ padding:4 }}>
      <div style={{ fontSize:14, fontWeight:700, color:BLUE, marginBottom:16 }}>Diagnósticos</div>

      {canEdit && (
        <div style={{ marginBottom:20, position:'relative' }}>
          <label style={lbl}>Buscar por código CIE-10 o descripción</label>
          <input style={inp} value={search} onChange={e => searchCie10(e.target.value)}
            placeholder="Ej: E11, diabetes, hipertensión..." />
          {results.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:8, zIndex:50, maxHeight:220, overflowY:'auto', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', marginTop:4 }}>
              {results.map(r => (
                <div key={r.code} onClick={() => addDiagnosis(r.code, r.description)}
                  style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'0.5px solid #f0f5f3', fontSize:13 }}
                  onMouseEnter={e => e.currentTarget.style.background='#f4faf7'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                  <span style={{ fontWeight:700, color:G, marginRight:8 }}>{r.code}</span>
                  {r.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : diagnoses.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Sin diagnósticos registrados.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {diagnoses.map(d => {
            const author = d.diagnoser ? `${d.diagnoser.prefix||''} ${d.diagnoser.first_name} ${d.diagnoser.last_name}`.trim() : ''
            const date = d.diagnosis_date ? new Date(d.diagnosis_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' }) : ''
            return (
              <div key={d.id} style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:10, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:G, background:'#E1F5EE', padding:'2px 8px', borderRadius:20 }}>{d.cie10_code}</span>
                    <span style={{ fontSize:13, fontWeight:500, color:BLUE }}>{d.cie10_description}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#aaa' }}>
                    {date}{author ? ` · ${author}` : ''}
                  </div>
                </div>
                {canEdit && (
                  <button onClick={() => removeDiagnosis(d.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#D85A30', fontSize:11, padding:'2px 8px', borderRadius:6, border:'0.5px solid #fde0e0', whiteSpace:'nowrap', flexShrink:0 }}>
                    Desactivar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
