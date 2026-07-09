import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'


const s = {
  fieldLabel: { display:'block', fontSize:13, color:'#666', marginBottom:4, fontWeight:500 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' },
  btnPrimary: { background:'var(--clinic-primary, #1D9E75)', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer' },
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={s.fieldLabel}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={s.fieldInput} />
    </div>
  )
}

export default function NewUserForm({ type, doctors, saving, error, onSave, onClose, initialData }) {
  const [specialties, setSpecialties] = useState([])

  useEffect(() => {
    async function loadSpecialties() {
      const { data } = await supabase.from('specialties').select('name').order('name')
      setSpecialties(data?.map(s => s.name) || [])
    }
    loadSpecialties()
  }, [])

  async function addSpecialty(name) {
    await supabase.from('specialties').insert({ name })
    const { data } = await supabase.from('specialties').select('name').order('name')
    setSpecialties(data?.map(s => s.name) || [])
  }

  const CANTONES = {
    'San Jose': ['San Jose','Escazu','Desamparados','Puriscal','Tarrazu','Aserri','Mora','Goicoechea','Santa Ana','Alajuelita','Vazquez de Coronado','Acosta','Tibas','Moravia','Montes de Oca','Turrubares','Dota','Curridabat','Perez Zeledon','Leon Cortes'],
    'Alajuela': ['Alajuela','San Ramon','Grecia','San Mateo','Atenas','Naranjo','Palmares','Poas','Orotina','San Carlos','Zarcero','Valverde Vega','Upala','Los Chiles','Guatuso','Rio Cuarto'],
    'Cartago': ['Cartago','Paraiso','La Union','Jimenez','Turrialba','Alvarado','Oreamuno','El Guarco'],
    'Heredia': ['Heredia','Barva','Santo Domingo','Santa Barbara','San Rafael','San Isidro','Belen','Flores','San Pablo','Sarapiqui'],
    'Guanacaste': ['Liberia','Nicoya','Santa Cruz','Bagaces','Carrillo','Canas','Abangares','Tilaran','Nandayure','La Cruz','Hojancha'],
    'Puntarenas': ['Puntarenas','Esparza','Buenos Aires','Montes de Oro','Osa','Quepos','Golfito','Coto Brus','Parrita','Corredores','Garabito','Rio Nuevo','Monteverde','Puerto Jimenez'],
    'Limon': ['Limon','Pococi','Siquirres','Talamanca','Matina','Guacimo'],
  }
  const [form, setForm] = useState(initialData || { prefix:'', profession:'', firstName:'', lastName:'', email:'', password:'', specialty:'', medicalCode:'', doctorId:'', birthDate:'', height:'', sex:'', province:'', canton:'', idNumber:'', phone:'' })
  useEffect(() => { if (initialData) setForm(initialData) }, [initialData])
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>{initialData ? (type === 'doctor' ? 'Editar personal' : 'Editar paciente') : (type === 'doctor' ? 'Nuevo personal' : 'Nuevo paciente')}</div>
      {error && <div style={{ background:'#FAECE7', color:'#C24B2A', fontSize:13, padding:'8px 11px', borderRadius:8, marginBottom:12 }}>{error}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        {type === 'doctor' && (
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.fieldLabel}>Profesión <span style={{ color:'#D85A30' }}>*</span></label>
            <select value={form.profession} onChange={f('profession')} style={s.fieldInput}>
              <option value="">Seleccioná una profesión...</option>
              <optgroup label="Profesionales de salud">
                {['Médico general','Médico especialista','Enfermero/a','Fisioterapeuta','Nutricionista','Psicólogo/a','Odontólogo/a','Otro profesional de la salud'].map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
              <optgroup label="Profesionales administrativos">
                {['Administrador/a de clínica','Recepcionista','Contador/a','Asistente administrativo/a','Otro profesional administrativo'].map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            </select>
            {form.profession === 'Recepcionista' && (
              <div style={{ fontSize:11, color:'#185FA5', marginTop:4 }}>ℹ️ Este perfil tendrá acceso al calendario y gestión de pacientes únicamente.</div>
            )}
          </div>
        )}
        {type === 'doctor' && form.profession && form.profession !== 'Recepcionista' && (
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.fieldLabel}>Prefijo <span style={{ color:'#D85A30' }}>*</span></label>
            <select value={form.prefix} onChange={f('prefix')} style={s.fieldInput}>
              <option value="">Seleccioná un prefijo...</option>
              {['Dr.','Dra.','Lic.','Licda.','MSc.','PhD.','Ing.','Inga.','Enf.','Enfra.','Sr.','Sra.','Sin prefijo'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <Field label="Nombre" value={form.firstName} onChange={f('firstName')} placeholder="Maria" />
        <Field label="Apellido" value={form.lastName} onChange={f('lastName')} placeholder="Rodriguez" />
        <div style={{ gridColumn:'1/-1' }}><Field label="Correo electronico" value={form.email} onChange={f('email')} type="email" placeholder="correo@ejemplo.com" /></div>
        {!initialData && <div style={{ gridColumn:'1/-1' }}><Field label="Contrasena temporal" value={form.password} onChange={f('password')} type="password" placeholder="Minimo 6 caracteres" /></div>}
        {type === 'doctor' && <>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.fieldLabel}>Tipo de consulta</label>
            <select value={form.specialty} onChange={f('specialty')} style={s.fieldInput}>
              <option value="">Selecciona...</option>
              {specialties.map(sp => <option key={sp} value={sp}>{sp}</option>)}
              <option value="__nueva__">+ Agregar nueva especialidad...</option>
            </select>
          </div>
          {form.specialty === '__nueva__' && (
            <div style={{ gridColumn:'1/-1', display:'flex', gap:8 }}>
              <input value={form.newSpecialty || ''} onChange={e => setForm(p => ({ ...p, newSpecialty: e.target.value }))}
                placeholder="Nombre de la especialidad" style={s.fieldInput} />
              <button style={{ background:'#1D9E75', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap' }}
                onClick={async () => {
                  if (!form.newSpecialty?.trim()) return
                  await addSpecialty(form.newSpecialty.trim())
                  setForm(p => ({ ...p, specialty: form.newSpecialty.trim(), newSpecialty: '' }))
                }}>Guardar</button>
            </div>
          )}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={s.fieldLabel}>Codigo profesional (colegiado)</label>
            <input value={form.medicalCode} onChange={f('medicalCode')} placeholder="MED-12345" style={s.fieldInput} />
          </div>
          <div>
            <label style={s.fieldLabel}>Sexo</label>
            <select value={form.sex} onChange={f('sex')} style={s.fieldInput}>
              <option value="">Seleccionar</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div>
            <label style={s.fieldLabel}>Cédula / ID</label>
            <input value={form.idNumber} onChange={f('idNumber')} placeholder="1-1234-5678" style={s.fieldInput} />
          </div>
          <div>
            <label style={s.fieldLabel}>Teléfono</label>
<div style={{ display:'flex', gap:6 }}>
              <select value={(form.phone||'').startsWith('+') ? (form.phone||'').split(' ')[0] : '+506'}
                onChange={e => {
                  const num = (form.phone||'').includes(' ') ? (form.phone||'').split(' ').slice(1).join(' ') : (form.phone||'').replace(/^\+\d+\s?/,'')
                  setForm(p => ({ ...p, phone: e.target.value + ' ' + num }))
                }}
                style={{ ...s.fieldInput, width:110, flexShrink:0 }}>
                
              <option value="+93">+93 (Afganistán)</option>
              <option value="+355">+355 (Albania)</option>
              <option value="+213">+213 (Argelia)</option>
              <option value="+376">+376 (Andorra)</option>
              <option value="+244">+244 (Angola)</option>
              <option value="+1264">+1264 (Anguila)</option>
              <option value="+1268">+1268 (Antigua y Barbuda)</option>
              <option value="+54">+54 (Argentina)</option>
              <option value="+374">+374 (Armenia)</option>
              <option value="+297">+297 (Aruba)</option>
              <option value="+61">+61 (Australia)</option>
              <option value="+43">+43 (Austria)</option>
              <option value="+994">+994 (Azerbaiyán)</option>
              <option value="+1242">+1242 (Bahamas)</option>
              <option value="+973">+973 (Baréin)</option>
              <option value="+880">+880 (Bangladés)</option>
              <option value="+1246">+1246 (Barbados)</option>
              <option value="+375">+375 (Bielorrusia)</option>
              <option value="+32">+32 (Bélgica)</option>
              <option value="+501">+501 (Belice)</option>
              <option value="+229">+229 (Benín)</option>
              <option value="+1441">+1441 (Bermudas)</option>
              <option value="+975">+975 (Bután)</option>
              <option value="+591">+591 (Bolivia)</option>
              <option value="+387">+387 (Bosnia y Herzegovina)</option>
              <option value="+267">+267 (Botsuana)</option>
              <option value="+55">+55 (Brasil)</option>
              <option value="+673">+673 (Brunéi)</option>
              <option value="+359">+359 (Bulgaria)</option>
              <option value="+226">+226 (Burkina Faso)</option>
              <option value="+257">+257 (Burundi)</option>
              <option value="+238">+238 (Cabo Verde)</option>
              <option value="+855">+855 (Camboya)</option>
              <option value="+237">+237 (Camerún)</option>
              <option value="+1">+1 (Canadá)</option>
              <option value="+236">+236 (Rep. Centroafricana)</option>
              <option value="+235">+235 (Chad)</option>
              <option value="+56">+56 (Chile)</option>
              <option value="+86">+86 (China)</option>
              <option value="+357">+357 (Chipre)</option>
              <option value="+57">+57 (Colombia)</option>
              <option value="+269">+269 (Comoras)</option>
              <option value="+242">+242 (Congo)</option>
              <option value="+243">+243 (Congo RD)</option>
              <option value="+682">+682 (Cook)</option>
              <option value="+850">+850 (Corea del Norte)</option>
              <option value="+82">+82 (Corea del Sur)</option>
              <option value="+225">+225 (Costa de Marfil)</option>
              <option value="+506">+506 (Costa Rica)</option>
              <option value="+385">+385 (Croacia)</option>
              <option value="+53">+53 (Cuba)</option>
              <option value="+45">+45 (Dinamarca)</option>
              <option value="+253">+253 (Yibuti)</option>
              <option value="+1767">+1767 (Dominica)</option>
              <option value="+593">+593 (Ecuador)</option>
              <option value="+20">+20 (Egipto)</option>
              <option value="+503">+503 (El Salvador)</option>
              <option value="+971">+971 (Emiratos Árabes)</option>
              <option value="+291">+291 (Eritrea)</option>
              <option value="+421">+421 (Eslovaquia)</option>
              <option value="+386">+386 (Eslovenia)</option>
              <option value="+34">+34 (España)</option>
              <option value="+1">+1 (EE.UU.)</option>
              <option value="+251">+251 (Etiopía)</option>
              <option value="+679">+679 (Fiyi)</option>
              <option value="+63">+63 (Filipinas)</option>
              <option value="+358">+358 (Finlandia)</option>
              <option value="+33">+33 (Francia)</option>
              <option value="+241">+241 (Gabón)</option>
              <option value="+220">+220 (Gambia)</option>
              <option value="+995">+995 (Georgia)</option>
              <option value="+233">+233 (Ghana)</option>
              <option value="+350">+350 (Gibraltar)</option>
              <option value="+30">+30 (Grecia)</option>
              <option value="+1473">+1473 (Granada)</option>
              <option value="+502">+502 (Guatemala)</option>
              <option value="+224">+224 (Guinea)</option>
              <option value="+240">+240 (Guinea Ecuatorial)</option>
              <option value="+245">+245 (Guinea-Bisáu)</option>
              <option value="+592">+592 (Guyana)</option>
              <option value="+509">+509 (Haití)</option>
              <option value="+504">+504 (Honduras)</option>
              <option value="+36">+36 (Hungría)</option>
              <option value="+91">+91 (India)</option>
              <option value="+62">+62 (Indonesia)</option>
              <option value="+964">+964 (Irak)</option>
              <option value="+98">+98 (Irán)</option>
              <option value="+353">+353 (Irlanda)</option>
              <option value="+354">+354 (Islandia)</option>
              <option value="+1345">+1345 (Islas Caimán)</option>
              <option value="+672">+672 (Islas Norfolk)</option>
              <option value="+677">+677 (Islas Salomón)</option>
              <option value="+972">+972 (Israel)</option>
              <option value="+39">+39 (Italia)</option>
              <option value="+1876">+1876 (Jamaica)</option>
              <option value="+81">+81 (Japón)</option>
              <option value="+962">+962 (Jordania)</option>
              <option value="+7">+7 (Kazajistán)</option>
              <option value="+254">+254 (Kenia)</option>
              <option value="+996">+996 (Kirguistán)</option>
              <option value="+686">+686 (Kiribati)</option>
              <option value="+965">+965 (Kuwait)</option>
              <option value="+856">+856 (Laos)</option>
              <option value="+266">+266 (Lesoto)</option>
              <option value="+371">+371 (Letonia)</option>
              <option value="+961">+961 (Líbano)</option>
              <option value="+231">+231 (Liberia)</option>
              <option value="+218">+218 (Libia)</option>
              <option value="+423">+423 (Liechtenstein)</option>
              <option value="+370">+370 (Lituania)</option>
              <option value="+352">+352 (Luxemburgo)</option>
              <option value="+853">+853 (Macao)</option>
              <option value="+389">+389 (Macedonia del Norte)</option>
              <option value="+261">+261 (Madagascar)</option>
              <option value="+265">+265 (Malaui)</option>
              <option value="+60">+60 (Malasia)</option>
              <option value="+960">+960 (Maldivas)</option>
              <option value="+223">+223 (Malí)</option>
              <option value="+356">+356 (Malta)</option>
              <option value="+212">+212 (Marruecos)</option>
              <option value="+692">+692 (Islas Marshall)</option>
              <option value="+222">+222 (Mauritania)</option>
              <option value="+230">+230 (Mauricio)</option>
              <option value="+52">+52 (México)</option>
              <option value="+691">+691 (Micronesia)</option>
              <option value="+373">+373 (Moldavia)</option>
              <option value="+377">+377 (Mónaco)</option>
              <option value="+976">+976 (Mongolia)</option>
              <option value="+382">+382 (Montenegro)</option>
              <option value="+258">+258 (Mozambique)</option>
              <option value="+264">+264 (Namibia)</option>
              <option value="+674">+674 (Nauru)</option>
              <option value="+977">+977 (Nepal)</option>
              <option value="+505">+505 (Nicaragua)</option>
              <option value="+227">+227 (Níger)</option>
              <option value="+234">+234 (Nigeria)</option>
              <option value="+47">+47 (Noruega)</option>
              <option value="+64">+64 (Nueva Zelanda)</option>
              <option value="+968">+968 (Omán)</option>
              <option value="+31">+31 (Países Bajos)</option>
              <option value="+92">+92 (Pakistán)</option>
              <option value="+680">+680 (Palaos)</option>
              <option value="+507">+507 (Panamá)</option>
              <option value="+675">+675 (Papúa Nueva Guinea)</option>
              <option value="+595">+595 (Paraguay)</option>
              <option value="+51">+51 (Perú)</option>
              <option value="+48">+48 (Polonia)</option>
              <option value="+351">+351 (Portugal)</option>
              <option value="+974">+974 (Catar)</option>
              <option value="+44">+44 (Reino Unido)</option>
              <option value="+1809">+1809 (Rep. Dominicana)</option>
              <option value="+250">+250 (Ruanda)</option>
              <option value="+40">+40 (Rumanía)</option>
              <option value="+7">+7 (Rusia)</option>
              <option value="+685">+685 (Samoa)</option>
              <option value="+1869">+1869 (San Cristóbal y Nieves)</option>
              <option value="+378">+378 (San Marino)</option>
              <option value="+1784">+1784 (San Vicente y Granadinas)</option>
              <option value="+239">+239 (Santo Tomé y Príncipe)</option>
              <option value="+966">+966 (Arabia Saudita)</option>
              <option value="+221">+221 (Senegal)</option>
              <option value="+381">+381 (Serbia)</option>
              <option value="+248">+248 (Seychelles)</option>
              <option value="+232">+232 (Sierra Leona)</option>
              <option value="+65">+65 (Singapur)</option>
              <option value="+963">+963 (Siria)</option>
              <option value="+252">+252 (Somalia)</option>
              <option value="+94">+94 (Sri Lanka)</option>
              <option value="+268">+268 (Suazilandia)</option>
              <option value="+249">+249 (Sudán)</option>
              <option value="+211">+211 (Sudán del Sur)</option>
              <option value="+46">+46 (Suecia)</option>
              <option value="+41">+41 (Suiza)</option>
              <option value="+597">+597 (Surinam)</option>
              <option value="+66">+66 (Tailandia)</option>
              <option value="+886">+886 (Taiwán)</option>
              <option value="+255">+255 (Tanzania)</option>
              <option value="+992">+992 (Tayikistán)</option>
              <option value="+670">+670 (Timor Oriental)</option>
              <option value="+228">+228 (Togo)</option>
              <option value="+676">+676 (Tonga)</option>
              <option value="+1868">+1868 (Trinidad y Tobago)</option>
              <option value="+216">+216 (Túnez)</option>
              <option value="+993">+993 (Turkmenistán)</option>
              <option value="+90">+90 (Turquía)</option>
              <option value="+688">+688 (Tuvalu)</option>
              <option value="+380">+380 (Ucrania)</option>
              <option value="+256">+256 (Uganda)</option>
              <option value="+598">+598 (Uruguay)</option>
              <option value="+998">+998 (Uzbekistán)</option>
              <option value="+678">+678 (Vanuatu)</option>
              <option value="+58">+58 (Venezuela)</option>
              <option value="+84">+84 (Vietnam)</option>
              <option value="+967">+967 (Yemen)</option>
              <option value="+253">+253 (Yibuti)</option>
              <option value="+260">+260 (Zambia)</option>
              <option value="+263">+263 (Zimbabue)</option>
              </select>
              <input type="tel" value={(form.phone||'').includes(' ') ? (form.phone||'').split(' ').slice(1).join(' ') : (form.phone||'').replace(/^\+\d+\s?/,'')}
                onChange={e => {
                  const prefix = (form.phone||'').startsWith('+') ? (form.phone||'').split(' ')[0] : '+506'
                  setForm(p => ({ ...p, phone: prefix + ' ' + e.target.value }))
                }}
                placeholder="8888-8888" style={{ ...s.fieldInput, flex:1 }} />
            </div>
          </div>
          <div>
            <label style={s.fieldLabel}>Provincia</label>
            <select value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value, canton: '' }))} style={s.fieldInput}>
              <option value="">Seleccionar</option>
              {Object.keys(CANTONES).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={s.fieldLabel}>Cantón</label>
            <select value={form.canton} onChange={f('canton')} style={s.fieldInput} disabled={!form.province}>
              <option value="">Seleccionar</option>
              {form.province && CANTONES[form.province] && CANTONES[form.province].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </>}
        {type === 'patient' && (
          <>
            <Field label="Fecha de nacimiento" value={form.birthDate} onChange={f('birthDate')} type="date" />
            <Field label="Estatura (cm)" value={form.height} onChange={f('height')} type="number" placeholder="165" />
            <div>
              <label style={s.fieldLabel}>Sexo</label>
              <select value={form.sex} onChange={f('sex')} style={s.fieldInput}>
                <option value="">Selecciona...</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro</option>
              </select>
            </div>

              <div>
                <label style={s.fieldLabel}>Cedula / ID</label>
                <input value={form.idNumber} onChange={f('idNumber')} placeholder="1-1234-5678" style={s.fieldInput} />
              </div>
              <div>
                <label style={s.fieldLabel}>Telefono</label>
<div style={{ display:'flex', gap:6 }}>
              <select value={(form.phone||'').startsWith('+') ? (form.phone||'').split(' ')[0] : '+506'}
                onChange={e => {
                  const num = (form.phone||'').includes(' ') ? (form.phone||'').split(' ').slice(1).join(' ') : (form.phone||'').replace(/^\+\d+\s?/,'')
                  setForm(p => ({ ...p, phone: e.target.value + ' ' + num }))
                }}
                style={{ ...s.fieldInput, width:110, flexShrink:0 }}>
                
              <option value="+93">+93 (Afganistán)</option>
              <option value="+355">+355 (Albania)</option>
              <option value="+213">+213 (Argelia)</option>
              <option value="+376">+376 (Andorra)</option>
              <option value="+244">+244 (Angola)</option>
              <option value="+1264">+1264 (Anguila)</option>
              <option value="+1268">+1268 (Antigua y Barbuda)</option>
              <option value="+54">+54 (Argentina)</option>
              <option value="+374">+374 (Armenia)</option>
              <option value="+297">+297 (Aruba)</option>
              <option value="+61">+61 (Australia)</option>
              <option value="+43">+43 (Austria)</option>
              <option value="+994">+994 (Azerbaiyán)</option>
              <option value="+1242">+1242 (Bahamas)</option>
              <option value="+973">+973 (Baréin)</option>
              <option value="+880">+880 (Bangladés)</option>
              <option value="+1246">+1246 (Barbados)</option>
              <option value="+375">+375 (Bielorrusia)</option>
              <option value="+32">+32 (Bélgica)</option>
              <option value="+501">+501 (Belice)</option>
              <option value="+229">+229 (Benín)</option>
              <option value="+1441">+1441 (Bermudas)</option>
              <option value="+975">+975 (Bután)</option>
              <option value="+591">+591 (Bolivia)</option>
              <option value="+387">+387 (Bosnia y Herzegovina)</option>
              <option value="+267">+267 (Botsuana)</option>
              <option value="+55">+55 (Brasil)</option>
              <option value="+673">+673 (Brunéi)</option>
              <option value="+359">+359 (Bulgaria)</option>
              <option value="+226">+226 (Burkina Faso)</option>
              <option value="+257">+257 (Burundi)</option>
              <option value="+238">+238 (Cabo Verde)</option>
              <option value="+855">+855 (Camboya)</option>
              <option value="+237">+237 (Camerún)</option>
              <option value="+1">+1 (Canadá)</option>
              <option value="+236">+236 (Rep. Centroafricana)</option>
              <option value="+235">+235 (Chad)</option>
              <option value="+56">+56 (Chile)</option>
              <option value="+86">+86 (China)</option>
              <option value="+357">+357 (Chipre)</option>
              <option value="+57">+57 (Colombia)</option>
              <option value="+269">+269 (Comoras)</option>
              <option value="+242">+242 (Congo)</option>
              <option value="+243">+243 (Congo RD)</option>
              <option value="+682">+682 (Cook)</option>
              <option value="+850">+850 (Corea del Norte)</option>
              <option value="+82">+82 (Corea del Sur)</option>
              <option value="+225">+225 (Costa de Marfil)</option>
              <option value="+506">+506 (Costa Rica)</option>
              <option value="+385">+385 (Croacia)</option>
              <option value="+53">+53 (Cuba)</option>
              <option value="+45">+45 (Dinamarca)</option>
              <option value="+253">+253 (Yibuti)</option>
              <option value="+1767">+1767 (Dominica)</option>
              <option value="+593">+593 (Ecuador)</option>
              <option value="+20">+20 (Egipto)</option>
              <option value="+503">+503 (El Salvador)</option>
              <option value="+971">+971 (Emiratos Árabes)</option>
              <option value="+291">+291 (Eritrea)</option>
              <option value="+421">+421 (Eslovaquia)</option>
              <option value="+386">+386 (Eslovenia)</option>
              <option value="+34">+34 (España)</option>
              <option value="+1">+1 (EE.UU.)</option>
              <option value="+251">+251 (Etiopía)</option>
              <option value="+679">+679 (Fiyi)</option>
              <option value="+63">+63 (Filipinas)</option>
              <option value="+358">+358 (Finlandia)</option>
              <option value="+33">+33 (Francia)</option>
              <option value="+241">+241 (Gabón)</option>
              <option value="+220">+220 (Gambia)</option>
              <option value="+995">+995 (Georgia)</option>
              <option value="+233">+233 (Ghana)</option>
              <option value="+350">+350 (Gibraltar)</option>
              <option value="+30">+30 (Grecia)</option>
              <option value="+1473">+1473 (Granada)</option>
              <option value="+502">+502 (Guatemala)</option>
              <option value="+224">+224 (Guinea)</option>
              <option value="+240">+240 (Guinea Ecuatorial)</option>
              <option value="+245">+245 (Guinea-Bisáu)</option>
              <option value="+592">+592 (Guyana)</option>
              <option value="+509">+509 (Haití)</option>
              <option value="+504">+504 (Honduras)</option>
              <option value="+36">+36 (Hungría)</option>
              <option value="+91">+91 (India)</option>
              <option value="+62">+62 (Indonesia)</option>
              <option value="+964">+964 (Irak)</option>
              <option value="+98">+98 (Irán)</option>
              <option value="+353">+353 (Irlanda)</option>
              <option value="+354">+354 (Islandia)</option>
              <option value="+1345">+1345 (Islas Caimán)</option>
              <option value="+672">+672 (Islas Norfolk)</option>
              <option value="+677">+677 (Islas Salomón)</option>
              <option value="+972">+972 (Israel)</option>
              <option value="+39">+39 (Italia)</option>
              <option value="+1876">+1876 (Jamaica)</option>
              <option value="+81">+81 (Japón)</option>
              <option value="+962">+962 (Jordania)</option>
              <option value="+7">+7 (Kazajistán)</option>
              <option value="+254">+254 (Kenia)</option>
              <option value="+996">+996 (Kirguistán)</option>
              <option value="+686">+686 (Kiribati)</option>
              <option value="+965">+965 (Kuwait)</option>
              <option value="+856">+856 (Laos)</option>
              <option value="+266">+266 (Lesoto)</option>
              <option value="+371">+371 (Letonia)</option>
              <option value="+961">+961 (Líbano)</option>
              <option value="+231">+231 (Liberia)</option>
              <option value="+218">+218 (Libia)</option>
              <option value="+423">+423 (Liechtenstein)</option>
              <option value="+370">+370 (Lituania)</option>
              <option value="+352">+352 (Luxemburgo)</option>
              <option value="+853">+853 (Macao)</option>
              <option value="+389">+389 (Macedonia del Norte)</option>
              <option value="+261">+261 (Madagascar)</option>
              <option value="+265">+265 (Malaui)</option>
              <option value="+60">+60 (Malasia)</option>
              <option value="+960">+960 (Maldivas)</option>
              <option value="+223">+223 (Malí)</option>
              <option value="+356">+356 (Malta)</option>
              <option value="+212">+212 (Marruecos)</option>
              <option value="+692">+692 (Islas Marshall)</option>
              <option value="+222">+222 (Mauritania)</option>
              <option value="+230">+230 (Mauricio)</option>
              <option value="+52">+52 (México)</option>
              <option value="+691">+691 (Micronesia)</option>
              <option value="+373">+373 (Moldavia)</option>
              <option value="+377">+377 (Mónaco)</option>
              <option value="+976">+976 (Mongolia)</option>
              <option value="+382">+382 (Montenegro)</option>
              <option value="+258">+258 (Mozambique)</option>
              <option value="+264">+264 (Namibia)</option>
              <option value="+674">+674 (Nauru)</option>
              <option value="+977">+977 (Nepal)</option>
              <option value="+505">+505 (Nicaragua)</option>
              <option value="+227">+227 (Níger)</option>
              <option value="+234">+234 (Nigeria)</option>
              <option value="+47">+47 (Noruega)</option>
              <option value="+64">+64 (Nueva Zelanda)</option>
              <option value="+968">+968 (Omán)</option>
              <option value="+31">+31 (Países Bajos)</option>
              <option value="+92">+92 (Pakistán)</option>
              <option value="+680">+680 (Palaos)</option>
              <option value="+507">+507 (Panamá)</option>
              <option value="+675">+675 (Papúa Nueva Guinea)</option>
              <option value="+595">+595 (Paraguay)</option>
              <option value="+51">+51 (Perú)</option>
              <option value="+48">+48 (Polonia)</option>
              <option value="+351">+351 (Portugal)</option>
              <option value="+974">+974 (Catar)</option>
              <option value="+44">+44 (Reino Unido)</option>
              <option value="+1809">+1809 (Rep. Dominicana)</option>
              <option value="+250">+250 (Ruanda)</option>
              <option value="+40">+40 (Rumanía)</option>
              <option value="+7">+7 (Rusia)</option>
              <option value="+685">+685 (Samoa)</option>
              <option value="+1869">+1869 (San Cristóbal y Nieves)</option>
              <option value="+378">+378 (San Marino)</option>
              <option value="+1784">+1784 (San Vicente y Granadinas)</option>
              <option value="+239">+239 (Santo Tomé y Príncipe)</option>
              <option value="+966">+966 (Arabia Saudita)</option>
              <option value="+221">+221 (Senegal)</option>
              <option value="+381">+381 (Serbia)</option>
              <option value="+248">+248 (Seychelles)</option>
              <option value="+232">+232 (Sierra Leona)</option>
              <option value="+65">+65 (Singapur)</option>
              <option value="+963">+963 (Siria)</option>
              <option value="+252">+252 (Somalia)</option>
              <option value="+94">+94 (Sri Lanka)</option>
              <option value="+268">+268 (Suazilandia)</option>
              <option value="+249">+249 (Sudán)</option>
              <option value="+211">+211 (Sudán del Sur)</option>
              <option value="+46">+46 (Suecia)</option>
              <option value="+41">+41 (Suiza)</option>
              <option value="+597">+597 (Surinam)</option>
              <option value="+66">+66 (Tailandia)</option>
              <option value="+886">+886 (Taiwán)</option>
              <option value="+255">+255 (Tanzania)</option>
              <option value="+992">+992 (Tayikistán)</option>
              <option value="+670">+670 (Timor Oriental)</option>
              <option value="+228">+228 (Togo)</option>
              <option value="+676">+676 (Tonga)</option>
              <option value="+1868">+1868 (Trinidad y Tobago)</option>
              <option value="+216">+216 (Túnez)</option>
              <option value="+993">+993 (Turkmenistán)</option>
              <option value="+90">+90 (Turquía)</option>
              <option value="+688">+688 (Tuvalu)</option>
              <option value="+380">+380 (Ucrania)</option>
              <option value="+256">+256 (Uganda)</option>
              <option value="+598">+598 (Uruguay)</option>
              <option value="+998">+998 (Uzbekistán)</option>
              <option value="+678">+678 (Vanuatu)</option>
              <option value="+58">+58 (Venezuela)</option>
              <option value="+84">+84 (Vietnam)</option>
              <option value="+967">+967 (Yemen)</option>
              <option value="+253">+253 (Yibuti)</option>
              <option value="+260">+260 (Zambia)</option>
              <option value="+263">+263 (Zimbabue)</option>
              </select>
              <input type="tel" value={(form.phone||'').includes(' ') ? (form.phone||'').split(' ').slice(1).join(' ') : (form.phone||'').replace(/^\+\d+\s?/,'')}
                onChange={e => {
                  const prefix = (form.phone||'').startsWith('+') ? (form.phone||'').split(' ')[0] : '+506'
                  setForm(p => ({ ...p, phone: prefix + ' ' + e.target.value }))
                }}
                placeholder="8888-8888" style={{ ...s.fieldInput, flex:1 }} />
            </div>
              </div>
              <div>
                <label style={s.fieldLabel}>Provincia</label>
                <select value={form.province} onChange={f('province')} style={s.fieldInput}>
                  <option value="">Selecciona...</option>
                  <option value="San Jose">San Jose</option>
                  <option value="Alajuela">Alajuela</option>
                  <option value="Cartago">Cartago</option>
                  <option value="Heredia">Heredia</option>
                  <option value="Guanacaste">Guanacaste</option>
                  <option value="Puntarenas">Puntarenas</option>
                  <option value="Limon">Limon</option>
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Canton</label>
                <select value={form.canton} onChange={f('canton')} style={s.fieldInput} disabled={!form.province}>
                  <option value="">Selecciona...</option>
                  {form.province && CANTONES[form.province] && CANTONES[form.province].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
          </>
        )}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : initialData ? 'Guardar cambios' : 'Crear usuario'}</button>
      </div>
    </>
  )
}

