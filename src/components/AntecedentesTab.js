import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'

const EDUCACION = ['Sin estudios formales','Primaria incompleta','Primaria completa','Secundaria incompleta','Secundaria completa','Universitaria incompleta','Universitaria completa','Maestría','Doctorado']
const RELIGION = ['Católica','Evangélica','Creyente no practicante','Atea','Agnóstica','Judía','Islámica','Musulmana','Testigo de Jehová']
const DROGAS = ['Marihuana','Cocaína','Crack','Heroína','Metanfetamina','Éxtasis (MDMA)','LSD','Hongos psilocibios','Benzodiacepinas (sin receta)','Opioides (sin receta)','Inhalantes','Ketamina']
const EJERCICIOS = ['Caminata','Senderismo','Ciclismo','Halterofilia','Pilates','Natación','Atletismo','Pádel','Tenis','Funcionales','Escalada','Aeróbicos']
const PATOLOGIAS = ['Diabetes mellitus tipo 1','Diabetes mellitus tipo 2','Hipertensión arterial','Hipotiroidismo','Hipertiroidismo','Asma','EPOC','Cardiopatía isquémica','Insuficiencia cardíaca','Fibrilación auricular','ACV/Ictus','Epilepsia','Depresión','Ansiedad','Artritis reumatoide','Lupus eritematoso','Psoriasis','Enfermedad renal crónica','Hepatitis B','Hepatitis C','VIH','Cáncer','Otra']
const COMPLICACIONES_EMBARAZO = ['Diabetes gestacional','Hipertensión inducida por el embarazo','Pre-eclampsia','Eclampsia','Hipotiroidismo del embarazo','Síndrome de HELLP','Parto distósico','Otra']
const RESULTADO_EMBARAZO = ['RNP-PEG','RNP-AEG','RNP-GEG','RNT-PEG','RNT-AEG','RNT-GEG','RNPo-PEG','RNPo-AEG','RNPo-GEG']
const ESTADO_BASAL = ['IABVD','IAIVD','DPABVD','DTABVD']
const MPF_OPTIONS = ['Anticonceptivos orales','Anticonceptivo intramuscular','Método barrera','Dispositivo intrauterino','Método del calendario','Implante subdérmico','Histerectomía']

