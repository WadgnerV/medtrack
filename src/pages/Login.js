import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'

const PROVINCIAS = {
  'San José': ['San José','Escazú','Desamparados','Puriscal','Tarrazú','Aserrí','Mora','Goicoechea','Santa Ana','Alajuelita','Vásquez de Coronado','Acosta','Tibás','Moravia','Montes de Oca','Turrubares','Dota','Curridabat','Pérez Zeledón','León Cortés'],
  'Alajuela': ['Alajuela','San Ramón','Grecia','San Mateo','Atenas','Naranjo','Palmares','Poás','Orotina','San Carlos','Zarcero','Valverde Vega','Upala','Los Chiles','Guatuso','Río Cuarto'],
  'Cartago': ['Cartago','Paraíso','La Unión','Jiménez','Turrialba','Alvarado','Oreamuno','El Guarco'],
  'Heredia': ['Heredia','Barva','Santo Domingo','Santa Bárbara','San Rafael','San Isidro','Belén','Flores','San Pablo','Sarapiquí'],
  'Guanacaste': ['Liberia','Nicoya','Santa Cruz','Bagaces','Carrillo','Cañas','Abangares','Tilarán','Nandayure','La Cruz','Hojancha'],
  'Puntarenas': ['Puntarenas','Esparza','Buenos Aires','Montes de Oro','Osa','Quepos','Golfito','Coto Brus','Parrita','Corredores','Garabito','Monteverde'],
  'Limón': ['Limón','Pococí','Siquirres','Talamanca','Matina','Guácimo'],
}

