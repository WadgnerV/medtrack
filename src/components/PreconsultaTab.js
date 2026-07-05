import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'

const CONSULTATION_TYPES = [
  { value: 'integral', label: 'Consulta médica integral' },
  { value: 'metabolica', label: 'Consulta metabólica' },
  { value: 'estetica', label: 'Consulta estética' },
  { value: 'regenerativa', label: 'Consulta regenerativa' },
  { value: 'obstetrica', label: 'Consulta obstétrica' },
  { value: 'pediatrica', label: 'Consulta pediátrica' },
  { value: 'geriatrica', label: 'Consulta geriátrica' },
  { value: 'nutricion', label: 'Nutrición' },
  { value: 'psicologia', label: 'Psicología' },
  { value: 'fisioterapia', label: 'Terapia física' },
]

const TONO_OPTIONS = [
  { value: 'sin_contracciones', label: 'Sin contracciones' },
  { value: 'leves', label: 'Contracciones leves' },
  { value: 'moderadas', label: 'Contracciones moderadas' },
  { value: 'francas', label: 'Contracciones francas' },
]

const ANTECEDENTES = [
  { key: 'antecedentes_patologicos', label: 'Patológicos' },
  { key: 'antecedentes_quirurgicos', label: 'Quirúrgicos' },
  { key: 'antecedentes_alergias', label: 'Alergias' },
  { key: 'antecedentes_medicamentos', label: 'Medicamentos actuales' },
  { key: 'antecedentes_familiares', label: 'Familiares' },
  { key: 'antecedentes_habitos', label: 'Hábitos' },
]

const RANGES = {
  pas: [90, 140], pad: [60, 90], spo2: [95, 100],
  glicemia: [70, 140], frecuencia_cardiaca: [60, 100],
  frecuencia_respiratoria: [12, 20], fcf_lpm: [110, 160],
}

function isOut(key, val) {
  const v = parseFloat(val)
  if (isNaN(v) || !RANGES[key]) return false
  return v < RANGES[key][0] || v > RANGES[key][1]
}

function WarnIcon({ show }) {
  if (!show) return null
  return <span title="Valor fuera de rango normal" style={{ fontSize:11, color:'#F59E0B', marginLeft:3 }}>⚠</span>
}

function showConstitucionales(type) {
  return ['metabolica', 'nutricion', 'geriatrica'].includes(type)
}

function showObstetricos(type) {
  return type === 'obstetrica'
}

const emptyForm = {
  consultation_type: '',
  antecedentes_patologicos: '', antecedentes_quirurgicos: '',
  antecedentes_alergias: '', antecedentes_medicamentos: '',
  antecedentes_familiares: '', antecedentes_habitos: '',
  motivo_consulta: '',
  pas: '', pad: '', spo2: '', spo2_method: 'aa', spo2_litros: '',
  glicemia: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '',
  peso_kg: '', estatura_cm: '',
  grasa_pct: '', masa_muscular_kg: '', grasa_visceral_pt: '',
  ancho_pecho_cm: '', ancho_cintura_cm: '', ancho_muslo_cm: '',
  altura_uterina_cm: '', tono_uterino: '', fcf_lpm: '',
  nota_enfermeria: '',
}