const inp = { width:'100%', padding:'6px 9px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

function WarnIcon() {
  return <span title="Requiere atención" style={{ fontSize:11, color:'#F59E0B', marginLeft:4 }}>⚠</span>
}

function Chip({ label, active, color, onClick }) {
  const c = color || BLUE
  return (
    <div onClick={onClick} style={{ padding:'4px 10px', borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:active?600:400,
      border: active?`2px solid ${c}`:'1px solid #ddd',
      background: active?`${c}18`:'#fff', color: active?c:'#666', whiteSpace:'nowrap' }}>
      {label}
    </div>
  )
}

function Row({ children, gap=10 }) {
  return <div style={{ display:'flex', flexWrap:'wrap', gap, marginBottom:10 }}>{children}</div>
}

function Field({ label, flex='1 1 160px', children }) {
  return (
    <div style={{ flex }}>
      {label && <label style={lbl}>{label}</label>}
      {children}
    </div>
  )
}

function HabitRow({ label, opts, value, onSelect, children }) {
  return (
    <div style={{ marginBottom:8, padding:'8px 12px', background:'#f4f7f6', borderRadius:10, border:'0.5px solid #e2ede9' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.5px', minWidth:130 }}>{label}</span>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {opts.map(([v,l]) => <Chip key={v} label={l} active={value===v} onClick={() => onSelect(v)} />)}
        </div>
      </div>
      {children}
    </div>
  )
}

function MultiSelect({ options, value=[], onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const toggle = v => onChange(value.includes(v) ? value.filter(x=>x!==v) : [...value, v])
  return (
    <div style={{ position:'relative' }}>
      <div onClick={() => setOpen(p=>!p)} style={{ ...inp, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', userSelect:'none', minHeight:34 }}>
        <span style={{ fontSize:12, color: value.length?'#333':'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
          {value.length === 0 ? placeholder : value.join(', ')}
        </span>
        <span style={{ fontSize:10, color:'#aaa', flexShrink:0 }}>{open?'▲':'▼'}</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:8, zIndex:50, maxHeight:180, overflowY:'auto', marginTop:4, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
          {options.map(opt => {
            const sel = value.includes(opt)
            return (
              <div key={opt} onClick={() => toggle(opt)} style={{ padding:'7px 12px', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:8, background:sel?'#E6F1FB':'#fff', borderBottom:'0.5px solid #f0f5f3' }}>
                <div style={{ width:13, height:13, borderRadius:3, border:`1.5px solid ${sel?BLUE:'#ccc'}`, background:sel?BLUE:'#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sel && <div style={{ width:7, height:7, background:'#fff', borderRadius:1 }} />}
                </div>
                {opt}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Accordion({ title, sectionKey, expanded, onToggle, children }) {
  const isOpen = expanded.has(sectionKey)
  return (
    <div style={{ border:'0.5px solid #e2ede9', borderRadius:10, marginBottom:8, overflow:'hidden' }}>
      <div onClick={() => onToggle(sectionKey)} style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', background: isOpen?'#E6F1FB':'#fff' }}>
        <span style={{ fontSize:12, fontWeight:600, color: isOpen?BLUE:'#555' }}>{title}</span>
        <span style={{ fontSize:11, color:'#aaa' }}>{isOpen?'▲':'▼'}</span>
      </div>
      {isOpen && (
        <div style={{ padding:'14px', background:'#fafdfb', borderTop:'0.5px solid #e2ede9' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ListaItems({ items, onAdd, onRemove, addLabel, children }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ background:'#f0f4f8', border:'0.5px solid #e2ede9', borderRadius:10, padding:12, marginBottom:8, position:'relative' }}>
          {children(item, i)}
          <button onClick={() => onRemove(i)} style={{ position:'absolute', top:8, right:8, background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#ccc', lineHeight:1 }}>×</button>
        </div>
      ))}
      <button onClick={onAdd} style={{ padding:'6px 12px', background:'#fff', border:`1px dashed ${G}`, borderRadius:8, cursor:'pointer', fontSize:12, color:G, fontWeight:500 }}>
        + {addLabel}
      </button>
    </div>
  )
}

const emptyData = {
  apnp_educacion:'', apnp_estado_civil:'', apnp_religion:'',
  apnp_fumado:'negativo', apnp_fumado_paquetes_dia:'', apnp_fumado_años:'', apnp_fumado_año_suspension:'',
  apnp_alcohol:'negativo', apnp_alcohol_bebida:'', apnp_alcohol_veces_semana:'',
  apnp_drogas:'negativo', apnp_drogas_tipos:[], apnp_drogas_año_suspension:'',
  apnp_actividad_fisica:'sedentario', apnp_ejercicio_tipos:[], apnp_ejercicio_veces_semana:'', apnp_ejercicio_tiempo_sesion:'',
  apnp_alergia_medicamentos:[], apnp_alergia_alimentos:[],
  app_patologias:[], aqx_procedimientos:[], ahf_familiares:[],
  ago_fum:'', ago_frecuencia_menstrual:'', ago_mpf:'', ago_mpf_diu_cual:'', ago_mpf_implante_año:'',
  ago_menopausia:'no', ago_menopausia_año:'',
  ago_embarazos:'no', ago_gestas:'', ago_partos:'', ago_abortos:'', ago_cesareas:'',
  ago_complicaciones_embarazo:false, ago_complicaciones_tipos:[],
  ago_pap_fecha:'', ago_pap_resultado:'',
  aped_resultado_embarazo:'', aped_apgar_1min:'', aped_apgar_5min:'',
  aped_resucitacion:'no', aped_resucitacion_cual:'',
  aped_peso_nacer:'', aped_estatura_nacer:'', aped_cc_nacer:'',
  aped_tamizaje:'negativo', aped_tamizaje_patologia:'',
  ager_estado_basal:'', ager_caidas:'no', ager_caidas_fecha:'', ager_polifarmacia:'no',
}

export default function AntecedentesTab({ patient, profile }) {
  const [data, setData] = useState(emptyData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(new Set(['apnp']))

  const patientId = patient.profile?.id || patient.id
  const birthDate = patient.birth_date || patient.profile?.birth_date
  const age = birthDate ? Math.floor((Date.now() - new Date(birthDate+'T12:00:00')) / (1000*60*60*24*365.25)) : null
  const sex = patient.sex || patient.profile?.sex
  const isFemale = sex === 'female'
  const showAGO = isFemale && age !== null && age >= 10
  const showAPed = age !== null && age < 10
  const showAGer = age !== null && age >= 65

  const toggle = k => setExpanded(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n })

  useEffect(() => { if (patientId) load() }, [patientId])

  async function load() {
    setLoading(true)
    const { data: d } = await supabase.from('patient_antecedentes')
      .select('*').eq('patient_id', patientId).eq('clinic_id', profile.clinic_id).single()
    if (d) {
      setData({ ...emptyData, ...d,
        app_patologias: d.app_patologias || [],
        aqx_procedimientos: d.aqx_procedimientos || [],
        ahf_familiares: d.ahf_familiares || [],
        apnp_drogas_tipos: d.apnp_drogas_tipos || [],
        apnp_ejercicio_tipos: d.apnp_ejercicio_tipos || [],
        apnp_alergia_medicamentos: d.apnp_alergia_medicamentos || [],
        apnp_alergia_alimentos: d.apnp_alergia_alimentos || [],
        ago_complicaciones_tipos: d.ago_complicaciones_tipos || [],
      })
    }
    setLoading(false)
  }

  const upd = (key, val) => setData(p => ({ ...p, [key]: val }))
  const f = k => e => upd(k, e.target.value)

  async function save() {
    setSaving(true)
    const payload = { ...data, patient_id: patientId, clinic_id: profile.clinic_id, updated_by: profile.id, updated_at: new Date().toISOString() }
    delete payload.id; delete payload.created_at
    await supabase.from('patient_antecedentes').upsert(payload, { onConflict: 'patient_id,clinic_id' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const estadoCivil = base => {
    const fem = { 'Soltero':'Soltera','Casado':'Casada','Divorciado':'Divorciada','Unión libre':'Unión libre','Viudo':'Viuda' }
    return isFemale ? (fem[base] || base) : base
  }

  const listUpd = (key, i, field, val) => {
    const arr = [...(data[key] || [])]
    arr[i] = { ...arr[i], [field]: val }
    upd(key, arr)
  }

  if (loading) return <div style={{ textAlign:'center', padding:16, color:'#bbb', fontSize:12 }}>Cargando antecedentes...</div>

  return (
    <div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:BLUE }}>Antecedentes del paciente</div>
      </div>

      <Accordion title="Antecedentes personales no patológicos (APnP)" sectionKey="apnp" expanded={expanded} onToggle={toggle}>
        <Row>
          <Field label="Nivel de educación" flex="2 1 200px">
            <select style={inp} value={data.apnp_educacion} onChange={f('apnp_educacion')}>
              <option value="">Seleccionar...</option>
              {EDUCACION.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Estado civil" flex="1 1 130px">
            <select style={inp} value={data.apnp_estado_civil} onChange={f('apnp_estado_civil')}>
              <option value="">Seleccionar...</option>
              {['Soltero','Casado','Divorciado','Unión libre','Viudo'].map(e => <option key={e} value={e}>{estadoCivil(e)}</option>)}
            </select>
          </Field>
          <Field label="Religión" flex="1 1 150px">
            <select style={inp} value={data.apnp_religion} onChange={f('apnp_religion')}>
              <option value="">Seleccionar...</option>
              {RELIGION.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </Row>
        {data.apnp_religion === 'Testigo de Jehová' && (
          <div style={{ marginBottom:10, padding:'7px 10px', background:'#FFF8E1', border:'1px solid #F59E0B', borderRadius:8, fontSize:11, color:'#854F0B' }}>
            Esta religión prohíbe la transfusión sanguínea.
          </div>
        )}

        <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8, marginTop:4 }}>Hábitos</div>

        <HabitRow label="Fumado" opts={[['negativo','Negativo'],['activo','Activo'],['suspendido','Suspendido']]} value={data.apnp_fumado} onSelect={v => upd('apnp_fumado', v)}>
          {(data.apnp_fumado === 'activo' || data.apnp_fumado === 'suspendido') && (
            <Row gap={8} style={{ marginTop:8 }}>
              <Field label="Paquetes/día" flex="1 1 100px"><input type="number" style={inp} value={data.apnp_fumado_paquetes_dia} onChange={f('apnp_fumado_paquetes_dia')} /></Field>
              <Field label="Años fumando" flex="1 1 100px"><input type="number" style={inp} value={data.apnp_fumado_años} onChange={f('apnp_fumado_años')} /></Field>
              {data.apnp_fumado_paquetes_dia && data.apnp_fumado_años && (
                <div style={{ alignSelf:'flex-end', paddingBottom:6, fontSize:11, color:'#555' }}>Paquetes-año: <strong>{(parseFloat(data.apnp_fumado_paquetes_dia)*parseFloat(data.apnp_fumado_años)).toFixed(1)}</strong></div>
              )}
              {data.apnp_fumado === 'suspendido' && <Field label="Año suspensión" flex="1 1 100px"><input type="number" style={inp} value={data.apnp_fumado_año_suspension} onChange={f('apnp_fumado_año_suspension')} /></Field>}
            </Row>
          )}
        </HabitRow>

        <HabitRow label="Alcohol" opts={[['negativo','Negativo'],['ocasional/social','Ocasional'],['habitual','Habitual']]} value={data.apnp_alcohol} onSelect={v => upd('apnp_alcohol', v)}>
          {data.apnp_alcohol !== 'negativo' && (
            <Row gap={8} style={{ marginTop:8 }}>
              <Field label="Bebida habitual" flex="2 1 140px"><input style={inp} value={data.apnp_alcohol_bebida} onChange={f('apnp_alcohol_bebida')} /></Field>
              <Field label="Veces/semana" flex="1 1 90px"><input type="number" style={inp} value={data.apnp_alcohol_veces_semana} onChange={f('apnp_alcohol_veces_semana')} /></Field>
            </Row>
          )}
        </HabitRow>

        <HabitRow label="Drogas" opts={[['negativo','Negativo'],['activo','Activo'],['suspendido','Suspendido']]} value={data.apnp_drogas} onSelect={v => upd('apnp_drogas', v)}>
          {data.apnp_drogas !== 'negativo' && (
            <Row gap={8} style={{ marginTop:8 }}>
              <Field label="Tipo(s)" flex="2 1 180px"><MultiSelect options={DROGAS} value={data.apnp_drogas_tipos} onChange={v => upd('apnp_drogas_tipos', v)} placeholder="Seleccionar..." /></Field>
              {data.apnp_drogas === 'suspendido' && <Field label="Año suspensión" flex="1 1 90px"><input type="number" style={inp} value={data.apnp_drogas_año_suspension} onChange={f('apnp_drogas_año_suspension')} /></Field>}
            </Row>
          )}
        </HabitRow>

        <HabitRow label="Actividad física" opts={[['sedentario','Sedentario'],['en proceso','En proceso'],['activo','Activo']]} value={data.apnp_actividad_fisica} onSelect={v => upd('apnp_actividad_fisica', v)}>
          {data.apnp_actividad_fisica !== 'sedentario' && (
            <Row gap={8} style={{ marginTop:8 }}>
              <Field label="Tipo(s) de ejercicio" flex="2 1 180px"><MultiSelect options={EJERCICIOS} value={data.apnp_ejercicio_tipos} onChange={v => upd('apnp_ejercicio_tipos', v)} placeholder="Seleccionar..." /></Field>
              <Field label="Veces/semana" flex="1 1 80px"><input type="number" style={inp} value={data.apnp_ejercicio_veces_semana} onChange={f('apnp_ejercicio_veces_semana')} /></Field>
              <Field label="Min/sesión" flex="1 1 80px"><input type="number" style={inp} value={data.apnp_ejercicio_tiempo_sesion} onChange={f('apnp_ejercicio_tiempo_sesion')} /></Field>
            </Row>
          )}
        </HabitRow>

        <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8, marginTop:4 }}>Alergias</div>
        <div style={{ marginBottom:10 }}>
          <label style={lbl}>Alergia a medicamentos</label>
          <ListaItems items={data.apnp_alergia_medicamentos} addLabel="Agregar"
            onAdd={() => upd('apnp_alergia_medicamentos', [...data.apnp_alergia_medicamentos, { medicamento:'', tipo:'' }])}
            onRemove={i => upd('apnp_alergia_medicamentos', data.apnp_alergia_medicamentos.filter((_,j)=>j!==i))}>
            {(item, i) => (
              <Row>
                <Field label="Medicamento" flex="2 1 140px"><input style={inp} value={item.medicamento||''} onChange={e => listUpd('apnp_alergia_medicamentos', i, 'medicamento', e.target.value)} /></Field>
                <Field label="Tipo de reacción" flex="2 1 140px"><input style={inp} value={item.tipo||''} onChange={e => listUpd('apnp_alergia_medicamentos', i, 'tipo', e.target.value)} /></Field>
              </Row>
            )}
          </ListaItems>
        </div>
        <div>
          <label style={lbl}>Alergia a alimentos</label>
          <ListaItems items={data.apnp_alergia_alimentos} addLabel="Agregar"
            onAdd={() => upd('apnp_alergia_alimentos', [...data.apnp_alergia_alimentos, { alimento:'', tipo:'' }])}
            onRemove={i => upd('apnp_alergia_alimentos', data.apnp_alergia_alimentos.filter((_,j)=>j!==i))}>
            {(item, i) => (
              <Row>
                <Field label="Alimento" flex="2 1 140px"><input style={inp} value={item.alimento||''} onChange={e => listUpd('apnp_alergia_alimentos', i, 'alimento', e.target.value)} /></Field>
                <Field label="Tipo de reacción" flex="2 1 140px"><input style={inp} value={item.tipo||''} onChange={e => listUpd('apnp_alergia_alimentos', i, 'tipo', e.target.value)} /></Field>
              </Row>
            )}
          </ListaItems>
        </div>
      </Accordion>

      <Accordion title="Antecedentes personales patológicos (APP)" sectionKey="app" expanded={expanded} onToggle={toggle}>
        <ListaItems items={data.app_patologias} addLabel="Agregar patología"
          onAdd={() => upd('app_patologias', [...data.app_patologias, { patologia:'', otra:'', año:'', tratamiento:'', observaciones:'' }])}
          onRemove={i => upd('app_patologias', data.app_patologias.filter((_,j)=>j!==i))}>
          {(item, i) => (
            <div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'flex-end' }}>
                <div style={{ flex:'3 1 170px' }}>
                  <label style={lbl}>Patología</label>
                  <select style={inp} value={item.patologia||''} onChange={e => listUpd('ahf_familiares', i, 'patologia', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {PATOLOGIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ flex:'1 1 110px' }}>
                  <label style={lbl}>Parentesco</label>
                  <select style={inp} value={item.parentesco||''} onChange={e => listUpd('ahf_familiares', i, 'parentesco', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {['Padre','Madre','Hermano','Hermana','Abuelo','Abuela','Tío','Tía'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ flex:'2 1 130px' }}>
                  <label style={lbl}>Observaciones</label>
                  <input style={inp} value={item.observaciones||''} onChange={e => listUpd('ahf_familiares', i, 'observaciones', e.target.value)} />
                </div>
              </div>
              {item.patologia === 'Otra' && <div style={{ marginTop:6 }}><label style={lbl}>Especificar</label><input style={inp} value={item.otra||''} onChange={e => listUpd('ahf_familiares', i, 'otra', e.target.value)} /></div>}
            </div>
          )}
        </ListaItems>
      </Accordion>

      {showAGObase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'

const EDUCACION = ['Sin estudios formales','Primaria incompleta','Primaria completa','Secundaria incompleta','Secundaria completa','Universitaria incompleta','Universitaria completa','Maestría','Doctorado']
const RELIGION = ['Católica','Evangélica','Creyente no practicante','Atea','Agnóstica','Judía','Islámica','Musulmana','Testigo de Jehová']
const DROGAS = ['Marihuana','Cocaína','Crack','Heroína','Metanfetamina','Éxtasis (MDMA)','LSD','Hongos psilocibios','Benzodiacepinas (sin receta)','Opioides (sin receta)','Inhalantes','Ketamina']
const EJERCICIOS = ['Caminata','Senderismo','Ciclismo','Halterofilia','Pilates','Natación','Atletismo','Pádel','Tenis','Funcionales','Escalada','Aeróbicos']
const PATOLOGIAS = ['Diabetes mellitus tipo 1','Diabetes mellitus tipo 2','Hipertensión arterial','Hipotiroidismo','Hipertiroidismo','Asma','EPOC','Cardiopatía isquémica','Insuficiencia cardíaca','Fibrilación auricular','ACV/Ictus','Epilepsia','Depresión','Ansiedad','Artritis reumatoide','Lupus eritematoso','Psoriasis','Enfermedad renal crónica','Hepatitis B','Hepatitis C','VIH','Cáncer','Otra']
const COMPLICACIONES_EMBARAZO = ['Diabetes gestacional','Hipertensión inducida por el embarazo','Pre-eclampsia','Eclampsia','Hipotiroidismo del embarazo','Síndrome de HELLP','Parto distósico','Otra']
const RESULTADO_EMBARAZO = ['RNP-PEG','RNP-AEG','RNP-GEG','RNT-PEG','RNT-AEG','RNT-GEG','RNPo-PEG','RNPo-AEG','RNPo-GEG']
const ESTADO_BASAL = ['IABVD','IAIVD','DPABVD','DTABVD']
const MPF_OPTIONS = ['Anticonceptivos orales','Anticonceptivo intramuscular','Método barrera','Dispositivo intrauterino','Método del calendario','Implante subdérmico','Histerectomía']

const inp = { width:'100%', padding:'6px 9px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

function WarnIcon() {
  return <span title="Requiere atención" style={{ fontSize:11, color:'#F59E0B', marginLeft:4 }}>⚠</span>
}

function Chip({ label, active, color, onClick }) {
  const c = color || BLUE
  return (
    <div onClick={onClick} style={{ padding:'4px 10px', borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:active?600:400,
      border: active?`2px solid ${c}`:'1px solid #ddd',
      background: active?`${c}18`:'#fff', color: active?c:'#666', whiteSpace:'nowrap' }}>
      {label}
    </div>
  )
}

function Row({ children, gap=10 }) {
  return <div style={{ display:'flex', flexWrap:'wrap', gap, marginBottom:10 }}>{children}</div>
}

function Field({ label, flex='1 1 160px', children }) {
  return (
    <div style={{ flex }}>
      {label && <label style={lbl}>{label}</label>}
      {children}
    </div>
  )
}

function HabitRow({ label, opts, value, onSelect, children }) {
  return (
    <div style={{ marginBottom:8, padding:'8px 12px', background:'#f4f7f6', borderRadius:10, border:'0.5px solid #e2ede9' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.5px', minWidth:130 }}>{label}</span>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {opts.map(([v,l]) => <Chip key={v} label={l} active={value===v} onClick={() => onSelect(v)} />)}
        </div>
      </div>
      {children}
    </div>
  )
}

function MultiSelect({ options, value=[], onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const toggle = v => onChange(value.includes(v) ? value.filter(x=>x!==v) : [...value, v])
  return (
    <div style={{ position:'relative' }}>
      <div onClick={() => setOpen(p=>!p)} style={{ ...inp, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', userSelect:'none', minHeight:34 }}>
        <span style={{ fontSize:12, color: value.length?'#333':'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
          {value.length === 0 ? placeholder : value.join(', ')}
        </span>
        <span style={{ fontSize:10, color:'#aaa', flexShrink:0 }}>{open?'▲':'▼'}</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:8, zIndex:50, maxHeight:180, overflowY:'auto', marginTop:4, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
          {options.map(opt => {
            const sel = value.includes(opt)
            return (
              <div key={opt} onClick={() => toggle(opt)} style={{ padding:'7px 12px', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:8, background:sel?'#E6F1FB':'#fff', borderBottom:'0.5px solid #f0f5f3' }}>
                <div style={{ width:13, height:13, borderRadius:3, border:`1.5px solid ${sel?BLUE:'#ccc'}`, background:sel?BLUE:'#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sel && <div style={{ width:7, height:7, background:'#fff', borderRadius:1 }} />}
                </div>
                {opt}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Accordion({ title, sectionKey, expanded, onToggle, children }) {
  const isOpen = expanded.has(sectionKey)
  return (
    <div style={{ border:'0.5px solid #e2ede9', borderRadius:10, marginBottom:8, overflow:'hidden' }}>
      <div onClick={() => onToggle(sectionKey)} style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', background: isOpen?'#E6F1FB':'#fff' }}>
        <span style={{ fontSize:12, fontWeight:600, color: isOpen?BLUE:'#555' }}>{title}</span>
        <span style={{ fontSize:11, color:'#aaa' }}>{isOpen?'▲':'▼'}</span>
      </div>
      {isOpen && (
        <div style={{ padding:'14px', background:'#fafdfb', borderTop:'0.5px solid #e2ede9' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ListaItems({ items, onAdd, onRemove, addLabel, children }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ background:'#f0f4f8', border:'0.5px solid #e2ede9', borderRadius:10, padding:12, marginBottom:8, position:'relative' }}>
          {children(item, i)}
          <button onClick={() => onRemove(i)} style={{ position:'absolute', top:8, right:8, background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#ccc', lineHeight:1 }}>×</button>
        </div>
      ))}
      <button onClick={onAdd} style={{ padding:'6px 12px', background:'#fff', border:`1px dashed ${G}`, borderRadius:8, cursor:'pointer', fontSize:12, color:G, fontWeight:500 }}>
        + {addLabel}
      </button>
    </div>
  )
}

const emptyData = {
  apnp_educacion:'', apnp_estado_civil:'', apnp_religion:'',
  apnp_fumado:'negativo', apnp_fumado_paquetes_dia:'', apnp_fumado_años:'', apnp_fumado_año_suspension:'',
  apnp_alcohol:'negativo', apnp_alcohol_bebida:'', apnp_alcohol_veces_semana:'',
  apnp_drogas:'negativo', apnp_drogas_tipos:[], apnp_drogas_año_suspension:'',
  apnp_actividad_fisica:'sedentario', apnp_ejercicio_tipos:[], apnp_ejercicio_veces_semana:'', apnp_ejercicio_tiempo_sesion:'',
  apnp_alergia_medicamentos:[], apnp_alergia_alimentos:[],
  app_patologias:[], aqx_procedimientos:[], ahf_familiares:[],
  ago_fum:'', ago_frecuencia_menstrual:'', ago_mpf:'', ago_mpf_diu_cual:'', ago_mpf_implante_año:'',
  ago_menopausia:'no', ago_menopausia_año:'',
  ago_embarazos:'no', ago_gestas:'', ago_partos:'', ago_abortos:'', ago_cesareas:'',
  ago_complicaciones_embarazo:false, ago_complicaciones_tipos:[],
  ago_pap_fecha:'', ago_pap_resultado:'',
  aped_resultado_embarazo:'', aped_apgar_1min:'', aped_apgar_5min:'',
  aped_resucitacion:'no', aped_resucitacion_cual:'',
  aped_peso_nacer:'', aped_estatura_nacer:'', aped_cc_nacer:'',
  aped_tamizaje:'negativo', aped_tamizaje_patologia:'',
  ager_estado_basal:'', ager_caidas:'no', ager_caidas_fecha:'', ager_polifarmacia:'no',
}

export default function AntecedentesTab({ patient, profile }) {
  const [data, setData] = useState(emptyData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(new Set(['apnp']))

  const patientId = patient.profile?.id || patient.id
  const birthDate = patient.birth_date || patient.profile?.birth_date
  const age = birthDate ? Math.floor((Date.now() - new Date(birthDate+'T12:00:00')) / (1000*60*60*24*365.25)) : null
  const sex = patient.sex || patient.profile?.sex
  const isFemale = sex === 'female'
  const showAGO = isFemale && age !== null && age >= 10
  const showAPed = age !== null && age < 10
  const showAGer = age !== null && age >= 65

  const toggle = k => setExpanded(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n })

  useEffect(() => { if (patientId) load() }, [patientId])

  async function load() {
    setLoading(true)
    const { data: d } = await supabase.from('patient_antecedentes')
      .select('*').eq('patient_id', patientId).eq('clinic_id', profile.clinic_id).single()
    if (d) {
      setData({ ...emptyData, ...d,
        app_patologias: d.app_patologias || [],
        aqx_procedimientos: d.aqx_procedimientos || [],
        ahf_familiares: d.ahf_familiares || [],
        apnp_drogas_tipos: d.apnp_drogas_tipos || [],
        apnp_ejercicio_tipos: d.apnp_ejercicio_tipos || [],
        apnp_alergia_medicamentos: d.apnp_alergia_medicamentos || [],
        apnp_alergia_alimentos: d.apnp_alergia_alimentos || [],
        ago_complicaciones_tipos: d.ago_complicaciones_tipos || [],
      })
    }
    setLoading(false)
  }

  const upd = (key, val) => setData(p => ({ ...p, [key]: val }))
  const f = k => e => upd(k, e.target.value)

  async function save() {
    setSaving(true)
    const payload = { ...data, patient_id: patientId, clinic_id: profile.clinic_id, updated_by: profile.id, updated_at: new Date().toISOString() }
    delete payload.id; delete payload.created_at
    await supabase.from('patient_antecedentes').upsert(payload, { onConflict: 'patient_id,clinic_id' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const estadoCivil = base => {
    const fem = { 'Soltero':'Soltera','Casado':'Casada','Divorciado':'Divorciada','Unión libre':'Unión libre','Viudo':'Viuda' }
    return isFemale ? (fem[base] || base) : base
  }

  const listUpd = (key, i, field, val) => {
    const arr = [...(data[key] || [])]
    arr[i] = { ...arr[i], [field]: val }
    upd(key, arr)
  }

  if (loading) return <div style={{ textAlign:'center', padding:16, color:'#bbb', fontSize:12 }}>Cargando antecedentes...</div>

  return (
    <div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:BLUE }}>Antecedentes del paciente</div>
      </div>

      <Accordion title="Antecedentes personales no patológicos (APnP)" sectionKey="apnp" expanded={expanded} onToggle={toggle}>
        <Row>
          <Field label="Nivel de educación" flex="2 1 200px">
            <select style={inp} value={data.apnp_educacion} onChange={f('apnp_educacion')}>
              <option value="">Seleccionar...</option>
              {EDUCACION.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Estado civil" flex="1 1 130px">
            <select style={inp} value={data.apnp_estado_civil} onChange={f('apnp_estado_civil')}>
              <option value="">Seleccionar...</option>
              {['Soltero','Casado','Divorciado','Unión libre','Viudo'].map(e => <option key={e} value={e}>{estadoCivil(e)}</option>)}
            </select>
          </Field>
          <Field label="Religión" flex="1 1 150px">
            <select style={inp} value={data.apnp_religion} onChange={f('apnp_religion')}>
              <option value="">Seleccionar...</option>
              {RELIGION.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </Row>
        {data.apnp_religion === 'Testigo de Jehová' && (
          <div style={{ marginBottom:10, padding:'7px 10px', background:'#FFF8E1', border:'1px solid #F59E0B', borderRadius:8, fontSize:11, color:'#854F0B' }}>
            Esta religión prohíbe la transfusión sanguínea.
          </div>
        )}

        <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8, marginTop:4 }}>Hábitos</div>

        <HabitRow label="Fumado" opts={[['negativo','Negativo'],['activo','Activo'],['suspendido','Suspendido']]} value={data.apnp_fumado} onSelect={v => upd('apnp_fumado', v)}>
          {(data.apnp_fumado === 'activo' || data.apnp_fumado === 'suspendido') && (
            <Row gap={8} style={{ marginTop:8 }}>
              <Field label="Paquetes/día" flex="1 1 100px"><input type="number" style={inp} value={data.apnp_fumado_paquetes_dia} onChange={f('apnp_fumado_paquetes_dia')} /></Field>
              <Field label="Años fumando" flex="1 1 100px"><input type="number" style={inp} value={data.apnp_fumado_años} onChange={f('apnp_fumado_años')} /></Field>
              {data.apnp_fumado_paquetes_dia && data.apnp_fumado_años && (
                <div style={{ alignSelf:'flex-end', paddingBottom:6, fontSize:11, color:'#555' }}>Paquetes-año: <strong>{(parseFloat(data.apnp_fumado_paquetes_dia)*parseFloat(data.apnp_fumado_años)).toFixed(1)}</strong></div>
              )}
              {data.apnp_fumado === 'suspendido' && <Field label="Año suspensión" flex="1 1 100px"><input type="number" style={inp} value={data.apnp_fumado_año_suspension} onChange={f('apnp_fumado_año_suspension')} /></Field>}
            </Row>
          )}
        </HabitRow>

        <HabitRow label="Alcohol" opts={[['negativo','Negativo'],['ocasional/social','Ocasional'],['habitual','Habitual']]} value={data.apnp_alcohol} onSelect={v => upd('apnp_alcohol', v)}>
          {data.apnp_alcohol !== 'negativo' && (
            <Row gap={8} style={{ marginTop:8 }}>
              <Field label="Bebida habitual" flex="2 1 140px"><input style={inp} value={data.apnp_alcohol_bebida} onChange={f('apnp_alcohol_bebida')} /></Field>
              <Field label="Veces/semana" flex="1 1 90px"><input type="number" style={inp} value={data.apnp_alcohol_veces_semana} onChange={f('apnp_alcohol_veces_semana')} /></Field>
            </Row>
          )}
        </HabitRow>

        <HabitRow label="Drogas" opts={[['negativo','Negativo'],['activo','Activo'],['suspendido','Suspendido']]} value={data.apnp_drogas} onSelect={v => upd('apnp_drogas', v)}>
          {data.apnp_drogas !== 'negativo' && (
            <Row gap={8} style={{ marginTop:8 }}>
              <Field label="Tipo(s)" flex="2 1 180px"><MultiSelect options={DROGAS} value={data.apnp_drogas_tipos} onChange={v => upd('apnp_drogas_tipos', v)} placeholder="Seleccionar..." /></Field>
              {data.apnp_drogas === 'suspendido' && <Field label="Año suspensión" flex="1 1 90px"><input type="number" style={inp} value={data.apnp_drogas_año_suspension} onChange={f('apnp_drogas_año_suspension')} /></Field>}
            </Row>
          )}
        </HabitRow>

        <HabitRow label="Actividad física" opts={[['sedentario','Sedentario'],['en proceso','En proceso'],['activo','Activo']]} value={data.apnp_actividad_fisica} onSelect={v => upd('apnp_actividad_fisica', v)}>
          {data.apnp_actividad_fisica !== 'sedentario' && (
            <Row gap={8} style={{ marginTop:8 }}>
              <Field label="Tipo(s) de ejercicio" flex="2 1 180px"><MultiSelect options={EJERCICIOS} value={data.apnp_ejercicio_tipos} onChange={v => upd('apnp_ejercicio_tipos', v)} placeholder="Seleccionar..." /></Field>
              <Field label="Veces/semana" flex="1 1 80px"><input type="number" style={inp} value={data.apnp_ejercicio_veces_semana} onChange={f('apnp_ejercicio_veces_semana')} /></Field>
              <Field label="Min/sesión" flex="1 1 80px"><input type="number" style={inp} value={data.apnp_ejercicio_tiempo_sesion} onChange={f('apnp_ejercicio_tiempo_sesion')} /></Field>
            </Row>
          )}
        </HabitRow>

        <div style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8, marginTop:4 }}>Alergias</div>
        <div style={{ marginBottom:10 }}>
          <label style={lbl}>Alergia a medicamentos</label>
          <ListaItems items={data.apnp_alergia_medicamentos} addLabel="Agregar"
            onAdd={() => upd('apnp_alergia_medicamentos', [...data.apnp_alergia_medicamentos, { medicamento:'', tipo:'' }])}
            onRemove={i => upd('apnp_alergia_medicamentos', data.apnp_alergia_medicamentos.filter((_,j)=>j!==i))}>
            {(item, i) => (
              <Row>
                <Field label="Medicamento" flex="2 1 140px"><input style={inp} value={item.medicamento||''} onChange={e => listUpd('apnp_alergia_medicamentos', i, 'medicamento', e.target.value)} /></Field>
                <Field label="Tipo de reacción" flex="2 1 140px"><input style={inp} value={item.tipo||''} onChange={e => listUpd('apnp_alergia_medicamentos', i, 'tipo', e.target.value)} /></Field>
              </Row>
            )}
          </ListaItems>
        </div>
        <div>
          <label style={lbl}>Alergia a alimentos</label>
          <ListaItems items={data.apnp_alergia_alimentos} addLabel="Agregar"
            onAdd={() => upd('apnp_alergia_alimentos', [...data.apnp_alergia_alimentos, { alimento:'', tipo:'' }])}
            onRemove={i => upd('apnp_alergia_alimentos', data.apnp_alergia_alimentos.filter((_,j)=>j!==i))}>
            {(item, i) => (
              <Row>
                <Field label="Alimento" flex="2 1 140px"><input style={inp} value={item.alimento||''} onChange={e => listUpd('apnp_alergia_alimentos', i, 'alimento', e.target.value)} /></Field>
                <Field label="Tipo de reacción" flex="2 1 140px"><input style={inp} value={item.tipo||''} onChange={e => listUpd('apnp_alergia_alimentos', i, 'tipo', e.target.value)} /></Field>
              </Row>
            )}
          </ListaItems>
        </div>
      </Accordion>

      <Accordion title="Antecedentes personales patológicos (APP)" sectionKey="app" expanded={expanded} onToggle={toggle}>
        <ListaItems items={data.app_patologias} addLabel="Agregar patología"
          onAdd={() => upd('app_patologias', [...data.app_patologias, { patologia:'', otra:'', año:'', tratamiento:'', observaciones:'' }])}
          onRemove={i => upd('app_patologias', data.app_patologias.filter((_,j)=>j!==i))}>
          {(item, i) => (
            <div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'flex-end' }}>
                <div style={{ flex:'3 1 170px' }}>
                  <label style={lbl}>Patología</label>
                  <select style={inp} value={item.patologia||''} onChange={e => listUpd('ahf_familiares', i, 'patologia', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {PATOLOGIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ flex:'1 1 110px' }}>
                  <label style={lbl}>Parentesco</label>
                  <select style={inp} value={item.parentesco||''} onChange={e => listUpd('ahf_familiares', i, 'parentesco', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {['Padre','Madre','Hermano','Hermana','Abuelo','Abuela','Tío','Tía'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ flex:'2 1 130px' }}>
                  <label style={lbl}>Observaciones</label>
                  <input style={inp} value={item.observaciones||''} onChange={e => listUpd('ahf_familiares', i, 'observaciones', e.target.value)} />
                </div>
              </div>
              {item.patologia === 'Otra' && <div style={{ marginTop:6 }}><label style={lbl}>Especificar</label><input style={inp} value={item.otra||''} onChange={e => listUpd('ahf_familiares', i, 'otra', e.target.value)} /></div>}
            </div>
          )}
        </ListaItems>
      </Accordion>

      {showAGO