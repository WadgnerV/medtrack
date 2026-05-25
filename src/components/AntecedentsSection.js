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

const RELIGIONS = ['Agnóstico','Ateísmo','Catolicismo','Cristianismo no practicante','Evangelismo','Judaísmo','Musulmán','Testigo de Jehová','Otra']
const CIVIL_STATUS = ['Soltero/a','Casado/a','Unión libre','Divorciado/a','Viudo/a']
const EDUCATION = ['Sin estudios formales','Primaria','Secundaria','Técnico','Universitario','Posgrado']
const EXERCISE_TYPES = ['Caminata','Gimnasio','Calistenia','Funcional','Natación','Ciclismo','Otro']
const ALLERGY_TYPES = ['Medicamento','Alimento','Ambiental','Otra']
const DIET_TYPES = ['Omnívora','Vegetariana','Vegana','Sin gluten','Otra']

const EMPTY_APNP = {
  // Tabaquismo
  smoking_status: 'no', // no, ex, active
  smoking_cigs_per_day: '',
  smoking_years: '',
  // Alcohol
  alcohol_status: 'no', // no, occasional, habitual
  alcohol_detail: '',
  // Drogas
  drugs_status: 'no',
  drugs_detail: '',
  // Ejercicio
  exercise_status: 'no', // no, active
  exercise_types: [],
  exercise_days_per_week: '',
  exercise_minutes: '',
  // Alergias
  allergies: [], // [{type, medication_name, reaction}]
  // Alimentación
  diet_type: '',
  diet_observations: '',
  // Personal
  occupation: '',
  civil_status: '',
  education: '',
  religion: '',
  observations: '',
}

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

function ApnpForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_APNP)
  const f = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const packYears = form.smoking_status !== 'no' && form.smoking_cigs_per_day && form.smoking_years
    ? ((parseFloat(form.smoking_cigs_per_day) / 20) * parseFloat(form.smoking_years)).toFixed(1)
    : null

  function toggleExerciseType(t) {
    setForm(p => ({ ...p, exercise_types: p.exercise_types.includes(t) ? p.exercise_types.filter(x=>x!==t) : [...p.exercise_types, t] }))
  }

  function addAllergy() {
    setForm(p => ({ ...p, allergies: [...p.allergies, { type:'Medicamento', medication_name:'', reaction:'' }] }))
  }

  function updateAllergy(i, k, v) {
    setForm(p => { const a = [...p.allergies]; a[i] = {...a[i], [k]:v}; return {...p, allergies:a} })
  }

  function removeAllergy(i) {
    setForm(p => ({ ...p, allergies: p.allergies.filter((_,idx)=>idx!==i) }))
  }

  return (
    <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:16, marginBottom:10 }}>
      
      {/* Tabaquismo */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>🚬 Tabaquismo</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <div>
            <label style={s.label}>Estado</label>
            <select value={form.smoking_status} onChange={f('smoking_status')} style={s.input}>
              <option value="no">No fumador</option>
              <option value="ex">Ex-fumador</option>
              <option value="active">Fumador activo</option>
            </select>
          </div>
          {form.smoking_status !== 'no' && <>
            <div>
              <label style={s.label}>Cigarros/día</label>
              <input type="number" value={form.smoking_cigs_per_day} onChange={f('smoking_cigs_per_day')} placeholder="Ej: 10" style={s.input} min="0" />
            </div>
            <div>
              <label style={s.label}>Años fumando</label>
              <input type="number" value={form.smoking_years} onChange={f('smoking_years')} placeholder="Ej: 5" style={s.input} min="0" />
            </div>
          </>}
        </div>
        {packYears && <div style={{ fontSize:11, color:'#185FA5', marginTop:6, background:'#E6F1FB', padding:'4px 10px', borderRadius:6, display:'inline-block' }}>📊 Índice paquetes/año: <strong>{packYears}</strong></div>}
      </div>

      {/* Alcohol */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>🍷 Alcohol</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={s.label}>Consumo</label>
            <select value={form.alcohol_status} onChange={f('alcohol_status')} style={s.input}>
              <option value="no">No consume</option>
              <option value="occasional">Ocasional</option>
              <option value="habitual">Habitual</option>
            </select>
          </div>
          {form.alcohol_status !== 'no' && (
            <div>
              <label style={s.label}>Detalle (tipo y cantidad)</label>
              <input value={form.alcohol_detail} onChange={f('alcohol_detail')} placeholder="Ej: 2 cervezas los fines de semana" style={s.input} />
            </div>
          )}
        </div>
      </div>

      {/* Drogas */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>💊 Drogas</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={s.label}>Consumo</label>
            <select value={form.drugs_status} onChange={f('drugs_status')} style={s.input}>
              <option value="no">No consume</option>
              <option value="yes">Sí</option>
            </select>
          </div>
          {form.drugs_status === 'yes' && (
            <div>
              <label style={s.label}>Especificar</label>
              <input value={form.drugs_detail} onChange={f('drugs_detail')} placeholder="Tipo y frecuencia" style={s.input} />
            </div>
          )}
        </div>
      </div>

      {/* Ejercicio */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>🏃 Ejercicio</div>
        <div style={{ marginBottom:8 }}>
          <label style={s.label}>Actividad física</label>
          <select value={form.exercise_status} onChange={f('exercise_status')} style={{ ...s.input, width:'50%' }}>
            <option value="no">Sedentario</option>
            <option value="active">Activo</option>
          </select>
        </div>
        {form.exercise_status === 'active' && <>
          <div style={{ marginBottom:8 }}>
            <label style={s.label}>Tipo de ejercicio</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {EXERCISE_TYPES.map(t => (
                <div key={t} onClick={() => toggleExerciseType(t)}
                  style={{ padding:'4px 12px', borderRadius:20, border:`1px solid ${form.exercise_types.includes(t)?G:'#e2e8f0'}`, background:form.exercise_types.includes(t)?G:'#f7fafc', color:form.exercise_types.includes(t)?'#fff':'#555', fontSize:12, cursor:'pointer', userSelect:'none' }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <label style={s.label}>Días por semana</label>
              <input type="number" value={form.exercise_days_per_week} onChange={f('exercise_days_per_week')} placeholder="Ej: 3" min="1" max="7" style={s.input} />
            </div>
            <div>
              <label style={s.label}>Minutos por sesión</label>
              <input type="number" value={form.exercise_minutes} onChange={f('exercise_minutes')} placeholder="Ej: 45" min="1" style={s.input} />
            </div>
          </div>
        </>}
      </div>

      {/* Alergias */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.05em' }}>⚠️ Alergias</div>
          <button style={{ ...s.btnOutline, fontSize:11, padding:'3px 10px' }} onClick={addAllergy}>+ Agregar</button>
        </div>
        {form.allergies.length === 0 && <div style={{ fontSize:12, color:'#999' }}>No reporta alergias</div>}
        {form.allergies.map((al, i) => (
          <div key={i} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div>
                <label style={s.label}>Tipo</label>
                <select value={al.type} onChange={e => updateAllergy(i,'type',e.target.value)} style={s.input}>
                  {ALLERGY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {al.type === 'Medicamento' && (
                <div>
                  <label style={s.label}>Medicamento</label>
                  <input value={al.medication_name} onChange={e => updateAllergy(i,'medication_name',e.target.value)} placeholder="Nombre del medicamento" style={s.input} />
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{ flex:1 }}>
                <label style={s.label}>Reacción</label>
                <input value={al.reaction} onChange={e => updateAllergy(i,'reaction',e.target.value)} placeholder="Describí la reacción alérgica" style={s.input} />
              </div>
              <button style={s.btnDanger} onClick={() => removeAllergy(i)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Alimentación */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>🥗 Alimentación</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={s.label}>Tipo de dieta</label>
            <select value={form.diet_type} onChange={f('diet_type')} style={s.input}>
              <option value="">Seleccionar...</option>
              {DIET_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Observaciones</label>
            <input value={form.diet_observations} onChange={f('diet_observations')} placeholder="Intolerancias, preferencias..." style={s.input} />
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>👤 Datos personales</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={s.label}>Ocupación</label>
            <input value={form.occupation} onChange={f('occupation')} placeholder="Ej: Ingeniero, Docente..." style={s.input} />
          </div>
          <div>
            <label style={s.label}>Estado civil</label>
            <select value={form.civil_status} onChange={f('civil_status')} style={s.input}>
              <option value="">Seleccionar...</option>
              {CIVIL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Nivel educativo</label>
            <select value={form.education} onChange={f('education')} style={s.input}>
              <option value="">Seleccionar...</option>
              {EDUCATION.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Religión</label>
            <select value={form.religion} onChange={f('religion')} style={s.input}>
              <option value="">Seleccionar...</option>
              {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.label}>Observaciones generales</label>
            <textarea value={form.observations} onChange={f('observations')} rows={2} placeholder="Información adicional relevante..." style={{ ...s.input, resize:'vertical' }} />
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        {onCancel && <button style={s.btnOutline} onClick={onCancel}>Cancelar</button>}
        <button style={s.btn} onClick={() => onSave(form)}>Guardar APNP</button>
      </div>
    </div>
  )
}

function AqxForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { procedure:'', year:'', hospital:'', complications:'no', complications_detail:'', observations:'' })
  const f = k => e => setForm(p => ({...p, [k]: e.target.value}))

  return (
    <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:16, marginBottom:10 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.label}>Tipo de cirugía / procedimiento <span style={{ color:'#D85A30' }}>*</span></label>
          <input value={form.procedure} onChange={f('procedure')} placeholder="Ej: Apendicectomía, Cesárea, Colecistectomía..." style={s.input} />
        </div>
        <div>
          <label style={s.label}>Año</label>
          <input type="number" value={form.year} onChange={f('year')} placeholder="Ej: 2015" min="1900" max={new Date().getFullYear()} style={s.input} />
        </div>
        <div>
          <label style={s.label}>Hospital / Centro médico</label>
          <input value={form.hospital} onChange={f('hospital')} placeholder="Opcional" style={s.input} />
        </div>
        <div>
          <label style={s.label}>¿Complicaciones?</label>
          <select value={form.complications} onChange={f('complications')} style={s.input}>
            <option value="no">No</option>
            <option value="yes">Sí</option>
          </select>
        </div>
        {form.complications === 'yes' && (
          <div>
            <label style={s.label}>Especificar complicación</label>
            <input value={form.complications_detail} onChange={f('complications_detail')} placeholder="Describí la complicación" style={s.input} />
          </div>
        )}
        <div style={{ gridColumn:'1/-1' }}>
          <label style={s.label}>Observaciones</label>
          <textarea value={form.observations} onChange={f('observations')} rows={2} placeholder="Notas adicionales..." style={{ ...s.input, resize:'vertical' }} />
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        {onCancel && <button style={s.btnOutline} onClick={onCancel}>Cancelar</button>}
        <button style={s.btn} onClick={() => { if (!form.procedure) return alert('Ingresá el tipo de cirugía'); onSave(form) }}>Guardar</button>
      </div>
    </div>
  )
}

function AgoForm({ initial, onSave, onCancel }) {
  const EMPTY_AGO = {
    fum: '', planning_method: '', cycle_type: '', bleeding_amount: '',
    menopause: 'no', menopause_year: '', hrt: 'no', hrt_detail: '',
    gestas: '', partos: '', abortos: '', cesareas: '',
    last_pap: '', pap_result: '',
  }
  const [form, setForm] = useState(initial || EMPTY_AGO)
  const f = k => e => setForm(p => ({...p, [k]: e.target.value}))

  return (
    <div style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:16, marginBottom:10 }}>

      {/* Menstruación */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>🗓️ Menstruación</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={s.label}>Fecha última menstruación (FUM)</label>
            <input type="date" value={form.fum} onChange={f('fum')} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Método de planificación familiar</label>
            <input value={form.planning_method} onChange={f('planning_method')} placeholder="Ej: Anticonceptivos orales, DIU..." style={s.input} />
          </div>
          <div>
            <label style={s.label}>Tipo de ciclo</label>
            <select value={form.cycle_type} onChange={f('cycle_type')} style={s.input}>
              <option value="">Seleccionar...</option>
              <option value="regular">Regular</option>
              <option value="irregular">Irregular</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Cantidad de sangrado</label>
            <select value={form.bleeding_amount} onChange={f('bleeding_amount')} style={s.input}>
              <option value="">Seleccionar...</option>
              <option value="light">Ligero</option>
              <option value="moderate">Moderado</option>
              <option value="heavy">Abundante</option>
            </select>
          </div>
        </div>
      </div>

      {/* Menopausia */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>🌙 Menopausia</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={s.label}>¿Menopausia?</label>
            <select value={form.menopause} onChange={f('menopause')} style={s.input}>
              <option value="no">No</option>
              <option value="yes">Sí</option>
            </select>
          </div>
          {form.menopause === 'yes' && <>
            <div>
              <label style={s.label}>Año de inicio</label>
              <input type="number" value={form.menopause_year} onChange={f('menopause_year')} placeholder="Ej: 2020" min="1960" max={new Date().getFullYear()} style={s.input} />
            </div>
            <div>
              <label style={s.label}>¿Terapia de reemplazo hormonal?</label>
              <select value={form.hrt} onChange={f('hrt')} style={s.input}>
                <option value="no">No</option>
                <option value="yes">Sí</option>
                <option value="past">La tomó anteriormente</option>
              </select>
            </div>
            {(form.hrt === 'yes' || form.hrt === 'past') && (
              <div>
                <label style={s.label}>¿Cuál terapia?</label>
                <input value={form.hrt_detail} onChange={f('hrt_detail')} placeholder="Nombre del medicamento o terapia" style={s.input} />
              </div>
            )}
          </>}
        </div>
      </div>

      {/* GPAC */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>🤰 Obstétrico (GPAC)</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
          {[['gestas','G — Gestas'],['partos','P — Partos'],['abortos','A — Abortos'],['cesareas','C — Cesáreas']].map(([key, label]) => (
            <div key={key}>
              <label style={s.label}>{label}</label>
              <input type="number" value={form[key]} onChange={f(key)} placeholder="0" min="0" style={s.input} />
            </div>
          ))}
        </div>
      </div>

      {/* PAP */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>🔬 Papanicolau</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={s.label}>Fecha del último PAP</label>
            <input type="date" value={form.last_pap} onChange={f('last_pap')} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Resultado</label>
            <select value={form.pap_result} onChange={f('pap_result')} style={s.input}>
              <option value="">Seleccionar...</option>
              <option value="normal">Normal</option>
              <option value="abnormal">Anormal</option>
              <option value="pending">Pendiente</option>
              <option value="never">Nunca realizado</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        {onCancel && <button style={s.btnOutline} onClick={onCancel}>Cancelar</button>}
        <button style={s.btn} onClick={() => onSave(form)}>Guardar AGO</button>
      </div>
    </div>
  )
}

export default function AntecedentsSection({ patient, profile, canEdit = true, compact = false }) {
  const [antecedents, setAntecedents] = useState([])
  const [apnpData, setApnpData] = useState(null)
  const [agoData, setAgoData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAppForm, setShowAppForm] = useState(false)
  const [showApnpForm, setShowApnpForm] = useState(false)
  const [showAgoForm, setShowAgoForm] = useState(false)
  const [showAqxForm, setShowAqxForm] = useState(false)
  const [editingAqxId, setEditingAqxId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [apnpModal, setApnpModal] = useState(false)

  useEffect(() => { if (patient?.id) loadAntecedents() }, [patient?.id])

  async function loadAntecedents() {
    setLoading(true)
    const { data } = await supabase.from('patient_antecedents').select('*').eq('patient_id', patient.id).order('created_at')
    setAntecedents(data || [])
    // Cargar APNP
    const apnpRecord = (data||[]).find(a => a.type === 'apnp')
    setApnpData(apnpRecord?.apnp_data || null)
    const agoRecord = (data||[]).find(a => a.type === 'ago')
    setAgoData(agoRecord?.ago_data || null)
    setLoading(false)
  }

  async function saveAqx(form, id = null) {
    setSaving(true)
    const payload = { patient_id: patient.id, clinic_id: profile?.clinic_id, type: 'aqx', condition: form.procedure, diagnosis_year: form.year ? parseInt(form.year) : null, observations: [form.hospital, form.complications === 'yes' ? `Complicaciones: ${form.complications_detail}` : null, form.observations].filter(Boolean).join(' | ') || null, updated_by: profile?.id }
    if (id) {
      await supabase.from('patient_antecedents').update(payload).eq('id', id)
    } else {
      await supabase.from('patient_antecedents').insert({ ...payload, created_by: profile?.id })
    }
    await loadAntecedents()
    setShowAqxForm(false)
    setEditingAqxId(null)
    setSaving(false)
  }

  async function saveAgo(form) {
    setSaving(true)
    const existing = antecedents.find(a => a.type === 'ago')
    const payload = { patient_id: patient.id, clinic_id: profile?.clinic_id, type: 'ago', ago_data: form, updated_by: profile?.id }
    if (existing) {
      await supabase.from('patient_antecedents').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('patient_antecedents').insert({ ...payload, created_by: profile?.id })
    }
    await loadAntecedents()
    setShowAgoForm(false)
    setSaving(false)
  }

  async function saveApnp(form) {
    setSaving(true)
    const existing = antecedents.find(a => a.type === 'apnp')
    const payload = { patient_id: patient.id, clinic_id: profile?.clinic_id, type: 'apnp', apnp_data: form, updated_by: profile?.id }
    if (existing) {
      await supabase.from('patient_antecedents').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('patient_antecedents').insert({ ...payload, created_by: profile?.id })
    }
    await loadAntecedents()
    setApnpModal(false)
    setShowApnpForm(false)
    setSaving(false)
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
            {apnpData && <span style={{ fontSize:11, background:'#e2e8f0', color:'#555', padding:'1px 7px', borderRadius:20 }}>APNP</span>}
            {agoData && patient?.sex === 'female' && <span style={{ fontSize:11, background:'#fce8f3', color:'#9d174d', padding:'1px 7px', borderRadius:20 }}>AGO</span>}
            {antecedents.filter(a=>a.type==='aqx').length > 0 && <span style={{ fontSize:11, background:'#e2e8f0', color:'#555', padding:'1px 7px', borderRadius:20 }}>{antecedents.filter(a=>a.type==='aqx').length} AQx</span>}
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
                {/* APNP en modo edición compact */}
                <div style={{ fontSize:12, fontWeight:600, color:'#1a3a5c', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Antecedentes No Patológicos (APNP)</div>
                {showApnpForm ? (
                  <ApnpForm initial={apnpData || EMPTY_APNP} onSave={form => saveApnp(form)} onCancel={() => setShowApnpForm(false)} />
                ) : (
                  <button style={{ ...s.btnOutline, fontSize:11, padding:'4px 10px', marginBottom:12 }} onClick={() => setShowApnpForm(true)}>
                    {apnpData ? 'Editar APNP' : '+ Agregar APNP'}
                  </button>
                )}
                {/* AGO en compact edición - solo femenino */}
                {patient?.sex === 'female' && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1a3a5c', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Antecedentes Gineco-Obstétricos (AGO)</div>
                    {showAgoForm ? (
                      <AgoForm initial={agoData || {}} onSave={form => saveAgo(form)} onCancel={() => setShowAgoForm(false)} />
                    ) : (
                      <button style={{ ...s.btnOutline, fontSize:11, padding:'4px 10px', marginBottom:8 }} onClick={() => setShowAgoForm(true)}>
                        {agoData ? 'Editar AGO' : '+ Agregar AGO'}
                      </button>
                    )}
                  </div>
                )}
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
                {/* AQx en compact edición */}
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#1a3a5c', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Antecedentes Quirúrgicos (AQx)</div>
                  {showAqxForm && !editingAqxId && <AqxForm onSave={form => saveAqx(form)} onCancel={() => setShowAqxForm(false)} />}
                  {!showAqxForm && <button style={{ ...s.btnOutline, fontSize:11, padding:'4px 10px', marginBottom:6 }} onClick={() => { setShowAqxForm(true); setEditingAqxId(null) }}>+ Agregar cirugía</button>}
                  {antecedents.filter(a=>a.type==='aqx').map(item => (
                    <div key={item.id} style={{ ...s.card, marginBottom:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:'#1a1a1a' }}>{item.condition}</div>
                          {item.diagnosis_year && <div style={{ fontSize:11, color:'#999' }}>{item.diagnosis_year}</div>}
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button style={s.btnEdit} onClick={() => { setEditingAqxId(item.id); setShowAqxForm(false) }}>Editar</button>
                          <button style={s.btnDanger} onClick={() => deleteAntecedent(item.id)}>✕</button>
                        </div>
                      </div>
                      {editingAqxId === item.id && (
                        <AqxForm initial={{ procedure:item.condition||'', year:item.diagnosis_year||'', observations:item.observations||'', complications:'no', complications_detail:'', hospital:'' }}
                          onSave={form => saveAqx(form, item.id)} onCancel={() => setEditingAqxId(null)} />
                      )}
                    </div>
                  ))}
                </div>
                <button style={{ fontSize:11, color:'#555', background:'none', border:'none', cursor:'pointer', marginTop:4 }} onClick={() => { setEditModal(false); setShowAppForm(false); setShowApnpForm(false); setShowAgoForm(false); setShowAqxForm(false); setEditingId(null); setEditingAqxId(null) }}>✓ Cerrar edición</button>
              </div>
            ) : (
              <div style={{ paddingTop:10 }}>
                {/* Resumen APNP */}
                {apnpData && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4, textTransform:'uppercase' }}>APNP</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {apnpData.smoking_status && apnpData.smoking_status !== 'no' && <div style={{ fontSize:11, background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px' }}>🚬 {apnpData.smoking_status === 'active' ? 'Fumador activo' : 'Ex-fumador'}{apnpData.smoking_cigs_per_day ? ` · ${apnpData.smoking_cigs_per_day} cig/día` : ''}</div>}
                      {apnpData.alcohol_status && apnpData.alcohol_status !== 'no' && <div style={{ fontSize:11, background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px' }}>🍷 Alcohol: {apnpData.alcohol_status}</div>}
                      {apnpData.exercise_status === 'active' && <div style={{ fontSize:11, background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px' }}>🏃 Ejercicio activo {apnpData.exercise_days_per_week ? `· ${apnpData.exercise_days_per_week}x/sem` : ''}</div>}
                      {apnpData.allergies?.length > 0 && <div style={{ fontSize:11, background:'#FAEEDA', border:'1px solid #F59E0B', borderRadius:6, padding:'4px 8px', color:'#854F0B' }}>⚠️ {apnpData.allergies.length} alergia{apnpData.allergies.length>1?'s':''}</div>}
                      {apnpData.occupation && <div style={{ fontSize:11, background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px' }}>👤 {apnpData.occupation}</div>}
                      {apnpData.civil_status && <div style={{ fontSize:11, background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px' }}>💍 {apnpData.civil_status}</div>}
                    </div>
                  </div>
                )}
                {(!apnpData && !agoData && appItems.length === 0 && antecedents.filter(a=>a.type==='aqx').length === 0) && (
                  <div style={{ fontSize:12, color:'#bbb', textAlign:'center', padding:'8px 0' }}>Sin antecedentes registrados</div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:10 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>APP</div>
                    {appItems.length === 0 ? <div style={{ fontSize:11, color:'#bbb' }}>Sin registros</div> : appItems.map(item => (
                      <div key={item.id} style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 10px', marginBottom:6 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'#1a1a1a' }}>{item.condition === 'Otra (especificar)' || item.condition === 'Cáncer (especificar)' ? item.condition.split(' (')[0]+': '+(item.condition_other||'—') : item.condition}</div>
                        {item.diagnosis_year && <div style={{ fontSize:10, color:'#999' }}>Desde {item.diagnosis_year}</div>}
                        <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, background:STATUS_COLORS[item.current_status]?.bg, color:STATUS_COLORS[item.current_status]?.color }}>{STATUS_LABELS[item.current_status]}</span>
                        {item.current_treatment && <div style={{ fontSize:10, color:'#666', marginTop:3 }}>Tto: {item.current_treatment}</div>}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>APNP</div>
                    {!apnpData ? <div style={{ fontSize:11, color:'#bbb' }}>Sin registros</div> : (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {apnpData.smoking_status !== 'no' && <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>🚬 {apnpData.smoking_status === 'active' ? 'Fumador' : 'Ex-fumador'}{apnpData.smoking_cigs_per_day ? ' '+apnpData.smoking_cigs_per_day+'/día' : ''}</span>}
                        {apnpData.alcohol_status !== 'no' && <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>🍷 Alcohol {apnpData.alcohol_status === 'occasional' ? 'ocasional' : 'habitual'}</span>}
                        {apnpData.exercise_status === 'active' && <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>🏃 {apnpData.exercise_days_per_week ? apnpData.exercise_days_per_week+'x/sem' : 'Ejercicio activo'}</span>}
                        {apnpData.allergies?.length > 0 && <span style={{ fontSize:11, background:'#FAEEDA', border:'1px solid #F59E0B', borderRadius:6, padding:'3px 8px', color:'#854F0B' }}>⚠️ {apnpData.allergies.length} alergia{apnpData.allergies.length>1?'s':''}</span>}
                        {apnpData.occupation && <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>👤 {apnpData.occupation}</span>}
                        {apnpData.civil_status && <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>💍 {apnpData.civil_status}</span>}
                      </div>
                    )}
                  </div>
                  {patient?.sex === 'female' && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>AGO</div>
                      {!agoData ? <div style={{ fontSize:11, color:'#bbb' }}>Sin registros</div> : (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {agoData.fum && <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>🗓️ FUM: {new Date(agoData.fum+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'short',year:'numeric'})}</span>}
                          {agoData.cycle_type && <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>{agoData.cycle_type === 'regular'?'Ciclo regular':'Ciclo irregular'}</span>}
                          <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>G{agoData.gestas||0}P{agoData.partos||0}A{agoData.abortos||0}C{agoData.cesareas||0}</span>
                          {agoData.menopause === 'yes' && <span style={{ fontSize:11, background:'#fce8f3', border:'1px solid #fbcfe8', borderRadius:6, padding:'3px 8px', color:'#9d174d' }}>🌙 Menopausia {agoData.menopause_year||''}</span>}
                          {agoData.pap_result && <span style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>🔬 PAP: {({normal:'Normal',abnormal:'Anormal',pending:'Pendiente',never:'Nunca'})[agoData.pap_result]||'—'}</span>}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>AQx</div>
                    {antecedents.filter(a=>a.type==='aqx').length === 0 ? <div style={{ fontSize:11, color:'#bbb' }}>Sin registros</div> : (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {antecedents.filter(a=>a.type==='aqx').map(item => (
                          <span key={item.id} style={{ fontSize:11, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 8px' }}>🔪 {item.condition}{item.diagnosis_year ? ' ('+item.diagnosis_year+')' : ''}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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

      {/* APNP - Antecedentes Personales No Patológicos */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div>
            <div style={s.sectionTitle}>🏃 Antecedentes Personales No Patológicos (APNP)</div>
            <div style={s.sectionSub}>Hábitos, estilo de vida, alergias y datos personales</div>
          </div>
          {canEdit && !showApnpForm && (
            <button style={s.btnOutline} onClick={() => setShowApnpForm(true)}>{apnpData ? 'Editar' : '+ Agregar'}</button>
          )}
        </div>

        {showApnpForm ? (
          <ApnpForm initial={apnpData || EMPTY_APNP} onSave={form => saveApnp(form)} onCancel={() => setShowApnpForm(false)} />
        ) : apnpData ? (
          <div style={s.card}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {/* Tabaquismo */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>🚬 Tabaquismo</div>
                <div style={{ fontSize:13, color:'#1a1a1a' }}>
                  {apnpData.smoking_status === 'no' ? 'No fumador' : apnpData.smoking_status === 'ex' ? 'Ex-fumador' : 'Fumador activo'}
                  {apnpData.smoking_cigs_per_day && ` · ${apnpData.smoking_cigs_per_day} cig/día`}
                  {apnpData.smoking_years && `, ${apnpData.smoking_years} años`}
                </div>
                {apnpData.smoking_status !== 'no' && apnpData.smoking_cigs_per_day && apnpData.smoking_years && (
                  <div style={{ fontSize:11, color:'#185FA5', marginTop:2 }}>
                    Paquetes/año: {((parseFloat(apnpData.smoking_cigs_per_day)/20)*parseFloat(apnpData.smoking_years)).toFixed(1)}
                  </div>
                )}
              </div>
              {/* Alcohol */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>🍷 Alcohol</div>
                <div style={{ fontSize:13, color:'#1a1a1a' }}>
                  {apnpData.alcohol_status === 'no' ? 'No consume' : apnpData.alcohol_status === 'occasional' ? 'Ocasional' : 'Habitual'}
                  {apnpData.alcohol_detail && ` · ${apnpData.alcohol_detail}`}
                </div>
              </div>
              {/* Drogas */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>💊 Drogas</div>
                <div style={{ fontSize:13, color:'#1a1a1a' }}>
                  {apnpData.drugs_status === 'no' ? 'No consume' : `Sí${apnpData.drugs_detail ? ` · ${apnpData.drugs_detail}` : ''}`}
                </div>
              </div>
              {/* Ejercicio */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>🏃 Ejercicio</div>
                <div style={{ fontSize:13, color:'#1a1a1a' }}>
                  {apnpData.exercise_status === 'no' ? 'Sedentario' : `Activo${apnpData.exercise_days_per_week ? ` · ${apnpData.exercise_days_per_week}x/sem` : ''}${apnpData.exercise_minutes ? `, ${apnpData.exercise_minutes} min` : ''}`}
                </div>
                {apnpData.exercise_types?.length > 0 && <div style={{ fontSize:11, color:'#555', marginTop:2 }}>{apnpData.exercise_types.join(', ')}</div>}
              </div>
              {/* Alergias */}
              {apnpData.allergies?.length > 0 && (
                <div style={{ gridColumn:'1/-1' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>⚠️ Alergias</div>
                  {apnpData.allergies.map((al, i) => (
                    <div key={i} style={{ fontSize:12, color:'#1a1a1a', marginBottom:2 }}>
                      <strong>{al.type}{al.medication_name ? ` — ${al.medication_name}` : ''}</strong>: {al.reaction}
                    </div>
                  ))}
                </div>
              )}
              {/* Alimentación */}
              {apnpData.diet_type && (
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>🥗 Alimentación</div>
                  <div style={{ fontSize:13, color:'#1a1a1a' }}>{apnpData.diet_type}{apnpData.diet_observations ? ` · ${apnpData.diet_observations}` : ''}</div>
                </div>
              )}
              {/* Datos personales */}
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>👤 Datos personales</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6 }}>
                  {apnpData.occupation && <div style={{ fontSize:12, color:'#555' }}><strong>Ocupación:</strong> {apnpData.occupation}</div>}
                  {apnpData.civil_status && <div style={{ fontSize:12, color:'#555' }}><strong>Estado civil:</strong> {apnpData.civil_status}</div>}
                  {apnpData.education && <div style={{ fontSize:12, color:'#555' }}><strong>Educación:</strong> {apnpData.education}</div>}
                  {apnpData.religion && <div style={{ fontSize:12, color:'#555' }}><strong>Religión:</strong> {apnpData.religion}</div>}
                </div>
                {apnpData.observations && <div style={{ fontSize:12, color:'#777', marginTop:6 }}><strong>Obs:</strong> {apnpData.observations}</div>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background:'#f7fafc', border:'1px dashed #e2e8f0', borderRadius:10, padding:20, textAlign:'center', fontSize:13, color:'#999' }}>
            Sin antecedentes no patológicos registrados
          </div>
        )}
      </div>

      {/* AGO - solo si el paciente es femenino */}
      {patient?.sex === 'female' && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div>
              <div style={s.sectionTitle}>🌸 Antecedentes Gineco-Obstétricos (AGO)</div>
              <div style={s.sectionSub}>Historial menstrual, obstétrico y ginecológico</div>
            </div>
            {canEdit && !showAgoForm && (
              <button style={s.btnOutline} onClick={() => setShowAgoForm(true)}>{agoData ? 'Editar' : '+ Agregar'}</button>
            )}
          </div>

          {showAgoForm ? (
            <AgoForm initial={agoData || {}} onSave={form => saveAgo(form)} onCancel={() => setShowAgoForm(false)} />
          ) : agoData ? (
            <div style={s.card}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>🗓️ Menstruación</div>
                  {agoData.fum && <div style={{ fontSize:12, color:'#555', marginBottom:2 }}>FUM: {new Date(agoData.fum+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>}
                  {agoData.cycle_type && <div style={{ fontSize:12, color:'#555', marginBottom:2 }}>Ciclo: {agoData.cycle_type === 'regular' ? 'Regular' : 'Irregular'}</div>}
                  {agoData.bleeding_amount && <div style={{ fontSize:12, color:'#555', marginBottom:2 }}>Sangrado: {agoData.bleeding_amount === 'light'?'Ligero':agoData.bleeding_amount === 'moderate'?'Moderado':'Abundante'}</div>}
                  {agoData.planning_method && <div style={{ fontSize:12, color:'#555' }}>Planificación: {agoData.planning_method}</div>}
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>🤰 GPAC</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                    {[['G','gestas'],['P','partos'],['A','abortos'],['C','cesareas']].map(([label,key]) => (
                      <div key={key} style={{ fontSize:12, color:'#555' }}><strong>{label}:</strong> {agoData[key]||'0'}</div>
                    ))}
                  </div>
                </div>
                {agoData.menopause === 'yes' && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>🌙 Menopausia</div>
                    <div style={{ fontSize:12, color:'#555', marginBottom:2 }}>Desde {agoData.menopause_year||'—'}</div>
                    <div style={{ fontSize:12, color:'#555' }}>TRH: {agoData.hrt==='yes'?'Sí actualmente':agoData.hrt==='past'?'La tomó anteriormente':'No'}{agoData.hrt_detail ? ` · ${agoData.hrt_detail}` : ''}</div>
                  </div>
                )}
                {(agoData.last_pap || agoData.pap_result) && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:'#718096', marginBottom:4 }}>🔬 PAP</div>
                    {agoData.last_pap && <div style={{ fontSize:12, color:'#555', marginBottom:2 }}>Fecha: {new Date(agoData.last_pap+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>}
                    {agoData.pap_result && <div style={{ fontSize:12, color:'#555' }}>Resultado: {{normal:'Normal',abnormal:'Anormal',pending:'Pendiente',never:'Nunca realizado'}[agoData.pap_result]||agoData.pap_result}</div>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background:'#f7fafc', border:'1px dashed #e2e8f0', borderRadius:10, padding:20, textAlign:'center', fontSize:13, color:'#999' }}>
              Sin antecedentes gineco-obstétricos registrados
            </div>
          )}
        </div>
      )}

      {/* AQx - Antecedentes Quirúrgicos */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div>
            <div style={s.sectionTitle}>🔪 Antecedentes Quirúrgicos (AQx)</div>
            <div style={s.sectionSub}>Cirugías y procedimientos quirúrgicos previos</div>
          </div>
          {canEdit && !showAqxForm && (
            <button style={s.btnOutline} onClick={() => { setShowAqxForm(true); setEditingAqxId(null) }}>+ Agregar</button>
          )}
        </div>

        {showAqxForm && !editingAqxId && (
          <AqxForm onSave={form => saveAqx(form)} onCancel={() => setShowAqxForm(false)} />
        )}

        {antecedents.filter(a => a.type === 'aqx').length === 0 && !showAqxForm && (
          <div style={{ background:'#f7fafc', border:'1px dashed #e2e8f0', borderRadius:10, padding:20, textAlign:'center', fontSize:13, color:'#999' }}>
            Sin antecedentes quirúrgicos registrados
          </div>
        )}

        {antecedents.filter(a => a.type === 'aqx').map(item => (
          <div key={item.id}>
            {editingAqxId === item.id ? (
              <AqxForm
                initial={{ procedure: item.condition||'', year: item.diagnosis_year||'', hospital:'', complications:'no', complications_detail:'', observations: item.observations||'' }}
                onSave={form => saveAqx(form, item.id)}
                onCancel={() => setEditingAqxId(null)}
              />
            ) : (
              <div style={s.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>{item.condition}</div>
                    {item.diagnosis_year && <div style={{ fontSize:12, color:'#999', marginTop:2 }}>Año: {item.diagnosis_year}</div>}
                    {item.observations && <div style={{ fontSize:12, color:'#555', marginTop:4 }}>{item.observations}</div>}
                  </div>
                  {canEdit && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button style={s.btnEdit} onClick={() => { setEditingAqxId(item.id); setShowAqxForm(false) }}>Editar</button>
                      <button style={s.btnDanger} onClick={() => deleteAntecedent(item.id)}>Eliminar</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
