import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import AntecedentesTab from './AntecedentesTab'

const G = '#0F6E56'
const BLUE = '#1a3a5c'

const CONSULTATION_TYPE_COLORS = {
  integral:      '#F59E0B',
  metabolica:    '#F97316',
  estetica:      '#A855F7',
  regenerativa:  '#3B82F6',
  obstetrica:    '#EC4899',
  pediatrica:    '#22C55E',
  geriatrica:    '#6B7280',
  psicologia:    '#92400E',
  fisioterapia:  '#EF4444',
  nutricion:     '#F97316',
}

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

  pas: '', pad: '', spo2: '', spo2_method: 'aa', spo2_litros: '',
  glicemia: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '',
  peso_kg: '', estatura_cm: '',
  grasa_pct: '', masa_muscular_kg: '', grasa_visceral_pt: '',
  ancho_pecho_cm: '', ancho_cintura_cm: '', ancho_muslo_cm: '',
  altura_uterina_cm: '', tono_uterino: '', fcf_lpm: '',
  nota_enfermeria: '',
}

export default function PreconsultaTab({ patient, profile, todayAppointment }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [hizoProcedimiento, setHizoProcedimiento] = useState(null)
  const [insumosUsados, setInsumosUsados] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [expandedId, setExpandedId] = useState(null)

  const canEdit = ['clinic_admin', 'admin', 'branch_admin', 'doctor'].includes(profile?.role)
  const isEditable = (r) => {
    if (!canEdit) return false
    const recorded = new Date(r.recorded_at)
    const now = new Date()
    const diffHours = (now - recorded) / (1000 * 60 * 60)
    return diffHours < 24
  }
  const antecedentesRef = useRef(null)

  useEffect(() => { if (patient?.id) { loadRecords(); loadInventory() } }, [patient?.id])

  async function loadInventory() {
    const { data } = await supabase.from('inventory_items').select('id, name, sku, unit, quantity, min_quantity').eq('clinic_id', profile.clinic_id).order('name')
    setInventoryItems(data || [])
  }

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
    setHizoProcedimiento(null)
    setInsumosUsados([])
    const lastRecord = records[0]
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(r) {
    setForm({
      consultation_type: r.consultation_type || '',

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
    if (antecedentesRef.current) await antecedentesRef.current()
    const payload = {
      patient_id: patient.profile?.id || patient.id,
      clinic_id: profile.clinic_id,
      recorded_by: profile.id,
      recorded_at: new Date().toISOString(),
      appointment_id: todayAppointment?.id || null,
      status: ready ? 'ready' : 'draft',
      consultation_type: form.consultation_type || null,
      antecedentes_patologicos: form.antecedentes_patologicos || null,
      antecedentes_quirurgicos: form.antecedentes_quirurgicos || null,
      antecedentes_alergias: form.antecedentes_alergias || null,
      antecedentes_medicamentos: form.antecedentes_medicamentos || null,
      antecedentes_familiares: form.antecedentes_familiares || null,
      antecedentes_habitos: form.antecedentes_habitos || null,
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
    const alreadyReady = editingId && records.find(r => r.id === editingId)?.status === 'ready'
    if (ready && !alreadyReady) {
      const doctorId = todayAppointment?.doctor_id || null
      const patientName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()
      console.log('todayAppointment:', todayAppointment)
      console.log('doctorId:', doctorId)
      console.log('patientName:', patientName)
      if (doctorId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          profile_id: doctorId,
          clinic_id: profile.clinic_id,
          type: 'preconsult_ready',
          title: 'Paciente listo',
          message: `El paciente **${patientName}** agendado para su cita con fecha ${todayAppointment?.appointment_date ? new Date(todayAppointment.appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' }) : ''} a las ${todayAppointment?.appointment_time?.slice(0,5) || ''} ya terminó el proceso de preconsulta y está listo para ser atendido.`,
          is_read: false,
          sender_id: profile.id,
          data: { appointment_id: todayAppointment?.id || null, patient_id: patient.profile?.id || patient.id }
        })
        if (notifError) console.error('Error notificación:', notifError)
        else console.log('Notificación enviada OK')
      } else {
        console.log('Sin doctor asignado, no se notifica')
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

  function AntRow({ label, val }) {
    return (
      <div style={{ display:'flex', gap:6, fontSize:12 }}>
        <span style={{ color:'#888', minWidth:140, flexShrink:0 }}>{label}:</span>
        <span style={{ fontWeight:500 }}>{val}</span>
      </div>
    )
  }

  function QuickView({ r }) {
    const [antecedentes, setAntecedentes] = useState(null)
    const patId = patient.profile?.id || patient.id
    useEffect(() => {
      if (expandedId === r.id) {
        supabase.from('patient_antecedentes').select('*').eq('patient_id', patId).eq('clinic_id', profile.clinic_id).maybeSingle()
          .then(({ data }) => setAntecedentes(data))
      }
    }, [expandedId, r.id])
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
                {isEditable(r) ? (
                  <button onClick={e=>{e.stopPropagation();startEdit(r)}} style={{ background:'none', border:'0.5px solid #e2ede9', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#555' }}>Editar</button>
                ) : (
                  <span title="No editable — han pasado más de 24 horas" style={{ fontSize:11, color:'#ccc', padding:'3px 8px', display:'flex', alignItems:'center', gap:3 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Bloqueado
                  </span>
                )}
                <button onClick={e=>{e.stopPropagation();handleDelete(r.id)}} style={{ background:'none', border:'0.5px solid #fde0e0', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#D85A30' }}>Eliminar</button>
              </>
            )}
            <span style={{ fontSize:12, color:'#bbb' }}>{isExp?'▲':'▼'}</span>
          </div>
        </div>
        {isExp && (
          <div style={{ padding:'14px 16px', borderTop:'0.5px solid #f0f5f3', background:'#fafdfb' }}>

            <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8 }}>Signos vitales</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:12 }}>
              {r.pas && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>PA: </span><strong>{r.pas}/{r.pad} mmHg</strong></div>}
              {r.spo2 && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>SpO2: </span><strong>{r.spo2}% ({r.spo2_method||'AA'}{r.spo2_litros?` ${r.spo2_litros}L/min`:''})</strong></div>}
              {r.frecuencia_cardiaca && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>FC: </span><strong>{r.frecuencia_cardiaca} lpm</strong></div>}
              {r.frecuencia_respiratoria && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>FR: </span><strong>{r.frecuencia_respiratoria} rpm</strong></div>}
              {r.glicemia && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Glicemia: </span><strong>{r.glicemia} mg/dL</strong></div>}
              {r.peso_kg && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Peso: </span><strong>{r.peso_kg} kg</strong></div>}
              {r.estatura_cm && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Talla: </span><strong>{r.estatura_cm} cm</strong></div>}
              {r.peso_kg && r.estatura_cm && (() => {
                const imc = (parseFloat(r.peso_kg)/Math.pow(parseFloat(r.estatura_cm)/100,2)).toFixed(1)
                const n = parseFloat(imc)
                const cat = n<18.5?'Desnutrición':n<25?'Normal':n<30?'Sobrepeso':'Obesidad'
                return <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>IMC: </span><strong>{imc} ({cat})</strong></div>
              })()}
            </div>

            {(r.grasa_pct||r.masa_muscular_kg||r.grasa_visceral_pt||r.ancho_cintura_cm) && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:6 }}>Signos constitucionales</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {r.grasa_pct && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Grasa: </span><strong>{r.grasa_pct}%</strong></div>}
                  {r.masa_muscular_kg && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Músculo: </span><strong>{r.masa_muscular_kg} kg</strong></div>}
                  {r.grasa_visceral_pt && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Visceral: </span><strong>{r.grasa_visceral_pt} pt</strong></div>}
                  {r.ancho_pecho_cm && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Pecho: </span><strong>{r.ancho_pecho_cm} cm</strong></div>}
                  {r.ancho_cintura_cm && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Cintura: </span><strong>{r.ancho_cintura_cm} cm</strong></div>}
                  {r.ancho_muslo_cm && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Muslo: </span><strong>{r.ancho_muslo_cm} cm</strong></div>}
                </div>
              </div>
            )}
            {(r.altura_uterina_cm||r.fcf_lpm||r.tono_uterino) && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:6 }}>Signos obstétricos</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {r.altura_uterina_cm && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>AU: </span><strong>{r.altura_uterina_cm} cm</strong></div>}
                  {r.tono_uterino && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>Tono: </span><strong>{r.tono_uterino}</strong></div>}
                  {r.fcf_lpm && <div style={{ fontSize:12 }}><span style={{ color:'#888' }}>FCF: </span><strong>{r.fcf_lpm} lpm</strong></div>}
                </div>
              </div>
            )}


            {antecedentes && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8 }}>Antecedentes</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {antecedentes.apnp_educacion && <AntRow label="Educación" val={antecedentes.apnp_educacion} />}
                  {antecedentes.apnp_estado_civil && <AntRow label="Estado civil" val={antecedentes.apnp_estado_civil} />}
                  {antecedentes.apnp_religion && <AntRow label="Religión" val={antecedentes.apnp_religion} />}
                  <AntRow label="Fumado" val={antecedentes.apnp_fumado==='negativo'?'Niega':antecedentes.apnp_fumado==='activo'?`Activo${antecedentes.apnp_fumado_paquetes_dia?` — ${antecedentes.apnp_fumado_paquetes_dia} paq/día, ${antecedentes.apnp_fumado_años} años`:''}`:antecedentes.apnp_fumado==='suspendido'?`Suspendido${antecedentes.apnp_fumado_año_suspension?` (${antecedentes.apnp_fumado_año_suspension})`:''}`:''} />
                  <AntRow label="Alcohol" val={antecedentes.apnp_alcohol==='negativo'?'Niega':antecedentes.apnp_alcohol==='ocasional/social'?`Ocasional/social${antecedentes.apnp_alcohol_bebida?` — ${antecedentes.apnp_alcohol_bebida}`:''}`:`Habitual${antecedentes.apnp_alcohol_bebida?` — ${antecedentes.apnp_alcohol_bebida}`:''}`} />
                  <AntRow label="Drogas" val={antecedentes.apnp_drogas==='negativo'?'Niega':antecedentes.apnp_drogas==='activo'?`Activo${antecedentes.apnp_drogas_tipos?.length?` — ${antecedentes.apnp_drogas_tipos.join(', ')}`:''}`:`Suspendido${antecedentes.apnp_drogas_año_suspension?` (${antecedentes.apnp_drogas_año_suspension})`:''}`} />
                  <AntRow label="Actividad física" val={antecedentes.apnp_actividad_fisica==='sedentario'?'Sedentario':antecedentes.apnp_actividad_fisica==='en proceso'?`En proceso${antecedentes.apnp_ejercicio_tipos?.length?` — ${antecedentes.apnp_ejercicio_tipos.join(', ')}`:''}`:antecedentes.apnp_actividad_fisica==='activo'?`Activo${antecedentes.apnp_ejercicio_tipos?.length?` — ${antecedentes.apnp_ejercicio_tipos.join(', ')}`:''}`:'Sedentario'} />
                  <AntRow label="Alergia medicamentos" val={antecedentes.apnp_alergia_medicamentos?.length>0?antecedentes.apnp_alergia_medicamentos.map(a=>`${a.medicamento} (${a.tipo})`).join(', '):'Niega'} />
                  <AntRow label="Alergia alimentos" val={antecedentes.apnp_alergia_alimentos?.length>0?antecedentes.apnp_alergia_alimentos.map(a=>`${a.alimento} (${a.tipo})`).join(', '):'Niega'} />
                  <AntRow label="APP" val={antecedentes.app_patologias?.length>0?antecedentes.app_patologias.map(p=>`${p.patologia==='Otra'?p.otra:p.patologia}${p.año?` (${p.año})`:''}`).join(', '):'Niega'} />
                  <AntRow label="AQx" val={antecedentes.aqx_procedimientos?.length>0?antecedentes.aqx_procedimientos.map(p=>`${p.procedimiento}${p.año?` (${p.año})`:''}`).join(', '):'Niega'} />
                  <AntRow label="AHF" val={antecedentes.ahf_familiares?.length>0?antecedentes.ahf_familiares.map(f=>`${f.patologia==='Otra'?f.otra:f.patologia} (${f.parentesco})`).join(', '):'Niega'} />
                  {(() => {
                    const birthDate = patient.birth_date || patient.profile?.birth_date
                    const age = birthDate ? Math.floor((Date.now() - new Date(birthDate+'T12:00:00')) / (1000*60*60*24*365.25)) : null
                    const sex = patient.sex || patient.profile?.sex
                    return sex === 'female' && age !== null && age >= 10
                  })() && (<>
                    <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginTop:6, marginBottom:2 }}>AGO</div>
                    {antecedentes.ago_fum && <AntRow label="FUM" val={antecedentes.ago_fum} />}
                    {antecedentes.ago_frecuencia_menstrual && <AntRow label="Ciclo menstrual" val={antecedentes.ago_frecuencia_menstrual} />}
                    {antecedentes.ago_mpf && <AntRow label="MPF" val={antecedentes.ago_mpf} />}
                    <AntRow label="Menopausia" val={antecedentes.ago_menopausia==='sí'?`Sí${antecedentes.ago_menopausia_año?' ('+antecedentes.ago_menopausia_año+')':''}`:antecedentes.ago_menopausia==='perimenopáusica'?'Perimenopáusica':'No'} />
                    <AntRow label="Embarazos" val={antecedentes.ago_embarazos==='sí'?`G${antecedentes.ago_gestas||0} P${antecedentes.ago_partos||0} A${antecedentes.ago_abortos||0} C${antecedentes.ago_cesareas||0}`:'Niega'} />
                    {antecedentes.ago_complicaciones_embarazo && antecedentes.ago_complicaciones_tipos?.length>0 && <AntRow label="Complicaciones" val={antecedentes.ago_complicaciones_tipos.join(', ')} />}
                    {antecedentes.ago_pap_resultado && <AntRow label="Último PAP" val={`${antecedentes.ago_pap_fecha||''} — ${antecedentes.ago_pap_resultado}`} />}
                  </>)}
                  {(() => {
                    const birthDate = patient.birth_date || patient.profile?.birth_date
                    const age = birthDate ? Math.floor((Date.now() - new Date(birthDate+'T12:00:00')) / (1000*60*60*24*365.25)) : null
                    return age !== null && age < 10
                  })() && (<>
                    <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginTop:6, marginBottom:2 }}>APed</div>
                    <AntRow label="Resultado embarazo" val={antecedentes.aped_resultado_embarazo} />
                    {(antecedentes.aped_apgar_1min||antecedentes.aped_apgar_5min) && <AntRow label="Apgar" val={`1min: ${antecedentes.aped_apgar_1min} / 5min: ${antecedentes.aped_apgar_5min}`} />}
                    <AntRow label="Resucitación" val={antecedentes.aped_resucitacion==='sí'?`Sí — ${antecedentes.aped_resucitacion_cual||''}`: 'No'} />
                    {antecedentes.aped_peso_nacer && <AntRow label="Peso nacer" val={`${antecedentes.aped_peso_nacer} g`} />}
                    {antecedentes.aped_estatura_nacer && <AntRow label="Talla nacer" val={`${antecedentes.aped_estatura_nacer} cm`} />}
                    {antecedentes.aped_cc_nacer && <AntRow label="CC nacer" val={`${antecedentes.aped_cc_nacer} cm`} />}
                    <AntRow label="Tamizaje neonatal" val={antecedentes.aped_tamizaje==='positivo'?`Positivo — ${antecedentes.aped_tamizaje_patologia||''}`: 'Negativo'} />
                  </>)}
                  {(() => {
                    const birthDate = patient.birth_date || patient.profile?.birth_date
                    const age = birthDate ? Math.floor((Date.now() - new Date(birthDate+'T12:00:00')) / (1000*60*60*24*365.25)) : null
                    return age !== null && age >= 65
                  })() && (<>
                    <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginTop:6, marginBottom:2 }}>AGer</div>
                    <AntRow label="Estado basal" val={antecedentes.ager_estado_basal} />
                    <AntRow label="Caídas" val={antecedentes.ager_caidas==='sí'?`Sí${antecedentes.ager_caidas_fecha?` (${antecedentes.ager_caidas_fecha})`:''}`:'No'} />
                    <AntRow label="Polifarmacia" val={antecedentes.ager_polifarmacia==='sí'?'Sí':'No'} />
                  </>)}
                </div>
              </div>
            )}

            {r.nota_enfermeria && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4 }}>Nota de enfermería</div>
                <div style={{ fontSize:12 }}>{r.nota_enfermeria}</div>
              </div>
            )}
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
        : (
          <div style={{ display:'flex', gap:0, height:'calc(100vh - 220px)', border:'0.5px solid #e2ede9', borderRadius:12, overflow:'hidden' }}>
            {/* Columna izquierda — lista */}
            <div style={{ width:220, flexShrink:0, borderRight:'0.5px solid #e2ede9', overflowY:'auto', background:'#f8fbf9' }}>
              {records.map(r => {
                const isSelected = expandedId === r.id
                const date = new Date(r.recorded_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })
                const consType = CONSULTATION_TYPES.find(c => c.value === r.consultation_type)
                return (
                  <div key={r.id} onClick={() => setExpandedId(isSelected ? null : r.id)}
                    style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'0.5px solid #e2ede9',
                      background: isSelected ? '#E1F5EE' : '#f8fbf9',
                      borderLeft: isSelected ? `3px solid ${G}` : '3px solid transparent' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {r.consultation_type && (
                        <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: CONSULTATION_TYPE_COLORS[r.consultation_type] || '#ccc' }} />
                      )}
                      <div style={{ fontSize:12, fontWeight:600, color: isSelected ? G : BLUE }}>{date}</div>
                    </div>
                    <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>
                      {new Date(r.recorded_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit', hour12:false })} hrs
                    </div>
                    <div style={{ fontSize:11, color:'#666', marginTop:3 }}>{consType?.label || '—'}</div>
                    <div style={{ marginTop:5 }}>
                      <span style={{ fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20,
                        background: r.status==='ready'?'#E1F5EE':'#f0f4f8',
                        color: r.status==='ready'?G:'#888' }}>
                        {r.status==='ready'?'Trasladado':'Borrador'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Columna derecha — detalle */}
            <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
              {expandedId ? (
                (() => {
                  const r = records.find(x => x.id === expandedId)
                  if (!r) return null
                  return <QuickView r={r} />
                })()
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#ccc', fontSize:13 }}>
                  Seleccioná una pre-consulta para ver el detalle
                </div>
              )}
            </div>
          </div>
        )
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
          <AntecedentesTab patient={patient} profile={profile} saveRef={antecedentesRef} />
          <div style={{ height:1, background:'#e2ede9', margin:'20px 0' }} />



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

          <div style={{ margin:'16px 0', padding:'14px', background:'#f8fbf9', border:'0.5px solid #e2ede9', borderRadius:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:10 }}>¿Realizó algún procedimiento? <span style={{ color:'#D85A30' }}>*</span></div>
            <div style={{ display:'flex', gap:8, marginBottom: hizoProcedimiento === 'si' ? 12 : 0 }}>
              {[['no','No'],['si','Sí']].map(([v,l]) => (
                <div key={v} onClick={() => { setHizoProcedimiento(v); if (v==='no') setInsumosUsados([]) }}
                  style={{ padding:'5px 14px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:hizoProcedimiento===v?600:400,
                    border: hizoProcedimiento===v?`2px solid #1a3a5c`:'1px solid #ddd',
                    background: hizoProcedimiento===v?'#E6F1FB':'#fff', color: hizoProcedimiento===v?'#1a3a5c':'#666' }}>
                  {l}
                </div>
              ))}
            </div>
            {hizoProcedimiento === 'si' && (
              <div>
                {insumosUsados.map((uso, i) => {
                  const item = inventoryItems.find(x => x.id === uso.item_id)
                  const stockBajo = item && parseFloat(uso.cantidad) > item.quantity
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'8px 10px', background:'#fff', borderRadius:8, border: stockBajo?'1px solid #F59E0B':'0.5px solid #e2ede9' }}>
                      <select style={{ flex:2, padding:'6px 8px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:6, outline:'none', fontFamily:'inherit' }}
                        value={uso.item_id} onChange={e => { const arr=[...insumosUsados]; arr[i]={...arr[i],item_id:e.target.value}; setInsumosUsados(arr) }}>
                        <option value="">Seleccionar insumo...</option>
                        {inventoryItems.map(it => <option key={it.id} value={it.id}>{it.name} — {it.quantity} {it.unit}</option>)}
                      </select>
                      <input type="number" min="0" style={{ width:80, padding:'6px 8px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:6, outline:'none', fontFamily:'inherit' }}
                        value={uso.cantidad} onChange={e => { const arr=[...insumosUsados]; arr[i]={...arr[i],cantidad:e.target.value}; setInsumosUsados(arr) }} placeholder="Cant." />
                      {item && <span style={{ fontSize:11, color:'#aaa', whiteSpace:'nowrap' }}>{item.unit}</span>}
                      {stockBajo && <span style={{ fontSize:10, color:'#BA7517' }}>⚠ Stock insuficiente</span>}
                      <button onClick={() => setInsumosUsados(p=>p.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:16 }}>×</button>
                    </div>
                  )
                })}
                <button onClick={() => setInsumosUsados(p=>[...p,{item_id:'',cantidad:''}])}
                  style={{ padding:'5px 12px', background:'#fff', border:`1px dashed ${G}`, borderRadius:8, cursor:'pointer', fontSize:12, color:G, fontWeight:500 }}>
                  + Agregar insumo
                </button>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditingId(null) }}
              style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
              Cancelar
            </button>
            {editingId && records.find(r => r.id === editingId)?.status === 'ready' ? (
              <button onClick={() => handleSave(true)} disabled={saving || !form.consultation_type || hizoProcedimiento === null}
                style={{ padding:'8px 18px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity:saving?0.7:1 }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            ) : (
              <>
                <button onClick={() => handleSave(false)} disabled={saving || !form.consultation_type || hizoProcedimiento === null}
                  style={{ padding:'8px 18px', background:'#f0f4f8', color:BLUE, border:'1px solid #c5d5e8', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, opacity:saving?0.7:1 }}>
                  {saving ? 'Guardando...' : 'Guardar borrador'}
                </button>
                <button onClick={() => handleSave(true)} disabled={saving || !form.consultation_type}
                  style={{ padding:'8px 18px', background:G, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, opacity:saving?0.7:1 }}>
                  {saving ? 'Guardando...' : 'Guardar y trasladar paciente'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
