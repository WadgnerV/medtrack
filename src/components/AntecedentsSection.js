import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const APP_CONDITIONS = [
  'Artritis / Artrosis',
  'Asma / EPOC',
  'Cáncer (especificar)',
  'Dermatitis alérgica',
  'Dermatitis seborreica',
  'Diabetes mellitus tipo 1',
  'Diabetes mellitus tipo 2',
  'Dislipidemia mixta',
  'Enfermedad cardiovascular',
  'Enfermedad renal crónica',
  'Hipercolesterolemia',
  'Hipertensión arterial',
  'Hipertiroidismo',
  'Hipertrigliceridemia',
  'Hipotiroidismo',
  'Lupus eritematoso sistémico',
  'Osteoporosis',
  'Reflujo gastroesofágico',
  'Rinitis crónica',
  'VIH',
  'Otra (especificar)',
]

const STATUS_LABELS = { active: 'Activo', remission: 'En remisión', resolved: 'Resuelto' }
const STATUS_COLORS = { active: { bg:'#FAEEDA', color:'#854F0B' }, remission: { bg:'#E6F1FB', color:'#185FA5' }, resolved: { bg:'#E1F5EE', color:'#0F6E56' } }

const G = '#1D9E75'
const s = {
  label: { fontSize:12, color:'#666', marginBottom:4, display:'block' },
  input: { width:'100%', padding:'8px 10px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' },
  btn: { background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer' },
  btnOutline: { background:'#fff', color:G, border:`1px solid ${G}`, borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' },
  btnDanger: { background:'none', color:'#D85A30', border:'1px solid #D85A30', borderRadius:8, padding:'5px 10px', fontSize:11, cursor:'pointer' },
  btnEdit: { background:'#f0f0f0', color:'#555', border:'none', borderRadius:8, padding:'5px 10px', fontSize:11, cursor:'pointer' },
  card: { background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px', marginBottom:10 },
  sectionTitle: { fontSize:13, fontWeight:700, color:'#1a3a5c', marginBottom:4, display:'flex', alignItems:'center', gap:6 },
  sectionSub: { fontSize:11, color:'#999', marginBottom:14 },
}

function AppForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { condition:'', condition_other:'', diagnosis_year:'', current_status:'active', current_treatment:'', observations:'' })
  const f = k => e => setForm(p => ({...p, [k]: e.target.value}))

  return (
    <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:16, marginBottom:10 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.label}>Condición / Diagnóstico <span style={{ color:'#D85A30' }}>*</span></label>
          <select value={form.condition} onChange={f('condition')} style={s.input}>
            <option value="">Seleccioná una condición...</option>
            {APP_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(form.condition === 'Otra (especificar)' || form.condition === 'Cáncer (especificar)') && (
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.label}>Especificar</label>
            <input value={form.condition_other} onChange={f('condition_other')} placeholder="Describí la condición..." style={s.input} />
          </div>
        )}
        <div>
          <label style={s.label}>Año de diagnóstico</label>
          <input type="number" value={form.diagnosis_year} onChange={f('diagnosis_year')} placeholder="Ej: 2018" min="1900" max={new Date().getFullYear()} style={s.input} />
        </div>
        <div>
          <label style={s.label}>Estado actual</label>
          <select value={form.current_status} onChange={f('current_status')} style={s.input}>
            <option value="active">Activo</option>
            <option value="remission">En remisión</option>
            <option value="resolved">Resuelto</option>
          </select>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.label}>Tratamiento actual</label>
          <input value={form.current_treatment} onChange={f('current_treatment')} placeholder="Medicamentos, terapias, etc." style={s.input} />
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.label}>Observaciones</label>
          <textarea value={form.observations} onChange={f('observations')} rows={2} placeholder="Notas adicionales..." style={{ ...s.input, resize:'vertical' }} />
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        {onCancel && <button style={s.btnOutline} onClick={onCancel}>Cancelar</button>}
        <button style={s.btn} onClick={() => { if (!form.condition) return alert('Seleccioná una condición'); onSave(form) }}>Guardar</button>
      </div>
    </div>
  )
}

