import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import DocumentosTab from '../components/DocumentosTab'
import InventarioTab from '../components/InventarioTab'
import NewUserForm from '../components/NewUserForm'
import TicketsTab from '../components/TicketsTab'
import ConsentimientosTab from '../components/ConsentimientosTab'
import IntegralModule from './IntegralModule'
import PatientExpediente from '../components/PatientExpediente'
import ModuleChat from '../components/ModuleChat'
import MetabolicModule from './MetabolicModule'
import AestheticModule from './AestheticModule'
import FisioterapiaModule from './FisioterapiaModule'
import EnfermeriaModule from './EnfermeriaModule'
import ReportesView from '../components/ReportesView'
import UserMenu from '../components/UserMenu'
import SpotifyBar from '../components/SpotifyBar'
import ChatBubble from '../components/ChatBubble'
import NotificationBell from '../components/NotificationBell'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Dot, PieChart, Pie, Cell, Legend } from 'recharts'

const G = '#1D9E75'
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return { r, g, b }
}
function lighten(hex, amount=0.85) {
  const { r,g,b } = hexToRgb(hex)
  return `rgb(${Math.round(r+(255-r)*amount)},${Math.round(g+(255-g)*amount)},${Math.round(b+(255-b)*amount)})`
}
function darken(hex, amount=0.2) {
  const { r,g,b } = hexToRgb(hex)
  return `rgb(${Math.round(r*(1-amount))},${Math.round(g*(1-amount))},${Math.round(b*(1-amount))})`
}
const SP = ' '

