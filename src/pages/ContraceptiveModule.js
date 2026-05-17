import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const ANTH_URL = 'https://mdcqdigxbmfajlmaxrta.supabase.co/functions/v1/claude-proxy'

const METHODS = [
  {
    type: 'hormonal_oral',
    label: 'Hormonal oral',
    names: ['Píldora combinada', 'Yasmin', 'Microgynon', 'Diane 35', 'Belara', 'Loette', 'Minipíldora (Cerazette)', 'Otro']
  },
  {
    type: 'hormonal_no_oral',
    label: 'Hormonal no oral',
    names: ['Parche anticonceptivo (Evra)', 'Anillo vaginal (NuvaRing)', 'Inyectable mensual (Mesigyna)', 'Inyectable trimestral (Depo-Provera)', 'Implante subdérmico (Implanon)', 'Implante subdérmico (Nexplanon)', 'Otro']
  },
  {
    type: 'diu',
    label: 'DIU',
    names: ['DIU de cobre (Multiload)', 'DIU de cobre (T de cobre)', 'DIU hormonal (Mirena)', 'DIU hormonal (Kyleena)', 'Otro']
  },
  {
    type: 'barrera',
    label: 'Barrera',
    names: ['Condón masculino', 'Condón femenino', 'Diafragma', 'Otro']
  },
  {
    type: 'natural',
    label: 'Planificación familiar natural',
    names: ['Método del ritmo (calendario)', 'Método Billings (moco cervical)', 'Método sintotérmico', 'Otro']
  },
  {
    type: 'permanente',
    label: 'Permanente',
    names: ['Ligadura de trompas']
  },
  {
    type: 'ninguno',
    label: 'Ninguno de los anteriores',
    names: []
  },
]

function renderMarkdown(text) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })
}