function calcAge(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob + 'T12:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]         = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent]   = useState(false)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  const [reg, setReg] = useState({
    firstName: '', lastName: '', idNumber: '', phone: '',
    email: '', password: '', confirmPassword: '',
    birthDate: '', sex: '', province: '', canton: '', heightCm: ''
  })

  function setR(field, value) {
    setReg(p => ({ ...p, [field]: value, ...(field === 'province' ? { canton: '' } : {}) }))
  }

  const age = calcAge(reg.birthDate)
  const cantones = reg.province ? PROVINCIAS[reg.province] || [] : []

  async function handleForgotPassword(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://medtrack-gilt.vercel.app/reset-password'
    })
    if (error) { setError(error.message); setLoading(false); return }
    setResetSent(true); setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error, role } = await signIn(email, password)
    if (error) {
      const msg = error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already exists') || error.message?.toLowerCase().includes('duplicate')
        ? 'Este correo electrónico ya está registrado. Intentá iniciar sesión.'
        : error.message
      setError(msg); setLoading(false); return
    }
    if (role === 'superadmin')  navigate('/superadmin')
    else if (role === 'admin')  navigate('/admin')
    else if (role === 'receptionist') navigate('/recepcion')
    else if (role === 'doctor') navigate('/doctor')
    else                        navigate('/paciente')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')

    if (!reg.firstName || !reg.lastName || !reg.email || !reg.password) {
      setError('Completá todos los campos obligatorios.'); setLoading(false); return
    }
    if (reg.password !== reg.confirmPassword) {
      setError('Las contraseñas no coinciden.'); setLoading(false); return
    }
    if (reg.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.'); setLoading(false); return
    }

    const { error } = await signUp({
      email: reg.email,
      password: reg.password,
      firstName: reg.firstName,
      lastName: reg.lastName,
      role: 'patient',
      idNumber: reg.idNumber,
      phone: reg.phone,
      birthDate: reg.birthDate || null,
      sex: reg.sex || null,
      province: reg.province || null,
      canton: reg.canton || null,
      heightCm: reg.heightCm ? parseInt(reg.heightCm) : null,
    })

    if (error) {
      const msg = error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already exists') || error.message?.toLowerCase().includes('duplicate')
        ? 'Este correo electrónico ya está registrado. Intentá iniciar sesión.'
        : error.message
      setError(msg); setLoading(false); return
    }
    setReg({
      firstName: '', lastName: '', idNumber: '', phone: '',
      email: '', password: '', confirmPassword: '',
      birthDate: '', sex: '', province: '', canton: '', heightCm: ''
    })
    setError('✓ Cuenta creada exitosamente.')
    setLoading(false)
  }

  const s = {
    bg: { minHeight:'100vh', background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px', fontFamily:"Inter, system-ui, sans-serif" },
    card: { width:'100%', maxWidth:440, background:'#fff', borderRadius:20, padding:'32px 28px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' },
    logoWrap: { display:'flex', alignItems:'center', gap:10, marginBottom:24 },
    logoMark: { width:40, height:40, borderRadius:12, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 },
    logoName: { fontSize:16, fontWeight:700, color:'#1a1a1a', letterSpacing:'0.05em' },
    logoSub: { fontSize:12, color:'#888' },
    tabs: { display:'flex', background:'#f5f5f5', borderRadius:10, padding:3, marginBottom:20 },
    tab: { flex:1, padding:'8px 0', border:'none', borderRadius:8, background:'transparent', fontSize:13, color:'#888', cursor:'pointer', fontWeight:400 },
    tabActive: { background:'#fff', color:G, fontWeight:600, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' },
    alert: { background:'#fdecea', color:'#c0392b', borderRadius:8, padding:'9px 12px', fontSize:13, marginBottom:14 },
    alertOk: { background:'#E1F5EE', color:'#0F6E56' },
    label: { fontSize:12, fontWeight:500, color:'#555', marginBottom:4, display:'block' },
    input: { width:'100%', padding:'9px 12px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#1a1a1a' },
    select: { width:'100%', padding:'9px 12px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#1a1a1a', background:'#fff' },
    row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
    field: { marginBottom:12 },
    btn: { width:'100%', padding:'11px', background:G, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 },
    divider: { fontSize:11, color:'#bbb', textAlign:'center', margin:'8px 0 12px', textTransform:'uppercase', letterSpacing:'0.05em', borderTop:'1px solid #f0f0f0', paddingTop:12 },
    required: { color:'#c0392b', marginLeft:2 },
    ageTag: { fontSize:11, color:'#0F6E56', fontWeight:500, marginLeft:6 },
  }

  return (
    <div style={s.bg}>
      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.logoMark}>💊</div>
          <div>
            <div style={s.logoName}>MEDTRACK</div>
            <div style={s.logoSub}>by Glow Clinic</div>
          </div>
        </div>

        <div style={s.tabs}>
          <button style={{...s.tab, ...(tab==='login'?s.tabActive:{})}} onClick={()=>{setTab('login');setError('')}}>Iniciar sesión</button>
          <button style={{...s.tab, ...(tab==='register'?s.tabActive:{})}} onClick={()=>{setTab('register');setError('')}}>Crear cuenta</button>
        </div>

        {error && <div style={{...s.alert, ...(error.startsWith('✓')?s.alertOk:{})}}>{error}</div>}

        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={s.field}>
              <label style={s.label}>Correo electrónico</label>
              <input style={s.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Contraseña</label>
              <input style={s.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
            <button type="button" onClick={() => { setTab('forgot'); setError('') }}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:G, textDecoration:'underline', width:'100%', marginTop:10 }}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <div>
            {resetSent ? (
              <div>
                <div style={{ textAlign:'center', fontSize:32, marginBottom:12 }}>📧</div>
                <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', textAlign:'center', marginBottom:8 }}>Revisá tu correo</div>
                <div style={{ fontSize:13, color:'#666', textAlign:'center', marginBottom:20, lineHeight:1.6 }}>
                  Te enviamos un link para restablecer tu contraseña a <strong>{resetEmail}</strong>
                </div>
                <button style={s.btn} onClick={() => { setTab('login'); setResetSent(false); setResetEmail('') }}>Volver al inicio de sesión</button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div style={{ fontSize:14, color:'#666', marginBottom:16, lineHeight:1.6 }}>
                  Ingresá tu correo y te enviaremos un link para restablecer tu contraseña.
                </div>
                <div style={s.field}>
                  <label style={s.label}>Correo electrónico</label>
                  <input style={s.input} type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
                </div>
                <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar link'}</button>
                <div style={{ textAlign:'center', marginTop:12 }}>
                  <button type="button" onClick={() => { setTab('login'); setError('') }}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#888', textDecoration:'underline' }}>
                    Volver al inicio de sesión
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ maxHeight:'70vh', overflowY:'auto', paddingRight:4 }}>
            <div style={s.divider}>Información personal</div>

            <div style={{...s.row, marginBottom:12}}>
              <div>
                <label style={s.label}>Nombre<span style={s.required}>*</span></label>
                <input style={s.input} value={reg.firstName} onChange={e=>setR('firstName',e.target.value)} placeholder="Juan" required />
              </div>
              <div>
                <label style={s.label}>Apellidos<span style={s.required}>*</span></label>
                <input style={s.input} value={reg.lastName} onChange={e=>setR('lastName',e.target.value)} placeholder="Pérez Mora" required />
              </div>
            </div>

            <div style={{...s.row, marginBottom:12}}>
              <div>
                <label style={s.label}>Cédula / ID</label>
                <input style={s.input} value={reg.idNumber} onChange={e=>setR('idNumber',e.target.value)} placeholder="1-1234-5678" />
              </div>
              <div>
                <label style={s.label}>Teléfono</label>
                <input style={s.input} value={reg.phone} onChange={e=>setR('phone',e.target.value)} placeholder="8888-8888" />
              </div>
            </div>

            <div style={{...s.row, marginBottom:12}}>
              <div>
                <label style={s.label}>
                  Fecha de nacimiento
                  {age !== null && <span style={s.ageTag}>{age} años</span>}
                </label>
                <input style={s.input} type="date" value={reg.birthDate} onChange={e=>setR('birthDate',e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Sexo</label>
                <select style={s.select} value={reg.sex} onChange={e=>setR('sex',e.target.value)}>
                  <option value="">Seleccionar</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            <div style={{...s.row, marginBottom:12}}>
              <div>
                <label style={s.label}>Provincia</label>
                <select style={s.select} value={reg.province} onChange={e=>setR('province',e.target.value)}>
                  <option value="">Seleccionar</option>
                  {Object.keys(PROVINCIAS).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Cantón</label>
                <select style={s.select} value={reg.canton} onChange={e=>setR('canton',e.target.value)} disabled={!reg.province}>
                  <option value="">Seleccionar</option>
                  {cantones.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Estatura (cm)</label>
              <input style={s.input} type="number" min="100" max="250" value={reg.heightCm} onChange={e=>setR('heightCm',e.target.value)} placeholder="170" />
            </div>

            <div style={s.divider}>Datos de acceso</div>

            <div style={s.field}>
              <label style={s.label}>Correo electrónico<span style={s.required}>*</span></label>
              <input style={s.input} type="email" value={reg.email} onChange={e=>setR('email',e.target.value)} placeholder="correo@ejemplo.com" required />
            </div>

            <div style={{...s.row, marginBottom:12}}>
              <div>
                <label style={s.label}>Contraseña<span style={s.required}>*</span></label>
                <input style={s.input} type="password" value={reg.password} onChange={e=>setR('password',e.target.value)} placeholder="••••••••" required />
              </div>
              <div>
                <label style={s.label}>Confirmar<span style={s.required}>*</span></label>
                <input style={s.input} type="password" value={reg.confirmPassword} onChange={e=>setR('confirmPassword',e.target.value)} placeholder="••••••••" required />
              </div>
            </div>

            <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Creando cuenta...' : 'Crear mi cuenta'}</button>
          </form>
        )}
      </div>
    </div>
  )
}