function EditDoctorForm({ doctor, saving, onSave, onClose }) {
  const CANTONES = {
    'San Jose': ['San Jose','Escazu','Desamparados','Puriscal','Tarrazu','Aserri','Mora','Goicoechea','Santa Ana','Alajuelita','Vazquez de Coronado','Acosta','Tibas','Moravia','Montes de Oca','Turrubares','Dota','Curridabat','Perez Zeledon','Leon Cortes'],
    'Alajuela': ['Alajuela','San Ramon','Grecia','San Mateo','Atenas','Naranjo','Palmares','Poas','Orotina','San Carlos','Zarcero','Valverde Vega','Upala','Los Chiles','Guatuso','Rio Cuarto'],
    'Cartago': ['Cartago','Paraiso','La Union','Jimenez','Turrialba','Alvarado','Oreamuno','El Guarco'],
    'Heredia': ['Heredia','Barva','Santo Domingo','Santa Barbara','San Rafael','San Isidro','Belen','Flores','San Pablo','Sarapiqui'],
    'Guanacaste': ['Liberia','Nicoya','Santa Cruz','Bagaces','Carrillo','Canas','Abangares','Tilaran','Nandayure','La Cruz','Hojancha'],
    'Puntarenas': ['Puntarenas','Esparza','Buenos Aires','Montes de Oro','Osa','Quepos','Golfito','Coto Brus','Parrita','Corredores','Garabito','Monteverde'],
    'Limon': ['Limon','Pococi','Siquirres','Talamanca','Matina','Guacimo'],
  }
  const [form, setForm] = useState({
    prefix:      doctor.prefix       || '',
    firstName:   doctor.first_name   || '',
    lastName:    doctor.last_name    || '',
    medicalCode: doctor.medical_code || '',
    specialty:   doctor.specialty    || '',
    sex:         doctor.sex          || '',
    idNumber:    doctor.id_number    || '',
    phone:       doctor.phone        || '',
    province:    doctor.province     || '',
    canton:      doctor.canton       || '',
    newSpecialty: '',
  })
  const [specialties, setSpecialties] = useState([])
  const supabaseLocal = require('../lib/supabase').supabase
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    supabaseLocal.from('specialties').select('name').order('name').then(({ data }) => {
      if (data) setSpecialties(data.map(s => s.name))
    })
  }, [])

  async function addNewSpecialty() {
    if (!form.newSpecialty?.trim()) return
    await supabaseLocal.from('specialties').insert({ name: form.newSpecialty.trim() })
    const { data } = await supabaseLocal.from('specialties').select('name').order('name')
    if (data) setSpecialties(data.map(s => s.name))
    setForm(p => ({ ...p, specialty: form.newSpecialty.trim(), newSpecialty: '' }))
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const lbl = { fontSize:12, fontWeight:500, color:'#666', display:'block', marginBottom:4 }

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Editar personal</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Prefijo</label>
          <select value={form.prefix} onChange={f('prefix')} style={inp}>
            <option value="">Seleccioná un prefijo...</option>
            {['Dr.','Dra.','Lic.','Licda.','MSc.','PhD.','Ing.','Inga.','Enf.','Enfra.','Sr.','Sra.','Sin prefijo'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Nombre</label>
          <input value={form.firstName} onChange={f('firstName')} style={inp} />
        </div>
        <div>
          <label style={lbl}>Apellidos</label>
          <input value={form.lastName} onChange={f('lastName')} style={inp} />
        </div>
        <div>
          <label style={lbl}>Sexo</label>
          <select value={form.sex} onChange={f('sex')} style={inp}>
            <option value="">Seleccionar</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div>
          <label style={lbl}>Cédula / ID</label>
          <input value={form.idNumber} onChange={f('idNumber')} placeholder="1-1234-5678" style={inp} />
        </div>
        <div>
          <label style={lbl}>Teléfono</label>
<div style={{ display:'flex', gap:6 }}>
            <select value={(form.phone||'').startsWith('+') ? (form.phone||'').split(' ')[0] : '+506'}
              onChange={e => {
                const num = (form.phone||'').includes(' ') ? (form.phone||'').split(' ').slice(1).join(' ') : (form.phone||'').replace(/^\+\d+\s?/,'')
                setForm(p => ({ ...p, phone: e.target.value + ' ' + num }))
              }}
              style={{ ...inp, width:110, flexShrink:0 }}>
              
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
              placeholder="8888-8888" style={{ ...inp, flex:1 }} />
          </div>
        </div>
        <div>
          <label style={lbl}>Código profesional</label>
          <input value={form.medicalCode} onChange={f('medicalCode')} placeholder="MED-12345" style={inp} />
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={lbl}>Especialidad</label>
          <select value={form.specialty} onChange={f('specialty')} style={inp}>
            <option value="">Seleccionar</option>
            {specialties.map(sp => <option key={sp} value={sp}>{sp}</option>)}
            <option value="__nueva__">+ Agregar nueva especialidad...</option>
          </select>
        </div>
        {form.specialty === '__nueva__' && (
          <div style={{ gridColumn:'1/-1', display:'flex', gap:8 }}>
            <input value={form.newSpecialty} onChange={f('newSpecialty')} placeholder="Nombre de la especialidad" style={inp} />
            <button onClick={addNewSpecialty} style={{ background:'#0F6E56', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap' }}>Guardar</button>
          </div>
        )}
        <div>
          <label style={lbl}>Provincia</label>
          <select value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value, canton: '' }))} style={inp}>
            <option value="">Seleccionar</option>
            {Object.keys(CANTONES).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Cantón</label>
          <select value={form.canton} onChange={f('canton')} style={inp} disabled={!form.province}>
            <option value="">Seleccionar</option>
            {form.province && CANTONES[form.province] && CANTONES[form.province].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button onClick={onClose} style={{ background:'none', border:'1px solid #e0e0e0', fontSize:13, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' }}>Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving} style={{ background:'#0F6E56', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </>
  )
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const urlPatientId = location.pathname.startsWith('/admin/pacientes/') 
    ? location.pathname.replace('/admin/pacientes/', '').split('/')[0] 
    : null

  // Extraer la vista actual de la URL
  const getViewFromPath = () => {
    const path = location.pathname.replace('/admin', '').replace(/^\//, '') || 'calendario'
    const valid = ['calendario','pacientes','medicos','biblioteca','permisos','reportes','config','sucursales','inventario','tickets']
    return valid.includes(path.split('/')[0]) ? path.split('/')[0] : 'calendario'
  }

  const [view, setView] = useState(getViewFromPath)

  useEffect(() => {
    const v = getViewFromPath()
    if (v !== view) {
      setView(v)
      if (v !== 'perfil-paciente') setSelPatient(null)
    }
  }, [location.pathname])

  useEffect(() => {
    function handlePopState(e) {
      const path = window.location.pathname
      if (!path.startsWith('/admin/pacientes/')) {
        setSelPatient(null)
        const v = path.replace('/admin/', '').split('/')[0] || 'calendario'
        setView(v)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function setViewPersist(v) {
    setView(v)
    navigate(`/admin/${v}`)
  }
  function setSelPatientPersist(p) {
    setSelPatient(p)
    if (p) navigate(`/admin/pacientes/${p.id}`)
    else navigate('/admin/pacientes')
  }
  const [searchPac, setSearchPac] = useState('')
  const [searchDoc, setSearchDoc] = useState('')
  const [inactivePatients, setInactivePatients] = useState([])
  const [showInactive, setShowInactive] = useState(false)
  const [inactiveSearch, setInactiveSearch] = useState('')
  const [newPatientId, setNewPatientId] = useState(null)
  const [blockForm, setBlockForm] = useState({ doctor_id:'', date:'', end_date:'', start_time:'', end_time:'', reason:'' })
  const [apptTags, setApptTags] = useState([])
  const [moduleAssignments, setModuleAssignments] = useState({})
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [appts, setAppts] = useState([])
  const [msgs, setMsgs] = useState([])
  const [library, setLibrary] = useState([])
  const [perms, setPerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [editPatientForm, setEditPatientForm] = useState({})
  const [activeChat, setActiveChat] = useState(null)
  const [chatMsg, setChatMsg] = useState('')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calView, setCalView] = useState(window.innerWidth <= 640 ? 'dia' : 'semana')
  const [draggingAppt, setDraggingAppt] = useState(null)
  const [availability, setAvailability] = useState([])
  const [availForm, setAvailForm] = useState({ doctor_id:'', branch_id:'', start_time:'08:00', end_time:'17:00', repeat_type:'weekly', days_of_week:[], start_date:'', end_type:'indefinite', repeat_until:'' })
  const [popupAppt, setPopupAppt] = useState(null)
  const [comprobanteAppt, setComprobanteAppt] = useState(null)
  const [comprobanteHoraIngreso, setComprobanteHoraIngreso] = useState('')
  const [comprobanteHoraSalida, setComprobanteHoraSalida] = useState('')

  useEffect(() => {
    if (!comprobanteAppt) return
    setTimeout(() => {
      const canvas = document.getElementById('firma-canvas')
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#1a3a5c'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      let drawing = false
      let lastX = 0, lastY = 0
      function getPos(e) {
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        if (e.touches) return [(e.touches[0].clientX - rect.left)*scaleX, (e.touches[0].clientY - rect.top)*scaleY]
        return [(e.clientX - rect.left)*scaleX, (e.clientY - rect.top)*scaleY]
      }
      canvas.addEventListener('mousedown', e => { drawing = true; ;[lastX, lastY] = getPos(e) })
      canvas.addEventListener('mousemove', e => {
        if (!drawing) return
        const [x, y] = getPos(e)
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke()
        lastX = x; lastY = y
      })
      canvas.addEventListener('mouseup', () => drawing = false)
      canvas.addEventListener('mouseleave', () => drawing = false)
      canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; ;[lastX, lastY] = getPos(e) }, { passive: false })
      canvas.addEventListener('touchmove', e => {
        e.preventDefault()
        if (!drawing) return
        const [x, y] = getPos(e)
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke()
        lastX = x; lastY = y
      }, { passive: false })
      canvas.addEventListener('touchend', () => drawing = false)
    }, 100)
  }, [comprobanteAppt])
  const [popupPos, setPopupPos] = useState({ x:0, y:0 })
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  function scrollToNow(viewName) {
    const id = viewName === 'semana' ? 'cal-semana-scroll' : 'cal-dia-scroll'
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        const now = new Date()
        const SLOT_H = viewName === 'semana' ? 80 : 88
        const offset = (now.getHours() * 60 + now.getMinutes()) / 60 * (SLOT_H/2) * 2 - (el.clientHeight / 2)
        el.scrollTop = Math.max(0, offset)
      }
    }, 300)
  }

  useEffect(() => {
    if (calView === 'semana' || calView === 'dia') scrollToNow(calView)
  }, [calView])

  useEffect(() => {
    if (view === 'calendario') scrollToNow(calView)
  }, [view])

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(today)
    mon.setDate(today.getDate() + diff)
    mon.setHours(0,0,0,0)
    return mon
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [collapsedMenuOpen, setCollapsedMenuOpen] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [selDate, setSelDate] = useState(null)
  const [selDoctor, setSelDoctor] = useState(null)
  const [selPatient, setSelPatient] = useState(null)
  const [patientTab, setPatientTab] = useState('modulos')
  const [measurements, setMeasurements] = useState([])
  const [goals, setGoals] = useState([])
  const [patientTasks, setPatientTasks] = useState([])
  const [treatments, setTreatments] = useState([])
  const [notes, setNotes] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [cie10Search, setCie10Search] = useState('')
  const [cie10Results, setCie10Results] = useState([])
  const [clinicSettings, setClinicSettings] = useState(null)
  const [primaryColor, setPrimaryColor] = useState('#0F6E56')
  const [expedienteInitialTab, setExpedienteInitialTab] = useState('preconsulta')
  // Clínica activa — usa active_clinic_id si existe, sino clinic_id
  const effectiveClinicId = profile?.active_clinic_id || profile?.active_clinic_id || profile?.clinic_id

  useEffect(() => {
    const r = parseInt(primaryColor.slice(1,3),16)
    const g = parseInt(primaryColor.slice(3,5),16)
    const b = parseInt(primaryColor.slice(5,7),16)
    const dark = `rgb(${Math.round(r*0.8)},${Math.round(g*0.8)},${Math.round(b*0.8)})`
    const light = `rgba(${r},${g},${b},0.12)`
    document.documentElement.style.setProperty('--clinic-primary', primaryColor)
    document.documentElement.style.setProperty('--clinic-primary-dark', dark)
    document.documentElement.style.setProperty('--clinic-primary-light', light)
  }, [primaryColor])
  const [clinicPlan, setClinicPlan] = useState('basic')
  const isClinicAdmin = profile?.role === 'clinic_admin'
  const isBranchAdmin = profile?.role === 'branch_admin' || profile?.role === 'admin'
  const [selBranch, setSelBranch] = useState('')
  const [filterDoctorId, setFilterDoctorId] = useState('')
  const [myBranchId, setMyBranchId] = useState(null)

  // Filtros automáticos para branch_admin
  const filteredPatients = myBranchId
    ? patients.filter(p => p.branch_id === myBranchId || p.clinic_id === effectiveClinicId)
    : patients
  const filteredDoctors = (myBranchId
    ? doctors.filter(d => d.branch_id === myBranchId)
    : doctors).filter(d => d.is_health_professional || d.role === 'doctor')
  const filteredAppts = myBranchId
    ? appts.filter(a => a.branch_id === myBranchId)
    : appts
  const [branchForm, setBranchForm] = useState({})
  const [branches, setBranches] = useState([])
  const [enabledModules, setEnabledModules] = useState(['integral','metabolica','estetica','fisioterapia','enfermeria','odontologia','nutricion'])
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => { if (profile?.id) loadAll() }, [profile?.id])

  const [allGoals, setAllGoals] = useState([])
  const [allDiagnoses, setAllDiagnoses] = useState([])

  async function loadAll() {
    setLoading(true)
    let branchId = null
    if (profile?.role === 'branch_admin' || profile?.role === 'admin') {
      const { data: bs } = await supabase.from('branch_staff').select('branch_id').eq('profile_id', profile.id).single()
      if (bs?.branch_id) { branchId = bs.branch_id; setMyBranchId(bs.branch_id) }
    }
    await Promise.all([loadDoctors(), loadPatients(branchId), loadAppts(branchId), loadMsgs(), loadLibrary(), loadPerms(), loadAllGoals(), loadAllDiagnoses(), loadClinicSettings(), loadBranches(), loadAvailability(), loadApptTags()])
    setLoading(false)
  }

  async function loadClinicSettings() {
    const cid = profile?.active_clinic_id || effectiveClinicId
    const { data } = await supabase.from('clinic_settings').select('*').eq('clinic_id', cid).limit(1).maybeSingle()
    const { data: clinicData } = await supabase.from('clinics').select('sku_prefix').eq('id', cid).single()
    if (data) {
      if (clinicData?.sku_prefix) data.sku_prefix = clinicData.sku_prefix
      setClinicSettings(data)
    }
    if (cid) {
      const { data: clinic } = await supabase.from('clinics').select('plan, enabled_modules, primary_color').eq('id', cid).single()
      if (clinic?.plan) setClinicPlan(clinic.plan)
      if (clinic?.enabled_modules) setEnabledModules(clinic.enabled_modules)
      if (clinic?.primary_color) setPrimaryColor(clinic.primary_color)
    }
  }

  const PLAN_LIMITS = {
    basic:        { doctors: 0,        patients: 100,  modules: 0        },
    starter:      { doctors: 2,        patients: 100,  modules: 2        },
    gold:         { doctors: 10,       patients: 300,  modules: 4        },
    gold_plus:    { doctors: 20,       patients: 500,  modules: 6        },
    enterprise:   { doctors: 50,       patients: 1500, modules: 10       },
    enterprise_plus: { doctors: Infinity, patients: Infinity, modules: Infinity },
  }

  function checkLimit(type) {
    const limits = PLAN_LIMITS[clinicPlan] || PLAN_LIMITS.basic
    const planLabel = { basic:'Basic', starter:'Starter', gold:'Gold', gold_plus:'Gold+', enterprise:'Enterprise', enterprise_plus:'Enterprise+' }[clinicPlan]
    if (type === 'doctor') {
      const activeDoctors = doctors.filter(d => d.role === 'doctor').length
      if (activeDoctors >= limits.doctors) {
        alert(`Tu plan ${planLabel} permite un máximo de ${limits.doctors} médico${limits.doctors!==1?'s':''}. Para agregar más, actualizá tu plan.`)
        return false
      }
    }
    if (type === 'patient') {
      if (patients.length >= limits.patients) {
        alert(`Tu plan ${planLabel} permite un máximo de ${limits.patients} pacientes. Para agregar más, actualizá tu plan.`)
        return false
      }
    }
    if (type === 'module') {
      if (limits.modules !== Infinity) {
        alert(`Tu plan ${planLabel} permite un máximo de ${limits.modules} módulo${limits.modules!==1?'s':''}. Para agregar más, actualizá tu plan.`)
        return false
      }
    }
    return true
  }

  async function saveClinicSettings() {
    if (!clinicSettings) return
    setSavingSettings(true)
    if (clinicSettings.sku_prefix) {
      await supabase.from('clinics').update({ sku_prefix: clinicSettings.sku_prefix.toUpperCase().slice(0,5) }).eq('id', effectiveClinicId)
    }
    await supabase.from('clinic_settings').update({
      clinic_name: clinicSettings.clinic_name,
      whatsapp: clinicSettings.whatsapp,
      email: clinicSettings.email,
      province: clinicSettings.province,
      canton: clinicSettings.canton,
      district: clinicSettings.district,
      address: clinicSettings.address,
      office_number: clinicSettings.office_number,
    }).eq('id', clinicSettings.id)
    setSavingSettings(false)
    alert('Configuración guardada correctamente')
  }

  async function loadAllGoals() {
    const { data } = await supabase.from('goals').select('patient_id, is_active, target_value, initial_value')
    setAllGoals(data || [])
  }

  async function loadAllDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses').select('cie10_code, cie10_description, patient_id').eq('is_active', true)
    setAllDiagnoses(data || [])
  }

  async function saveDoctor(form) {
    setSaving(true)
    const d = modalData.doctor
    await supabase.from('profiles').update({
      prefix:       form.prefix      || null,
      first_name:   form.firstName   || null,
      last_name:    form.lastName    || null,
      medical_code: form.medicalCode || null,
      specialty:    form.specialty   || null,
      sex:          form.sex         || null,
      id_number:    form.idNumber    || null,
      phone:        form.phone       || null,
      province:     form.province    || null,
      canton:       form.canton      || null,
    }).eq('id', d.id)
    await loadDoctors()
    setModal(null)
    setSaving(false)
  }

  async function loadBranches() {
    if (!effectiveClinicId) return
    const { data } = await supabase.from('branches').select('*').eq('clinic_id', effectiveClinicId).order('name')
    setBranches(data || [])
  }

  async function loadDoctors() {
    // Cargar desde membresías
    const { data: memberships } = await supabase
      .from('professional_clinic_memberships')
      .select('profile:profile_id(*)')
      .eq('clinic_id', effectiveClinicId)
      .eq('is_active', true)
    
    // Cargar perfiles directos por clinic_id (personal sin membresía explícita)
    const { data: directProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin','doctor','clinic_admin','branch_admin','receptionist'])
      .eq('is_active', true)
      .eq('clinic_id', effectiveClinicId)
      .order('first_name')

    const fromMemberships = (memberships || []).map(m => m.profile).filter(Boolean)
    const membershipIds = new Set(fromMemberships.map(p => p?.id))
    const fromDirect = (directProfiles || []).filter(p => !membershipIds.has(p.id))
    const combined = [...fromMemberships, ...fromDirect].sort((a,b) => (a.first_name||'').localeCompare(b.first_name||''))
    setDoctors(combined)
  }

  async function loadInactivePatients() {
    const { data } = await supabase.from('patients')
      .select('id, status, id_number, profile:profile_id(id, first_name, last_name, email, is_active)')
      .eq('clinic_id', effectiveClinicId)
      .eq('status', 'inactive')
      .order('created_at', { ascending: false })
    setInactivePatients(data || [])
  }

  async function reactivatePatient(p) {
    await supabase.from('patients').update({ status: 'active' }).eq('id', p.id)
    await supabase.from('profiles').update({ is_active: true }).eq('id', p.profile?.id)
    await loadInactivePatients()
    await loadPatients()
  }

  async function loadPatients(branchId) {
    let query = supabase.from('patients').select('id, status, specialty_type, birth_date, sex, province, canton, id_number, phone, height_cm, clinic_id, profile:profile_id(id, first_name, last_name, email, role), doctor:assigned_doctor_id(id, first_name, last_name)').eq('clinic_id', effectiveClinicId).neq('status', 'inactive').order('created_at', { ascending: false })
    if (branchId) query = query.eq('branch_id', branchId)
    const { data } = await query
    const loadedPatients = data || []
    setPatients(loadedPatients)
    // Restaurar paciente seleccionado si venimos de un refresh
    const savedId = localStorage.getItem('adminSelPatientId')
    const savedView = localStorage.getItem('adminView')
    console.log('Restaurando — savedId:', savedId, 'savedView:', savedView, 'patients:', loadedPatients.length)
    if (savedId && savedView === 'perfil-paciente') {
      const p = loadedPatients.find(x => x.id === savedId)
      console.log('Paciente encontrado:', p?.id)
      if (p) setSelPatient(p)
      else { localStorage.removeItem('adminSelPatientId'); setViewPersist('calendario') }
    }
  }

  async function loadAvailability() {
    const { data } = await supabase.from('doctor_availability').select('*, doctor:doctor_id(id, first_name, last_name, prefix, sex)').eq('clinic_id', effectiveClinicId).eq('is_active', true)
    setAvailability(data || [])
  }

  async function saveAvailability() {
    const doctorId = profile?.role === 'doctor' ? profile.id : availForm.doctor_id
    if (!doctorId || !availForm.start_time || !availForm.end_time) { alert('Complete todos los campos obligatorios'); return }
    if (availForm.repeat_type === 'weekly' && (!availForm.days_of_week || availForm.days_of_week.length === 0)) { alert('Seleccioná al menos un día de la semana'); return }
    const payload = {
      clinic_id: effectiveClinicId,
      doctor_id: doctorId,
      start_time: availForm.start_time,
      end_time: availForm.end_time,
      repeat_type: availForm.repeat_type,
      days_of_week: availForm.repeat_type === 'weekly' ? availForm.days_of_week : null,
      day_of_week: null,
      specific_date: availForm.repeat_type === 'once' ? availForm.start_date : null,
      repeat_until: availForm.end_type === 'date' ? availForm.repeat_until : null,
      branch_id: isClinicAdmin ? (availForm.branch_id || null) : (myBranchId || null),
      created_by: profile.id,
      is_active: true,
    }
    if (availForm.id) {
      await supabase.from('doctor_availability').update(payload).eq('id', availForm.id)
    } else {
      await supabase.from('doctor_availability').insert(payload)
    }
    await loadAvailability()
    setModal(null)
    setAvailForm({ doctor_id:'', branch_id:'', start_time:'08:00', end_time:'17:00', repeat_type:'weekly', days_of_week:[], start_date:'', end_type:'indefinite', repeat_until:'' })
  }

  async function deleteAvailability(id) {
    if (!window.confirm('¿Eliminar esta disponibilidad?')) return
    await supabase.from('doctor_availability').update({ is_active: false }).eq('id', id)
    await loadAvailability()
  }

  function getDayAvailability(dateStr) {
    const date = new Date(dateStr + 'T12:00:00')
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1
    const isWeekday = dayOfWeek >= 0 && dayOfWeek <= 4
    return availability.filter(a => {
      if (a.repeat_until && dateStr > a.repeat_until) return false
      if (a.repeat_type === 'weekly') {
        const days = a.days_of_week || (a.day_of_week != null ? [a.day_of_week] : [])
        return days.includes(dayOfWeek)
      }
      if (a.repeat_type === 'daily') return true
      if (a.repeat_type === 'weekdays') return isWeekday
      if (a.repeat_type === 'once' && a.specific_date === dateStr) return true
      return false
    })
  }

  async function createApptTag({ name, color }) {
    const { data } = await supabase.from('appointment_tags').insert({ clinic_id: effectiveClinicId, name, color }).select().single()
    await loadApptTags()
    return { data }
  }

  async function deleteApptTag(id) {
    await supabase.from('appointment_tags').delete().eq('id', id)
    await loadApptTags()
  }

  async function saveBlock() {
    if (!blockForm.date || !blockForm.start_time || !blockForm.end_time) { alert('Completá fecha y horario'); return }
    const [sh, sm] = blockForm.start_time.split(':').map(Number)
    const [eh, em] = blockForm.end_time.split(':').map(Number)
    const duration = (eh * 60 + em) - (sh * 60 + sm)
    const endDate = blockForm.end_date || blockForm.date
    const dates = []
    let cur = new Date(blockForm.date + 'T12:00:00')
    const end = new Date(endDate + 'T12:00:00')
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
    await supabase.from('appointments').insert(dates.map(d => ({
      clinic_id: effectiveClinicId,
      doctor_id: blockForm.doctor_id || null,
      appointment_date: d,
      appointment_time: blockForm.start_time,
      duration_min: duration,
      visit_type: 'bloqueo',
      status: 'blocked',
      notes: blockForm.reason || 'Agenda bloqueada',
      created_by: profile.id,
    })))
    await loadAppts()
    setModal(null)
    setBlockForm({ doctor_id:'', date:'', end_date:'', start_time:'', end_time:'', reason:'' })
  }

  async function moveAppt(apptId, newDate, newHour) {
    const timeStr = String(newHour).padStart(2,'0') + ':00'
    await supabase.from('appointments').update({ appointment_date: newDate, appointment_time: timeStr }).eq('id', apptId)
    await loadAppts()
  }

  async function loadAppts(branchId) {
    let query = supabase.from('appointments').select('*, patient:patient_id(id, phone, profile:profile_id(first_name, last_name, email)), doctor:doctor_id(id, first_name, last_name), tags:appointment_tag_links(tag:tag_id(id, name, color))').order('appointment_date').order('appointment_time')
    if (branchId) query = query.eq('branch_id', branchId)
    const { data } = await query
    setAppts(data || [])
  }

  async function loadApptTags() {
    const { data } = await supabase.from('appointment_tags').select('*').eq('clinic_id', effectiveClinicId).order('name')
    setApptTags(data || [])
  }

  async function loadMsgs() {
    const { data } = await supabase.from('messages').select('*, patient:patient_id(id, profile:profile_id(first_name, last_name)), sender:sender_id(first_name, last_name)').order('created_at', { ascending: false })
    setMsgs(data || [])
  }

  async function loadLibrary() {
    const { data } = await supabase.from('library_items').select('*').order('name')
    setLibrary(data || [])
  }

  async function loadPerms() {
    const { data } = await supabase.from('doctor_permissions').select('*, doctor:doctor_id(first_name, last_name)')
    setPerms(data || [])
  }

  function age(dob) {
    if (!dob) return '--'
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25))
  }

  function pName(p) { return ((p.profile?.first_name || '') + SP + (p.profile?.last_name || '')).trim() }
  function dName(d) { return d ? ((d.first_name || '') + SP + (d.last_name || '')).trim() : '--' }
  function initials(name) { return name.split(SP).map(n => n[0] || '').join('').substring(0,2).toUpperCase() }

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DAYS = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom']
  const DAYS_FULL = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado']

  async function handleSignOut() { await signOut(); navigate('/login') }

  async function createUser(form, roleInput) {
    // Si la profesión es Recepcionista, asignar rol receptionist
    const role = roleInput === 'doctor' && form.profession === 'Recepcionista' ? 'receptionist' : roleInput
    setSaving(true); setFormError('')

    // Guardar sesión actual para restaurarla después
    window.__skipAuthChange = true
    const { data: { session: currentSession } } = await supabase.auth.getSession()

    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase() + '!1'
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email, password: tempPassword,
      options: { data: {
        first_name: form.firstName, last_name: form.lastName, role,
        id_number:  form.idNumber  || '',
        phone:      form.phone     || '',
        birth_date: form.birthDate || '',
        sex:        form.sex       || '',
        province:   form.province  || '',
        canton:     form.canton    || '',
        height_cm:  form.height    ? String(form.height) : '',
      }}
    })
    if (error) {
      const msg = error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already exists') || error.message?.toLowerCase().includes('duplicate')
        ? 'Este correo electrónico ya está registrado en el sistema.'
        : error.message
      setFormError(msg); setSaving(false); return
    }
    const userId = signUpData?.user?.id

    if (role === 'patient' && userId) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500))
        const { data } = await supabase.from('patients').select('id').eq('profile_id', userId).single()
        if (data?.id) break
      }
      await supabase.from('patients').update({
        assigned_doctor_id: form.doctorId || null,
        clinic_id: effectiveClinicId || null,
      }).eq('profile_id', userId)
      await supabase.from('profiles').update({
        clinic_id: effectiveClinicId || null,
      }).eq('id', userId)
    }

    // Abrir modal de módulos ANTES de restaurar sesión
    let newPatientDbId = null
    if (role === 'patient' && userId) {
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 400))
        const { data: np } = await supabase.from('patients').select('id').eq('profile_id', userId).single()
        if (np?.id) { newPatientDbId = np.id; break }
      }
    }

    // Restaurar sesión del admin
    if (currentSession) {
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      })
    }
    window.__skipAuthChange = false
    // Para doctor, guardar campos extra en profiles
    if (role === 'doctor' && userId) {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500))
        const { data } = await supabase.from('profiles').select('id').eq('id', userId).single()
        if (data?.id) break
      }
      await supabase.from('profiles').update({
        specialty:    form.specialty    || null,
        medical_code: form.medicalCode  || null,
        sex:          form.sex          || null,
        id_number:    form.idNumber     || null,
        phone:        form.phone        || null,
        province:     form.province     || null,
        canton:       form.canton       || null,
        clinic_id:    effectiveClinicId || null,
        prefix:       form.prefix       || null,
        profession:   form.profession   || null,
      }).eq('id', userId)
    }

    // Enviar correo de bienvenida al nuevo doctor/staff/recepcionista
    if ((role === 'doctor' || role === 'receptionist') && form.email) {
      const { data: cs } = await supabase.from('clinic_settings').select('clinic_name').limit(1).single()
      await supabase.functions.invoke('staff-welcome', {
        body: {
          staff_email: form.email,
          staff_name: `${form.firstName} ${form.lastName}`,
          staff_role: role,
          clinic_name: cs?.clinic_name || 'la clínica',
          app_url: 'https://medtrackcr.com',
        }
      })
    }
    if (role === 'doctor' || role === 'receptionist') {
      await supabase.from('profiles').update({ clinic_id: effectiveClinicId || null }).eq('id', userId)
      await loadDoctors(); setModal(null)
    }
    else if (role === 'patient') {
      await loadPatients()
      setSelPatient(null)
      setViewPersist('pacientes')
      if (newPatientDbId) { setModal(null) } else { setModal(null) }
    } else {
      if (userId) await supabase.from('profiles').update({ clinic_id: effectiveClinicId || null }).eq('id', userId)
      await loadDoctors(); setModal(null)
    }
    setSaving(false); setSelPatient(null)
  }

  async function saveEditPatient(form) {
    setSaving(true)
    const profileId = editPatientForm.profileId
    const patientId = editPatientForm.patientId
    if (!profileId || !patientId) { alert('Error: IDs no encontrados'); setSaving(false); return }
    const { error: e1 } = await supabase.from('profiles').update({
      first_name: form.firstName, last_name: form.lastName, email: form.email || undefined,
    }).eq('id', profileId)
    if (e1) { alert('Error perfil: ' + e1.message); setSaving(false); return }
    const { data: patData, error: e2 } = await supabase.from('patients').update({
      id_number: form.idNumber || null,
      phone: form.phone || null,
      birth_date: form.birthDate || null,
      sex: form.sex || null,
      province: form.province || null,
      canton: form.canton || null,
      height_cm: form.height ? parseInt(form.height) : null,
    }).eq('id', patientId).select()
    if (e2) { alert('Error paciente: ' + e2.message); setSaving(false); return }
    if (!patData || patData.length === 0) { alert('RLS bloqueó el update — sin permiso'); setSaving(false); return }
    await loadPatients(); setModal(null); setSaving(false)
  }

  async function reassignPatient(patientId, doctorId) {
    setSaving(true)
    await supabase.from('patients').update({ assigned_doctor_id: doctorId || null }).eq('id', patientId)
    await loadPatients(); setModal(null); setSaving(false)
  }

  async function deleteRecord(type, id) {
    if (type === 'appointment') { await supabase.from('appointments').delete().eq('id', id); await loadAppts() }
    if (type === 'library') { await supabase.from('library_items').delete().eq('id', id); await loadLibrary() }
    if (type === 'patient') { await supabase.from('profiles').update({ is_active: false }).eq('id', id); await supabase.from('patients').update({ status: 'inactive' }).eq('id', id); await loadPatients() }
    if (type === 'note') { await supabase.from('clinical_notes').delete().eq('id', id); if (selPatient) { const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false }); setNotes(data || []) } }
    if (type === 'doctor') {
      await supabase.functions.invoke('delete-user', { body: { user_id: id } })
      await loadDoctors()
    }
    setModal(null)
  }

  async function openDeleteDoctor(doctor) {
    setModal('confirm-delete')
    setModalData({ type:'doctor', id: doctor.id, name: doctor.first_name + SP + doctor.last_name })
  }
  async function updateApptStatus(id, status, appt = null) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    await loadAppts()

    // Si es no_show, disparar correo al paciente
    if (status === 'no_show' && appt) {
      const patient = patients.find(p => p.id === appt.patient_id)
      const doctor = doctors.find(d => d.id === appt.doctor_id)
      if (patient?.profile?.email) {
        await supabase.functions.invoke('appointment-noshow', {
          body: {
            patient_email: patient.profile.email,
            patient_name: `${patient.profile.first_name} ${patient.profile.last_name}`,
            doctor_name: `Dr. ${doctor?.first_name} ${doctor?.last_name}`,
            appointment_date: appt.appointment_date,
            appointment_time: appt.appointment_time,
          }
        })
      }
    }
  }

  async function saveAppt(form, selectedTags = []) {
    const payload = { patient_id: form.patientId, doctor_id: form.doctorId, appointment_date: form.date, appointment_time: form.time, visit_type: form.visitType, duration_min: parseInt(form.duration), notes: form.notes, status: form.status || 'pending_confirmation', module_type: form.moduleType || null, created_by: profile?.id, clinic_id: effectiveClinicId }
    const prevAppt = form.id ? appts.find(a => a.id === form.id) : null
    const prevStatus = prevAppt?.status || null
    if (form.id) {
      await supabase.from('appointments').update(payload).eq('id', form.id)
      const patient = patients.find(p => p.id === form.patientId)
      const doctor = doctors.find(d => d.id === form.doctorId)
      // Si cambió fecha, hora o doctor → correo de reagendamiento
      const wasRescheduled = prevAppt && (
        prevAppt.appointment_date !== form.date ||
        prevAppt.appointment_time?.substring(0,5) !== form.time?.substring(0,5) ||
        prevAppt.doctor_id !== form.doctorId
      )
      if (wasRescheduled) {
        let reschedEmail = patient?.profile?.email
        let reschedName = `${patient?.profile?.first_name||''} ${patient?.profile?.last_name||''}`.trim()
        if (!reschedEmail) {
          const { data: pr } = await supabase.from('patients').select('profile:profile_id(first_name, last_name, email)').eq('id', form.patientId).single()
          reschedEmail = pr?.profile?.email
          reschedName = `${pr?.profile?.first_name||''} ${pr?.profile?.last_name||''}`.trim()
        }
        if (reschedEmail) {
          await supabase.functions.invoke('appointment-rescheduled', {
            body: {
              patient_email: reschedEmail,
              patient_name: reschedName,
              doctor_name: `Dr. ${doctor?.first_name} ${doctor?.last_name}`,
              appointment_date: form.date,
              appointment_time: form.time,
              clinic_id: effectiveClinicId,
            }
          })
        }
      }
      // Si cambió a no_show, disparar correo
      if (form.status === 'no_show' && prevStatus !== 'no_show') {
        if (patient?.profile?.email) {
          await supabase.functions.invoke('appointment-noshow', {
            body: {
              patient_email: patient.profile.email,
              patient_name: `${patient.profile.first_name} ${patient.profile.last_name}`,
              doctor_name: `Dr. ${doctor?.first_name} ${doctor?.last_name}`,
              clinic_id: effectiveClinicId,
              appointment_date: form.date,
              appointment_time: form.time,
            }
          })
        }
      }
    } else {
      await supabase.from('appointments').insert(payload)
      // Enviar correo de confirmación al paciente
      const patient = patients.find(p => p.id === form.patientId)
      const doctor = doctors.find(d => d.id === form.doctorId)
      let patientEmail = patient?.profile?.email
      let patientName = `${patient?.profile?.first_name||''} ${patient?.profile?.last_name||''}`
      if (!patientEmail) {
        const { data: pr } = await supabase.from('patients').select('profile:profile_id(first_name, last_name, email)').eq('id', form.patientId).single()
        patientEmail = pr?.profile?.email
        patientName = `${pr?.profile?.first_name||''} ${pr?.profile?.last_name||''}`
      }
      if (patientEmail) {
        await supabase.functions.invoke('appointment-confirmation', {
          body: {
            patient_email: patientEmail,
            patient_name: patientName,
            doctor_name: `Dr. ${doctor?.first_name} ${doctor?.last_name}`,
            appointment_date: form.date,
            appointment_time: form.time,
          }
        })
      }
    }
    // Guardar etiquetas
    if (form.id) {
      await supabase.from('appointment_tag_links').delete().eq('appointment_id', form.id)
    } else {
      const { data: newAppt } = await supabase.from('appointments').select('id').eq('clinic_id', effectiveClinicId).order('created_at', { ascending: false }).limit(1).single()
      if (newAppt?.id && selectedTags.length > 0) {
        await supabase.from('appointment_tag_links').insert(selectedTags.map(tagId => ({ appointment_id: newAppt.id, tag_id: tagId })))
      }
    }
    if (form.id && selectedTags.length > 0) {
      await supabase.from('appointment_tag_links').insert(selectedTags.map(tagId => ({ appointment_id: form.id, tag_id: tagId })))
    }
    await loadAppts(); setModal(null); setSaving(false)
  }

  async function addLibraryItem(form) {
    setSaving(true)
    await supabase.from('library_items').insert({ type: form.type, name: form.name, category: form.category || null, is_global: true, created_by: profile?.id, clinic_id: effectiveClinicId })
    await loadLibrary(); setModal(null); setSaving(false)
  }

  async function savePerm(doctorId, field, value) {
    await supabase.from('doctor_permissions').update({ [field]: value }).eq('doctor_id', doctorId)
    await loadPerms()
  }

  async function openChat(c) {
    setActiveChat(c)
    const unreadIds = c.msgs.filter(m => !m.is_read && m.sender_role === 'patient').map(m => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
      await loadMsgs()
    }
  }

  async function deleteChat(patientId) {
    if (!window.confirm('¿Eliminar toda la conversación con este paciente?')) return
    await supabase.from('messages').delete().eq('patient_id', patientId)
    setActiveChat(null)
    await loadMsgs()
  }

  async function sendMessage() {
    if (!chatMsg.trim() || !activeChat) return
    await supabase.from('messages').insert({ patient_id: activeChat.patientId, sender_id: profile?.id, content: chatMsg.trim(), sender_role: 'doctor', is_read: false })
    setChatMsg(''); await loadMsgs()
  }

  function apptsByDate(dateStr) {
    return appts.filter(a => a.appointment_date === dateStr && a.status !== 'cancelled' && (!selBranch || a.branch_id === selBranch) && (!filterDoctorId || a.doctor_id === filterDoctorId)).sort((a,b) => a.appointment_time.localeCompare(b.appointment_time))
  }

  function doctorColor(doctorId) {
    const doctor = doctors.find(d => d.id === doctorId)
    if (doctor?.calendar_color) return doctor.calendar_color
    const colors = ['#0F6E56','#1a5c8a','#8e44ad','#e67e22','#c0392b','#2980b9','#16a085','#d35400']
    const idx = doctors.findIndex(d => d.id === doctorId)
    return colors[idx % colors.length] || '#1D9E75'
  }

  async function updateDoctorColor(doctorId, color) {
    await supabase.from('profiles').update({ calendar_color: color }).eq('id', doctorId)
    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, calendar_color: color } : d))
  }

  function renderCalendar() {
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0')
    const firstDay = (new Date(calYear, calMonth, 1).getDay() + 6) % 7
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate()
    const daysInPrev = new Date(calYear, calMonth, 0).getDate()
    const cells = []
    for (let i = firstDay-1; i >= 0; i--) cells.push({ day: daysInPrev-i, current: false, dateStr: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0')
      cells.push({ day: d, current: true, dateStr, isToday: dateStr === todayStr, isSelected: dateStr === selDate })
    }
    const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
    for (let i = 1; i <= rem; i++) cells.push({ day: i, current: false, dateStr: null })
    return cells
  }

  function pendingChats() {
    const byPatient = {}
    msgs.forEach(m => {
      if (!byPatient[m.patient_id]) byPatient[m.patient_id] = { patientId: m.patient_id, name: pName(m.patient || {}), msgs: [] }
      byPatient[m.patient_id].msgs.push(m)
    })
    return Object.values(byPatient)
  }

  const pendingCount = msgs.filter(m => !m.is_read && m.sender_role === 'patient').length

  async function openPatient(p) {
    setSelPatient(p)
    setView('perfil-paciente')
    window.history.pushState({view:'perfil-paciente', patientId:p.id}, '', `/admin/pacientes/${p.id}`)
    const pid = p.id
    const [m, g, t, tr, n] = await Promise.all([
      supabase.from('measurements').select('*').eq('patient_id', pid).order('measured_at', { ascending: false }),
      supabase.from('goals').select('*').eq('patient_id', pid).eq('is_active', true),
      supabase.from('tasks').select('*').eq('patient_id', pid).order('created_at', { ascending: false }),
      supabase.from('treatments').select('*').eq('patient_id', pid).order('appointment_date', { ascending: false }),
      supabase.from('clinical_notes').select('*').eq('patient_id', pid).order('note_date', { ascending: false }),
    ])
    setMeasurements(m.data || [])
    setGoals(g.data || [])
    setPatientTasks(t.data || [])
    setTreatments(tr.data || [])
    setNotes(n.data || [])
    await loadDiagnoses(pid)
  }

  async function adminSaveMeasurement(form) {
    setSaving(true)
    await supabase.from('measurements').insert({
      patient_id: selPatient.id, recorded_by: profile?.id,
      measured_at: form.date, weight_kg: form.weight || null,
      body_fat_pct: form.fat || null, muscle_mass_kg: form.muscle || null,
      visceral_fat_pts: form.visceral || null
    })
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', selPatient.id).order('measured_at', { ascending: false })
    setMeasurements(data || [])
    setModal(null); setSaving(false)
  }

  async function adminDeleteMeasurement(id) {
    await supabase.from('measurements').delete().eq('id', id)
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', selPatient.id).order('measured_at', { ascending: false })
    setMeasurements(data || [])
  }

  async function adminEditMeasurement(id, form) {
    setSaving(true)
    await supabase.from('measurements').update({
      measured_at: form.date, weight_kg: form.weight || null,
      body_fat_pct: form.fat || null, muscle_mass_kg: form.muscle || null,
      visceral_fat_pts: form.visceral || null
    }).eq('id', id)
    const { data } = await supabase.from('measurements').select('*').eq('patient_id', selPatient.id).order('measured_at', { ascending: false })
    setMeasurements(data || [])
    setModal(null); setSaving(false)
  }

  async function adminSaveGoal(form) {
    setSaving(true)
    await supabase.from('goals').insert({
      patient_id: selPatient.id, created_by: profile?.id,
      name: form.name, initial_value: form.initial || null,
      target_value: form.target || null, deadline: form.deadline || null
    })
    const { data } = await supabase.from('goals').select('*').eq('patient_id', selPatient.id).eq('is_active', true)
    setGoals(data || [])
    setModal(null); setSaving(false)
  }

  async function adminDeleteGoal(id) {
    await supabase.from('goals').update({ is_active: false }).eq('id', id)
    const { data } = await supabase.from('goals').select('*').eq('patient_id', selPatient.id).eq('is_active', true)
    setGoals(data || [])
  }

  async function adminAssignTasks(selectedTasks) {
    setSaving(true)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const inserts = selectedTasks.map(desc => ({
      patient_id: selPatient.id, assigned_by: profile?.id,
      description: desc, week_start: weekStart.toISOString().split('T')[0]
    }))
    await supabase.from('tasks').insert(inserts)
    const { data } = await supabase.from('tasks').select('*').eq('patient_id', selPatient.id).order('created_at', { ascending: false })
    setPatientTasks(data || [])
    setModal(null); setSaving(false)
  }

  async function adminDeleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    const { data } = await supabase.from('tasks').select('*').eq('patient_id', selPatient.id).order('created_at', { ascending: false })
    setPatientTasks(data || [])
  }

  async function adminSaveTreatment(form) {
    setSaving(true)
    await supabase.from('treatments').insert({
      patient_id: selPatient.id, registered_by: profile?.id,
      product_name: form.product, dose: form.dose || null,
      zone: form.zone || null, session_label: form.session || null,
      appointment_date: form.date || null, notes: form.notes || null
    })
    const { data } = await supabase.from('treatments').select('*').eq('patient_id', selPatient.id).order('appointment_date', { ascending: false })
    setTreatments(data || [])
    setModal(null); setSaving(false)
  }

  async function loadDiagnoses(patientId) {
    const { data } = await supabase.from('patient_diagnoses').select('*').eq('patient_id', patientId).eq('is_active', true).order('diagnosis_date', { ascending: false })
    setDiagnoses(data || [])
  }

  async function searchCie10(term) {
    if (!term || term.length < 2) { setCie10Results([]); return }
    const { data } = await supabase.from('cie10').select('code, description').or(`code.ilike.%${term}%,description.ilike.%${term}%`).limit(10)
    setCie10Results(data || [])
  }

  async function adminAddDiagnosis(code, description) {
    await supabase.from('patient_diagnoses').insert({
      patient_id: selPatient.id, cie10_code: code, cie10_description: description,
      diagnosed_by: profile?.id, diagnosis_date: new Date().toISOString().split('T')[0]
    })
    await loadDiagnoses(selPatient.id)
    setCie10Search(''); setCie10Results([])
  }

  async function adminDeleteDiagnosis(id) {
    await supabase.from('patient_diagnoses').update({ is_active: false }).eq('id', id)
    await loadDiagnoses(selPatient.id)
  }

  async function adminDeleteNote(id) {
    await supabase.from('clinical_notes').delete().eq('id', id)
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false })
    setNotes(data || [])
    setModal(null)
  }

  async function adminEditNote(id, form) {
    setSaving(true)
    await supabase.from('clinical_notes').update({
      note_date: form.date, visit_type: form.visitType, content: form.content,
      pas: form.pas || null, pad: form.pad || null, pam: form.pam || null,
      spo2: form.spo2 || null, o2_device: form.o2device || 'aa',
      o2_flow: form.o2flow || null, glucose: form.glucose || null,
      heart_rate: form.hr || null
    }).eq('id', id)
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false })
    setNotes(data || [])
    setModal(null); setSaving(false)
  }

  async function adminSaveNote(form) {
    setSaving(true)
    await supabase.from('clinical_notes').insert({
      patient_id: selPatient.id, author_id: profile?.id,
      note_date: form.date, visit_type: form.visitType, content: form.content,
      pas: form.pas || null, pad: form.pad || null, pam: form.pam || null,
      spo2: form.spo2 || null, o2_device: form.o2device || 'aa',
      o2_flow: form.o2flow || null, glucose: form.glucose || null,
      heart_rate: form.hr || null
    })
    const { data } = await supabase.from('clinical_notes').select('*').eq('patient_id', selPatient.id).order('note_date', { ascending: false })
    setNotes(data || [])
    setModal(null); setSaving(false)
  }

  function openDelete(type, id, name) {
    setModal('confirm-delete')
    setModalData({ type, id, name })
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:13, color:G, fontFamily:'system-ui' }}>Cargando MedTrack...</div>

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"Inter, system-ui, sans-serif", background:'#f5f5f5' }}>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ width:420, background:'#fff', borderRadius:16, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            {modal === 'confirm-delete' && (
              <>
                <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Eliminar {modalData.type === 'patient' ? 'paciente' : modalData.type === 'doctor' ? 'medico' : modalData.type === 'appointment' ? 'cita' : modalData.type === 'note' ? 'nota clinica' : modalData.type === 'library' ? 'item' : modalData.type}</div>
                <p style={{ fontSize:13, color:'#666', marginBottom:18, lineHeight:1.6 }}>Se eliminara permanentemente <strong>"{modalData.name}"</strong>. Esta accion no se puede deshacer.</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={s.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
                  <button style={{ flex:1, padding:8, fontSize:13, fontWeight:500, background:'#D85A30', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', opacity:saving?0.7:1 }}
                    disabled={saving} onClick={() => deleteRecord(modalData.type, modalData.id)}>
                    {saving ? 'Eliminando...' : 'Si, eliminar'}
                  </button>
                </div>
              </>
            )}
            {modal === 'confirm-delete-doctor-blocked' && (
              <>
                <div style={{ fontSize:15, fontWeight:600, color:'#D85A30', marginBottom:12 }}>⚠️ No se puede eliminar este médico</div>
                <p style={{ fontSize:13, color:'#666', marginBottom:8, lineHeight:1.6 }}>
                  <strong>{modalData.doctor?.first_name} {modalData.doctor?.last_name}</strong> tiene <strong>{modalData.modCount} paciente{modalData.modCount !== 1 ? 's' : ''}</strong> asignado{modalData.modCount !== 1 ? 's' : ''} en módulos activos.
                </p>
                <p style={{ fontSize:13, color:'#666', marginBottom:18, lineHeight:1.6 }}>
                  Antes de eliminar este perfil, asegurate de reasignar o desactivar los módulos médicos en los que está asignado.
                </p>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center' }} onClick={() => setModal(null)}>Entendido</button>
                </div>
              </>
            )}
            {modal === 'edit-doctor' && modalData?.doctor && (
            <EditDoctorForm
              doctor={modalData.doctor}
              saving={saving}
              onSave={saveDoctor}
              onClose={() => setModal(null)}
            />
          )}

          {(modal === 'new-doctor' || modal === 'new-patient') && (
              <NewUserForm
                type={modal === 'new-doctor' ? 'doctor' : 'patient'}
                doctors={doctors} saving={saving} error={formError}
                onSave={form => createUser(form, modal === 'new-doctor' ? 'doctor' : 'patient')}
                onClose={() => setModal(null)} />
            )}
            {modal === 'assign' && (
              <AssignForm patient={modalData.patient} doctors={doctors} saving={saving}
                onSave={docId => reassignPatient(modalData.patient.id, docId)}
                onClose={() => setModal(null)} />
            )}
            {modal === 'edit-patient' && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={() => setModal(null)}>
                <div style={{ background:'#fff', borderRadius:14, padding:28, width:520, maxWidth:'95vw', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
                  <NewUserForm
                    type="patient"
                    doctors={doctors}
                    saving={saving}
                    error={formError}
                    initialData={editPatientForm}
                    onSave={saveEditPatient}
                    onClose={() => setModal(null)}
                  />
                </div>
              </div>
            )}
            {modal === 'branch' && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={() => setModal(null)}>
                <div style={{ background:'#fff', borderRadius:14, padding:28, width:480, maxWidth:'95vw', boxShadow:'0 8px 32px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize:16, fontWeight:600, color:'#1a3a5c', marginBottom:20 }}>{branchForm.id ? 'Editar sucursal' : 'Nueva sucursal'}</div>
                  <div style={{ marginBottom:14 }}>
                    <label style={s.fieldLabel}>Nombre</label>
                    <input value={branchForm.name||''} onChange={e => setBranchForm(p=>({...p, name:e.target.value}))} style={s.fieldInput} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                    <div><label style={s.fieldLabel}>Provincia</label><input value={branchForm.province||''} onChange={e => setBranchForm(p=>({...p, province:e.target.value}))} style={s.fieldInput} /></div>
                    <div><label style={s.fieldLabel}>Cantón</label><input value={branchForm.canton||''} onChange={e => setBranchForm(p=>({...p, canton:e.target.value}))} style={s.fieldInput} /></div>
                    <div><label style={s.fieldLabel}>Distrito</label><input value={branchForm.district||''} onChange={e => setBranchForm(p=>({...p, district:e.target.value}))} style={s.fieldInput} /></div>
                    <div><label style={s.fieldLabel}>Dirección</label><input value={branchForm.address||''} onChange={e => setBranchForm(p=>({...p, address:e.target.value}))} style={s.fieldInput} /></div>
                  </div>
                  {branchForm.id && <div style={{ marginBottom:14 }}>
                    <label style={s.fieldLabel}>Estado</label>
                    <select value={branchForm.is_active?'true':'false'} onChange={e => setBranchForm(p=>({...p, is_active:e.target.value==='true'}))} style={s.fieldInput}>
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </select>
                  </div>}
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <button onClick={() => setModal(null)} style={{ ...s.btnEdit, flex:1, textAlign:'center' }}>Cancelar</button>
                    <button onClick={async () => {
                      setSaving(true)
                      if (branchForm.id) {
                        await supabase.from('branches').update({ name:branchForm.name, province:branchForm.province||null, canton:branchForm.canton||null, district:branchForm.district||null, address:branchForm.address||null, is_active:branchForm.is_active!==false }).eq('id', branchForm.id)
                      } else {
                        await supabase.from('branches').insert({ clinic_id:branchForm.clinic_id, name:branchForm.name, province:branchForm.province||null, canton:branchForm.canton||null, district:branchForm.district||null, address:branchForm.address||null, is_active:true })
                      }
                      await loadBranches(); setModal(null); setSaving(false)
                    }} disabled={saving||!branchForm.name} style={{ ...s.btnPrimary, flex:1, opacity:(saving||!branchForm.name)?0.7:1 }}>{saving?'Guardando...':'Guardar'}</button>
                  </div>
                </div>
              </div>
            )}
            {modal === 'new-branch-admin' && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }} onClick={() => setModal(null)}>
                <div style={{ background:'#fff', borderRadius:14, padding:28, width:520, maxWidth:'95vw', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
                  <NewUserForm
                    type="doctor"
                    doctors={doctors}
                    saving={saving}
                    error={formError}
                    onSave={form => createUser(form, 'branch_admin')}
                    onClose={() => setModal(null)}
                  />
                </div>
              </div>
            )}
            {(modal === 'new-appt' || modal === 'edit-appt') && (
              <ApptForm appt={modalData.appt} patients={patients} doctors={doctors}
                saving={saving} error={formError} defaultDate={selDate} defaultTime={modalData.defaultTime}
                onSave={saveAppt} onClose={() => setModal(null)} tags={apptTags} onCreateTag={createApptTag} onDeleteTag={deleteApptTag}
                onCancelAppt={async (id) => {
                  if (!window.confirm('¿Estás seguro que querés cancelar esta cita?')) return
                  await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
                  await loadAppts(); setModal(null)
                }}
                onGoToExpediente={(appt) => {
                  const p = patients.find(p => p.id === appt.patient_id)
                  if (p) {
                    setModal(null)
                    setExpedienteInitialTab('preconsulta'); openPatient(p)
                    setPatientTab(appt.module_type ? 'modulo_' + appt.module_type : 'modulos')
                  }
                }} />
            )}
            {modal === 'new-library' && (
              <LibraryForm saving={saving} onSave={addLibraryItem} onClose={() => setModal(null)} />
            )}
          </div>
        </div>
      )}

      {!isMobile && <div style={{ width: sidebarCollapsed ? 52 : 210, minWidth: sidebarCollapsed ? 52 : 210, background:primaryColor, borderRight:`0.5px solid ${darken(primaryColor,0.15)}`, display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden', transition:'width 0.2s ease, min-width 0.2s ease' }}>
        <div style={{ padding:'10px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
          {!sidebarCollapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:6, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className="ti ti-heart-rate-monitor" style={{ color:'white', fontSize:15 }} aria-hidden="true"></i>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>MedTrack</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)' }}>{clinicSettings?.clinic_name || profile?.clinic_name || ''}</div>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div style={{ width:28, height:28, borderRadius:6, background:'var(--clinic-primary, #0F6E56)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="ti ti-heart-rate-monitor" style={{ color:'white', fontSize:15 }} aria-hidden="true"></i>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(p => !p)} style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb', padding:4, display:'flex', alignItems:'center', marginLeft: sidebarCollapsed ? 0 : 'auto' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              {sidebarCollapsed
                ? <path d="M5 3L9 7L5 11" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M9 3L5 7L9 11" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              }
            </svg>
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
        {[
          { section:'Clínica', items:[{ icon:'ti-calendar', label:'Calendario', key:'calendario', badge:appts.filter(a => a.status === 'scheduled' && a.appointment_date === new Date().toISOString().split('T')[0]).length }, ...(clinicPlan !== 'basic' ? [{ icon:'ti-chart-bar', label:'Reportes', key:'reportes' }] : []), ...(isClinicAdmin ? [{ icon:'ti-building', label:'Sucursales', key:'sucursales' }] : []), { icon:'ti-package', label:'Inventario', key:'inventario' }, { icon:'ti-ticket', label:'Tickets', key:'tickets' }] },
          { section:'Usuarios', items:[...(clinicPlan !== 'basic' ? [{ icon:'ti-users', label:'Personal', key:'medicos', badge:doctors.length }] : []), { icon:'ti-user-heart', label:'Pacientes', key:'pacientes', badge:patients.length }] },
          ...(clinicPlan !== 'basic' ? [{ section:'Sistema', items:[{ icon:'ti-books', label:'Biblioteca', key:'biblioteca' }, { icon:'ti-shield-check', label:'Permisos', key:'permisos' }, { icon:'ti-settings', label:'Configuración', key:'config' }] }] : [{ section:'Sistema', items:[{ icon:'ti-settings', label:'Configuración', key:'config' }] }]),
        ].map(group => (
          <div key={group.section}>
            {!sidebarCollapsed && <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:'0.07em', textTransform:'uppercase', padding:'10px 14px 3px' }}>{group.section}</div>}
            {group.items.map(item => (
              <div key={item.key} onClick={() => { setViewPersist(item.key); setShowDrawer(false) }} title={item.label}
                style={{ display:'flex', alignItems:'center', gap:8, padding: sidebarCollapsed ? '9px 0' : '7px 14px', cursor:'pointer', fontSize:13, background: view === item.key ? 'rgba(255,255,255,0.15)' : 'transparent', color: view === item.key ? '#fff' : 'rgba(255,255,255,0.75)', fontWeight: view === item.key ? 500 : 400, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', borderRadius:6, margin: sidebarCollapsed ? '1px 6px' : '1px 8px' }}>
                <i className={`ti ${item.icon}`} style={{ fontSize:16, color: view === item.key ? '#fff' : 'rgba(255,255,255,0.6)', flexShrink:0 }} aria-hidden="true"></i>
                {!sidebarCollapsed && item.label}
                {!sidebarCollapsed && item.badge > 0 && <span style={{ marginLeft:'auto', fontSize:11, background:'rgba(255,255,255,0.9)', color:'#085041', borderRadius:10, padding:'1px 6px', fontWeight:500 }}>{item.badge}</span>}
                {sidebarCollapsed && item.badge > 0 && <span style={{ position:'absolute', top:6, right:6, width:6, height:6, borderRadius:'50%', background:'var(--clinic-primary)' }} />}
              </div>
            ))}
          </div>
        ))}

        </div>
        <div style={{ marginTop:'auto', paddingBottom:8 }}>
          {!sidebarCollapsed && <UserMenu />}
          {sidebarCollapsed && (
            <div style={{ padding:'10px 0', borderTop:'0.5px solid rgba(255,255,255,0.15)', display:'flex', justifyContent:'center', position:'relative' }}>
              <div onClick={() => setCollapsedMenuOpen(p => !p)} title={`${profile?.first_name} ${profile?.last_name}`}
                style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.2)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, cursor:'pointer' }}>
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              {collapsedMenuOpen && (
                <div style={{ position:'fixed', left:58, bottom:16, background:'#fff', border:'0.5px solid #eee', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden', zIndex:300, minWidth:180 }}>
                  <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee', fontSize:12 }}>
                    <div style={{ fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</div>
                    <div style={{ color:'#999', fontSize:11, marginTop:2 }}>{profile?.email}</div>
                  </div>
                  <div onClick={() => { setCollapsedMenuOpen(false); setViewPersist('config') }} style={{ padding:'8px 14px', cursor:'pointer', fontSize:13, color:'#555', display:'flex', alignItems:'center', gap:8 }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8f8f8'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <i className="ti ti-user" style={{ fontSize:15, color:'#888' }} aria-hidden="true"></i> Mi perfil
                  </div>
                  <div onClick={async () => { setCollapsedMenuOpen(false); await supabase.auth.resetPasswordForEmail(profile?.email, { redirectTo: `${window.location.origin}/reset-password` }); alert('Te enviamos un correo para cambiar tu contraseña.') }} style={{ padding:'8px 14px', cursor:'pointer', fontSize:13, color:'#555', display:'flex', alignItems:'center', gap:8 }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8f8f8'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <i className="ti ti-lock" style={{ fontSize:15, color:'#888' }} aria-hidden="true"></i> Cambiar contraseña
                  </div>
                  <div style={{ height:'0.5px', background:'#f0f0f0' }} />
                  <div onClick={async () => { setCollapsedMenuOpen(false); await supabase.auth.signOut() }} style={{ padding:'8px 14px', cursor:'pointer', fontSize:13, color:'#D85A30', display:'flex', alignItems:'center', gap:8 }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8f8f8'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <i className="ti ti-logout" style={{ fontSize:15, color:'#D85A30' }} aria-hidden="true"></i> Cerrar sesión
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>}



      {/* Overlay para cerrar menú en móvil */}
      {/* Drawer móvil admin */}
      {isMobile && showDrawer && (
        <>
          <div onClick={() => setShowDrawer(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 }} />
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'75vw', maxWidth:280, background:'#fff', zIndex:201, display:'flex', flexDirection:'column', overflowY:'auto' }}>
            <div style={{ padding:'14px', borderBottom:'0.5px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:26, height:26, background:'var(--clinic-primary, #0F6E56)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-heart-rate-monitor" style={{ color:'white', fontSize:13 }} aria-hidden="true"></i>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>MedTrack</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)' }}>{clinicSettings?.clinic_name || profile?.clinic_name || ''}</div>
                </div>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#aaa' }}>×</button>
            </div>
            <div style={{ flex:1, padding:'8px 0' }}>
              <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 16px 3px' }}>Clínica</div>
              {[
                { label:'Calendario', key:'calendario', icon:'ti-calendar' },
                ...(clinicPlan !== 'basic' ? [{ label:'Reportes', key:'reportes', icon:'ti-chart-bar' }] : []),
                ...(isClinicAdmin ? [{ label:'Sucursales', key:'sucursales', icon:'ti-building' }] : []),
              ].map(item => (
                <div key={item.key} onClick={() => { setViewPersist(item.key); setShowDrawer(false) }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', cursor:'pointer', background: view===item.key?'#E1F5EE':'transparent', color: view===item.key?G:'#555', fontWeight: view===item.key?500:400, fontSize:13 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:15, color: view===item.key?G:'#999' }} aria-hidden="true"></i>
                  {item.label}
                </div>
              ))}
              <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 16px 3px' }}>Usuarios</div>
              {[
                ...(clinicPlan !== 'basic' ? [{ label:'Personal', key:'medicos', icon:'ti-users' }] : []),
                { label:'Pacientes', key:'pacientes', icon:'ti-user-heart' },
              ].map(item => (
                <div key={item.key} onClick={() => { setViewPersist(item.key); setShowDrawer(false) }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', cursor:'pointer', background: view===item.key?'#E1F5EE':'transparent', color: view===item.key?G:'#555', fontWeight: view===item.key?500:400, fontSize:13 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:15, color: view===item.key?G:'#999' }} aria-hidden="true"></i>
                  {item.label}
                </div>
              ))}
              <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 16px 3px' }}>Sistema</div>
              {[
                ...(clinicPlan !== 'basic' ? [{ label:'Biblioteca', key:'biblioteca', icon:'ti-books' }] : []),
                ...(clinicPlan !== 'basic' ? [{ label:'Permisos', key:'permisos', icon:'ti-shield-check' }] : []),
                { label:'Configuración', key:'config', icon:'ti-settings' },
              ].map(item => (
                <div key={item.key} onClick={() => { setViewPersist(item.key); setShowDrawer(false) }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', cursor:'pointer', background: view===item.key?'#E1F5EE':'transparent', color: view===item.key?G:'#555', fontWeight: view===item.key?500:400, fontSize:13 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:15, color: view===item.key?G:'#999' }} aria-hidden="true"></i>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {isMobile ? (
          <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
            <button onClick={() => setShowDrawer(true)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#555', padding:'2px 6px', lineHeight:1 }}>☰</button>
            <div style={{ fontSize:15, fontWeight:700, color:'#1a1a1a' }}>MedTrack</div>
            <UserMenu dropUp={false} />
          </div>
        ) : (
          <div style={{ padding:'12px 18px', borderBottom:'0.5px solid #eee', background:'#fff', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>
                {({'dashboard':'Dashboard','medicos':'Personal','pacientes':'Pacientes','calendario':'Calendario','reportes':'Reportes','biblioteca':'Biblioteca','permisos':'Permisos','config':'Configuración','inventario':'Inventario','tickets':'Tickets'})[view]}
              </div>
              <div style={{ fontSize:13, color:'#999', marginTop:1 }}>{clinicSettings?.clinic_name || profile?.clinic_name || ''}</div>
            </div>
            {view === 'medicos'    && <button style={s.btnPrimary} onClick={() => { if (!checkLimit('doctor')) return; setFormError(''); setModal('new-doctor') }}>+ Nuevo personal</button>}
            {view === 'medicos' && isClinicAdmin && <button style={{ ...s.btnPrimary, background:'#1a3a5c' }} onClick={() => { setFormError(''); setModal('new-branch-admin') }}>+ Nuevo admin sucursal</button>}
            {view === 'pacientes' && !showInactive && <button style={s.btnPrimary} onClick={() => { if (!checkLimit('patient')) return; setFormError(''); setModal('new-patient') }}>+ Nuevo paciente</button>}
            {view === 'pacientes' && !showInactive && <button onClick={() => { loadInactivePatients(); setShowInactive(true) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#bbb', textDecoration:'underline' }}>perfiles inactivos</button>}
            {view === 'calendario' && <button style={s.btnPrimary} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Nueva cita</button>}
            {view === 'calendario' && <button style={{ ...s.btnPrimary, background:'#1a3a5c' }} onClick={() => setModal('availability')}>Disponibilidad</button>}
            {view === 'calendario' && <button style={{ ...s.btnPrimary, background:'#5F5E5A' }} onClick={() => setModal('block-agenda')}>Bloquear agenda</button>}
            {view === 'biblioteca' && <button style={s.btnPrimary} onClick={() => setModal('new-library')}>+ Nuevo item</button>}
            <NotificationBell profile={profile} />
          </div>
        )}

        {isMobile && view === 'calendario' && (
          <div style={{ padding:'8px 12px', background:'#fff', borderBottom:'0.5px solid #eee', display:'flex', gap:6, flexWrap:'wrap' }}>
            <button style={{ ...s.btnPrimary, fontSize:12, padding:'6px 10px' }} onClick={() => { setModal('new-appt'); setModalData({}) }}>+ Nueva cita</button>
            <button style={{ ...s.btnPrimary, background:'#1a3a5c', fontSize:12, padding:'6px 10px' }} onClick={() => setModal('availability')}>Disponibilidad</button>
            <button style={{ ...s.btnPrimary, background:'#5F5E5A', fontSize:12, padding:'6px 10px' }} onClick={() => setModal('block-agenda')}>Bloquear</button>
            <NotificationBell profile={profile} />
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding: isMobile ? '12px 12px 16px' : '16px 18px' }}>


    
      {view === 'medicos' && (
            <div>
              <div style={{ marginBottom:12, position:'relative' }}>
                <i className="ti ti-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#bbb' }} aria-hidden="true"></i>
                <input value={searchDoc} onChange={e => setSearchDoc(e.target.value)} placeholder="Buscar por nombre o email..."
                  style={{ width:'100%', padding:'7px 10px 7px 30px', fontSize:13, border:'0.5px solid #eee', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', background:'#f9f9f9' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap:10 }}>
              {[...doctors].filter(d => { if (!searchDoc) return true; const q = searchDoc.toLowerCase(); return (d.first_name||'').toLowerCase().includes(q) || (d.last_name||'').toLowerCase().includes(q) || (d.email||'').toLowerCase().includes(q) }).sort((a,b) => {
                const la = (a.last_name||'').toLowerCase()
                const lb = (b.last_name||'').toLowerCase()
                if (la !== lb) return la.localeCompare(lb)
                return (a.first_name||'').toLowerCase().localeCompare((b.first_name||'').toLowerCase())
              }).map(d => {
                const ACOLORS = [['#E1F5EE','#085041'],['#E6F1FB','#0C447C'],['#FBEAF0','#72243E'],['#FAEEDA','#633806'],['#EEEDFE','#3C3489'],['#F1EFE8','#444441']]
                const aci = Math.abs(((d.first_name||'')+(d.last_name||'')).split('').reduce((h,c)=>((h<<5)-h)+c.charCodeAt(0),0)) % ACOLORS.length
                const [abg, acolor] = ACOLORS[aci]
                const roleLabel = ({'admin':'Admin','clinic_admin':'Admin clínica','branch_admin':'Admin sucursal','doctor':'Médico','receptionist':'Recepcionista'})[d.role] || 'Colaborador'
                const roleBg = d.role==='clinic_admin'||d.role==='admin' ? '#E1F5EE' : d.role==='branch_admin' ? '#FAEEDA' : '#E6F1FB'
                const roleColor = d.role==='clinic_admin'||d.role==='admin' ? '#0F6E56' : d.role==='branch_admin' ? '#854F0B' : '#185FA5'
                return (
                  <div key={d.id} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#ccc'} onMouseLeave={e=>e.currentTarget.style.borderColor='#eee'}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:abg, color:acolor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:500, flexShrink:0 }}>{initials(d.first_name + SP + d.last_name)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.prefix ? d.prefix+' ' : ''}{d.last_name} {d.first_name}</div>
                        <div style={{ fontSize:11, color:'#999', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.email}</div>
                      </div>
                    </div>
                    <div style={{ height:'0.5px', background:'#f0f0f0' }} />
                    <div style={{ fontSize:11, color:'#888' }}>{d.phone || ''}{d.specialty ? (d.phone ? ` · ${d.specialty}` : d.specialty) : ''}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background:roleBg, color:roleColor }}>{roleLabel}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--clinic-primary-light, #E1F5EE)', color:'var(--clinic-primary)' }}>activo</span>
                      <span style={{ fontSize:11, color:'#999' }}>{patients.filter(p=>p.doctor?.id===d.id).length} pac.</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:6 }}>
                      {d.role !== 'admin' && d.role !== 'clinic_admin' && (
                        <button style={{ width:28, height:28, borderRadius:6, border:'0.5px solid #eee', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                          onClick={() => setViewPersist('permisos')} title="Permisos">
                          <i className="ti ti-shield-check" style={{ fontSize:13, color:'#666' }} aria-hidden="true"></i>
                        </button>
                      )}
                      <button style={{ width:28, height:28, borderRadius:6, border:'0.5px solid #eee', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                        onClick={() => { setModal('edit-doctor'); setModalData({ doctor:d }) }} title="Editar">
                        <i className="ti ti-edit" style={{ fontSize:13, color:'#666' }} aria-hidden="true"></i>
                      </button>
                      {d.role !== 'admin' && d.role !== 'clinic_admin' && (
                        <button style={{ width:28, height:28, borderRadius:6, border:'0.5px solid #FAECE7', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                          onClick={() => openDeleteDoctor(d)} title="Eliminar">
                          <i className="ti ti-trash" style={{ fontSize:13, color:'#D85A30' }} aria-hidden="true"></i>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {doctors.length === 0 && <div style={{ padding:30, textAlign:'center', fontSize:13, color:'#999', gridColumn:'1/-1' }}>No hay personal registrado</div>}
              </div>
            </div>
          )}

          {(view === 'perfil-paciente' || urlPatientId) && selPatient && (
            <PatientExpediente
              patient={selPatient}
              profile={profile}
              onBack={() => { setSelPatient(null); setView('pacientes'); navigate('/admin/pacientes') }}
              onEdit={() => {
                const p = selPatient
                setEditPatientForm({ profileId:p.profile?.id, patientId:p.id, firstName:p.profile?.first_name||'', lastName:p.profile?.last_name||'', email:p.profile?.email||'', idNumber:p.id_number||'', phone:p.phone||'', birthDate:p.birth_date||'', sex:p.sex||'', province:p.province||'', canton:p.canton||'', height:p.height_cm||'' })
                setModal('edit-patient')
              }}
              canEdit={true}
              senderRole='admin'
              enabledModules={enabledModules}
              clinicPlan={clinicPlan}
              doctors={doctors}
              effectiveClinicId={effectiveClinicId}
            />
          )}

          {view === 'pacientes' && showInactive && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                <button onClick={() => { setShowInactive(false); setInactiveSearch('') }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--clinic-primary)', display:'flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-arrow-left" style={{ fontSize:13 }} aria-hidden="true"></i> Volver a pacientes
                </button>
                <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>Perfiles inactivos</div>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ position:'relative' }}>
                    <i className="ti ti-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#bbb' }} aria-hidden="true"></i>
                    <input value={inactiveSearch} onChange={e => setInactiveSearch(e.target.value)}
                      placeholder="Buscar por nombre, cédula o correo..."
                      style={{ width:'100%', padding:'7px 10px 7px 32px', fontSize:13, border:'0.5px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
                  </div>
                </div>
              </div>
              {inactivePatients.length === 0 ? (
                <div style={{ textAlign:'center', color:'#bbb', fontSize:13, padding:30 }}>No hay perfiles inactivos</div>
              ) : (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:500, color:'#888', borderBottom:'1px solid #eee', background:'#f8f8f8', textTransform:'uppercase', letterSpacing:'0.05em' }}>Nombre</th>
                        <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:500, color:'#888', borderBottom:'1px solid #eee', background:'#f8f8f8', textTransform:'uppercase', letterSpacing:'0.05em' }}>Identificación</th>
                        <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:500, color:'#888', borderBottom:'1px solid #eee', background:'#f8f8f8', textTransform:'uppercase', letterSpacing:'0.05em' }}>Correo</th>
                        <th style={{ padding:'8px 14px', borderBottom:'1px solid #eee', background:'#f8f8f8' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {inactivePatients.filter(p => {
                        if (!inactiveSearch) return true
                        const q = inactiveSearch.toLowerCase()
                        return (p.profile?.first_name||'').toLowerCase().includes(q) ||
                               (p.profile?.last_name||'').toLowerCase().includes(q) ||
                               (p.id_number||'').toLowerCase().includes(q) ||
                               (p.profile?.email||'').toLowerCase().includes(q)
                      }).map(p => (
                        <tr key={p.id}>
                          <td style={{ padding:'10px 14px', fontSize:13, borderBottom:'0.5px solid #f0f0f0', color:'#1a1a1a' }}>{p.profile?.first_name} {p.profile?.last_name}</td>
                          <td style={{ padding:'10px 14px', fontSize:13, borderBottom:'0.5px solid #f0f0f0', color:'#666' }}>{p.id_number || '—'}</td>
                          <td style={{ padding:'10px 14px', fontSize:13, borderBottom:'0.5px solid #f0f0f0', color:'#666' }}>{p.profile?.email}</td>
                          <td style={{ padding:'10px 14px', borderBottom:'0.5px solid #f0f0f0' }}>
                            <button onClick={() => reactivatePatient(p)}
                              style={{ background:'var(--clinic-primary)', color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                              Reactivar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {view === 'pacientes' && !showInactive && (
            <div>
              <div style={{ marginBottom:12, position:'relative', display:'flex', alignItems:'center' }}>
                <span style={{ position:'absolute', left:12, fontSize:13, color:'#bbb', pointerEvents:'none' }}>🔍</span>
                <input type="text" placeholder="Buscar por nombre, email o diagnóstico..." value={searchPac} onChange={e=>setSearchPac(e.target.value)} style={{ width:'100%', padding:'8px 12px 8px 34px', border:'0.5px solid #eee', borderRadius:8, fontSize:13, outline:'none', background:'#f9f9f9', boxSizing:'border-box' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap:10 }}>
              {patients.filter(p => {
                if (p.profile?.role === 'admin' || p.profile?.role === 'superadmin' || p.profile?.role === 'doctor') return false
                const q = searchPac.toLowerCase()
                if(!q) return true
                const nombre = ((p.profile?.first_name||'')+' '+(p.profile?.last_name||'')).toLowerCase()
                const email = (p.profile?.email||'').toLowerCase()
                const diag = (allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description||'').toLowerCase()
                const cedula = (p.id_number||'').toLowerCase()
                const telefono = (p.phone||'').toLowerCase()
                return nombre.includes(q)||email.includes(q)||diag.includes(q)||cedula.includes(q)||telefono.includes(q)
              }).sort((a,b) => {
                const la = (a.profile?.last_name||'').toLowerCase()
                const lb = (b.profile?.last_name||'').toLowerCase()
                if (la !== lb) return la.localeCompare(lb)
                return (a.profile?.first_name||'').toLowerCase().localeCompare((b.profile?.first_name||'').toLowerCase())
              }).map(p => {
                const ACOLORS = [['#E1F5EE','#085041'],['#E6F1FB','#0C447C'],['#FBEAF0','#72243E'],['#FAEEDA','#633806'],['#EEEDFE','#3C3489'],['#F1EFE8','#444441']]
                const aci = Math.abs((pName(p)||'').split('').reduce((h,c)=>((h<<5)-h)+c.charCodeAt(0),0)) % ACOLORS.length
                const [abg, acolor] = ACOLORS[aci]
                const diag = allDiagnoses.find(d=>d.patient_id===p.id)?.cie10_description
                return (
                  <div key={p.id} onClick={() => openPatient(p)}
                    style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', cursor:'pointer', display:'flex', flexDirection:'column', gap:0, position:'relative' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#ccc'} onMouseLeave={e=>e.currentTarget.style.borderColor='#eee'}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', background:abg, color:acolor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:500, flexShrink:0 }}>{initials(pName(p))}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{(p.profile?.last_name||'')} {(p.profile?.first_name||'')}</div>
                        <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{age(p.birth_date)} años{p.province ? ` · ${p.province}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ height:'0.5px', background:'#f0f0f0', marginBottom:10 }} />
                    <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:32 }}>
                      {p.profile?.email && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#888' }}>
                          <i className="ti ti-mail" style={{ fontSize:13, color:'#bbb' }} aria-hidden="true"></i>
                          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.profile.email}</span>
                        </div>
                      )}
                      {p.phone && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#888' }}>
                          <i className="ti ti-phone" style={{ fontSize:13, color:'#bbb' }} aria-hidden="true"></i>
                          {p.phone}
                        </div>
                      )}
                    </div>
                    <div style={{ position:'absolute', bottom:14, left:16, right:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background: p.status==='active' ? '#E1F5EE' : '#FAEEDA', color: p.status==='active' ? '#0F6E56' : '#854F0B' }}>
                        {p.status==='active' ? 'activo' : 'pendiente'}
                      </span>
                      <div style={{ display:'flex', gap:4 }}>
                        <button style={{ width:28, height:28, borderRadius:6, border:'0.5px solid #eee', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                          onClick={e=>{ e.stopPropagation(); setEditPatientForm({ profileId:p.profile?.id, patientId:p.id, firstName:p.profile?.first_name||'', lastName:p.profile?.last_name||'', email:p.profile?.email||'', idNumber:p.id_number||'', phone:p.phone||'', birthDate:p.birth_date||'', sex:p.sex||'', province:p.province||'', canton:p.canton||'', height:p.height_cm||'' }); setModal('edit-patient') }}>
                          <i className="ti ti-edit" style={{ fontSize:13, color:'#666' }} aria-hidden="true"></i>
                        </button>
                        <button style={{ width:28, height:28, borderRadius:6, border:'0.5px solid #FAECE7', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                          onClick={e=>{ e.stopPropagation(); openDelete('patient', p.id, pName(p)) }}>
                          <i className="ti ti-trash" style={{ fontSize:13, color:'#D85A30' }} aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {patients.length === 0 && <div style={{ padding:30, textAlign:'center', fontSize:13, color:'#999', gridColumn:'1/-1' }}>No hay pacientes registrados</div>}
              </div>
            </div>
          )}

          {view === 'calendario' && (
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              {/* Mini calendario lateral */}
              {!isMobile && (
                <div style={{ width:220, flexShrink:0, background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#888', padding:'2px 6px' }}>{'<'}</button>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1a3a5c' }}>{MONTHS[calMonth]} {calYear}</div>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#888', padding:'2px 6px' }}>{'>'}</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
                    {['L','M','M','J','V','S','D'].map((d,i) => (
                      <div key={i} style={{ textAlign:'center', fontSize:10, color:'#bbb', fontWeight:500, padding:'2px 0' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
                    {renderCalendar().map((cell, i) => {
                      const hasAppts = cell.dateStr ? apptsByDate(cell.dateStr).length > 0 : false
                      return (
                        <div key={i} onClick={() => { if(cell.dateStr) {
                          const d = new Date(cell.dateStr + 'T12:00:00')
                          const day = d.getDay()
                          const diff = day === 0 ? -6 : 1 - day
                          const monday = new Date(d)
                          monday.setDate(d.getDate() + diff)
                          setWeekStart(new Date(monday))
                          setSelDate(cell.dateStr)
                          setCalView('semana')
                        } }}
                          style={{ textAlign:'center', fontSize:11, padding:'3px 2px', borderRadius:4, cursor: cell.dateStr ? 'pointer' : 'default', opacity: cell.current ? 1 : 0.3, background: cell.isToday ? 'var(--clinic-primary)' : selDate === cell.dateStr ? '#1a3a5c' : 'transparent', color: cell.isToday || selDate === cell.dateStr ? '#fff' : '#444', fontWeight: cell.isToday ? 700 : 400, position:'relative' }}>
                          {cell.day}
                          {hasAppts && !cell.isToday && <div style={{ position:'absolute', bottom:1, left:'50%', transform:'translateX(-50%)', width:3, height:3, borderRadius:'50%', background: 'var(--clinic-primary)' }} />}
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={() => {
                    const today = new Date()
                    const d = new Date(today)
                    d.setDate(d.getDate() - d.getDay())
                    setWeekStart(new Date(d))
                    setCalMonth(today.getMonth())
                    setCalYear(today.getFullYear())
                    setSelDate(today.toISOString().split('T')[0])
                    setCalView('semana')
                  }} style={{ width:'100%', marginTop:12, padding:'6px', background:'#f0f4f8', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', fontWeight:500 }}>
                    Hoy
                  </button>
                  <div style={{ marginTop:12, borderTop:'0.5px solid #eee', paddingTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                    {doctors.filter(d => d.is_health_professional || d.role === 'doctor').map(d => (
                      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#555' }}>
                        <label style={{ position:'relative', cursor:'pointer', flexShrink:0 }} title="Cambiar color">
                          <div style={{ width:10, height:10, borderRadius:3, background: doctorColor(d.id) }} />
                          <input type="color" defaultValue={doctorColor(d.id)} onChange={e => updateDoctorColor(d.id, e.target.value)}
                            style={{ position:'absolute', opacity:0, width:10, height:10, cursor:'pointer', left:0, top:0 }} />
                        </label>
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.prefix ? d.prefix+' ' : ''}{d.first_name} {d.last_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Columna principal */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
              {/* Controles de vista */}
              <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                {isMobile && <button onClick={() => {
                    const today = new Date()
                    const day = today.getDay()
                    const diff = day === 0 ? -6 : 1 - day
                    const mon = new Date(today)
                    mon.setDate(today.getDate() + diff)
                    setWeekStart(new Date(mon))
                    setSelDate(today.toISOString().split('T')[0])
                    scrollToNow(calView)
                  }} style={{ padding:'5px 12px', background:'#f0f4f8', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, color:'#1a3a5c', fontWeight:500 }}>Hoy</button>}
                <div style={{ display:'flex', gap:6 }}>
                  {calView === 'mes' && <>
                    <button style={s.calNavBtn} onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}>{'<'}</button>
                    <div style={{ fontSize:13, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>{MONTHS[calMonth]} {calYear}</div>
                    <button style={s.calNavBtn} onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}>{'>'}</button>
                  </>}
                  {calView === 'semana' && <>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(new Date(d)) }}>{'<'}</button>
                    <div style={{ fontSize:13, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>
                      {weekStart.toLocaleDateString('es-CR',{day:'numeric',month:'short'})} — {new Date(weekStart.getTime()+6*86400000).toLocaleDateString('es-CR',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(new Date(d)) }}>{'>'}</button>
                  </>}
                  {calView === 'dia' && <>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(selDate||new Date()); d.setDate(d.getDate()-1); setSelDate(d.toISOString().split('T')[0]) }}>{'<'}</button>
                    <div style={{ fontSize:13, fontWeight:500, padding:'0 8px', display:'flex', alignItems:'center' }}>
                      {selDate ? new Date(selDate+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'}) : 'Hoy'}
                    </div>
                    <button style={s.calNavBtn} onClick={() => { const d = new Date(selDate||new Date()); d.setDate(d.getDate()+1); setSelDate(d.toISOString().split('T')[0]) }}>{'>'}</button>
                  </>}
                </div>
                {isClinicAdmin && branches.length > 1 && (
                  <select value={selBranch} onChange={e => setSelBranch(e.target.value)}
                    style={{ padding:'5px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:12, outline:'none', color: selBranch ? '#1a3a5c' : '#888' }}>
                    <option value="">Todas las sucursales</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                {filteredDoctors.length > 0 && (
                  <select value={filterDoctorId} onChange={e => setFilterDoctorId(e.target.value)}
                    style={{ padding:'5px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:12, outline:'none', color: filterDoctorId ? '#1a3a5c' : '#888' }}>
                    <option value="">Todos los profesionales</option>
                    {filteredDoctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.prefix ? d.prefix+' ' : ''}{d.first_name} {d.last_name}
                      </option>
                    ))}
                  </select>
                )}
                <div style={{ display:'flex', background:'#f5f5f5', borderRadius:8, padding:3, gap:2 }}>
                  {[['mes','Mes'],['semana','Semana'],['dia','Día']].map(([key,label]) => (
                    <button key={key} onClick={() => setCalView(key)}
                      style={{ padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight: calView===key ? 600 : 400, background: calView===key ? '#fff' : 'transparent', color: calView===key ? G : '#888', boxShadow: calView===key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista MES */}
              {calView === 'mes' && (
                <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'8px 10px 4px' }}>
                    {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:500, color:'#999', textTransform:'uppercase' }}>{d}</div>)}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 10px 10px', gap:2, flex:1 }}>
                    {renderCalendar().map((cell, i) => {
                      const dayAppts = cell.dateStr ? apptsByDate(cell.dateStr) : []
                      return (
                        <div key={i} onClick={() => { if(cell.dateStr) {
                          const d = new Date(cell.dateStr + 'T12:00:00')
                          const day = d.getDay()
                          const diff = day === 0 ? -6 : 1 - day
                          const monday = new Date(d)
                          monday.setDate(d.getDate() + diff)
                          setWeekStart(new Date(monday))
                          setSelDate(cell.dateStr)
                          setCalView('semana')
                        } }}
                          style={{ minHeight:70, padding:5, borderRadius:6, cursor: cell.dateStr ? 'pointer' : 'default', opacity: cell.current ? 1 : 0.3, background: cell.isToday ? '#f0fdf9' : 'transparent', border: cell.isToday ? '1px solid var(--clinic-primary)' : '1px solid transparent' }}>
                          <div style={{ fontSize:13, color: cell.isToday ? 'var(--clinic-primary)' : '#666', fontWeight: cell.isToday ? 600 : 400, marginBottom:2 }}>{cell.day}</div>
                          {dayAppts.filter(a => a.status === 'blocked').slice(0,1).map(a => (
                            <div key={a.id} style={{ fontSize:9, padding:'1px 3px', borderRadius:2, color:'#5F5E5A', marginBottom:1, background:'#F1EFE8', border:'1px solid #D3D1C7', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:2 }}>
                              <i className="ti ti-ban" style={{ fontSize:8 }} aria-hidden="true"></i> Bloqueado
                            </div>
                          ))}
                          {dayAppts.filter(a => a.status !== 'blocked').slice(0,2).map(a => {
                            const statusConfig = { pending_confirmation:'#F59E0B', confirmed_patient:'#0F6E56', confirmed_doctor:'#185FA5', no_show:'#854F0B', scheduled:'#888' }
                            const sc = statusConfig[a.status] || G
                            return (
                              <div key={a.id} style={{ fontSize:9, padding:'1px 3px', borderRadius:2, color:'#fff', marginBottom:1, background: doctorColor(a.doctor_id), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <span>{a.appointment_time?.substring(0,5)} {a.patient?.profile?.first_name}</span>
                                {a.status === 'confirmed_patient' && <i className='ti ti-check' style={{ fontSize:11, color:'#085041', WebkitTextStroke:'0.5px #085041' }} aria-hidden='true'></i>}
                                {a.status === 'confirmed_doctor' && <i className='ti ti-check' style={{ fontSize:11, color:'#0C447C', WebkitTextStroke:'0.5px #0C447C' }} aria-hidden='true'></i>}
                                {a.status === 'no_show' && <span style={{ fontSize:11, fontWeight:900, color:'#D97706', lineHeight:1 }}>—</span>}
                              </div>
                            )
                          })}
                          {dayAppts.filter(a => a.status !== 'blocked').length > 2 && <div style={{ fontSize:9, color:'#999' }}>+{dayAppts.filter(a => a.status !== 'blocked').length-2}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Vista SEMANA */}
              {calView === 'semana' && (() => {
                const HORA_INI = 0
                const HORA_FIN = 24
                const SLOT_H = 110
                const now = currentTime
                const todayStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')
                const nowOffsetPx = HORA_INI <= now.getHours() && now.getHours() < HORA_FIN
                  ? ((now.getHours() - HORA_INI) * 60 + now.getMinutes()) / 60 * SLOT_H : -1
                const weekDays = Array.from({length:7}, (_,i) => {
                  const d = new Date(weekStart)
                  d.setDate(weekStart.getDate() + i)
                  const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
                  return { date: d, dateStr: ds, isToday: ds === todayStr }
                })
                const hours = Array.from({length: HORA_FIN - HORA_INI}, (_,i) => HORA_INI + i)
                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ display:'grid', gridTemplateColumns:`48px repeat(7,1fr)`, borderBottom:'0.5px solid #eee' }}>
                      <div />
                      {weekDays.map(({date, isToday}) => (
                        <div key={date.toISOString()} style={{ textAlign:'center', padding:'8px 4px', borderLeft:'1px solid #ebebeb', background: isToday ? '#f0fdf9' : '#fff' }}>
                          <div style={{ fontSize:11, color:'#999', textTransform:'uppercase' }}>
                            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][date.getDay()===0?6:date.getDay()-1]}
                          </div>
                          <div style={{ fontSize:16, fontWeight: isToday ? 700 : 400, background: isToday ? 'var(--clinic-primary)' : 'transparent', color: isToday ? '#fff' : '#1a1a1a', borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0' }}>
                            {date.getDate()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div id="cal-semana-scroll" style={{ overflowY:'auto', maxHeight: isMobile ? '60vh' : 'calc(100vh - 260px)', position:'relative' }}>
                      <div style={{ display:'grid', gridTemplateColumns:`48px repeat(7,1fr)`, position:'relative' }}>
                        <div>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, position:'relative' }}>
                              <span style={{ position:'absolute', top:-6, right:6, fontSize:10, color:'#bbb', lineHeight:1, whiteSpace:'nowrap' }}>{h === 0 ? '12 AM' : h < 12 ? h+' AM' : h === 12 ? '12 PM' : (h-12)+' PM'}</span>
                              <span style={{ position:'absolute', top:'50%', right:6, fontSize:9, color:'#ccc', lineHeight:1, whiteSpace:'nowrap', transform:'translateY(-50%)' }}>{h === 0 ? '12:30' : h < 12 ? h+':30' : h === 12 ? '12:30' : (h-12)+':30'}</span>
                            </div>
                          ))}
                        </div>
                        {weekDays.map(({dateStr, isToday}) => {
                          const dayAppts = apptsByDate(dateStr)
                          return (
                            <div key={dateStr} style={{ borderLeft:'1px solid #ebebeb', position:'relative', background: isToday ? '#fafffe' : '#fff', overflow:'hidden' }}>
                              {hours.map(h => [0, 30].map(min => (
                                <div key={h+'-'+min} style={{ height:SLOT_H/2, cursor:'pointer', position:'relative' }}
                                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.background='rgba(29,158,117,0.08)' }}
                                  onDragLeave={e => { e.currentTarget.style.background='' }}
                                  onDrop={e => { e.preventDefault(); e.currentTarget.style.background=''; if (draggingAppt) { const t = String(h).padStart(2,'0')+':'+String(min).padStart(2,'0'); supabase.from('appointments').update({ appointment_date: dateStr, appointment_time: t }).eq('id', draggingAppt.id).then(() => loadAppts()); setDraggingAppt(null) } }}
                                  onClick={() => { setSelDate(dateStr); setModal('new-appt'); setModalData({ defaultTime: String(h).padStart(2,'0')+':'+String(min).padStart(2,'0') }) }}>
                                  <div style={{ position:'absolute', top:0, left:0, right:0, borderTop: min===0 ? '1px solid #ebebeb' : '1px dashed #e8e8e8', pointerEvents:'none' }} />
                                </div>
                              )))}
                              {isToday && nowOffsetPx >= 0 && (
                                <div style={{ position:'absolute', left:0, right:0, top:nowOffsetPx, zIndex:10, display:'flex', alignItems:'center' }}>
                                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', flexShrink:0 }} />
                                  <div style={{ flex:1, height:1.5, background:'#D85A30' }} />
                                </div>
                              )}
                              {getDayAvailability(dateStr).map((a, ai) => {
                                const [sh, sm] = (a.start_time||'00:00').split(':').map(Number)
                                const [eh, em] = (a.end_time||'00:00').split(':').map(Number)
                                const topPx = ((sh - HORA_INI) * 60 + sm) / 60 * (SLOT_H/2) * 2
                                const heightPx = ((eh - sh) * 60 + (em - sm)) / 60 * (SLOT_H/2) * 2
                                const color = doctorColor(a.doctor_id)
                                return (
                                  <div key={a.id} title={`${a.doctor?.prefix ? a.doctor.prefix+' ' : ''}${a.doctor?.first_name} ${a.doctor?.last_name} · ${a.start_time?.substring(0,5)}-${a.end_time?.substring(0,5)}`}
                                    style={{ position:'absolute', left: ai * 4, width:3, top:topPx, height:heightPx, background:color, borderRadius:2, opacity:0.25, zIndex:3, pointerEvents:'none' }} />
                                )
                              })}
                              {dayAppts.filter(a => a.status === 'blocked').map(a => {
                                const [ah, am] = (a.appointment_time||'00:00').split(':').map(Number)
                                if (ah < HORA_INI || ah >= HORA_FIN) return null
                                const top = ((ah - HORA_INI) * 60 + am) / 60 * (SLOT_H/2) * 2
                                const height = Math.max((a.duration_min||60) / 60 * (SLOT_H/2) * 2 - 2, 20)
                                return (
                                  <div key={a.id} style={{ position:'absolute', left:2, right:2, top, height, background:'#F1EFE8', borderLeft:'3px solid #888780', borderRadius:4, padding:'3px 6px', overflow:'hidden', zIndex:4, cursor:'pointer' }}
                                    onClick={e => { e.stopPropagation(); if (window.confirm('¿Eliminar este bloqueo de agenda?')) { supabase.from('appointments').delete().eq('id', a.id).then(() => loadAppts()) } }}>
                                    <div style={{ display:'flex', flexDirection:'column', height:'100%', justifyContent:'space-between' }}>
                                      <div>
                                        <div style={{ fontSize:10, fontWeight:500, color:'#5F5E5A', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                                            <i className="ti ti-ban" style={{ fontSize:10 }} aria-hidden="true"></i> Agenda cerrada
                                          </div>
                                          <i className="ti ti-trash" style={{ fontSize:10, color:'#888780' }} aria-hidden="true"></i>
                                        </div>
                                        {a.notes && a.notes !== 'Agenda bloqueada' && <div style={{ fontSize:9, color:'#888780', marginTop:1 }}>{a.notes}</div>}
                                      </div>
                                      {a.doctor_id && <div style={{ fontSize:9, color:'#6B6B6B', fontWeight:500 }}>{(() => { const d = doctors.find(x => x.id === a.doctor_id); return d ? `${d.prefix ? d.prefix+' ' : ''}${d.first_name} ${d.last_name}` : '' })()} </div>}
                                    </div>
                                  </div>
                                )
                              })}
                              {(() => {
                                const visible = dayAppts.filter(a => a.status !== 'blocked').map(a => {
                                  const [ah, am] = (a.appointment_time||'00:00').split(':').map(Number)
                                  const startMin = ah*60+am
                                  const endMin = startMin + (a.duration_min||30)
                                  return { a, ah, am, startMin, endMin }
                                }).filter(x => x.ah >= HORA_INI && x.ah < HORA_FIN)

                                // Calcular columnas para citas que se solapan
                                const withCols = visible.map(item => ({ ...item, col:0, cols:1 }))
                                for (let i = 0; i < withCols.length; i++) {
                                  const overlapping = withCols.filter((other, j) => j !== i &&
                                    other.startMin < withCols[i].endMin && other.endMin > withCols[i].startMin)
                                  if (overlapping.length > 0) {
                                    const group = [withCols[i], ...overlapping].sort((x,y) => x.startMin - y.startMin || x.a.id.localeCompare(y.a.id))
                                    const totalCols = group.length
                                    group.forEach((g, idx) => {
                                      const target = withCols.find(w => w.a.id === g.a.id)
                                      target.col = idx
                                      target.cols = totalCols
                                    })
                                  }
                                }

                                return withCols.map(({ a, ah, am, col, cols }) => {
                                const top = ((ah - HORA_INI) * 60 + am) / 60 * SLOT_H
                                const height = Math.max((a.duration_min||30) / 60 * SLOT_H, 18)
                                const color = doctorColor(a.doctor_id)
                                const widthPct = 100 / cols
                                const leftPct = widthPct * col
                                return (
                                  <>{(() => {
                                    const ML = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería', odontologia:'Odontología', nutricion:'Nutrición' }
                                    const [ah2, am2] = (a.appointment_time||'00:00').split(':').map(Number)
                                    const endMin = ah2*60 + am2 + (a.duration_min||30)
                                    const fmt = (h,m) => { const p=h>=12?'pm':'am'; const h12=h%12||12; return h12+':'+(m<10?'0':'')+m+p }
                                    const timeStr = fmt(ah2,am2)+' - '+fmt(Math.floor(endMin/60)%24,endMin%60)
                                    return (
                                      <div key={a.id} draggable={true} onDragStart={e => { e.stopPropagation(); setDraggingAppt(a); e.dataTransfer.effectAllowed='move' }} style={{ position:'absolute', left:`calc(${leftPct}% + 1px)`, width:`calc(${widthPct}% - 2px)`, top, height, background:color+'22', borderLeft:'3px solid '+color, borderRadius:4, padding:'3px 5px', overflow:'hidden', cursor:'grab', zIndex:5, boxSizing:'border-box' }}
                                        onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setPopupAppt(a); setPopupPos({ x: Math.min(r.right+8, window.innerWidth-320), y: Math.min(r.top, window.innerHeight-400) }) }}>
                                        <div style={{ fontSize:10, fontWeight:600, color, lineHeight:1.3, display:'flex', justifyContent:'space-between' }}>
                                          <span>{timeStr}</span>
                                          {a.status === 'confirmed_patient' && <i className='ti ti-check' style={{ fontSize:12, color:'#085041', WebkitTextStroke:'0.5px #085041' }} aria-hidden='true'></i>}
                                          {a.status === 'confirmed_doctor' && <i className='ti ti-check' style={{ fontSize:12, color:'#0C447C', WebkitTextStroke:'0.5px #0C447C' }} aria-hidden='true'></i>}
                                          {a.status === 'no_show' && <span style={{ fontSize:12, fontWeight:900, color:'#D97706', lineHeight:1 }}>—</span>}
                                        </div>
                                        <div style={{ fontSize:10, fontWeight:500, color:'#1a1a1a', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.patient?.profile?.last_name} {a.patient?.profile?.first_name}</div>
                                        {a.notes && <div style={{ fontSize:9, color:'#777', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.notes}</div>}
                                        {a.tags?.length > 0 && (
                                          <div style={{ position:'absolute', bottom:3, left:4, display:'flex', gap:2 }}>
                                            {a.tags.map(t => <div key={t.tag?.id} style={{ width:10, height:10, borderRadius:2, background:t.tag?.color || '#ccc' }} title={t.tag?.name} />)}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}</>
                                )
                              })
                              })()}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Vista DÍA */}
              {calView === 'dia' && (() => {
                const HORA_INI = 0
                const HORA_FIN = 24
                const SLOT_H = 88
                const now = new Date()
                const todayStr = now.toISOString().split('T')[0]
                const currentDate = selDate || todayStr
                const dayAppts = apptsByDate(currentDate)
                const isToday = currentDate === todayStr
                const nowOffsetPx = isToday && HORA_INI <= now.getHours() && now.getHours() < HORA_FIN
                  ? ((now.getHours() - HORA_INI) * 60 + now.getMinutes()) / 60 * SLOT_H : -1
                const hours = Array.from({length: HORA_FIN - HORA_INI}, (_,i) => HORA_INI + i)
                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>
                        {new Date(currentDate+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                      </div>
                      <span style={{ fontSize:12, color:'#888' }}>{dayAppts.length} citas</span>
                    </div>
                    <div style={{ overflowY:'auto', maxHeight: isMobile ? '65vh' : 'calc(100vh - 240px)', position:'relative' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'48px 1fr', position:'relative' }}>
                        <div>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, position:'relative' }}>
                              <span style={{ position:'absolute', top:-6, right:6, fontSize:10, color:'#bbb', lineHeight:1, whiteSpace:'nowrap' }}>{h === 0 ? '12 AM' : h < 12 ? h+' AM' : h === 12 ? '12 PM' : (h-12)+' PM'}</span>
                              <span style={{ position:'absolute', top:'50%', right:6, fontSize:9, color:'#ccc', lineHeight:1, whiteSpace:'nowrap', transform:'translateY(-50%)' }}>{h === 0 ? '12:30' : h < 12 ? h+':30' : h === 12 ? '12:30' : (h-12)+':30'}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ position:'relative', background: isToday ? '#fafffe' : '#fff' }}>
                          {hours.map(h => (
                            <div key={h} style={{ height:SLOT_H, borderLeft:'1px solid #ebebeb', cursor:'pointer', backgroundImage: 'linear-gradient(to bottom, #ebebeb 0px, transparent 1px, transparent 50%, #e0e0e0 50%, transparent calc(50% + 1px), transparent 100%)', backgroundSize: `100% ${SLOT_H}px` }}
                              onClick={() => { setSelDate(currentDate); setModal('new-appt'); setModalData({ defaultTime: String(h).padStart(2,'0')+':00' }) }}>
                            </div>
                          ))}
                          {isToday && nowOffsetPx >= 0 && (
                            <div style={{ position:'absolute', left:0, right:0, top:nowOffsetPx, zIndex:10, display:'flex', alignItems:'center' }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', flexShrink:0 }} />
                              <div style={{ flex:1, height:1.5, background:'#D85A30' }} />
                            </div>
                          )}
                          {dayAppts.filter(a => a.status === 'blocked').map(a => {
                                const [ah, am] = (a.appointment_time||'00:00').split(':').map(Number)
                                if (ah < HORA_INI) return null
                                const top = ((ah - HORA_INI) * 60 + am) / 60 * SLOT_H
                                const height = Math.max((a.duration_min||60) / 60 * SLOT_H - 2, 20)
                                return (
                                  <div key={a.id} style={{ position:'absolute', left:2, right:2, top, height, background:'#F1EFE8', borderLeft:'3px solid #888780', borderRadius:4, padding:'3px 6px', overflow:'hidden', zIndex:4 }}>
                                    <div style={{ fontSize:10, fontWeight:500, color:'#5F5E5A', display:'flex', alignItems:'center', gap:3 }}>
                                      <i className="ti ti-ban" style={{ fontSize:10 }} aria-hidden="true"></i> Agenda cerrada
                                    </div>
                                    {a.notes && a.notes !== 'Agenda bloqueada' && <div style={{ fontSize:9, color:'#888780', marginTop:1 }}>{a.notes}</div>}
                                  </div>
                                )
                              })}
                          {(() => {
                            const visible = dayAppts.filter(a => a.status !== 'blocked').map(a => {
                              const [ah, am] = (a.appointment_time||'00:00').split(':').map(Number)
                              const startMin = ah*60+am
                              const endMin = startMin + (a.duration_min||30)
                              return { a, ah, am, startMin, endMin }
                            }).filter(x => x.ah >= HORA_INI && x.ah < HORA_FIN)

                            const withCols = visible.map(item => ({ ...item, col:0, cols:1 }))
                            for (let i = 0; i < withCols.length; i++) {
                              const overlapping = withCols.filter((other, j) => j !== i &&
                                other.startMin < withCols[i].endMin && other.endMin > withCols[i].startMin)
                              if (overlapping.length > 0) {
                                const group = [withCols[i], ...overlapping].sort((x,y) => x.startMin - y.startMin || x.a.id.localeCompare(y.a.id))
                                const totalCols = group.length
                                group.forEach((g, idx) => {
                                  const target = withCols.find(w => w.a.id === g.a.id)
                                  target.col = idx
                                  target.cols = totalCols
                                })
                              }
                            }

                            return withCols.map(({ a, ah, am, col, cols }) => {
                            const ML = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería', odontologia:'Odontología', nutricion:'Nutrición' }
                            const top = ((ah - HORA_INI) * 60 + am) / 60 * SLOT_H
                            const height = Math.max((a.duration_min||30) / 60 * SLOT_H, 28)
                            const color = doctorColor(a.doctor_id)
                            const statusConfig = { pending_confirmation:{ label:'Pendiente', bg:'#FFF8E1', color:'#F59E0B' }, confirmed_patient:{ label:'Confirmada', bg:'#E1F5EE', color:'#0F6E56' }, confirmed_doctor:{ label:'Confirmada', bg:'#E6F1FB', color:'#185FA5' }, no_show:{ label:'No asistió', bg:'#FAEEDA', color:'#C4531A' }, scheduled:{ label:'Agendada', bg:'#f0f0f0', color:'#888' } }
                            const st = statusConfig[a.status] || statusConfig.scheduled
                            const endMin = ah*60 + am + (a.duration_min||30)
                            const fmt = (h,m) => { const p=h>=12?'pm':'am'; const h12=h%12||12; return h12+':'+(m<10?'0':'')+m+p }
                            const timeStr = fmt(ah,am)+' - '+fmt(Math.floor(endMin/60)%24,endMin%60)
                            const widthPct = 100 / cols
                            const leftPct = widthPct * col
                            return (
                              <div key={a.id} style={{ position:'absolute', left:`calc(${leftPct}% + 4px)`, width:`calc(${widthPct}% - 8px)`, top, height, background:color+'22', borderLeft:'3px solid '+color, borderRadius:6, padding:'5px 8px', overflow:'hidden', cursor:'pointer', zIndex:5, boxSizing:'border-box' }}
                                onClick={() => { setModal('edit-appt'); setModalData({appt:a}) }}>
                                <div style={{ fontSize:11, fontWeight:700, color, display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                                  <span>{timeStr}</span>
                                  <span style={{ fontSize:10, padding:'0 5px', borderRadius:10, background:st.bg, color:st.color }}>{st.label}</span>
                                </div>
                                <div style={{ fontSize:11, fontWeight:600, color:'#1a1a1a', marginBottom:1 }}>{a.patient?.profile?.last_name} {a.patient?.profile?.first_name}</div>
                                {a.module_type && <div style={{ fontSize:10, color:'#555', marginBottom:1 }}>{ML[a.module_type]}</div>}
                                {a.visit_type && <div style={{ fontSize:10, color:'#777', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:4 }}>{a.visit_type}</div>}
                                <div style={{ display:'flex', gap:4 }}>
                                  {a.status !== 'confirmed_doctor' && a.status !== 'no_show' && (
                                    <button style={{ fontSize:10, padding:'1px 6px', borderRadius:4, border:'none', cursor:'pointer', background:'#E6F1FB', color:'#185FA5' }}
                                      onClick={e => { e.stopPropagation(); updateApptStatus(a.id, 'confirmed_doctor') }}><i className='ti ti-check' style={{ fontSize:12 }} aria-hidden='true'></i> Confirmar</button>
                                  )}
                                  {a.status !== 'no_show' && (
                                    <button style={{ fontSize:10, padding:'1px 6px', borderRadius:4, border:'none', cursor:'pointer', background:'#FAEEDA', color:'#854F0B' }}
                                      onClick={e => { e.stopPropagation(); updateApptStatus(a.id, 'no_show', a) }}>No asistió</button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                          })()}
                          {dayAppts.length === 0 && (
                            <div style={{ position:'absolute', top:'40%', left:0, right:0, textAlign:'center', fontSize:13, color:'#bbb' }}>Sin citas para este día</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}



              {/* POPUP DE CITA */}
              {popupAppt && (
                <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={() => setPopupAppt(null)}>
                  <div style={{ position:'fixed', left: popupPos.x, top: popupPos.y, width:300, background:'#fff', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', border:'0.5px solid #eee', zIndex:201, overflow:'hidden' }}
                    onClick={e => e.stopPropagation()}>
                    {/* Header con color del médico */}
                    <div style={{ background: doctorColor(popupAppt.doctor_id)+'15', borderBottom:'0.5px solid #eee', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>
                          {popupAppt.doctor ? `${popupAppt.doctor.first_name} ${popupAppt.doctor.last_name}` : 'Sin médico asignado'}
                        </div>
                        <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>
                          {new Date(popupAppt.appointment_date+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long'})}
                        </div>
                        <div style={{ fontSize:12, color:'#555' }}>
                          {(() => {
                            const [h,m] = (popupAppt.appointment_time||'00:00').split(':').map(Number)
                            const end = h*60+m+(popupAppt.duration_min||30)
                            const fmt = (hh,mm) => { const p=hh>=12?'pm':'am'; return (hh%12||12)+':'+(mm<10?'0':'')+mm+p }
                            return fmt(h,m)+' — '+fmt(Math.floor(end/60)%24,end%60)+` (${popupAppt.duration_min||30} min)`
                          })()}
                        </div>
                      </div>
                      <button onClick={() => setPopupAppt(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#999', padding:0 }}>✕</button>
                    </div>

                    {/* Estado */}
                    <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee' }}>
                      <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>Estado</div>
                      <select value={popupAppt.status || 'pending_confirmation'}
                        onChange={e => { updateApptStatus(popupAppt.id, e.target.value, popupAppt); setPopupAppt(p => ({...p, status: e.target.value})) }}
                        style={{ width:'100%', padding:'6px 10px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:8, outline:'none', fontFamily:'inherit', color:'#1a3a5c', fontWeight:500 }}>
                        <option value="pending_confirmation">Sin confirmar</option>
                        <option value="confirmed_patient">Confirmado por paciente</option>
                        <option value="confirmed_doctor">Confirmado por médico</option>
                        <option value="no_show">No asistió</option>
                      </select>
                    </div>

                    {/* Paciente */}
                    <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #eee' }}>
                      <div onClick={() => { const p = patients.find(x => x.id === popupAppt.patient_id); if(p) { setPopupAppt(null); setExpedienteInitialTab('preconsulta'); openPatient(p) } }}
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, background:'var(--clinic-primary-light, #E1F5EE)', cursor:'pointer', marginBottom:8 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--clinic-primary, #0F6E56)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {(popupAppt.patient?.profile?.first_name?.[0]||'')+( popupAppt.patient?.profile?.last_name?.[0]||'')}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--clinic-primary, #0F6E56)' }}>
                            {popupAppt.patient?.profile?.last_name} {popupAppt.patient?.profile?.first_name}
                          </div>
                          <div style={{ fontSize:10, color:'var(--clinic-primary, #0F6E56)', opacity:0.7 }}>Ver expediente →</div>
                        </div>
                      </div>
                      {popupAppt.patient?.phone && <div style={{ fontSize:11, color:'#666' }}>📞 {popupAppt.patient.phone}</div>}
                      {popupAppt.patient?.profile?.email && <div style={{ fontSize:11, color:'#666' }}>✉️ {popupAppt.patient.profile.email}</div>}
                      {popupAppt.visit_type && <div style={{ fontSize:11, color:'#888', marginTop:4 }}>{popupAppt.visit_type}</div>}
                      {popupAppt.notes && <div style={{ fontSize:11, color:'#888', marginTop:2, fontStyle:'italic' }}>{popupAppt.notes}</div>}
                    </div>

                    {/* Acciones */}
                    <div style={{ padding:'10px 14px', display:'flex', gap:6, flexWrap:'wrap' }}>

                      <button onClick={() => { setPopupAppt(null); setModal('edit-appt'); setModalData({appt:popupAppt}) }}
                        style={{ padding:'6px 10px', background:'#fff', color:'#555', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:11 }}>
                        Editar
                      </button>
                      <button onClick={() => { if(window.confirm('¿Cancelar esta cita?')) { updateApptStatus(popupAppt.id, 'cancelled'); setPopupAppt(null) } }}
                        style={{ padding:'6px 10px', background:'#fff', color:'#D85A30', border:'1px solid #D85A30', borderRadius:8, cursor:'pointer', fontSize:11 }}>
                        Cancelar
                      </button>
                    </div>
                    <div style={{ padding:'0 14px 10px' }}>
                      <button onClick={() => { setComprobanteAppt(popupAppt); setComprobanteHoraIngreso(''); setComprobanteHoraSalida(''); setPopupAppt(null) }}
                        style={{ width:'100%', padding:'6px', background:'#fff', color:'#0F6E56', border:'1px solid #0F6E56', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:500 }}>
                        Generar comprobante de asistencia
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>{/* fin columna principal */}
            </div>
          )}

          {/* Modal comprobante */}
          {comprobanteAppt && (() => {
            const G = '#0F6E56'
            const patient = patients.find(p => p.id === comprobanteAppt.patient_id)
            const doctor = doctors.find(d => d.id === comprobanteAppt.doctor_id)
            const patientName = `${comprobanteAppt.patient?.profile?.first_name||patient?.profile?.first_name||''} ${comprobanteAppt.patient?.profile?.last_name||patient?.profile?.last_name||''}`.trim()
            const idNumber = patient?.id_number || ''
            const dateFormatted = new Date(comprobanteAppt.appointment_date+'T12:00:00').toLocaleDateString('es-CR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
            const doctorName = doctor ? `${doctor.prefix?doctor.prefix+' ':''}${doctor.first_name} ${doctor.last_name}` : ''
            const doctorCode = doctor?.medical_code || ''
            const clinicName = profile?.clinic_name || clinicSettings?.clinic_name || ''

            function generatePDF() {
              const canvas = document.getElementById('firma-canvas')
              const firmaDataUrl = canvas ? canvas.toDataURL('image/png') : ''
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Inter', sans-serif; color: #1a1a1a; background: #fff; }
                .page { max-width: 680px; margin: 0 auto; position: relative; }
                .header { background: linear-gradient(135deg,#1b5e20,#2e7d32,#43a047); padding: 28px 36px 22px; color: #fff; }
                .clinic-name { font-size: 20pt; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.01em; }
                .clinic-sub { font-size: 10pt; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.08em; }
                .meta-bar { background: #f1f8e9; border-bottom: 2px solid #c8e6c9; padding: 10px 36px; font-size: 10pt; color: #2e7d32; font-weight: 500; }
                .body { padding: 28px 36px 36px; position: relative; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 13pt; font-weight: 700; color: rgba(15,110,86,0.08); text-align: center; pointer-events: none; white-space: nowrap; line-height: 1.6; }
                .intro { font-size: 11pt; color: #555; line-height: 1.7; margin-bottom: 20px; }
                .field { display: flex; gap: 8px; margin-bottom: 11px; font-size: 11pt; padding-bottom: 11px; border-bottom: 1px solid #f0f0f0; }
                .label { color: #6b8f7e; min-width: 220px; font-size: 10pt; }
                .value { font-weight: 600; color: #1a1a1a; }
                .sig-section { margin-top: 28px; display: flex; flex-direction: column; align-items: flex-end; }
                .sig-line { border-top: 1.5px solid #2e7d32; width: 220px; margin-bottom: 6px; }
                .sig-label { font-size: 10pt; color: #2e7d32; font-weight: 600; text-align: right; }
                .sig-sub { font-size: 9pt; color: #888; text-align: right; margin-top: 2px; }
                 .sig-img { width: 220px; height: 80px; border: none; object-fit: contain; margin-bottom: 0; }
                 .footer { display: none; }
                 .footer-text { display: none; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
              </style></head><body>
              <div class="page">
                <div class="header">
                  <div class="clinic-name">${clinicName||''}</div>
                  <div class="clinic-sub">Comprobante de asistencia a cita médica</div>
                </div>
                 <div class="meta-bar">Documento oficial</div>
                <div class="body">
                  <div class="watermark">Este comprobante es verificado<br/>por el centro de atención</div>
                  <p class="intro">El presente comprobante se extiende para confirmar la asistencia a cita médica de:</p>
                  <div class="field"><span class="label">Nombre del paciente</span><span class="value">${patientName}</span></div>
                  <div class="field"><span class="label">Número de identificación</span><span class="value">${idNumber||'—'}</span></div>
                  <div class="field"><span class="label">Fecha de la cita</span><span class="value">${dateFormatted}</span></div>
                  <div class="field"><span class="label">Hora de ingreso</span><span class="value">${comprobanteHoraIngreso||'—'}</span></div>
                  <div class="field"><span class="label">Hora de salida</span><span class="value">${comprobanteHoraSalida||'—'}</span></div>
                  <div class="field"><span class="label">Atención médica brindada por</span><span class="value">${doctorName}${doctorCode?' — '+doctorCode:''}</span></div>
                  <div class="sig-section">
                    ${firmaDataUrl ? `<img src="${firmaDataUrl}" class="sig-img" />` : '<div class="sig-img"></div>'}
                    <div class="sig-line"></div>
                    <div class="sig-label">Firma del médico tratante</div>
                    <div class="sig-sub">${doctorName}</div>
                  </div>
                </div>
                <div class="footer">
                  <span class="footer-text">${clinicName||''}</span>
                  <span class="footer-text">MedTrack · ${new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</span>
                </div>
              </div>
              </body></html>`
              const w = window.open('','_blank')
              w.document.write(html); w.document.close(); w.focus()
              setTimeout(() => { w.print(); w.close() }, 600)
            }

            return (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}
                onClick={e => { if(e.target===e.currentTarget) setComprobanteAppt(null) }}>
                <div style={{ background:'#fff', borderRadius:16, padding:28, width:520, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <div style={{ fontSize:15, fontWeight:600, color:'#1a3a5c' }}>Comprobante de asistencia</div>
                    <button onClick={() => setComprobanteAppt(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
                  </div>

                  <div style={{ fontSize:12, color:'#555', lineHeight:1.7, marginBottom:16 }}>
                    El presente comprobante se extiende para confirmar la asistencia a cita médica de:
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20, fontSize:13 }}>
                    <div style={{ display:'flex', gap:8 }}><span style={{ color:'#888', minWidth:180 }}>Nombre del paciente:</span><span style={{ fontWeight:500 }}>{patientName}</span></div>
                    <div style={{ display:'flex', gap:8 }}><span style={{ color:'#888', minWidth:180 }}>Número de identificación:</span><span style={{ fontWeight:500 }}>{idNumber||'—'}</span></div>
                    <div style={{ display:'flex', gap:8 }}><span style={{ color:'#888', minWidth:180 }}>Fecha de la cita:</span><span style={{ fontWeight:500 }}>{dateFormatted}</span></div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:'#888', minWidth:180 }}>Hora de ingreso:</span>
                      <input type="time" value={comprobanteHoraIngreso} onChange={e => setComprobanteHoraIngreso(e.target.value)}
                        style={{ fontSize:13, padding:'4px 8px', border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:'#888', minWidth:180 }}>Hora de salida:</span>
                      <input type="time" value={comprobanteHoraSalida} onChange={e => setComprobanteHoraSalida(e.target.value)}
                        style={{ fontSize:13, padding:'4px 8px', border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                    </div>
                    <div style={{ display:'flex', gap:8 }}><span style={{ color:'#888', minWidth:180 }}>Atención brindada por:</span><span style={{ fontWeight:500 }}>{doctorName}{doctorCode?' - '+doctorCode:''}</span></div>
                  </div>

                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:12, color:'#888', textAlign:'center', marginBottom:8 }}>Firma del médico tratante</div>
                    <canvas id="firma-canvas" width="464" height="110"
                      style={{ display:'block', width:'100%', height:110, border:'1px solid #e0e0e0', borderRadius:8, background:'#fafafa', cursor:'crosshair', touchAction:'none' }} />
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
                      <button onClick={() => { const c=document.getElementById('firma-canvas'); c.getContext('2d').clearRect(0,0,c.width,c.height) }}
                        style={{ fontSize:11, color:'#888', background:'none', border:'0.5px solid #e0e0e0', borderRadius:6, padding:'3px 8px', cursor:'pointer' }}>
                        Limpiar firma
                      </button>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                    <button onClick={() => setComprobanteAppt(null)}
                      style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                      Cancelar
                    </button>
                    <button onClick={generatePDF}
                      style={{ padding:'8px 20px', background:'var(--clinic-primary, #0F6E56)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                      Generar PDF
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}


          {view === 'chat' && (
            <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', height:'calc(100vh - 130px)', background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
              <div style={{ borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column' }}>
                <div style={{ padding:'11px 12px', borderBottom:'0.5px solid #eee', fontSize:13, fontWeight:500, color:'#1a1a1a' }}>
                  Conversaciones
                  {pendingCount > 0 && <span style={{ marginLeft:8, background:'#D85A30', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:13, fontWeight:500 }}>{pendingCount}</span>}
                </div>
                <div style={{ flex:1, overflowY:'auto' }}>
                  {pendingChats().map(c => {
                    const last = c.msgs[0]
                    const unread = c.msgs.filter(m => !m.is_read && m.sender_role === 'patient').length
                    return (
                      <div key={c.patientId} onClick={() => openChat(c)}
                        style={{ padding:'10px 12px', borderBottom:'1px solid #ebebeb', cursor:'pointer', background: activeChat?.patientId === c.patientId ? '#E1F5EE' : 'transparent' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{c.name || 'Paciente'}</div>
                          {unread > 0 && <div style={{ width:8, height:8, borderRadius:'50%', background:'#D85A30', marginTop:4 }} />}
                        </div>
                        <div style={{ fontSize:13, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last?.content}</div>
                      </div>
                    )
                  })}
                  {pendingChats().length === 0 && <div style={{ padding:20, textAlign:'center', fontSize:13, color:'#999' }}>Sin conversaciones</div>}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {!activeChat && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#999' }}>Selecciona una conversacion</div>}
                {activeChat && (
                  <>
                    <div style={{ padding:'11px 14px', borderBottom:'0.5px solid #eee', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span>{activeChat.name}</span>
                      <button onClick={() => deleteChat(activeChat.patientId)} style={{ background:'none', border:'none', cursor:'pointer', color:'#D85A30', fontSize:13, padding:'2px 8px', borderRadius:6, border:'1px solid #D85A30' }}>Eliminar chat</button>
                    </div>
                    <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
                      {[...activeChat.msgs].reverse().map(m => (
                        <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: m.sender_role === 'doctor' ? 'flex-end' : 'flex-start' }}>
                          {m.sender_role === 'doctor' && <div style={{ fontSize:13, color:'#888', marginBottom:2, textAlign:'right' }}>{m.sender?.first_name ? `Dr. ${m.sender.first_name} ${m.sender.last_name}` : 'Doctor adicional'}</div>}
                          <div style={{ maxWidth:'78%', padding:'8px 11px', borderRadius:12, fontSize:13, lineHeight:1.5, background: m.sender_role === 'doctor' ? G : '#f0f0f0', color: m.sender_role === 'doctor' ? '#fff' : '#1a1a1a' }}>
                            {m.content}
                          </div>
                          <div style={{ fontSize:13, color:'#999', marginTop:2 }}>{new Date(m.created_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:'10px 12px', borderTop:'0.5px solid #eee', display:'flex', gap:8 }}>
                      <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                        placeholder="Escribe tu respuesta..."
                        style={{ flex:1, padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                      <button onClick={sendMessage} style={{ width:32, height:32, borderRadius:'50%', background:'var(--clinic-primary, #0F6E56)', border:'none', cursor:'pointer', color:'#fff', fontSize:13 }}>{'>'}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {view === 'reportes' && (
            <ReportesView
              appts={appts}
              patients={patients}
              doctors={doctors}
              profile={{...profile, clinic_id: effectiveClinicId}}
              isMobile={isMobile}
              branches={branches}
              isClinicAdmin={isClinicAdmin}
            />
          )}

          {view === 'biblioteca' && (
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
              {['task','treatment'].map(type => (
                <div key={type} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>{type === 'task' ? 'Tareas' : 'Tratamientos'} ({library.filter(l => l.type === type).length})</div>
                  {library.filter(l => l.type === type).map(item => (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border:'0.5px solid #eee', marginBottom:5, background:'#fafafa' }}>
                      <span style={{ fontSize:13, flex:1, color:'#1a1a1a' }}>{item.name}</span>
                      {item.category && <span style={{ fontSize:13, padding:'1px 7px', borderRadius:20, background:'#f0f0f0', color:'#888', whiteSpace:'nowrap' }}>{item.category}</span>}
                      <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#D85A30' }}
                        onClick={() => openDelete('library', item.id, item.name)}>X</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {view === 'permisos' && (
            <div>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                {doctors.filter(d => d.role === 'doctor').map(d => (
                  <div key={d.id} onClick={() => setSelDoctor(d.id)}
                    style={{ flex:1, padding:'10px 14px', borderRadius:10, border: '1px solid ' + (selDoctor === d.id ? G : '#eee'), background: selDoctor === d.id ? '#E1F5EE' : '#fff', cursor:'pointer' }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{d.prefix ? d.prefix+' ' : ''}{d.last_name} {d.first_name}</div>
                    <div style={{ fontSize:13, color:'#999' }}>Colaborador</div>
                  </div>
                ))}
                {doctors.filter(d => d.role === 'doctor').length === 0 && <div style={{ fontSize:13, color:'#999' }}>No hay medicos colaboradores registrados</div>}
              </div>
              {selDoctor && (() => {
                const perm = perms.find(p => p.doctor_id === selDoctor)
                if (!perm) return <div style={{ fontSize:13, color:'#999' }}>Sin permisos registrados</div>
                const fields = [
                  { key:'can_create_patients', label:'Crear pacientes nuevos' },
                  { key:'can_delete_patients', label:'Eliminar pacientes' },
                  { key:'can_view_all_patients', label:'Ver todos los pacientes' },
                  { key:'can_record_measurements', label:'Registrar mediciones' },
                  { key:'can_record_treatments', label:'Registrar tratamientos' },
                  { key:'can_manage_goals', label:'Gestionar objetivos y tareas' },
                  { key:'can_access_chat', label:'Acceso al chat' },
                  { key:'can_view_reports', label:'Ver reportes' },
                  { key:'can_edit_library', label:'Editar biblioteca global' },
                ]
                return (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Permisos - {doctors.find(d => d.id === selDoctor)?.first_name} {doctors.find(d => d.id === selDoctor)?.last_name}</div>
                    {fields.map(f => (
                      <div key={f.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #ebebeb' }}>
                        <span style={{ fontSize:13, color:'#444' }}>{f.label}</span>
                        <div onClick={() => savePerm(selDoctor, f.key, !perm[f.key])}
                          style={{ width:36, height:20, borderRadius:10, cursor:'pointer', transition:'background 0.2s', position:'relative', background: perm[f.key] ? G : '#e0e0e0' }}>
                          <div style={{ position:'absolute', width:14, height:14, borderRadius:'50%', background:'#fff', top:3, left: perm[f.key] ? 19 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {view === 'sucursales' && isClinicAdmin && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>Sucursales de la clínica</div>
                <button style={s.btnPrimary} onClick={() => { setBranchForm({ clinic_id: effectiveClinicId, name:'', is_active:true }); setModal('branch') }}>+ Nueva sucursal</button>
              </div>
              {branches.length === 0 && <div style={{ textAlign:'center', padding:40, color:'#999', fontSize:13 }}>No hay sucursales registradas</div>}
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap:10 }}>
                {branches.map(branch => (
                  <div key={branch.id} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#ccc'} onMouseLeave={e=>e.currentTarget.style.borderColor='#eee'}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className="ti ti-building" style={{ fontSize:16, color:'#0F6E56' }} aria-hidden="true"></i>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{branch.name}</div>
                        {(branch.canton || branch.province) && <div style={{ fontSize:11, color:'#999', marginTop:1 }}>{[branch.canton, branch.province].filter(Boolean).join(', ')}</div>}
                      </div>
                    </div>
                    <div style={{ height:'0.5px', background:'#f0f0f0' }} />
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background: branch.is_active ? '#E1F5EE' : '#f5f5f5', color: branch.is_active ? '#0F6E56' : '#999' }}>{branch.is_active ? 'Activa' : 'Inactiva'}</span>
                      {branch.address && <span style={{ fontSize:11, color:'#bbb', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{branch.address}</span>}
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:6 }}>
                      <button style={{ width:28, height:28, borderRadius:6, border:'0.5px solid #eee', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                        onClick={() => { setBranchForm({ ...branch }); setModal('branch') }} title="Editar">
                        <i className="ti ti-edit" style={{ fontSize:13, color:'#666' }} aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modal === 'block-agenda' && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
              <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:480 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:12, borderBottom:'0.5px solid #eee' }}>
                  <div style={{ width:28, height:28, background:'#F1EFE8', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-ban" style={{ fontSize:15, color:'#5F5E5A' }} aria-hidden="true"></i>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>Bloquear agenda</div>
                    <div style={{ fontSize:11, color:'#999' }}>Aparecerá como franja gris en el calendario</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
                  <div>
                    <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:4 }}>Profesional</label>
                    <select value={blockForm.doctor_id} onChange={e => setBlockForm(p=>({...p, doctor_id:e.target.value}))}
                      style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:7, outline:'none', fontFamily:'inherit' }}>
                      <option value="">Sin asignar</option>
                      {doctors.filter(d => d.is_health_professional || d.role === 'doctor').map(d => <option key={d.id} value={d.id}>{d.prefix ? d.prefix+' ' : ''}{d.first_name} {d.last_name}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div>
                      <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:4 }}>Fecha inicio *</label>
                      <input type="date" value={blockForm.date} onChange={e => setBlockForm(p=>({...p, date:e.target.value}))}
                        style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:7, outline:'none', fontFamily:'inherit' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:4 }}>Fecha fin <span style={{ color:'#bbb' }}>(opcional)</span></label>
                      <input type="date" value={blockForm.end_date} onChange={e => setBlockForm(p=>({...p, end_date:e.target.value}))}
                        style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:7, outline:'none', fontFamily:'inherit' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:4 }}>Hora inicio *</label>
                      <input type="time" value={blockForm.start_time} onChange={e => setBlockForm(p=>({...p, start_time:e.target.value}))}
                        style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:7, outline:'none', fontFamily:'inherit' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:4 }}>Hora fin *</label>
                      <input type="time" value={blockForm.end_time} onChange={e => setBlockForm(p=>({...p, end_time:e.target.value}))}
                        style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:7, outline:'none', fontFamily:'inherit' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:4 }}>Motivo</label>
                    <input value={blockForm.reason} onChange={e => setBlockForm(p=>({...p, reason:e.target.value}))}
                      placeholder="Ej: Almuerzo, reunión, día libre..."
                      style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:7, outline:'none', fontFamily:'inherit' }} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:12, borderTop:'0.5px solid #eee' }}>
                  <button onClick={() => setModal(null)} style={{ padding:'7px 14px', border:'0.5px solid #ddd', borderRadius:7, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>Cancelar</button>
                  <button onClick={saveBlock} style={{ padding:'7px 16px', background:'#5F5E5A', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-ban" style={{ fontSize:12 }} aria-hidden="true"></i> Bloquear
                  </button>
                </div>
              </div>
            </div>
          )}

          {modal === 'availability' && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
              <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:540, maxHeight:'92vh', overflowY:'auto' }}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:14, borderBottom:'0.5px solid #eee' }}>
                  <div style={{ width:32, height:32, background:'#E1F5EE', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-calendar-time" style={{ fontSize:18, color:'#1D9E75' }} aria-hidden="true"></i>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>Gestión de disponibilidad</div>
                    <div style={{ fontSize:11, color:'#999', marginTop:1 }}>{clinicSettings?.clinic_name || 'Clínica'}</div>
                  </div>
                </div>

                {/* Formulario */}
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Profesional</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                    <div>
                      <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:5 }}>Profesional {profile?.role !== 'doctor' && '*'}</label>
                      {profile?.role === 'doctor' ? (
                        <div style={{ padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, background:'#f8f8f8', color:'#666' }}>
                          {profile?.prefix ? profile.prefix+' ' : ''}{profile?.first_name} {profile?.last_name}
                        </div>
                      ) : (
                        <select value={availForm.doctor_id} onChange={e => setAvailForm(p=>({...p, doctor_id:e.target.value}))}
                          style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }}>
                          <option value="">Seleccionar...</option>
                          {doctors.filter(d => d.is_health_professional || d.role === 'doctor').map(d => <option key={d.id} value={d.id}>{d.prefix ? d.prefix+' ' : ''}{d.first_name} {d.last_name}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:5 }}>Sucursal</label>
                      {isClinicAdmin ? (
                        <select value={availForm.branch_id||''} onChange={e => setAvailForm(p=>({...p, branch_id:e.target.value}))}
                          style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }}>
                          <option value="">Sin sucursal específica</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      ) : (
                        <div style={{ padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, background:'#f8f8f8', color:'#666' }}>
                          {branches.find(b => b.id === myBranchId)?.name || '—'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop:'0.5px solid #eee', paddingTop:16, marginBottom:16 }}>
                    <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Horario</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                      <div>
                        <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:5 }}>Hora inicio</label>
                        <input type="time" value={availForm.start_time} onChange={e => setAvailForm(p=>({...p, start_time:e.target.value}))}
                          style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                      </div>
                      <div>
                        <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:5 }}>Hora fin</label>
                        <input type="time" value={availForm.end_time} onChange={e => setAvailForm(p=>({...p, end_time:e.target.value}))}
                          style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                      </div>
                      <div>
                        <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:5 }}>Fecha inicio</label>
                        <input type="date" value={availForm.start_date||''} onChange={e => setAvailForm(p=>({...p, start_date:e.target.value}))}
                          style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop:'0.5px solid #eee', paddingTop:16, marginBottom:16 }}>
                    <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Tipo de repetición</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                      {[
                        { key:'weekly', label:'Semanal', sub:'Mismos días cada semana' },
                        { key:'daily', label:'Diario', sub:'Todos los días' },
                        { key:'weekdays', label:'Entre semana', sub:'Lunes a viernes' },
                        { key:'once', label:'Sin repetición', sub:'Solo esta fecha' },
                      ].map(opt => (
                        <div key={opt.key} onClick={() => setAvailForm(p=>({...p, repeat_type:opt.key}))}
                          style={{ border: availForm.repeat_type === opt.key ? '1.5px solid #1D9E75' : '0.5px solid #eee', borderRadius:8, padding:'10px 12px', cursor:'pointer', background: availForm.repeat_type === opt.key ? '#E1F5EE' : '#fff' }}>
                          <div style={{ fontSize:12, fontWeight:500, color: availForm.repeat_type === opt.key ? '#085041' : '#1a1a1a' }}>{opt.label}</div>
                          <div style={{ fontSize:11, color: availForm.repeat_type === opt.key ? '#0F6E56' : '#999', marginTop:2 }}>{opt.sub}</div>
                        </div>
                      ))}
                    </div>

                    {availForm.repeat_type === 'weekly' && (
                      <div style={{ marginBottom:14 }}>
                        <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:8 }}>Días de la semana</label>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6 }}>
                          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d, i) => (
                            <div key={i} onClick={() => {
                              const days = availForm.days_of_week || []
                              const next = days.includes(i) ? days.filter(x => x !== i) : [...days, i]
                              setAvailForm(p=>({...p, days_of_week: next}))
                            }}
                              style={{ border: (availForm.days_of_week||[]).includes(i) ? '1.5px solid #1D9E75' : '0.5px solid #eee', borderRadius:8, padding:'7px 4px', fontSize:11, fontWeight:500, textAlign:'center', cursor:'pointer', background: (availForm.days_of_week||[]).includes(i) ? '#1D9E75' : '#fff', color: (availForm.days_of_week||[]).includes(i) ? '#fff' : '#666' }}>
                              {d}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {availForm.repeat_type !== 'once' && (
                      <div>
                        <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:8 }}>Fin de disponibilidad</label>
                        <div style={{ display:'flex', gap:8, marginBottom: availForm.end_type === 'date' ? 10 : 0 }}>
                          {[{key:'indefinite', label:'Indefinida', icon:'ti-infinity'}, {key:'date', label:'Fecha límite', icon:'ti-calendar-x'}].map(opt => (
                            <div key={opt.key} onClick={() => setAvailForm(p=>({...p, end_type:opt.key||'indefinite'}))}
                              style={{ flex:1, border: (availForm.end_type||'indefinite') === opt.key ? '1.5px solid #1D9E75' : '0.5px solid #eee', borderRadius:8, padding:'8px 12px', cursor:'pointer', textAlign:'center', background: (availForm.end_type||'indefinite') === opt.key ? '#E1F5EE' : '#fff' }}>
                              <i className={`ti ${opt.icon}`} style={{ fontSize:14, marginRight:4, color: (availForm.end_type||'indefinite') === opt.key ? '#085041' : '#999' }} aria-hidden="true"></i>
                              <span style={{ fontSize:12, fontWeight:500, color: (availForm.end_type||'indefinite') === opt.key ? '#085041' : '#666' }}>{opt.label}</span>
                            </div>
                          ))}
                        </div>
                        {(availForm.end_type === 'date') && (
                          <input type="date" value={availForm.repeat_until||''} onChange={e => setAvailForm(p=>({...p, repeat_until:e.target.value}))}
                            style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', marginTop:8 }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:14, borderTop:'0.5px solid #eee' }}>
                  {availForm.id && <button onClick={() => setAvailForm({ doctor_id:'', branch_id:'', start_time:'08:00', end_time:'17:00', repeat_type:'weekly', days_of_week:[], start_date:'', end_type:'indefinite', repeat_until:'' })}
                    style={{ padding:'8px 16px', border:'1px solid #eee', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>Cancelar edición</button>}
                  <button onClick={() => setModal(null)}
                    style={{ padding:'8px 16px', border:'0.5px solid #ddd', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>Cerrar</button>
                  <button onClick={saveAvailability}
                    style={{ padding:'8px 18px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true"></i>
                    {availForm.id ? 'Actualizar' : 'Guardar disponibilidad'}
                  </button>
                </div>

                {/* Lista de disponibilidades */}
                {availability.length > 0 && (
                  <div style={{ marginTop:20, paddingTop:16, borderTop:'0.5px solid #eee' }}>
                    <div style={{ fontSize:10, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Disponibilidades registradas</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {availability.map(a => {
                        const dName = a.doctor ? `${a.doctor.prefix ? a.doctor.prefix+' ' : ''}${a.doctor.first_name} ${a.doctor.last_name}` : ''
                        const color = doctorColor(a.doctor_id)
                        const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
                        const dayLabel = a.repeat_type === 'weekly' ? (a.days_of_week?.map(d => days[d]).join(', ') || days[a.day_of_week]) : a.repeat_type === 'daily' ? 'Todos los días' : a.repeat_type === 'weekdays' ? 'Lun–Vie' : a.specific_date
                        return (
                          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#f8f8f8', borderRadius:8, borderLeft:`3px solid ${color}`, borderRadius:'0 8px 8px 0' }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a' }}>{dName}</div>
                              <div style={{ fontSize:11, color:'#888' }}>{dayLabel} · {a.start_time?.substring(0,5)} – {a.end_time?.substring(0,5)}{a.repeat_until ? ` · hasta ${a.repeat_until}` : ' · indefinida'}</div>
                            </div>
                            <button onClick={() => setAvailForm({ ...a, days_of_week: a.days_of_week || (a.day_of_week != null ? [a.day_of_week] : []), start_date: a.specific_date||'', end_type: a.repeat_until ? 'date' : 'indefinite', branch_id: a.branch_id||'' })}
                              style={{ padding:'3px 10px', border:'0.5px solid #eee', borderRadius:6, cursor:'pointer', fontSize:11, color:'#555', background:'#fff' }}>Editar</button>
                            <button onClick={() => deleteAvailability(a.id)}
                              style={{ padding:'3px 10px', border:'0.5px solid #fde0e0', borderRadius:6, cursor:'pointer', fontSize:11, color:'#d9534f', background:'#fff' }}>Eliminar</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {modal === 'assign-modules-new' && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
              <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <div style={{ width:32, height:32, background:'#E1F5EE', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-layout-grid-add" style={{ fontSize:18, color:'#1D9E75' }} aria-hidden="true"></i>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>Asignar módulos</div>
                    <div style={{ fontSize:11, color:'#999' }}>Paciente creado — asigná los módulos ahora o después</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:'#888', marginBottom:16, padding:'8px 12px', background:'#f8fffe', borderRadius:8, border:'1px solid #E1F5EE' }}>
                  <i className="ti ti-info-circle" style={{ fontSize:13, marginRight:4, color:'#1D9E75' }} aria-hidden="true"></i>
                  Podés asignar módulos ahora o hacerlo más adelante desde el expediente del paciente.
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                  {(() => {
                    const MODULE_LABELS = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería', odontologia:'Odontología', nutricion:'Nutrición' }
                    const MODULE_ICONS = { integral:'ti-stethoscope', metabolica:'ti-activity', estetica:'ti-sparkles', fisioterapia:'ti-run', enfermeria:'ti-first-aid-kit', odontologia:'ti-tooth', nutricion:'ti-salad' }
                    const MODULE_COLORS = { integral:'#1a5c8a', metabolica:'#0F6E56', estetica:'#8e44ad', fisioterapia:'#e67e22', enfermeria:'#c0392b', odontologia:'#0e4d8a', nutricion:'#2e7d32' }
                    return enabledModules.map(mod => {
                      const assigned = moduleAssignments[mod]
                      return (
                        <div key={mod} style={{ border: assigned ? `1.5px solid ${MODULE_COLORS[mod]}` : '0.5px solid #eee', borderRadius:10, padding:'12px 14px', background: assigned ? MODULE_COLORS[mod]+'08' : '#fff' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: assigned !== undefined ? 8 : 0 }}>
                            <i className={`ti ${MODULE_ICONS[mod]}`} style={{ fontSize:16, color: MODULE_COLORS[mod] }} aria-hidden="true"></i>
                            <div style={{ flex:1, fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{MODULE_LABELS[mod]}</div>
                            <div onClick={() => setModuleAssignments(p => {
                              if (p[mod] !== undefined) { const n = {...p}; delete n[mod]; return n }
                              return {...p, [mod]: ''}
                            })}
                              style={{ width:20, height:20, borderRadius:4, border: assigned !== undefined ? `2px solid ${MODULE_COLORS[mod]}` : '2px solid #ccc', background: assigned !== undefined ? MODULE_COLORS[mod] : '#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                              {assigned !== undefined && <i className="ti ti-check" style={{ fontSize:11, color:'#fff' }} aria-hidden="true"></i>}
                            </div>
                          </div>
                          {assigned !== undefined && (
                            <select value={assigned} onChange={e => setModuleAssignments(p=>({...p, [mod]:e.target.value}))}
                              style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }}>
                              <option value="">Sin profesional asignado</option>
                              {doctors.filter(d => d.is_health_professional || d.role === 'doctor').map(d => (
                                <option key={d.id} value={d.id}>{d.prefix ? d.prefix+' ' : ''}{d.first_name} {d.last_name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button onClick={() => { setModal(null); setNewPatientId(null) }}
                    style={{ padding:'8px 16px', border:'0.5px solid #ddd', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                    Omitir por ahora
                  </button>
                  <button onClick={async () => {
                    if (!newPatientId) return
                    const assigns = Object.entries(moduleAssignments).filter(([,v]) => v !== undefined)
                    if (assigns.length > 0) {
                      await Promise.all(assigns.map(([mod, docId]) =>
                        supabase.from('patient_care_modules').upsert({
                          patient_id: newPatientId,
                          module_type: mod,
                          assigned_professional_id: docId || null,
                          is_active: true,
                          clinic_id: effectiveClinicId,
                        }, { onConflict: 'patient_id,module_type' })
                      ))
                    }
                    setModal(null); setNewPatientId(null)
                  }}
                    style={{ padding:'8px 18px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true"></i>
                    Guardar módulos
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'inventario' && (
            <InventarioTab profile={{...profile, clinic_id: effectiveClinicId}} branches={branches} isClinicAdmin={isClinicAdmin} />
          )}
          {view === 'tickets' && ['clinic_admin','admin'].includes(profile?.role) && (
            <TicketsTab profile={profile} />
          )}

          {view === 'config' && clinicSettings && (
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'20px 24px' }}>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:20, color:'#1a1a1a' }}>Configuración de la clínica</div>

              <div style={{ fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Información general</div>
              {[
                { l:'Nombre de la clínica', k:'clinic_name', ph:'Glow Clinic' },
                { l:'WhatsApp de agenda', k:'whatsapp', ph:'+506 0000-0000' },
                { l:'Correo de contacto', k:'email', ph:'info@clinica.com' },
                { l:'Prefijo SKU inventario', k:'sku_prefix', ph:'GLO' },
              ].map((row,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:'9px 0', borderBottom:'1px solid #ebebeb', alignItems:'center' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{row.l}</div>
                  <input value={clinicSettings[row.k]||''} onChange={e => setClinicSettings(p=>({...p,[row.k]:e.target.value}))}
                    placeholder={row.ph} style={{ padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }} />
                </div>
              ))}

              <div style={{ fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, marginTop:20 }}>Ubicación de la clínica</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { l:'Provincia', k:'province', ph:'San José' },
                  { l:'Cantón', k:'canton', ph:'Escazú' },
                  { l:'Distrito', k:'district', ph:'San Rafael' },
                  { l:'Número de consultorio/oficina', k:'office_number', ph:'Consultorio 3B' },
                ].map((row,i) => (
                  <div key={i}>
                    <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>{row.l}</label>
                    <input value={clinicSettings[row.k]||''} onChange={e => setClinicSettings(p=>({...p,[row.k]:e.target.value}))}
                      placeholder={row.ph} style={{ width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
                  </div>
                ))}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ fontSize:12, color:'#666', display:'block', marginBottom:4 }}>Dirección exacta</label>
                  <input value={clinicSettings.address||''} onChange={e => setClinicSettings(p=>({...p,address:e.target.value}))}
                    placeholder='200m norte del parque central...' style={{ width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
                </div>
              </div>

              {(clinicSettings.province || clinicSettings.canton || clinicSettings.district || clinicSettings.address) && (
                <div style={{ marginTop:16, background:'#f0fdf9', border:'1px solid #E1F5EE', borderRadius:8, padding:'10px 14px' }}>
                  <div style={{ fontSize:11, color:'#0F6E56', fontWeight:600, marginBottom:4 }}>Vista previa en correos</div>
                  <div style={{ fontSize:13, color:'#444' }}>
                    📍 {[clinicSettings.address, clinicSettings.district, clinicSettings.canton, clinicSettings.province, clinicSettings.office_number].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}

              <button style={{ ...s.btnPrimary, marginTop:20, opacity:savingSettings?0.7:1 }} disabled={savingSettings} onClick={saveClinicSettings}>
                {savingSettings ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          )}

        </div>
      </div>
      <ChatBubble profile={profile} />
      <SpotifyBar returnTo='/admin' />
    </div>
  )
}

function AssignForm({ patient, doctors, saving, onSave, onClose }) {
  const name = ((patient.profile?.first_name || '') + ' ' + (patient.profile?.last_name || '')).trim()
  const [sel, setSel] = useState(patient.doctor?.id || null)
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Reasignar paciente</div>
      <div style={{ background:'#f8f8f8', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:13, color:'#444' }}>
        <strong>{name}</strong> - actualmente: {patient.doctor ? (patient.doctor.first_name + ' ' + patient.doctor.last_name) : 'Sin asignar'}
      </div>
      {doctors.map(d => (
        <div key={d.id} onClick={() => setSel(d.id)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:8, border: '1px solid ' + (sel === d.id ? '#1D9E75' : '#eee'), background: sel === d.id ? '#E1F5EE' : '#fff', marginBottom:6, cursor:'pointer' }}>
          <div style={{ fontSize:13, fontWeight:500, flex:1 }}>{d.first_name} {d.last_name}</div>
          {sel === d.id && <span style={{ color:'#1D9E75' }}>v</span>}
        </div>
      ))}
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(sel)}>{saving ? 'Guardando...' : 'Confirmar'}</button>
      </div>
    </>
  )
}

function ApptForm({ appt, patients, doctors, tags, saving, error, defaultDate, defaultTime, onSave, onClose, isAdmin, onGoToExpediente, onCancelAppt, onCreateTag, onDeleteTag }) {
  const [patSearch, setPatSearch] = React.useState('')
  const [selectedTags, setSelectedTags] = React.useState(appt?.tags?.map(t => t.tag?.id).filter(Boolean) || [])
  const [showTagManager, setShowTagManager] = React.useState(false)
  const [showTagDropdown, setShowTagDropdown] = React.useState(false)
  const [newTagName, setNewTagName] = React.useState('')
  const [newTagColor, setNewTagColor] = React.useState('#1D9E75')
  const [form, setForm] = useState({ id:appt?.id||null, patientId:appt?.patient_id||'', doctorId:appt?.doctor_id||'', date:appt?.appointment_date||defaultDate||'', time:appt?.appointment_time?.substring(0,5)||defaultTime||'09:00', visitType:appt?.visit_type||'Consulta de seguimiento', duration:appt?.duration_min||30, notes:appt?.notes||'', moduleType:appt?.module_type||'', status:appt?.status||'pending_confirmation' })
  const [patientModules, setPatientModules] = useState([])
  const MODULE_LABELS_A = { integral:'Atención integral', metabolica:'Atención metabólica', estetica:'Atención estética', fisioterapia:'Fisioterapia', enfermeria:'Enfermería', odontologia:'Odontología', nutricion:'Nutrición' }


  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))

  const pn = p => ((p.profile?.first_name || '') + ' ' + (p.profile?.last_name || '')).trim()
  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
        <div style={{ fontSize:16, fontWeight:600, color:'#1a1a1a' }}>{appt ? 'Editar cita' : 'Nueva cita'}</div>
        {appt && (appt.status === 'confirmed_patient' || appt.status === 'confirmed_doctor') && onGoToExpediente && (
          <button onClick={() => onGoToExpediente(appt)} style={{ background:'#0F6E56', color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:500, cursor:'pointer' }}>
            📋 Ir al expediente
          </button>
        )}
        {appt && appt.status !== 'confirmed_patient' && appt.status !== 'confirmed_doctor' && (
          <div style={{ position:'relative', display:'inline-block' }} className="tooltip-wrap">
            <button disabled style={{ background:'#f0f0f0', color:'#bbb', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:500, cursor:'not-allowed' }}>
              📋 Ir al expediente
            </button>
            <div style={{ position:'absolute', right:0, top:'110%', background:'#1a1a1a', color:'#fff', fontSize:11, padding:'6px 10px', borderRadius:7, width:220, lineHeight:1.5, zIndex:999, pointerEvents:'none', display:'none' }} className="tooltip-box">
              Confirmá la asistencia del paciente en el campo de estado para habilitar el acceso al expediente.
            </div>
            <style>{`.tooltip-wrap:hover .tooltip-box { display: block !important; }`}</style>
          </div>
        )}
      </div>
      <div style={{ fontSize:13, color:'#999', marginBottom:18 }}>{appt ? 'Modificá los datos de la cita' : 'Completá los datos para agendar'}</div>
      {error && <div style={{ background:'#FAECE7', color:'#C24B2A', fontSize:13, padding:'8px 11px', borderRadius:8, marginBottom:12 }}>{error}</div>}

      <div style={{ marginBottom:12 }}>
        <label style={s.fieldLabel}>Paciente</label>
        <div style={{ position:'relative' }}>
          <input value={patSearch} onChange={e => { setPatSearch(e.target.value); if (!e.target.value) f('patientId')({ target: { value: '' } }) }}
            placeholder="Buscar por nombre o cédula..."
            style={{ ...s.fieldInput, marginBottom: patSearch ? 0 : undefined, borderRadius: patSearch ? '8px 8px 0 0' : 8 }} />
          {patSearch && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e0e0e0', borderTop:'none', borderRadius:'0 0 8px 8px', zIndex:20, maxHeight:180, overflowY:'auto', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
              {patients.filter(p => {
                const q = patSearch.toLowerCase()
                const name = pn(p).toLowerCase()
                const id = (p.id_number||'').toLowerCase()
                return name.includes(q) || id.includes(q)
              }).slice(0,8).map(p => (
                <div key={p.id} onClick={() => { f('patientId')({ target: { value: p.id } }); setPatSearch('') }}
                  style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, color:'#1a1a1a', borderBottom:'0.5px solid #f0f0f0' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8f8f8'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ fontWeight:500 }}>{pn(p)}</div>
                  {p.id_number && <div style={{ fontSize:11, color:'#999' }}>ID: {p.id_number}</div>}
                </div>
              ))}
              {patients.filter(p => { const q = patSearch.toLowerCase(); return pn(p).toLowerCase().includes(q) || (p.id_number||'').toLowerCase().includes(q) }).length === 0 && (
                <div style={{ padding:'10px 12px', fontSize:12, color:'#bbb' }}>Sin resultados</div>
              )}
            </div>
          )}
        </div>
        {form.patientId && (
          <div style={{ fontSize:11, color:'#1D9E75', marginTop:4 }}>✓ {pn(patients.find(p => p.id === form.patientId) || {})}</div>
        )}
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={s.fieldLabel}>Médico asignado</label>
        <select value={form.doctorId} onChange={f('doctorId')} style={s.fieldInput}>
          <option value="">Selecciona...</option>
          {doctors.filter(d => d.is_health_professional || d.role === 'doctor').map(d => <option key={d.id} value={d.id}>{d.prefix ? d.prefix+' ' : ''}{d.first_name} {d.last_name}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <Field label="Fecha" value={form.date} onChange={f('date')} type="date" />
        <Field label="Hora" value={form.time} onChange={f('time')} type="time" />
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={s.fieldLabel}>Duración</label>
        <select value={form.duration} onChange={f('duration')} style={s.fieldInput}>
          {[15,30,45,60,75,90,105,120].map(v => <option key={v} value={v}>{v} min</option>)}
        </select>
      </div>


      
      <div style={{ marginBottom:12 }}>
        <label style={s.fieldLabel}>Estado de la cita</label>
        <select value={form.status} onChange={f('status')} style={s.fieldInput}>
          <option value="pending_confirmation">⏳ Pendiente confirmación</option>
          <option value="confirmed_patient">Confirmada por paciente</option>
          <option value="confirmed_doctor">Confirmada por médico</option>
          <option value="no_show">No asistió</option>
        </select>
      </div>

      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <label style={s.fieldLabel}>Etiquetas</label>
          <span onClick={() => setShowTagManager(p => !p)} style={{ fontSize:11, color:'#1D9E75', cursor:'pointer', textDecoration:'underline' }}>Gestionar</span>
        </div>
        {showTagManager && (
          <div style={{ background:'#f8f8f8', borderRadius:8, padding:10, marginBottom:8, border:'0.5px solid #eee' }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
              <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nueva etiqueta..." style={{ flex:1, minWidth:100, padding:'5px 8px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:6, outline:'none', fontFamily:'inherit' }} />
              <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} style={{ width:32, height:28, border:'1px solid #e0e0e0', borderRadius:6, cursor:'pointer', padding:2 }} />
              <button onClick={async () => { if (!newTagName.trim()) return; await onCreateTag({ name: newTagName.trim(), color: newTagColor }); setNewTagName(''); setNewTagColor('#1D9E75') }}
                style={{ padding:'5px 10px', background:'var(--clinic-primary)', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 }}>+ Crear</button>
            </div>
            {tags && tags.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {tags.map(tag => (
                  <div key={tag.id} style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:20, border:`1px solid ${tag.color}`, background:tag.color+'18', fontSize:11 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:tag.color }} />
                    <span style={{ color:tag.color, fontWeight:500 }}>{tag.name}</span>
                    <span onClick={() => onDeleteTag(tag.id)} style={{ cursor:'pointer', color:'#bbb', marginLeft:3, fontSize:13, lineHeight:1 }}>×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ position:'relative' }}>
          <div style={{ border:'1px solid #e0e0e0', borderRadius:8, padding:'6px 10px', minHeight:36, display:'flex', flexWrap:'wrap', gap:4, cursor:'pointer', background:'#fff' }}
            onClick={() => setShowTagDropdown(p => !p)}>
            {selectedTags.length === 0 && <span style={{ fontSize:12, color:'#bbb', lineHeight:'24px' }}>Seleccionar etiquetas...</span>}
            {selectedTags.map(id => { const tag = tags?.find(t => t.id === id); return tag ? (
              <div key={id} style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, background:tag.color+'18', border:`1px solid ${tag.color}`, fontSize:11 }}>
                <div style={{ width:7, height:7, borderRadius:2, background:tag.color }} />
                <span style={{ color:tag.color, fontWeight:500 }}>{tag.name}</span>
                <span onClick={e => { e.stopPropagation(); setSelectedTags(p => p.filter(x => x !== id)) }} style={{ cursor:'pointer', color:'#bbb', marginLeft:2, fontSize:13, lineHeight:1 }}>×</span>
              </div>
            ) : null})}
            <i className="ti ti-chevron-down" style={{ marginLeft:'auto', fontSize:13, color:'#bbb', alignSelf:'center' }} aria-hidden="true"></i>
          </div>
          {showTagDropdown && tags && tags.length > 0 && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, zIndex:20, boxShadow:'0 4px 12px rgba(0,0,0,0.08)', overflow:'hidden' }}>
              {tags.map(tag => (
                <div key={tag.id} onClick={() => { setSelectedTags(p => p.includes(tag.id) ? p.filter(x => x !== tag.id) : [...p, tag.id]) }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', cursor:'pointer', background: selectedTags.includes(tag.id) ? tag.color+'10' : '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = tag.color+'10'}
                  onMouseLeave={e => e.currentTarget.style.background = selectedTags.includes(tag.id) ? tag.color+'10' : '#fff'}>
                  <div style={{ width:10, height:10, borderRadius:2, background:tag.color, flexShrink:0 }} />
                  <span style={{ fontSize:12, flex:1, color:'#333' }}>{tag.name}</span>
                  {selectedTags.includes(tag.id) && <i className="ti ti-check" style={{ fontSize:13, color:tag.color }} aria-hidden="true"></i>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom:18 }}>
        <label style={s.fieldLabel}>Notas</label>
        <textarea value={form.notes} onChange={f('notes')} rows={2} style={{ ...s.fieldInput, resize:'vertical' }} placeholder="Indicaciones u observaciones..." />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        {appt && onCancelAppt && (
          <button style={{ background:'#fff', border:'1px solid #D85A30', color:'#D85A30', fontSize:13, padding:'7px 12px', borderRadius:8, cursor:'pointer' }}
            onClick={() => onCancelAppt(appt.id)}>🗑 Cancelar cita</button>
        )}
        <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form, selectedTags)}>{saving ? 'Guardando...' : appt ? 'Guardar cambios' : 'Agendar cita'}</button>
      </div>
    </>
  )
}

function LibraryForm({ saving, onSave, onClose }) {
  const [form, setForm] = useState({ type:'task', name:'', category:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Nuevo item de biblioteca</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div>
          <label style={s.fieldLabel}>Tipo</label>
          <select value={form.type} onChange={f('type')} style={s.fieldInput}>
            <option value="task">Tarea</option>
            <option value="treatment">Tratamiento</option>
          </select>
        </div>
        <Field label="Categoria" value={form.category} onChange={f('category')} placeholder="Nutricion..." />
        <div style={{ gridColumn:'1/-1' }}><Field label="Nombre" value={form.name} onChange={f('name')} placeholder="Descripcion del item" /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Agregar'}</button>
      </div>
    </>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={s.fieldLabel}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={s.fieldInput} />
    </div>
  )
}

const s = {
  btnPrimary: { background:'var(--clinic-primary, #1D9E75)', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' },
  btnCancel:  { background:'none', border:'1px solid #e0e0e0', fontSize:13, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  iconBtn:    { background:'#E6F1FB', color:'#185FA5', border:'none', cursor:'pointer', fontSize:13, fontWeight:500, padding:'4px 8px', borderRadius:6 },
  iconBtnDel: { background:'#FAECE7', color:'#D85A30', border:'none', cursor:'pointer', fontSize:13, fontWeight:500, padding:'4px 8px', borderRadius:6 },
  calNavBtn:  { background:'none', border:'1px solid #eee', borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#666' },
  fieldLabel: { display:'block', fontSize:13, color:'#666', marginBottom:4, fontWeight:500 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' },
}

function PatientProfileAdmin({ patient, doctors, profile, measurements, goals, tasks, treatments, notes, diagnoses, library, tab, setTab, saving, modal, modalData, setModal, setModalData, onSaveMeasurement, onEditMeasurement, onDeleteMeasurement, onSaveGoal, onDeleteGoal, onAssignTasks, onDeleteTask, onSaveTreatment, onSaveNote, onEditNote, onDeleteNote, onAddDiagnosis, onDeleteDiagnosis, cie10Search, setCie10Search, cie10Results, onSearchCie10, onBack, enabledModules, clinicPlan }) {
  const [careModules, setCareModules] = React.useState([])

  React.useEffect(() => {
    if (patient?.id) loadCareModules()
  }, [patient?.id])

  async function loadCareModules() {
    const { data } = await supabase.from('patient_care_modules')
      .select('*, professional:assigned_professional_id(id, first_name, last_name)')
      .eq('patient_id', patient.id)
      .eq('is_active', true)
    setCareModules(data || [])
  }
  const pName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()
  const latest = measurements[0] || null

  function age(dob) {
    if (!dob) return '--'
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25))
  }

  return (
    <div>
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ width:420, background:'#fff', borderRadius:16, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            {modal === 'new-measurement' && <MeasurementForm saving={saving} onSave={onSaveMeasurement} onClose={() => setModal(null)} />}
            {modal === 'edit-measurement' && <MeasurementForm saving={saving} measurement={modalData.measurement} onSave={form => onEditMeasurement(modalData.measurement.id, form)} onClose={() => setModal(null)} />}
            {modal === 'new-goal' && <GoalForm saving={saving} onSave={onSaveGoal} onClose={() => setModal(null)} />}
            {modal === 'assign-tasks' && <TaskPickerForm library={library.filter(l => l.type === 'task')} saving={saving} onSave={onAssignTasks} onClose={() => setModal(null)} />}
            {modal === 'new-treatment' && <TreatmentForm library={library.filter(l => l.type === 'treatment')} saving={saving} onSave={onSaveTreatment} onClose={() => setModal(null)} />}
            {modal === 'new-note' && <NoteForm saving={saving} onSave={onSaveNote} onClose={() => setModal(null)} />}
            {modal === 'edit-note' && <NoteForm saving={saving} note={modalData.note} onSave={form => onEditNote(modalData.note.id, form)} onClose={() => setModal(null)} />}
          </div>
        </div>
      )}

      <div style={{ background:'#EAF4F0', border:'0.5px solid #c8e6dc', borderRadius:12, padding:'14px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'#E6F1FB', color:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:500, flexShrink:0 }}>
          {(pName[0] || '').toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:500, color:'#1a1a1a' }}>{pName}</div>
          <div style={{ fontSize:13, color:'#666', marginTop:2 }}>{age(patient.birth_date)} años · {patient.height_cm ? patient.height_cm + ' cm' : ''} · {patient.sex || ''}</div>
          <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>{patient.profile?.email}</span>
            {patient.id_number && <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>ID: {patient.id_number}</span>}
            {patient.phone && <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>📞 {patient.phone}</span>}
            {(patient.province || patient.canton) && <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>📍 {[patient.province, patient.canton].filter(Boolean).join(', ')}</span>}
          </div>
        </div>
        <button style={{ marginLeft:'auto', background:'none', border:'1px solid #eee', borderRadius:8, padding:'6px 12px', fontSize:13, cursor:'pointer', color:'#666' }} onClick={onBack}>
          Volver
        </button>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', borderBottom:'0.5px solid #eee', marginBottom:14, background:'#fff', borderRadius:'12px 12px 0 0', overflow:'hidden' }}>
        {(() => {
          const MODULE_LABELS = {
            integral:     'Atención integral',
            metabolica:   'Atención metabólica',
            estetica:     'Atención estética',
            fisioterapia: 'Fisioterapia',
            enfermeria:   'Enfermería',
          }
          const MODULE_COLORS = {
            integral:     '#1a5c8a',
            metabolica:   '#0F6E56',
            estetica:     '#8e44ad',
            fisioterapia: '#e67e22',
            enfermeria:   '#c0392b',
          }
          const MODULE_ORDER = ['integral','metabolica','estetica','fisioterapia','enfermeria','odontologia','nutricion']
          const sorted = [...careModules].sort((a,b) => MODULE_ORDER.indexOf(a.module_type) - MODULE_ORDER.indexOf(b.module_type))
          const tabs = [
            ...sorted.map(m => ({ key:'modulo_'+m.module_type, label: MODULE_LABELS[m.module_type], color: MODULE_COLORS[m.module_type] })),
            { key:'chat_modulos', label:'Chat', color:'#555' },
            ...(clinicPlan !== 'basic' ? [{ key:'modulos', label:'Módulos', color:'#888' }] : []),
            { key:'documentos', label:'Documentos', color:'#555' },
            { key:'consentimientos', label:'Consentimientos', color:'#555' },
          ]
          return tabs.map(t => (
            <div key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'9px 14px', fontSize:13, cursor:'pointer', borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent', color: tab === t.key ? t.color : '#888', fontWeight: tab === t.key ? 500 : 400, whiteSpace:'nowrap' }}>
              {t.label}
            </div>
          ))
        })()}
      </div>

      {tab === 'chat_modulos' && (
        <ModuleChat
          patient={patient}
          careModules={careModules}
          profile={profile}
          senderRole="admin"
        />
      )}

      {tab.startsWith('modulo_') && (() => {
        const moduleType = tab.replace('modulo_', '')
        const mod = careModules.find(m => m.module_type === moduleType)
        return (
          <div>
            {moduleType === 'integral' && <IntegralModule patient={patient} careModule={mod} canEdit={true} profile={profile} />}
            {moduleType === 'metabolica' && <MetabolicModule patient={patient} careModule={mod} canEdit={true} canEditMeasurements={true} profile={profile} />}
            {moduleType === 'estetica' && <AestheticModule patient={patient} careModule={mod} canEdit={true} />}
            {moduleType === 'fisioterapia' && <FisioterapiaModule patient={patient} careModule={mod} canEdit={true} profile={profile} />}
            {moduleType === 'enfermeria' && <EnfermeriaModule patient={patient} careModule={mod} canEdit={true} profile={profile} />}
          </div>
        )
      })()}

      {tab === 'modulos' && (
        <CareModulesAdmin patient={patient} doctors={doctors} onModulesUpdated={loadCareModules} enabledModules={enabledModules} clinicPlan={clinicPlan} />
      )}

      {tab === 'documentos' && (
        <DocumentosTab patient={patient} profile={profile} />
      )}

      {tab === 'consentimientos' && (
        <ConsentimientosTab patient={patient} profile={profile} />
      )}

      {tab === 'diagnosticos' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Buscar diagnostico CIE-10</div>
            <div style={{ position:'relative' }}>
              <input
                value={cie10Search}
                onChange={e => { setCie10Search(e.target.value); onSearchCie10(e.target.value) }}
                placeholder="Escribe codigo o nombre del diagnostico..."
                style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
              />
              {cie10Results.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e0e0e0', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:10, maxHeight:240, overflowY:'auto' }}>
                  {cie10Results.map(r => (
                    <div key={r.code} onClick={() => onAddDiagnosis(r.code, r.description)}
                      style={{ padding:'9px 12px', cursor:'pointer', borderBottom:'1px solid #ebebeb', fontSize:13 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontWeight:500, color:'#1D9E75', marginRight:8 }}>{r.code}</span>
                      <span style={{ color:'#444' }}>{r.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Diagnosticos activos ({diagnoses.length})</div>
            {diagnoses.map(d => (
              <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #ebebeb' }}>
                <span style={{ fontSize:13, padding:'2px 8px', borderRadius:20, background:'#E6F1FB', color:'#185FA5', fontWeight:500, whiteSpace:'nowrap' }}>{d.cie10_code}</span>
                <span style={{ fontSize:13, flex:1, color:'#1a1a1a' }}>{d.cie10_description}</span>
                <span style={{ fontSize:13, color:'#bbb', whiteSpace:'nowrap' }}>{d.diagnosis_date}</span>
                <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#D85A30', flexShrink:0 }} onClick={() => onDeleteDiagnosis(d.id)}>x</button>
              </div>
            ))}
            {diagnoses.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:20 }}>Sin diagnosticos registrados</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function MeasurementForm({ saving, onSave, onClose, measurement }) {
  const [form, setForm] = useState({
    date: measurement?.measured_at || new Date().toISOString().split('T')[0],
    weight: measurement?.weight_kg || '',
    fat: measurement?.body_fat_pct || '',
    muscle: measurement?.muscle_mass_kg || '',
    visceral: measurement?.visceral_fat_pts || ''
  })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>{measurement ? 'Editar medicion' : 'Registrar medicion'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Fecha</label><input type="date" value={form.date} onChange={f('date')} style={sa.inp} /></div>
        <div><label style={sa.lbl}>Peso (kg)</label><input type="number" value={form.weight} onChange={f('weight')} placeholder="64.2" style={sa.inp} /></div>
        <div><label style={sa.lbl}>% Grasa</label><input type="number" value={form.fat} onChange={f('fat')} placeholder="29.1" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Masa muscular (kg)</label><input type="number" value={form.muscle} onChange={f('muscle')} placeholder="42.3" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Grasa visceral (pts)</label><input type="number" value={form.visceral} onChange={f('visceral')} placeholder="8" style={sa.inp} /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar medicion'}</button>
      </div>
    </>
  )
}

function GoalForm({ saving, onSave, onClose }) {
  const [form, setForm] = useState({ name:'', initial:'', target:'', deadline:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Nuevo objetivo</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Nombre del objetivo</label><input value={form.name} onChange={f('name')} placeholder="% grasa corporal" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Valor actual</label><input type="number" value={form.initial} onChange={f('initial')} placeholder="29.1" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Meta</label><input type="number" value={form.target} onChange={f('target')} placeholder="22.0" style={sa.inp} /></div>
        <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Fecha limite</label><input type="date" value={form.deadline} onChange={f('deadline')} style={sa.inp} /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar objetivo'}</button>
      </div>
    </>
  )
}

function TaskPickerForm({ library, saving, onSave, onClose }) {
  const [selected, setSelected] = useState(new Set())
  const [custom, setCustom] = useState('')
  const categories = [...new Set(library.map(l => l.category).filter(Boolean))]
  function toggle(name) {
    setSelected(prev => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next })
  }
  function addCustom() { if (!custom.trim()) return; setSelected(prev => new Set([...prev, custom.trim()])); setCustom('') }
  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:12 }}>Asignar tareas</div>
      <div style={{ maxHeight:280, overflowY:'auto', marginBottom:12 }}>
        {categories.map(cat => (
          <div key={cat}>
            <div style={{ fontSize:13, fontWeight:500, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 0 4px' }}>{cat}</div>
            {library.filter(l => l.category === cat).map(item => (
              <div key={item.id} onClick={() => toggle(item.name)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:8, border: '0.5px solid ' + (selected.has(item.name) ? '#1D9E75' : '#eee'), background: selected.has(item.name) ? '#E1F5EE' : '#fff', marginBottom:4, cursor:'pointer' }}>
                <span style={{ fontSize:13, flex:1, color: selected.has(item.name) ? '#0F6E56' : '#444' }}>{item.name}</span>
                {selected.has(item.name) && <span style={{ color:'#1D9E75' }}>v</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop:'0.5px dashed #eee', paddingTop:10, marginBottom:12 }}>
        <div style={{ fontSize:13, color:'#999', marginBottom:6 }}>Tarea personalizada:</div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustom() }} placeholder="Descripcion..." style={{ flex:1, padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
          <button style={sa.btnPrimary} onClick={addCustom}>+</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:(saving||selected.size===0)?0.7:1 }} disabled={saving||selected.size===0} onClick={() => onSave([...selected])}>
          {saving ? 'Asignando...' : 'Asignar ' + selected.size + ' tarea(s)'}
        </button>
      </div>
    </>
  )
}

function TreatmentForm({ library, saving, onSave, onClose }) {
  const [form, setForm] = useState({ product:'', dose:'', zone:'', session:'', date: new Date().toISOString().split('T')[0], notes:'' })
  const f = k => e => setForm(p => ({ ...p, [k]:e.target.value }))

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Registrar tratamiento</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={sa.lbl}>Procedimiento</label>
          <select value={form.product} onChange={f('product')} style={sa.inp}>
            <option value="">Selecciona...</option>
            {library.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            <option value="otro">+ Otro</option>
          </select>
        </div>
        {form.product === 'otro' && <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Nombre</label><input value={form.customProduct || ''} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} style={sa.inp} /></div>}
        <div><label style={sa.lbl}>Dosis / duracion</label><input value={form.dose} onChange={f('dose')} placeholder="2 ml / 60 min" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Zona tratada</label><input value={form.zone} onChange={f('zone')} placeholder="Cara y cuello" style={sa.inp} /></div>
        <div><label style={sa.lbl}>Fecha</label><input type="date" value={form.date} onChange={f('date')} style={sa.inp} /></div>
        <div><label style={sa.lbl}>Sesion</label><input value={form.session} onChange={f('session')} placeholder="Sesion 2 de 3" style={sa.inp} /></div>
        <div style={{ gridColumn:'1/-1' }}><label style={sa.lbl}>Observaciones</label><textarea value={form.notes} onChange={f('notes')} rows={2} style={{ ...sa.inp, resize:'vertical' }} placeholder="Buena tolerancia..." /></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar tratamiento'}</button>
      </div>
    </>
  )
}

function NoteForm({ saving, onSave, onClose, note }) {
  const [form, setForm] = useState({
    date: note?.note_date || new Date().toISOString().split('T')[0],
    visitType: note?.visit_type || 'Seguimiento',
    content: note?.content || '',
    pas: note?.pas || '', pad: note?.pad || '', spo2: note?.spo2 || '',
    o2device: note?.o2_device || 'aa', o2flow: note?.o2_flow || '',
    glucose: note?.glucose || '', hr: note?.heart_rate || ''
  })
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const pam = form.pas && form.pad
    ? Math.round((parseInt(form.pas) + 2 * parseInt(form.pad)) / 3)
    : null

  const DEVICES = ['aa','Canula nasal','Mascarilla simple','Mascarilla con reservorio','Ventimask','CPAP','BPAP','Tubo endotraqueal','Venturi']

  function vitalStatus(type, val) {
    const v = parseFloat(val)
    if (!val || isNaN(v)) return null
    if (type === 'pas') {
      if (v >= 140) return { icon:'🔴', msg:'Hipertension grado 1+' }
      if (v >= 120) return { icon:'⚠️', msg:'PA elevada' }
      if (v < 90)  return { icon:'🔴', msg:'Hipotension' }
      return { icon:'✅', msg:'Normal' }
    }
    if (type === 'pad') {
      if (v >= 90) return { icon:'🔴', msg:'Hipertension' }
      if (v >= 80) return { icon:'⚠️', msg:'PA elevada' }
      if (v < 60)  return { icon:'🔴', msg:'Hipotension' }
      return { icon:'✅', msg:'Normal' }
    }
    if (type === 'spo2') {
      if (v < 90)  return { icon:'🔴', msg:'Hipoxemia critica' }
      if (v < 95)  return { icon:'⚠️', msg:'Hipoxemia leve' }
      return { icon:'✅', msg:'Normal' }
    }
    if (type === 'glucose') {
      if (v < 70)   return { icon:'🔴', msg:'Hipoglicemia' }
      if (v >= 126) return { icon:'🔴', msg:'Hiperglicemia' }
      if (v >= 100) return { icon:'⚠️', msg:'Prediabetes/ayuno alterado' }
      return { icon:'✅', msg:'Normal' }
    }
    if (type === 'hr') {
      if (v > 120 || v < 50) return { icon:'🔴', msg: v > 120 ? 'Taquicardia severa' : 'Bradicardia severa' }
      if (v > 100 || v < 60) return { icon:'⚠️', msg: v > 100 ? 'Taquicardia' : 'Bradicardia' }
      return { icon:'✅', msg:'Normal' }
    }
    return null
  }

  function VitalBadge({ type, val }) {
    const st = vitalStatus(type, val)
    if (!st) return null
    const colors = { '✅': ['#E1F5EE','#0F6E56'], '⚠️': ['#FAEEDA','#854F0B'], '🔴': ['#FAECE7','#C24B2A'] }
    const [bg, fg] = colors[st.icon] || ['#f0f0f0','#666']
    return <span style={{ fontSize:13, padding:'2px 7px', borderRadius:20, background:bg, color:fg, marginLeft:6, fontWeight:500 }}>{st.icon} {st.msg}</span>
  }

  return (
    <>
      <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Nueva nota clinica</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div><label style={sa.lbl}>Fecha</label><input type="date" value={form.date} onChange={f('date')} style={sa.inp} /></div>
        <div>
          <label style={sa.lbl}>Tipo de consulta</label>
          <select value={form.visitType} onChange={f('visitType')} style={sa.inp}>
            {['Seguimiento','Primera consulta','Procedimiento','Control'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background:'#f8f8f8', borderRadius:10, padding:12, marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#666', marginBottom:10 }}>Signos vitales</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <label style={sa.lbl}>PAS (mmHg) <VitalBadge type="pas" val={form.pas} /></label>
            <input type="number" value={form.pas} onChange={f('pas')} placeholder="120" style={{ ...sa.inp, borderColor: vitalStatus('pas',form.pas)?.icon === '🔴' ? '#D85A30' : vitalStatus('pas',form.pas)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={sa.lbl}>PAD (mmHg) <VitalBadge type="pad" val={form.pad} /></label>
            <input type="number" value={form.pad} onChange={f('pad')} placeholder="80" style={{ ...sa.inp, borderColor: vitalStatus('pad',form.pad)?.icon === '🔴' ? '#D85A30' : vitalStatus('pad',form.pad)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={sa.lbl}>PAM (mmHg)</label>
            <input value={pam !== null ? pam + ' mmHg' : ''} readOnly placeholder="Auto"
              style={{ ...sa.inp, background:'#eee', color:'#666', cursor:'not-allowed' }} />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <label style={sa.lbl}>SpO2 (%) <VitalBadge type="spo2" val={form.spo2} /></label>
            <input type="number" value={form.spo2} onChange={f('spo2')} placeholder="98" style={{ ...sa.inp, borderColor: vitalStatus('spo2',form.spo2)?.icon === '🔴' ? '#D85A30' : vitalStatus('spo2',form.spo2)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={sa.lbl}>O2 / Dispositivo</label>
            <select value={form.o2device} onChange={f('o2device')} style={sa.inp}>
              {DEVICES.map(d => <option key={d} value={d}>{d === 'aa' ? 'Aire ambiente' : d}</option>)}
            </select>
          </div>
          <div>
            <label style={sa.lbl}>Flujo O2 (L/min)</label>
            <input type="number" value={form.o2flow} onChange={f('o2flow')} placeholder="2"
              disabled={form.o2device === 'aa'}
              style={{ ...sa.inp, background: form.o2device === 'aa' ? '#eee' : '#fff', cursor: form.o2device === 'aa' ? 'not-allowed' : 'text' }} />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={sa.lbl}>Glicemia (mg/dL) <VitalBadge type="glucose" val={form.glucose} /></label>
            <input type="number" value={form.glucose} onChange={f('glucose')} placeholder="90" style={{ ...sa.inp, borderColor: vitalStatus('glucose',form.glucose)?.icon === '🔴' ? '#D85A30' : vitalStatus('glucose',form.glucose)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
          <div>
            <label style={sa.lbl}>FC (lpm) <VitalBadge type="hr" val={form.hr} /></label>
            <input type="number" value={form.hr} onChange={f('hr')} placeholder="72" style={{ ...sa.inp, borderColor: vitalStatus('hr',form.hr)?.icon === '🔴' ? '#D85A30' : vitalStatus('hr',form.hr)?.icon === '⚠️' ? '#BA7517' : '#e0e0e0' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={sa.lbl}>Nota clinica</label>
        <textarea value={form.content} onChange={f('content')} rows={4} style={{ ...sa.inp, resize:'vertical' }} placeholder="Paciente refiere..." />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button style={sa.btnCancel} onClick={onClose}>Cancelar</button>
        <button style={{ ...sa.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={() => onSave({ ...form, pam })}>
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>
    </>
  )
}

const sa = {
  btnPrimary: { background:'#1D9E75', color:'#fff', border:'none', fontSize:13, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5 },
  btnCancel:  { background:'none', border:'1px solid #e0e0e0', fontSize:13, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  lbl:        { display:'block', fontSize:13, color:'#666', marginBottom:4, fontWeight:500 },
  inp:        { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none' },
}


function CareModulesAdmin({ patient, doctors, onModulesUpdated, enabledModules = ['integral','metabolica','estetica','fisioterapia','enfermeria','odontologia','nutricion'], clinicPlan = 'basic' }) {
  const G = '#0F6E56'
  const [modules, setModules] = useState([])
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)

  const MODULE_TYPES = [
    { key:'integral', label:'Atención médica integral' },
    { key:'metabolica', label:'Atención médica metabólica' },
    { key:'estetica', label:'Atención médica estética' },
    { key:'fisioterapia', label:'Atención de fisioterapia' },
    { key:'enfermeria', label:'Atención de enfermería' },
    { key:'odontologia', label:'Odontología' },
  ].filter(m => enabledModules.includes(m.key))

  useEffect(() => { if (patient?.id) loadModules() }, [patient])

  async function loadModules() {
    const { data } = await supabase.from('patient_care_modules')
      .select('*').eq('patient_id', patient.id)
    setModules(data || [])
  }

  function getModule(type) {
    return modules.find(m => m.module_type === type)
  }

  async function toggleModule(type) {
    const existing = getModule(type)
    // Verificar límite de módulos si se va a activar uno nuevo
    if (!existing || !existing.is_active) {
      const activeModules = modules.filter(m => m.is_active).length
      const limits = { basic: 0, starter: 2, gold: 4, gold_plus: 6, enterprise: 10, enterprise_plus: Infinity }
      const planLabel = { basic:'Basic', starter:'Starter', gold:'Gold', gold_plus:'Gold+', enterprise:'Enterprise', enterprise_plus:'Enterprise+' }
      const limit = limits[clinicPlan] ?? 2
      if (activeModules >= limit && limit !== Infinity) {
        alert(`Tu plan ${planLabel[clinicPlan]} permite un máximo de ${limit} módulo${limit!==1?'s':''} activo${limit!==1?'s':''}. Para activar más, actualizá tu plan.`)
        return
      }
    }
    setSaving(type)
    if (existing) {
      await supabase.from('patient_care_modules').update({ is_active: !existing.is_active }).eq('id', existing.id)
    } else {
      await supabase.from('patient_care_modules').insert({ clinic_id: patient.clinic_id,
        patient_id: patient.id,
        module_type: type,
        is_active: true,
      })
    }
    await loadModules()
    if (onModulesUpdated) onModulesUpdated()
    setSaving(null); setSaved(type); setTimeout(() => setSaved(null), 2000)
  }

  async function assignProfessional(type, professionalId) {
    const existing = getModule(type)
    setSaving(type + '_prof')
    if (existing) {
      await supabase.from('patient_care_modules').update({ assigned_professional_id: professionalId || null }).eq('id', existing.id)
      // Si es integral, también actualizar assigned_doctor_id en patients
      if (type === 'integral') {
        await supabase.from('patients').update({ assigned_doctor_id: professionalId || null }).eq('id', patient.id)
      }
    }
    await loadModules()
    setSaving(null); setSaved(type + '_prof'); setTimeout(() => setSaved(null), 2000)
  }

  const inp = { width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div>
      <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Módulos de atención</div>
      <div style={{ fontSize:12, color:'#888', marginBottom:14 }}>
        Activá los módulos de atención asignados a este paciente y asigná un profesional a cada uno.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {MODULE_TYPES.map(m => {
          const mod = getModule(m.key)
          const isActive = mod?.is_active || false
          return (
            <div key={m.key} style={{ background:'#fff', border: isActive ? `1.5px solid ${G}` : '1px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: isActive ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: isActive ? G : '#555' }}>{m.label}</div>
                  {!isActive && <div style={{ fontSize:11, color:'#bbb' }}>No asignado</div>}
                </div>
                <div onClick={() => toggleModule(m.key)}
                  style={{ width:40, height:22, borderRadius:11, cursor:'pointer', transition:'background 0.2s', position:'relative', background: isActive ? G : '#e0e0e0', flexShrink:0 }}>
                  <div style={{ position:'absolute', width:16, height:16, borderRadius:'50%', background:'#fff', top:3, left: isActive ? 21 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {isActive && (
                <div>
                  <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>Profesional asignado</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <select style={{ ...inp, flex:1 }}
                      value={mod?.assigned_professional_id || ''}
                      onChange={e => assignProfessional(m.key, e.target.value)}>
                      <option value="">Sin asignar</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.prefix || (d.sex === 'female' ? 'Dra.' : 'Dr.')} {d.last_name} {d.first_name} · {d.specialty || ''}
                        </option>
                      ))}
                    </select>
                    {saving === m.key + '_prof' && <span style={{ fontSize:12, color:'#aaa', alignSelf:'center' }}>Guardando...</span>}
                    {saved === m.key + '_prof' && <span style={{ fontSize:12, color:G, alignSelf:'center' }}>✓</span>}
                  </div>
                  {!mod?.assigned_professional_id && (
                    <div style={{ fontSize:11, color:'#e67e22', marginTop:4 }}>
                      Aún no ha sido asignado un profesional para esta categoría
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
// Sat Jun  6 13:07:59 CST 2026