export default function AntecedentsSection({ patient, profile, canEdit = true, compact = false }) {
  const [antecedents, setAntecedents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAppForm, setShowAppForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [editModal, setEditModal] = useState(false)

  useEffect(() => { if (patient?.id) loadAntecedents() }, [patient?.id])

  async function loadAntecedents() {
    setLoading(true)
    const { data } = await supabase.from('patient_antecedents').select('*').eq('patient_id', patient.id).order('created_at')
    setAntecedents(data || [])
    setLoading(false)
  }

  async function saveApp(form, id = null) {
    setSaving(true)
    const payload = {
      patient_id: patient.id,
      clinic_id: profile?.clinic_id,
      type: 'app',
      condition: form.condition,
      condition_other: form.condition_other || null,
      diagnosis_year: form.diagnosis_year ? parseInt(form.diagnosis_year) : null,
      current_status: form.current_status || 'active',
      current_treatment: form.current_treatment || null,
      observations: form.observations || null,
      updated_by: profile?.id,
    }
    if (id) {
      await supabase.from('patient_antecedents').update(payload).eq('id', id)
    } else {
      await supabase.from('patient_antecedents').insert({ ...payload, created_by: profile?.id })
    }
    await loadAntecedents()
    setShowAppForm(false)
    setEditingId(null)
    setSaving(false)
  }

  async function deleteAntecedent(id) {
    if (!window.confirm('¿Eliminar este antecedente?')) return
    await supabase.from('patient_antecedents').delete().eq('id', id)
    await loadAntecedents()
  }

  const appItems = antecedents.filter(a => a.type === 'app')

  if (loading) return null

  // Modo compacto: colapsable con 2 columnas, para usar dentro de ClinicalNoteForm
  if (compact) {
    const appItems = antecedents.filter(a => a.type === 'app')
    return (
      <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:10, marginBottom:14, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', cursor:'pointer' }} onClick={() => setCollapsed(!collapsed)}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#1a3a5c' }}>📋 Antecedentes del paciente</span>
            {appItems.length > 0 && <span style={{ fontSize:11, background:'#e2e8f0', color:'#555', padding:'1px 7px', borderRadius:20 }}>{appItems.length} APP</span>}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {canEdit && <button style={{ fontSize:11, padding:'3px 10px', borderRadius:6, border:'1px solid #e2e8f0', background:'#fff', color:'#555', cursor:'pointer' }} onClick={e => { e.stopPropagation(); setEditModal(true); setCollapsed(false) }}>Editar</button>}
            <span style={{ fontSize:12, color:'#999' }}>{collapsed ? '▶' : '▼'}</span>
          </div>
        </div>
        {!collapsed && (
          <div style={{ padding:'0 14px 14px', borderTop:'1px solid #e2e8f0' }}>
            {editModal ? (
              <div style={{ paddingTop:12 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Antecedentes Patológicos Personales (APP)</div>
                {showAppForm && <AppForm onSave={form => saveApp(form)} onCancel={() => setShowAppForm(false)} />}
                {!showAppForm && <button style={{ ...s.btnOutline, fontSize:11, padding:'4px 10px', marginBottom:8 }} onClick={() => setShowAppForm(true)}>+ Agregar condición</button>}
                {appItems.map(item => (
                  <div key={item.id}>
                    {editingId === item.id ? (
                      <AppForm initial={{ condition:item.condition, condition_other:item.condition_other||'', diagnosis_year:item.diagnosis_year||'', current_status:item.current_status||'active', current_treatment:item.current_treatment||'', observations:item.observations||'' }}
                        onSave={form => saveApp(form, item.id)} onCancel={() => setEditingId(null)} />
                    ) : (
                      <div style={{ ...s.card, marginBottom:6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'#1a1a1a' }}>{item.condition === 'Otra (especificar)' || item.condition === 'Cáncer (especificar)' ? `${item.condition.split(' (')[0]}: ${item.condition_other||'—'}` : item.condition}</div>
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, background:STATUS_COLORS[item.current_status]?.bg, color:STATUS_COLORS[item.current_status]?.color }}>{STATUS_LABELS[item.current_status]}</span>
                            <button style={s.btnEdit} onClick={() => setEditingId(item.id)}>Editar</button>
                            <button style={s.btnDanger} onClick={() => deleteAntecedent(item.id)}>✕</button>
                          </div>
                        </div>
                        {item.current_treatment && <div style={{ fontSize:11, color:'#666', marginTop:4 }}>Tratamiento: {item.current_treatment}</div>}
                      </div>
                    )}
                  </div>
                ))}
                <button style={{ fontSize:11, color:'#555', background:'none', border:'none', cursor:'pointer', marginTop:4 }} onClick={() => { setEditModal(false); setShowAppForm(false); setEditingId(null) }}>✓ Cerrar edición</button>
              </div>
            ) : (
              <div style={{ paddingTop:10 }}>
                {appItems.length === 0 ? (
                  <div style={{ fontSize:12, color:'#bbb', textAlign:'center', padding:'8px 0' }}>Sin antecedentes patológicos registrados</div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {appItems.map(item => (
                      <div key={item.id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px' }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'#1a1a1a' }}>{item.condition === 'Otra (especificar)' || item.condition === 'Cáncer (especificar)' ? `${item.condition.split(' (')[0]}: ${item.condition_other||'—'}` : item.condition}</div>
                        {item.diagnosis_year && <div style={{ fontSize:10, color:'#999' }}>Desde {item.diagnosis_year}</div>}
                        <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, background:STATUS_COLORS[item.current_status]?.bg, color:STATUS_COLORS[item.current_status]?.color }}>{STATUS_LABELS[item.current_status]}</span>
                        {item.current_treatment && <div style={{ fontSize:10, color:'#666', marginTop:3 }}>Tto: {item.current_treatment}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* APP - Antecedentes Patológicos Personales */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div>
            <div style={s.sectionTitle}>🩺 Antecedentes Patológicos Personales (APP)</div>
            <div style={s.sectionSub}>Enfermedades crónicas y condiciones médicas diagnosticadas</div>
          </div>
          {canEdit && !showAppForm && (
            <button style={s.btnOutline} onClick={() => setShowAppForm(true)}>+ Agregar</button>
          )}
        </div>

        {showAppForm && !editingId && (
          <AppForm onSave={form => saveApp(form)} onCancel={() => setShowAppForm(false)} />
        )}

        {appItems.length === 0 && !showAppForm && (
          <div style={{ background:'#f7fafc', border:'1px dashed #e2e8f0', borderRadius:10, padding:20, textAlign:'center', fontSize:13, color:'#999' }}>
            Sin antecedentes patológicos registrados
          </div>
        )}

        {appItems.map(item => (
          <div key={item.id}>
            {editingId === item.id ? (
              <AppForm
                initial={{ condition: item.condition, condition_other: item.condition_other||'', diagnosis_year: item.diagnosis_year||'', current_status: item.current_status||'active', current_treatment: item.current_treatment||'', observations: item.observations||'' }}
                onSave={form => saveApp(form, item.id)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div style={s.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>
                      {item.condition === 'Otra (especificar)' || item.condition === 'Cáncer (especificar)'
                        ? `${item.condition.split(' (')[0]}: ${item.condition_other || '—'}`
                        : item.condition}
                    </div>
                    {item.diagnosis_year && <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Diagnóstico: {item.diagnosis_year}</div>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background: STATUS_COLORS[item.current_status]?.bg, color: STATUS_COLORS[item.current_status]?.color }}>
                      {STATUS_LABELS[item.current_status]}
                    </span>
                    {canEdit && (
                      <>
                        <button style={s.btnEdit} onClick={() => { setEditingId(item.id); setShowAppForm(false) }}>Editar</button>
                        <button style={s.btnDanger} onClick={() => deleteAntecedent(item.id)}>Eliminar</button>
                      </>
                    )}
                  </div>
                </div>
                {item.current_treatment && (
                  <div style={{ fontSize:12, color:'#555', marginBottom:4 }}>
                    <strong>Tratamiento:</strong> {item.current_treatment}
                  </div>
                )}
                {item.observations && (
                  <div style={{ fontSize:12, color:'#777' }}>
                    <strong>Obs:</strong> {item.observations}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Placeholder para APNP, AGO, AQx - próximamente */}
      <div style={{ background:'#f7fafc', border:'1px dashed #e2e8f0', borderRadius:10, padding:16, textAlign:'center', fontSize:12, color:'#bbb' }}>
        Antecedentes personales no patológicos, gineco-obstétricos y quirúrgicos — próximamente
      </div>
    </div>
  )
}