export default function ContraceptiveModule({ patient }) {
  const [record, setRecord] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showOther, setShowOther] = useState(false)
  const [aiInfo, setAiInfo] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [confirmedName, setConfirmedName] = useState('')
  const searchTimeout = useState(null)

  const [form, setForm] = useState({
    is_using: false,
    method_type: '',
    method_name: '',
    method_name_other: '',
    start_date: '',
    notes: ''
  })

  useEffect(() => { if (patient?.id) loadRecord() }, [patient])

  async function loadRecord() {
    const { data } = await supabase.from('contraceptive_records')
      .select('*').eq('patient_id', patient.id).single()
    if (data) {
      setRecord(data)
      const isOther = data.method_name && !getMethodNames(data.method_type).includes(data.method_name)
      setForm({
        is_using: data.is_using || false,
        method_type: data.method_type || '',
        method_name: isOther ? 'Otro' : (data.method_name || ''),
        method_name_other: isOther ? data.method_name : '',
        start_date: data.start_date || '',
        notes: data.notes || ''
      })
      setShowOther(isOther)
      // Cargar info IA automáticamente
      getMethodInfo(data.method_type || 'ninguno', data.method_name || '')
    } else {
      setEditing(true)
    }
  }

  function getMethodNames(type) {
    return METHODS.find(m => m.type === type)?.names || []
  }

  async function save() {
    if (form.is_using && !form.method_type) return
    setSaving(true)
    const finalName = form.method_name === 'Otro' ? form.method_name_other : form.method_name
    const payload = {
      patient_id: patient.id,
      is_using: form.is_using,
      method_type: form.is_using ? form.method_type : null,
      method_name: form.is_using ? finalName : null,
      start_date: form.is_using ? (form.start_date || null) : null,
      notes: form.notes || null,
      updated_at: new Date().toISOString()
    }
    if (record?.id) {
      await supabase.from('contraceptive_records').update(payload).eq('id', record.id)
    } else {
      await supabase.from('contraceptive_records').insert(payload)
    }
    await loadRecord()
    setEditing(false)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    // Cargar info IA automáticamente
    const finalMethodType = form.is_using ? form.method_type : 'ninguno'
    const finalMethodName = form.method_name === 'Otro' ? form.method_name_other : form.method_name
    getMethodInfo(finalMethodType, finalMethodName)
  }

  async function searchMedication(query) {
    if (!query || query.length < 2) { setSearchResults([]); return }
    setSearchLoading(true); setSearchResults([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(ANTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `La paciente escribió "${query}" como nombre de su anticonceptivo (puede estar en cualquier idioma o ser un nombre comercial regional de cualquier país). Identificá qué anticonceptivos reales corresponden a ese nombre o nombre similar globalmente. Devuelve SOLO un JSON array con máximo 3 opciones, sin markdown, formato: [{"name": "nombre comercial más conocido", "type": "tipo de anticonceptivo en español"}]. Si hay múltiples nombres para el mismo producto en distintos países, incluí el más relevante. Si no encontrás ningún anticonceptivo con ese nombre, devuelve []. Solo incluí medicamentos anticonceptivos reales.`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || '[]'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setSearchResults(Array.isArray(parsed) ? parsed : [])
    } catch(e) {
      setSearchResults([])
    }
    setSearchLoading(false)
  }

  async function getMethodInfo(methodType, methodName) {
    if (!methodType) return
    setAiLoading(true); setAiInfo('')
    const method = METHODS.find(m => m.type === methodType)
    const name = methodName && methodName !== 'Otro' ? methodName : method?.label
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const prompt = methodType === 'ninguno'
        ? 'La paciente no usa anticonceptivos. Dale un mensaje breve, amable y sin presión indicando que si en algún momento desea iniciar un método anticonceptivo, lo ideal es visitar a su médico tratante para recibir orientación personalizada. Máximo 60 palabras. En español.'
        : `Explica de forma breve y clara para una paciente el método anticonceptivo: "${name}". Incluye en este orden: 1) Qué es y cómo funciona (1-2 oraciones simples), 2) Composición farmacológica: si contiene hormonas indica exactamente qué tipo de estrógeno y/o progestágeno tiene y en qué dosis si es relevante; si no tiene componente farmacológico indica claramente "No contiene componentes farmacológicos", 3) Las 2-3 advertencias o contraindicaciones más importantes en lenguaje simple. Termina con una línea recordando consultar al médico ante dudas. Máximo 150 palabras. En español.`
      const res = await fetch(ANTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      setAiInfo(data.content?.[0]?.text || '')
    } catch(e) {
      setAiInfo('No se pudo obtener la información.')
    }
    setAiLoading(false)
  }

  const selectedMethod = METHODS.find(m => m.type === form.method_type)
  const methodLabel = METHODS.find(m => m.type === record?.method_type)?.label

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  return (
    <div>
      {!editing && record ? (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Mi método anticonceptivo</div>
            <button onClick={() => setEditing(true)}
              style={{ padding:'5px 12px', background:'none', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666' }}>
              Editar
            </button>
          </div>

          {saved && <div style={{ background:'#E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:13, color:G }}>✓ Información actualizada</div>}

          {!record.is_using ? (
            <div>
              <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#555', marginBottom:12 }}>
                No estás usando anticonceptivos actualmente.
              </div>

            </div>
          ) : (
            <div>
              <div style={{ background:'#E1F5EE', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                <div style={{ fontSize:12, color:'#0F6E56', marginBottom:2 }}>{methodLabel}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#0F6E56' }}>{record.method_name}</div>
                {record.start_date && (
                  <div style={{ fontSize:12, color:'#0F6E56', marginTop:4, opacity:0.8 }}>
                    Desde: {formatDate(record.start_date)}
                  </div>
                )}
              </div>
              {record.notes && (
                <div style={{ fontSize:12, color:'#888', padding:'8px 0' }}>{record.notes}</div>
              )}

            </div>
          )}

          {aiLoading && (
            <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px', marginTop:12, fontSize:13, color:'#aaa', textAlign:'center' }}>
              Cargando información...
            </div>
          )}
          {aiInfo && !aiLoading && (
            <div style={{ background:'#f8f8f8', border:'1px solid #eee', borderRadius:10, padding:'12px 14px', marginTop:12, fontSize:13, color:'#444', lineHeight:1.7 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Información educativa</div>
              {renderMarkdown(aiInfo)}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>
            {record ? 'Editar método anticonceptivo' : 'Registrar método anticonceptivo'}
          </div>

          {/* ¿Usás anticonceptivos? */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>¿Estás usando anticonceptivos actualmente?</label>
            <div style={{ display:'flex', gap:8 }}>
              {[{ value: true, label:'Sí' }, { value: false, label:'No' }].map(opt => (
                <button key={String(opt.value)} onClick={() => setForm(p => ({ ...p, is_using: opt.value, method_type:'', method_name:'', method_name_other:'' }))}
                  style={{ flex:1, padding:'9px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: form.is_using === opt.value ? G : '#f0f0f0', color: form.is_using === opt.value ? '#fff' : '#666' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.is_using && (
            <>
              {/* Tipo de método con nombres inline */}
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>Tipo de método</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {METHODS.map(m => (
                    <div key={m.type}>
                      <div onClick={() => setForm(p => ({ ...p, method_type: m.type, method_name:'', method_name_other:'' }))}
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:10, cursor:'pointer', border: form.method_type === m.type ? `2px solid ${G}` : '2px solid #eee', background: form.method_type === m.type ? '#E1F5EE' : '#f8f8f8' }}>
                        <div style={{ width:14, height:14, borderRadius:'50%', border: form.method_type === m.type ? `2px solid ${G}` : '2px solid #ccc', background: form.method_type === m.type ? G : '#fff', flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'#1a1a1a', fontWeight: form.method_type === m.type ? 500 : 400 }}>{m.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nombres específicos inline */}
              {form.method_type && form.method_type !== 'ninguno' && selectedMethod?.names.length > 0 && (
                <div style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px', marginBottom:12, border:'1px solid #eee' }}>
                  <div style={{ fontSize:12, color:'#888', marginBottom:8, fontWeight:500 }}>Seleccioná el método específico:</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    {selectedMethod.names.map(name => (
                      <button key={name} onClick={() => { setForm(p => ({ ...p, method_name: name, method_name_other:'' })); setShowOther(name === 'Otro') }}
                        style={{ padding:'7px 10px', borderRadius:8, border: form.method_name === name ? `2px solid ${G}` : '2px solid #eee', cursor:'pointer', fontSize:12, fontWeight:500, background: form.method_name === name ? '#E1F5EE' : '#fff', color: form.method_name === name ? G : '#555', textAlign:'left' }}>
                        {name}
                      </button>
                    ))}
                  </div>
                  {(form.method_name === 'Otro' || showOther) && (
                    <div style={{ marginTop:4 }}>
                      <input style={inp} value={form.method_name_other}
                        onChange={e => {
                          const val = e.target.value
                          setForm(p => ({ ...p, method_name_other: val }))
                          setConfirmedName('')
                          setSearchResults([])
                          clearTimeout(searchTimeout[0])
                          searchTimeout[0] = setTimeout(() => searchMedication(val), 600)
                        }}
                        placeholder="Escribí el nombre del anticonceptivo..." />
                      {searchLoading && (
                        <div style={{ fontSize:12, color:'#aaa', padding:'6px 4px' }}>Buscando...</div>
                      )}
                      {searchResults.length > 0 && !confirmedName && (
                        <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, marginTop:4, overflow:'hidden' }}>
                          <div style={{ fontSize:11, color:'#888', padding:'6px 10px', background:'#f8f8f8', borderBottom:'1px solid #eee' }}>
                            Seleccioná el correcto:
                          </div>
                          {searchResults.map((r, i) => (
                            <div key={i} onClick={() => {
                              setForm(p => ({ ...p, method_name_other: r.name }))
                              setConfirmedName(r.name)
                              setSearchResults([])
                            }}
                              style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'0.5px solid #f5f5f5', fontSize:13 }}>
                              <span style={{ fontWeight:500, color:'#1a1a1a' }}>{r.name}</span>
                              <span style={{ fontSize:11, color:'#888', marginLeft:6 }}>· {r.type}</span>
                            </div>
                          ))}
                          {searchResults.length === 0 && !searchLoading && form.method_name_other.length > 2 && (
                            <div style={{ padding:'8px 12px', fontSize:12, color:'#aaa' }}>No se encontraron resultados. Verificá el nombre con tu médico.</div>
                          )}
                        </div>
                      )}
                      {confirmedName && (
                        <div style={{ fontSize:12, color:G, padding:'4px 4px', fontWeight:500 }}>✓ Seleccionado: {confirmedName}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fecha de inicio */}
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>Fecha de inicio (opcional)</label>
                <input type="date" style={inp} value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
            </>
          )}

          {/* Notas */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Notas adicionales (opcional)</label>
            <textarea style={{ ...inp, height:50, resize:'vertical' }} value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="¿Algo más que quieras registrar?" />
          </div>

          <div style={{ display:'flex', gap:8 }}>
            {record && (
              <button onClick={() => { setEditing(false) }}
                style={{ padding:'8px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                Cancelar
              </button>
            )}
            <button onClick={save} disabled={saving || (form.is_using && !form.method_type)}
              style={{ flex:1, padding:'10px', background: (form.is_using && !form.method_type) ? '#f0f0f0' : G, color: (form.is_using && !form.method_type) ? '#bbb' : '#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
