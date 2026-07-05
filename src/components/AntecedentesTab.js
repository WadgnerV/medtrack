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

const inp = { width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5, display:'block' }
const row2 = { display:'flex', flexWrap:'wrap', gap:12, marginBottom:12 }
const row3 = { display:'flex', flexWrap:'wrap', gap:12, marginBottom:12 }

function WarnIcon() {
  return <span title="Valor fuera de rango" style={{ fontSize:11, color:'#F59E0B', marginLeft:4 }}>⚠</span>
}

function Chip({ label, active, color, onClick }) {
  const c = color || BLUE
  return (
    <div onClick={onClick} style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:active?600:400,
      border: active?`2px solid ${c}`:'1px solid #e0e0e0',
      background: active?`${c}18`:'#fff', color: active?c:'#666' }}>
      {label}
    </div>
  )
}

function MultiSelect({ options, value=[], onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const toggle = v => onChange(value.includes(v) ? value.filter(x=>x!==v) : [...value, v])
  return (
    <div style={{ position:'relative' }}>
      <div onClick={() => setOpen(p=>!p)} style={{ ...inp, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', userSelect:'none', minHeight:38 }}>
        <span style={{ fontSize:13, color: value.length?'#333':'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
          {value.length === 0 ? placeholder : value.join(', ')}
        </span>
        <span style={{ fontSize:10, color:'#aaa', flexShrink:0 }}>{open?'▲':'▼'}</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:8, zIndex:50, maxHeight:200, overflowY:'auto', marginTop:4, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
          {options.map(opt => {
            const sel = value.includes(opt)
            return (
              <div key={opt} onClick={() => toggle(opt)} style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:8, background:sel?'#E6F1FB':'#fff', borderBottom:'0.5px solid #f0f5f3' }}>
                <div style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${sel?BLUE:'#ccc'}`, background:sel?BLUE:'#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sel && <div style={{ width:8, height:8, background:'#fff', borderRadius:1 }} />}
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
      <div onClick={() => onToggle(sectionKey)} style={{ padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', background: isOpen?'#E6F1FB':'#fff' }}>
        <span style={{ fontSize:13, fontWeight:600, color: isOpen?BLUE:'#555' }}>{title}</span>
        <span style={{ fontSize:12, color:'#aaa' }}>{isOpen?'▲':'▼'}</span>
      </div>
      {isOpen && (
        <div style={{ padding:'16px', background:'#fafdfb', borderTop:'0.5px solid #e2ede9' }}>
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
        <div key={i} style={{ background:'#f0f4f8', border:'0.5px solid #e2ede9', borderRadius:10, padding:14, marginBottom:10, position:'relative' }}>
          {children(item, i)}
          <button onClick={() => onRemove(i)} style={{ position:'absolute', top:10, right:10, background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#ccc', lineHeight:1 }}>×</button>
        </div>
      ))}
      <button onClick={onAdd} style={{ padding:'7px 14px', background:'#fff', border:`1px dashed ${G}`, borderRadius:8, cursor:'pointer', fontSize:13, color:G, fontWeight:500 }}>
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

  if (loading) return <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Cargando antecedentes...</div>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:BLUE }}>Antecedentes del paciente</div>
        <button onClick={save} disabled={saving}
          style={{ padding:'7px 18px', background: saved?G:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
          {saving?'Guardando...':saved?'Guardado':'Guardar cambios'}
        </button>
      </div>

      <Accordion title="Antecedentes personales no patológicos (APnP)" sectionKey="apnp" expanded={expanded} onToggle={toggle}>
        <div style={row2}>
          <div style={{ flex:'1 1 220px' }}>
            <label style={lbl}>Nivel de educación</label>
            <select style={inp} value={data.apnp_educacion} onChange={f('apnp_educacion')}>
              <option value="">Seleccionar...</option>
              {EDUCACION.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={{ flex:'1 1 180px' }}>
            <label style={lbl}>Estado civil</label>
            <select style={inp} value={data.apnp_estado_civil} onChange={f('apnp_estado_civil')}>
              <option value="">Seleccionar...</option>
              {['Soltero','Casado','Divorciado','Unión libre','Viudo'].map(e => <option key={e} value={e}>{estadoCivil(e)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Religión</label>
          <select style={inp} value={data.apnp_religion} onChange={f('apnp_religion')}>
            <option value="">Seleccionar...</option>
            {RELIGION.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {data.apnp_religion === 'Testigo de Jehová' && (
            <div style={{ marginTop:6, padding:'8px 12px', background:'#FFF8E1', border:'1px solid #F59E0B', borderRadius:8, fontSize:12, color:'#854F0B' }}>
              Esta religión prohíbe la transfusión sanguínea.
            </div>
          )}
        </div>
        <div style={{ fontWeight:600, fontSize:12, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:10, marginTop:8 }}>Hábitos</div>
        {[
          { key:'apnp_fumado', label:'Fumado', opts:['negativo','activo','suspendido'] },
          { key:'apnp_alcohol', label:'Ingesta de alcohol', opts:['negativo','ocasional/social','habitual'] },
          { key:'apnp_drogas', label:'Consumo de drogas', opts:['negativo','activo','suspendido'] },
          { key:'apnp_actividad_fisica', label:'Actividad física', opts:['sedentario','en proceso','activo'] },
        ].map(hab => (
          <div key={hab.key} style={{ marginBottom:10, padding:'10px 12px', background:'#f0f4f8', borderRadius:10, border:'0.5px solid #e2ede9' }}>
            <label style={lbl}>{hab.label}</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
              {hab.opts.map(v => (
                <Chip key={v} label={v.charAt(0).toUpperCase()+v.slice(1)} active={data[hab.key]===v} onClick={() => upd(hab.key, v)} />
              ))}
            </div>
            {hab.key === 'apnp_fumado' && (data.apnp_fumado === 'activo' || data.apnp_fumado === 'suspendido') && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div><label style={lbl}>Paquetes/día</label><input type="number" style={inp} value={data.apnp_fumado_paquetes_dia} onChange={f('apnp_fumado_paquetes_dia')} /></div>
                <div><label style={lbl}>Años fumando</label><input type="number" style={inp} value={data.apnp_fumado_años} onChange={f('apnp_fumado_años')} /></div>
                {data.apnp_fumado_paquetes_dia && data.apnp_fumado_años && (
                  <div style={{ gridColumn:'span 2', fontSize:12, color:'#555' }}>Paquetes-año: <strong>{(parseFloat(data.apnp_fumado_paquetes_dia)*parseFloat(data.apnp_fumado_años)).toFixed(1)}</strong></div>
                )}
                {data.apnp_fumado === 'suspendido' && <div><label style={lbl}>Año de suspensión</label><input type="number" style={inp} value={data.apnp_fumado_año_suspension} onChange={f('apnp_fumado_año_suspension')} /></div>}
              </div>
            )}
            {hab.key === 'apnp_alcohol' && data.apnp_alcohol !== 'negativo' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div><label style={lbl}>Bebida habitual</label><input style={inp} value={data.apnp_alcohol_bebida} onChange={f('apnp_alcohol_bebida')} /></div>
                <div><label style={lbl}>Veces por semana</label><input type="number" style={inp} value={data.apnp_alcohol_veces_semana} onChange={f('apnp_alcohol_veces_semana')} /></div>
              </div>
            )}
            {hab.key === 'apnp_drogas' && data.apnp_drogas !== 'negativo' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div><label style={lbl}>Tipo(s) de droga</label><MultiSelect options={DROGAS} value={data.apnp_drogas_tipos} onChange={v => upd('apnp_drogas_tipos', v)} placeholder="Seleccionar..." /></div>
                {data.apnp_drogas === 'suspendido' && <div><label style={lbl}>Año de suspensión</label><input type="number" style={inp} value={data.apnp_drogas_año_suspension} onChange={f('apnp_drogas_año_suspension')} /></div>}
              </div>
            )}
            {hab.key === 'apnp_actividad_fisica' && data.apnp_actividad_fisica !== 'sedentario' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div><label style={lbl}>Tipo(s) de ejercicio</label><MultiSelect options={EJERCICIOS} value={data.apnp_ejercicio_tipos} onChange={v => upd('apnp_ejercicio_tipos', v)} placeholder="Seleccionar..." /></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div><label style={lbl}>Veces/semana</label><input type="number" style={inp} value={data.apnp_ejercicio_veces_semana} onChange={f('apnp_ejercicio_veces_semana')} /></div>
                  <div><label style={lbl}>Tiempo/sesión (min)</label><input type="number" style={inp} value={data.apnp_ejercicio_tiempo_sesion} onChange={f('apnp_ejercicio_tiempo_sesion')} /></div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div style={{ fontWeight:600, fontSize:12, color:BLUE, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:10, marginTop:8 }}>Alergias</div>
        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Alergia a medicamentos</label>
          <ListaItems items={data.apnp_alergia_medicamentos} addLabel="Agregar alergia a medicamento"
            onAdd={() => upd('apnp_alergia_medicamentos', [...data.apnp_alergia_medicamentos, { medicamento:'', tipo:'' }])}
            onRemove={i => upd('apnp_alergia_medicamentos', data.apnp_alergia_medicamentos.filter((_,j)=>j!==i))}>
            {(item, i) => (
              <div style={row2}>
                <div><label style={lbl}>Medicamento</label><input style={inp} value={item.medicamento||''} onChange={e => listUpd('apnp_alergia_medicamentos', i, 'medicamento', e.target.value)} /></div>
                <div><label style={lbl}>Tipo de reacción</label><input style={inp} value={item.tipo||''} onChange={e => listUpd('apnp_alergia_medicamentos', i, 'tipo', e.target.value)} /></div>
              </div>
            )}
          </ListaItems>
        </div>
        <div style={{ marginBottom:8 }}>
          <label style={lbl}>Alergia a alimentos</label>
          <ListaItems items={data.apnp_alergia_alimentos} addLabel="Agregar alergia a alimento"
            onAdd={() => upd('apnp_alergia_alimentos', [...data.apnp_alergia_alimentos, { alimento:'', tipo:'' }])}
            onRemove={i => upd('apnp_alergia_alimentos', data.apnp_alergia_alimentos.filter((_,j)=>j!==i))}>
            {(item, i) => (
              <div style={row2}>
                <div><label style={lbl}>Alimento</label><input style={inp} value={item.alimento||''} onChange={e => listUpd('apnp_alergia_alimentos', i, 'alimento', e.target.value)} /></div>
                <div><label style={lbl}>Tipo de reacción</label><input style={inp} value={item.tipo||''} onChange={e => listUpd('apnp_alergia_alimentos', i, 'tipo', e.target.value)} /></div>
              </div>
            )}
          </ListaItems>
        </div>
      </Accordion>

      <Accordion title="Antecedentes personales patológicos (APP)" sectionKey="app" expanded={expanded} onToggle={toggle}>
        <ListaItems items={data.app_patologias} addLabel="Agregar patología"
          onAdd={() => upd('app_patologias', [...data.app_patologias, { patologia:'', otra:'', año:'', tratamiento:'', observaciones:'' }])}
          onRemove={i => upd('app_patologias', data.app_patologias.filter((_,j)=>j!==i))}>
          {(item, i) => (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={row2}>
                <div>
                  <label style={lbl}>Patología</label>
                  <select style={inp} value={item.patologia||''} onChange={e => listUpd('app_patologias', i, 'patologia', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {PATOLOGIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Año del diagnóstico</label><input type="number" style={inp} value={item.año||''} onChange={e => listUpd('app_patologias', i, 'año', e.target.value)} /></div>
              </div>
              {item.patologia === 'Otra' && <div><label style={lbl}>Especificar</label><input style={inp} value={item.otra||''} onChange={e => listUpd('app_patologias', i, 'otra', e.target.value)} /></div>}
              <div><label style={lbl}>Tratamiento actual</label><input style={inp} value={item.tratamiento||''} onChange={e => listUpd('app_patologias', i, 'tratamiento', e.target.value)} /></div>
              <div><label style={lbl}>Observaciones</label><textarea style={{ ...inp, minHeight:50, resize:'vertical' }} value={item.observaciones||''} onChange={e => listUpd('app_patologias', i, 'observaciones', e.target.value)} /></div>
            </div>
          )}
        </ListaItems>
      </Accordion>

      <Accordion title="Antecedentes quirúrgicos (AQx)" sectionKey="aqx" expanded={expanded} onToggle={toggle}>
        <ListaItems items={data.aqx_procedimientos} addLabel="Agregar antecedente quirúrgico"
          onAdd={() => upd('aqx_procedimientos', [...data.aqx_procedimientos, { procedimiento:'', año:'', complicaciones:'', observaciones:'' }])}
          onRemove={i => upd('aqx_procedimientos', data.aqx_procedimientos.filter((_,j)=>j!==i))}>
          {(item, i) => (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={row2}>
                <div><label style={lbl}>Procedimiento quirúrgico</label><input style={inp} value={item.procedimiento||''} onChange={e => listUpd('aqx_procedimientos', i, 'procedimiento', e.target.value)} /></div>
                <div><label style={lbl}>Año del procedimiento</label><input type="number" style={inp} value={item.año||''} onChange={e => listUpd('aqx_procedimientos', i, 'año', e.target.value)} /></div>
              </div>
              <div><label style={lbl}>Complicaciones quirúrgicas</label><input style={inp} value={item.complicaciones||''} onChange={e => listUpd('aqx_procedimientos', i, 'complicaciones', e.target.value)} /></div>
              <div><label style={lbl}>Observaciones</label><textarea style={{ ...inp, minHeight:50, resize:'vertical' }} value={item.observaciones||''} onChange={e => listUpd('aqx_procedimientos', i, 'observaciones', e.target.value)} /></div>
            </div>
          )}
        </ListaItems>
      </Accordion>

      <Accordion title="Antecedentes heredo-familiares (AHF)" sectionKey="ahf" expanded={expanded} onToggle={toggle}>
        <ListaItems items={data.ahf_familiares} addLabel="Agregar antecedente familiar"
          onAdd={() => upd('ahf_familiares', [...data.ahf_familiares, { patologia:'', otra:'', parentesco:'', observaciones:'' }])}
          onRemove={i => upd('ahf_familiares', data.ahf_familiares.filter((_,j)=>j!==i))}>
          {(item, i) => (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={row2}>
                <div>
                  <label style={lbl}>Patología</label>
                  <select style={inp} value={item.patologia||''} onChange={e => listUpd('ahf_familiares', i, 'patologia', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {PATOLOGIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Parentesco</label>
                  <select style={inp} value={item.parentesco||''} onChange={e => listUpd('ahf_familiares', i, 'parentesco', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {['Padre','Madre','Hermano','Hermana','Abuelo','Abuela','Tío','Tía'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {item.patologia === 'Otra' && <div><label style={lbl}>Especificar</label><input style={inp} value={item.otra||''} onChange={e => listUpd('ahf_familiares', i, 'otra', e.target.value)} /></div>}
              <div><label style={lbl}>Observaciones</label><textarea style={{ ...inp, minHeight:50, resize:'vertical' }} value={item.observaciones||''} onChange={e => listUpd('ahf_familiares', i, 'observaciones', e.target.value)} /></div>
            </div>
          )}
        </ListaItems>
      </Accordion>

      {showAGO && (
        <Accordion title="Antecedentes gineco-obstétricos (AGO)" sectionKey="ago" expanded={expanded} onToggle={toggle}>
          <div style={row2}>
            <div><label style={lbl}>Fecha última menstruación (FUM)</label><input type="date" style={inp} value={data.ago_fum} onChange={f('ago_fum')} /></div>
            <div>
              <label style={lbl}>Frecuencia menstrual</label>
              <select style={inp} value={data.ago_frecuencia_menstrual} onChange={f('ago_frecuencia_menstrual')}>
                <option value="">Seleccionar...</option>
                <option value="regular">Regular</option>
                <option value="irregular">Irregular</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={lbl}>Método de planificación familiar (MPF)</label>
            <select style={inp} value={data.ago_mpf} onChange={f('ago_mpf')}>
              <option value="">Seleccionar...</option>
              {MPF_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {data.ago_mpf === 'Dispositivo intrauterino' && <div style={{ marginTop:8 }}><label style={lbl}>¿Cuál DIU?</label><input style={inp} value={data.ago_mpf_diu_cual} onChange={f('ago_mpf_diu_cual')} /></div>}
            {data.ago_mpf === 'Implante subdérmico' && <div style={{ marginTop:8 }}><label style={lbl}>Año de colocación</label><input type="number" style={inp} value={data.ago_mpf_implante_año} onChange={f('ago_mpf_implante_año')} /></div>}
          </div>
          <div style={{ marginBottom:12, padding:12, background:'#f0f4f8', borderRadius:10, border:'0.5px solid #e2ede9' }}>
            <label style={lbl}>Menopausia</label>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {[['no','No'],['perimenopáusica','Perimenopáusica'],['sí','Sí']].map(([v,l]) => (
                <Chip key={v} label={l} active={data.ago_menopausia===v} onClick={() => upd('ago_menopausia', v)} />
              ))}
            </div>
            {data.ago_menopausia === 'sí' && <div><label style={lbl}>Año de inicio</label><input type="number" style={inp} value={data.ago_menopausia_año} onChange={f('ago_menopausia_año')} /></div>}
          </div>
          <div style={{ marginBottom:12, padding:12, background:'#f0f4f8', borderRadius:10, border:'0.5px solid #e2ede9' }}>
            <label style={lbl}>Ha tenido embarazos</label>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {[['no','No'],['sí','Sí']].map(([v,l]) => <Chip key={v} label={l} active={data.ago_embarazos===v} onClick={() => upd('ago_embarazos', v)} />)}
            </div>
            {data.ago_embarazos === 'sí' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={row3}>
                  <div><label style={lbl}>Gestas (G)</label><input type="number" style={inp} value={data.ago_gestas} onChange={f('ago_gestas')} /></div>
                  <div><label style={lbl}>Partos (P)</label><input type="number" style={inp} value={data.ago_partos} onChange={f('ago_partos')} /></div>
                  <div><label style={lbl}>Abortos (A)</label><input type="number" style={inp} value={data.ago_abortos} onChange={f('ago_abortos')} /></div>
                  <div><label style={lbl}>Cesáreas (C)</label><input type="number" style={inp} value={data.ago_cesareas} onChange={f('ago_cesareas')} /></div>
                </div>
                <div>
                  <label style={lbl}>Complicaciones durante el embarazo</label>
                  <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                    {[['no','No'],['sí','Sí']].map(([v,l]) => <Chip key={v} label={l} active={(data.ago_complicaciones_embarazo===(v==='sí'))} onClick={() => upd('ago_complicaciones_embarazo', v==='sí')} />)}
                  </div>
                  {data.ago_complicaciones_embarazo && <MultiSelect options={COMPLICACIONES_EMBARAZO} value={data.ago_complicaciones_tipos} onChange={v => upd('ago_complicaciones_tipos', v)} placeholder="Seleccionar complicaciones..." />}
                </div>
              </div>
            )}
          </div>
          <div style={row2}>
            <div><label style={lbl}>Último PAP (mes/año)</label><input type="month" style={inp} value={data.ago_pap_fecha} onChange={f('ago_pap_fecha')} /></div>
            <div>
              <label style={{ ...lbl, display:'flex', alignItems:'center', gap:4 }}>Resultado PAP {data.ago_pap_resultado==='anormal' && <WarnIcon />}</label>
              <select style={{ ...inp, borderColor:data.ago_pap_resultado==='anormal'?'#F59E0B':'#e0e0e0' }} value={data.ago_pap_resultado} onChange={f('ago_pap_resultado')}>
                <option value="">Seleccionar...</option>
                <option value="normal">Normal</option>
                <option value="anormal">Anormal</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>
        </Accordion>
      )}

      {showAPed && (
        <Accordion title="Antecedentes pediátricos (APed)" sectionKey="aped" expanded={expanded} onToggle={toggle}>
          <div style={row2}>
            <div>
              <label style={lbl}>Resultado del embarazo</label>
              <select style={inp} value={data.aped_resultado_embarazo} onChange={f('aped_resultado_embarazo')}>
                <option value="">Seleccionar...</option>
                {RESULTADO_EMBARAZO.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={row2}>
            <div>
              <label style={lbl}>Apgar 1er minuto</label>
              <select style={inp} value={data.aped_apgar_1min} onChange={f('aped_apgar_1min')}>
                <option value="">Seleccionar...</option>
                {[0,2,4,6,8,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Apgar 5 minutos</label>
              <select style={inp} value={data.aped_apgar_5min} onChange={f('aped_apgar_5min')}>
                <option value="">Seleccionar...</option>
                {[0,2,4,6,8,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:12, padding:12, background:'#f0f4f8', borderRadius:10, border:'0.5px solid #e2ede9' }}>
            <label style={lbl}>Requirió maniobras de resucitación</label>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {[['no','No'],['sí','Sí']].map(([v,l]) => <Chip key={v} label={l} active={data.aped_resucitacion===v} onClick={() => upd('aped_resucitacion', v)} />)}
            </div>
            {data.aped_resucitacion === 'sí' && <div><label style={lbl}>¿Cuáles maniobras?</label><input style={inp} value={data.aped_resucitacion_cual} onChange={f('aped_resucitacion_cual')} /></div>}
          </div>
          <div style={row3}>
            <div><label style={lbl}>Peso al nacer (g)</label><input type="number" style={inp} value={data.aped_peso_nacer} onChange={f('aped_peso_nacer')} /></div>
            <div><label style={lbl}>Estatura al nacer (cm)</label><input type="number" style={inp} value={data.aped_estatura_nacer} onChange={f('aped_estatura_nacer')} /></div>
            <div><label style={lbl}>CC al nacer (cm)</label><input type="number" style={inp} value={data.aped_cc_nacer} onChange={f('aped_cc_nacer')} /></div>
          </div>
          <div style={{ padding:12, background:'#f0f4f8', borderRadius:10, border:'0.5px solid #e2ede9' }}>
            <label style={lbl}>Tamizaje neonatal</label>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {[['negativo','Negativo'],['positivo','Positivo']].map(([v,l]) => <Chip key={v} label={l} active={data.aped_tamizaje===v} onClick={() => upd('aped_tamizaje', v)} />)}
            </div>
            {data.aped_tamizaje === 'positivo' && <div><label style={lbl}>¿Para cuál patología?</label><input style={inp} value={data.aped_tamizaje_patologia} onChange={f('aped_tamizaje_patologia')} /></div>}
          </div>
        </Accordion>
      )}

      {showAGer && (
        <Accordion title="Antecedentes geriátricos (AGer)" sectionKey="ager" expanded={expanded} onToggle={toggle}>
          <div style={{ marginBottom:12 }}>
            <label style={lbl}>Estado basal</label>
            <select style={inp} value={data.ager_estado_basal} onChange={f('ager_estado_basal')}>
              <option value="">Seleccionar...</option>
              {ESTADO_BASAL.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12, padding:12, background:'#f0f4f8', borderRadius:10, border:'0.5px solid #e2ede9' }}>
            <label style={lbl}>Ha sufrido caídas</label>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {[['no','No'],['sí','Sí']].map(([v,l]) => <Chip key={v} label={l} active={data.ager_caidas===v} onClick={() => upd('ager_caidas', v)} />)}
            </div>
            {data.ager_caidas === 'sí' && <div><label style={lbl}>¿Cuándo? (mes/año)</label><input type="month" style={inp} value={data.ager_caidas_fecha} onChange={f('ager_caidas_fecha')} /></div>}
          </div>
          <div>
            <label style={lbl}>Polifarmacia</label>
            <div style={{ display:'flex', gap:8 }}>
              {[['no','No'],['sí','Sí']].map(([v,l]) => <Chip key={v} label={l} active={data.ager_polifarmacia===v} onClick={() => upd('ager_polifarmacia', v)} />)}
            </div>
          </div>
        </Accordion>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
        <button onClick={save} disabled={saving}
          style={{ padding:'8px 22px', background: saved?G:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
          {saving?'Guardando...':saved?'Guardado':'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