export default function PreconsultaTab({ patient, profile, appointment }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const canEdit = ['clinic_admin', 'admin', 'branch_admin', 'doctor'].includes(profile?.role)

  useEffect(() => { if (patient?.id) loadRecords() }, [patient?.id])

  async function loadRecords() {
    setLoading(true)
    const { data } = await supabase.from('preconsult_records')
      .select('*, recorder:recorded_by(first_name, last_name, prefix, role)')
      .eq('patient_id', patient.profile?.id || patient.id)
      .order('recorded_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  function startNew() {
    const lastRecord = records[0]
    if (lastRecord) {
      setForm({
        ...emptyForm,
        antecedentes_patologicos: lastRecord.antecedentes_patologicos || '',
        antecedentes_quirurgicos: lastRecord.antecedentes_quirurgicos || '',
        antecedentes_alergias: lastRecord.antecedentes_alergias || '',
        antecedentes_medicamentos: lastRecord.antecedentes_medicamentos || '',
        antecedentes_familiares: lastRecord.antecedentes_familiares || '',
        antecedentes_habitos: lastRecord.antecedentes_habitos || '',
      })
    } else {
      setForm(emptyForm)
    }
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(r) {
    setForm({
      consultation_type: r.consultation_type || '',
      antecedentes_patologicos: r.antecedentes_patologicos || '',
      antecedentes_quirurgicos: r.antecedentes_quirurgicos || '',
      antecedentes_alergias: r.antecedentes_alergias || '',
      antecedentes_medicamentos: r.antecedentes_medicamentos || '',
      antecedentes_familiares: r.antecedentes_familiares || '',
      antecedentes_habitos: r.antecedentes_habitos || '',
      motivo_consulta: r.motivo_consulta || '',
      pas: r.pas || '', pad: r.pad || '',
      spo2: r.spo2 || '', spo2_method: r.spo2_method || 'aa', spo2_litros: r.spo2_litros || '',
      glicemia: r.glicemia || '',
      frecuencia_cardiaca: r.frecuencia_cardiaca || '',
      frecuencia_respiratoria: r.frecuencia_respiratoria || '',
      peso_kg: r.peso_kg || '', estatura_cm: r.estatura_cm || '',
      grasa_pct: r.grasa_pct || '', masa_muscular_kg: r.masa_muscular_kg || '',
      grasa_visceral_pt: r.grasa_visceral_pt || '', ancho_pecho_cm: r.ancho_pecho_cm || '',
      ancho_cintura_cm: r.ancho_cintura_cm || '', ancho_muslo_cm: r.ancho_muslo_cm || '',
      altura_uterina_cm: r.altura_uterina_cm || '', tono_uterino: r.tono_uterino || '',
      fcf_lpm: r.fcf_lpm || '', nota_enfermeria: r.nota_enfermeria || '',
    })
    setEditingId(r.id); setShowForm(true)
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSave(ready = false) {
    setSaving(true)
    const payload = {
      patient_id: patient.profile?.id || patient.id,
      clinic_id: profile.clinic_id,
      recorded_by: profile.id,
      recorded_at: new Date().toISOString(),
      appointment_id: appointment?.id || null,
      status: ready ? 'ready' : 'draft',
      consultation_type: form.consultation_type || null,
      antecedentes_patologicos: form.antecedentes_patologicos || null,
      antecedentes_quirurgicos: form.antecedentes_quirurgicos || null,
      antecedentes_alergias: form.antecedentes_alergias || null,
      antecedentes_medicamentos: form.antecedentes_medicamentos || null,
      antecedentes_familiares: form.antecedentes_familiares || null,
      antecedentes_habitos: form.antecedentes_habitos || null,
      motivo_consulta: form.motivo_consulta || null,
      pas: form.pas ? parseInt(form.pas) : null,
      pad: form.pad ? parseInt(form.pad) : null,
      spo2: form.spo2 ? parseFloat(form.spo2) : null,
      spo2_method: form.spo2_method || 'aa',
      spo2_litros: form.spo2_litros ? parseFloat(form.spo2_litros) : null,
      glicemia: form.glicemia ? parseFloat(form.glicemia) : null,
      frecuencia_cardiaca: form.frecuencia_cardiaca ? parseInt(form.frecuencia_cardiaca) : null,
      frecuencia_respiratoria: form.frecuencia_respiratoria ? parseInt(form.frecuencia_respiratoria) : null,
      peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
      estatura_cm: form.estatura_cm ? parseFloat(form.estatura_cm) : null,
      grasa_pct: form.grasa_pct ? parseFloat(form.grasa_pct) : null,
      masa_muscular_kg: form.masa_muscular_kg ? parseFloat(form.masa_muscular_kg) : null,
      grasa_visceral_pt: form.grasa_visceral_pt ? parseFloat(form.grasa_visceral_pt) : null,
      ancho_pecho_cm: form.ancho_pecho_cm ? parseFloat(form.ancho_pecho_cm) : null,
      ancho_cintura_cm: form.ancho_cintura_cm ? parseFloat(form.ancho_cintura_cm) : null,
      ancho_muslo_cm: form.ancho_muslo_cm ? parseFloat(form.ancho_muslo_cm) : null,
      altura_uterina_cm: form.altura_uterina_cm ? parseFloat(form.altura_uterina_cm) : null,
      tono_uterino: form.tono_uterino || null,
      fcf_lpm: form.fcf_lpm ? parseInt(form.fcf_lpm) : null,
      nota_enfermeria: form.nota_enfermeria || null,
    }
    if (editingId) {
      await supabase.from('preconsult_records').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
    } else {
      await supabase.from('preconsult_records').insert(payload)
    }
    if (ready) {
      const doctorId = patient.assigned_doctor_id || appointment?.doctor_id
      if (doctorId) {
        const patientName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()
        await supabase.from('notifications').insert({
          profile_id: doctorId,
          clinic_id: profile.clinic_id,
          type: 'preconsult_ready',
          title: 'Paciente listo',
          message: `${patientName} ya pasó por pre-consulta y está listo para ser atendido.`,
          is_read: false,
          sender_id: profile.id,
        })
      }
    }
    await loadRecords()
    setShowForm(false); setEditingId(null); setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta pre-consulta?')) return
    await supabase.from('preconsult_records').delete().eq('id', id)
    setRecords(p => p.filter(r => r.id !== id))
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }
  const sec = { fontSize:12, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:12, marginTop:20, paddingBottom:6, borderBottom:'2px solid #e2ede9' }

  function numField(key, label) {
    const warn = isOut(key, form[key])
    return (
      <div>
        <label style={{ ...lbl, display:'flex', alignItems:'center', gap:4 }}>
          {label}{warn && <WarnIcon show={true} />}
        </label>
        <input type="number" style={{ ...inp, borderColor: warn ? '#F59E0B' : '#e0e0e0' }} value={form[key]} onChange={f(key)} />
      </div>
    )
  }

  function IMC() {
    const p = parseFloat(form.peso_kg)
    const h = parseFloat(form.estatura_cm)
    if (!p || !h) return null
    const imc = (p / Math.pow(h/100, 2)).toFixed(1)
    const n = parseFloat(imc)
    const cat = n < 18.5 ? { label:'Desnutrición', color:'#185FA5', bg:'#E6F1FB' }
      : n < 25 ? { label:'IMC normal', color:'#0F6E56', bg:'#E1F5EE' }
      : n < 30 ? { label:'Sobrepeso', color:'#BA7517', bg:'#FAEEDA' }
      : { label:'Obesidad', color:'#D85A30', bg:'#FAECE7' }
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
        <span style={{ fontSize:12, color:'#888' }}>IMC:</span>
        <span style={{ fontSize:14, fontWeight:700, color:cat.color }}>{imc}</span>
        <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:20, background:cat.bg, color:cat.color }}>{cat.label}</span>
      </div>
    )
  }

  function PAM() {
    const p = parseFloat(form.pas)
    const d = parseFloat(form.pad)
    if (!p || !d) return null
    const pam = ((p + 2*d)/3).toFixed(1)
    const n = parseFloat(pam)
    const color = n < 60 || n > 100 ? '#D85A30' : G
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
        <span style={{ fontSize:11, color:'#888' }}>PAM:</span>
        <span style={{ fontSize:13, fontWeight:700, color }}>{pam} mmHg</span>
        {(n < 60 || n > 100) && <WarnIcon show={true} />}
      </div>
    )
  }

  function QuickView({ r }) {
    const rec = r.recorder
    const recName = rec ? `${rec.prefix?rec.prefix+' ':''}${rec.first_name} ${rec.last_name}` : 'Desconocido'
    const date = new Date(r.recorded_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })
    const consType = CONSULTATION_TYPES.find(c => c.value === r.consultation_type)
    const isExp = expandedId === r.id
    return (
      <div style={{ background:'#fff', border:`0.5px solid ${r.status==='ready'?G:'#e2ede9'}`, borderRadius:12, overflow:'hidden', marginBottom:10 }}>
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
          onClick={() => setExpandedId(isExp ? null : r.id)}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:BLUE }}>{date}</div>
            <div style={{ fontSize:11, color:'#8aab9a', marginTop:2 }}>
              {recName}{consType ? ` · ${consType.label}` : ''}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500,
              background:r.status==='ready'?'#E1F5EE':'#f4f7f6', color:r.status==='ready'?G:'#888' }}>
              {r.status==='ready'?'Trasladado':'Borrador'}
            </span>
            {canEdit && (
              <>
                <button onClick={e=>{e.stopPropagation();startEdit(r)}} style={{ background:'none', border:'0.5px solid #e2ede9', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#555' }}>Editar</button>
                <button onClick={e=>{e.stopPropagation();handleDelete(r.id)}} style={{ background:'none', border:'0.5px solid #fde0e0', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#D85A30' }}>Eliminar</button>
              </>
            )}
            <span style={{ fontSize:12, color:'#bbb' }}>{isExp?'▲':'▼'}</span>
          </div>
        </div>
        {isExp && (
          <div style={{ padding:'14px 16px', borderTop:'0.5px solid #f0f5f3', background:'#fafdfb' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8, marginBottom:10 }}>
              {r.pas && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>PA: </span><strong>{r.pas}/{r.pad} mmHg</strong></div>}
              {r.spo2 && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>SpO2: </span><strong>{r.spo2}% ({r.spo2_method||'AA'})</strong></div>}
              {r.frecuencia_cardiaca && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>FC: </span><strong>{r.frecuencia_cardiaca} lpm</strong></div>}
              {r.frecuencia_respiratoria && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>FR: </span><strong>{r.frecuencia_respiratoria} rpm</strong></div>}
              {r.glicemia && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Glicemia: </span><strong>{r.glicemia} mg/dL</strong></div>}
              {r.peso_kg && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Peso: </span><strong>{r.peso_kg} kg</strong></div>}
              {r.estatura_cm && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Talla: </span><strong>{r.estatura_cm} cm</strong></div>}
            </div>
            {r.motivo_consulta && <div style={{ fontSize:12, marginBottom:6 }}><span style={{ color:'#888', fontWeight:600 }}>Motivo: </span>{r.motivo_consulta}</div>}
            {r.nota_enfermeria && <div style={{ fontSize:12 }}><span style={{ color:'#888', fontWeight:600 }}>Nota: </span>{r.nota_enfermeria}</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:BLUE }}>Pre-consulta / Triage</div>
        {canEdit && !showForm && (
          <button onClick={startNew} style={{ padding:'7px 16px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
            + Nueva pre-consulta
          </button>
        )}
      </div>

      {!showForm && (
        loading ? <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Cargando...</div>
        : records.length === 0 ? <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Sin registros de pre-consulta.</div>
        : records.map(r => <QuickView key={r.id} r={r} />)
      )}

      {showForm && (
        <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:14, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:BLUE }}>{editingId ? 'Editar pre-consulta' : 'Nueva pre-consulta'}</div>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Ingresa a consulta de <span style={{ color:'#D85A30' }}>*</span></label>
            <select style={{ ...inp, borderColor: !form.consultation_type ? '#D85A30' : '#e0e0e0' }} value={form.consultation_type} onChange={f('consultation_type')}>
              <option value="">Seleccionar tipo...</option>
              {CONSULTATION_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div style={sec}>Antecedentes</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:8 }}>
            {ANTECEDENTES.map(a => (
              <div key={a.key}>
                <label style={lbl}>{a.label}</label>
                <textarea style={{ ...inp, minHeight:60, resize:'vertical' }} value={form[a.key]} onChange={f(a.key)} />
              </div>
            ))}
          </div>

          <div style={sec}>Motivo de consulta</div>
          <textarea style={{ ...inp, minHeight:70, resize:'vertical', marginBottom:8 }} value={form.motivo_consulta} onChange={f('motivo_consulta')} />

          <div style={sec}>Signos vitales generales</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {numField('pas', 'PAS (mmHg)')}
              {numField('pad', 'PAD (mmHg)')}
              <PAM />
              {numField('frecuencia_cardiaca', 'FC (lpm)')}
              {numField('frecuencia_respiratoria', 'FR (rpm)')}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ ...lbl, display:'flex', alignItems:'center', gap:4 }}>
                  SpO2 (%) {isOut('spo2', form.spo2) && <WarnIcon show={true} />}
                </label>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                  <input type="number" style={{ ...inp, width:80, borderColor: isOut('spo2', form.spo2)?'#F59E0B':'#e0e0e0' }} value={form.spo2} onChange={f('spo2')} />
                  <select style={{ ...inp, flex:1 }} value={form.spo2_method} onChange={f('spo2_method')}>
                    <option value="aa">Aire ambiente (AA)</option>
                    <option value="nasocánula">Nasocánula</option>
                    <option value="venturi">Mascarilla Venturi</option>
                    <option value="reservorio">Mascarilla con reservorio</option>
                    <option value="cipap">CIPAP</option>
                    <option value="bipap">BIPAP</option>
                    <option value="tet">Tubo endotraqueal (TET)</option>
                  </select>
                  {form.spo2_method !== 'aa' && (
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input type="number" style={{ ...inp, width:60 }} value={form.spo2_litros} onChange={f('spo2_litros')} />
                      <span style={{ fontSize:11, color:'#888', whiteSpace:'nowrap' }}>L/min</span>
                    </div>
                  )}
                </div>
              </div>
              {numField('glicemia', 'Glicemia (mg/dL)')}
              <div>
                <label style={lbl}>Peso (kg)</label>
                <input type="number" style={inp} value={form.peso_kg} onChange={f('peso_kg')} />
              </div>
              <div>
                <label style={lbl}>Estatura (cm)</label>
                <input type="number" style={inp} value={form.estatura_cm} onChange={f('estatura_cm')} />
              </div>
              <IMC />
            </div>
          </div>

          {showConstitucionales(form.consultation_type) && (
            <>
              <div style={sec}>Signos vitales constitucionales</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                <div><label style={lbl}>Grasa corporal (%)</label><input type="number" style={inp} value={form.grasa_pct} onChange={f('grasa_pct')} /></div>
                <div><label style={lbl}>Masa muscular (kg)</label><input type="number" style={inp} value={form.masa_muscular_kg} onChange={f('masa_muscular_kg')} /></div>
                <div><label style={lbl}>Grasa visceral (pt)</label><input type="number" style={inp} value={form.grasa_visceral_pt} onChange={f('grasa_visceral_pt')} /></div>
                <div><label style={lbl}>Ancho pecho (cm)</label><input type="number" style={inp} value={form.ancho_pecho_cm} onChange={f('ancho_pecho_cm')} /></div>
                <div><label style={lbl}>Cintura (cm)</label><input type="number" style={inp} value={form.ancho_cintura_cm} onChange={f('ancho_cintura_cm')} /></div>
                <div><label style={lbl}>Muslo (cm)</label><input type="number" style={inp} value={form.ancho_muslo_cm} onChange={f('ancho_muslo_cm')} /></div>
              </div>
            </>
          )}

          {showObstetricos(form.consultation_type) && (
            <>
              <div style={sec}>Signos vitales obstétricos</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                <div><label style={lbl}>Altura uterina (cm)</label><input type="number" style={inp} value={form.altura_uterina_cm} onChange={f('altura_uterina_cm')} /></div>
                <div>
                  <label style={lbl}>Tono uterino</label>
                  <select style={inp} value={form.tono_uterino} onChange={f('tono_uterino')}>
                    <option value="">Seleccionar...</option>
                    {TONO_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...lbl, display:'flex', alignItems:'center', gap:4 }}>
                    FCF (lpm) {isOut('fcf_lpm', form.fcf_lpm) && <WarnIcon show={true} />}
                  </label>
                  <input type="number" style={{ ...inp, borderColor: isOut('fcf_lpm', form.fcf_lpm)?'#F59E0B':'#e0e0e0' }} value={form.fcf_lpm} onChange={f('fcf_lpm')} />
                </div>
              </div>
            </>
          )}

          <div style={sec}>Nota de enfermería</div>
          <textarea style={{ ...inp, minHeight:80, resize:'vertical', marginBottom:20 }} value={form.nota_enfermeria} onChange={f('nota_enfermeria')} />

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditingId(null) }}
              style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
              Cancelar
            </button>
            <button onClick={() => handleSave(false)} disabled={saving || !form.consultation_type}
              style={{ padding:'8px 18px', background:'#f0f4f8', color:BLUE, border:'1px solid #c5d5e8', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, opacity:saving?0.7:1 }}>
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving || !form.consultation_type}
              style={{ padding:'8px 18px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity:saving?0.7:1 }}>
              {saving ? 'Guardando...' : 'Guardar y trasladar paciente'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
