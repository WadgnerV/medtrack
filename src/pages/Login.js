import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const BRAND_COLOR = '#1D9E75'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]         = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [regEmail, setRegEmail]   = useState('')
  const [regPass, setRegPass]     = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error, role } = await signIn(email, password)
    if (error) { setError(error.message); setLoading(false); return }
    if (role === 'admin')       navigate('/admin')
    else if (role === 'doctor') navigate('/doctor')
    else                        navigate('/paciente')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signUp({ email: regEmail, password: regPass, firstName, lastName, role: 'patient' })
    if (error) { setError(error.message); setLoading(false); return }
    setError('✓ Cuenta creada. Revisa tu correo para confirmar.')
    setLoading(false)
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
              <input style={s.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com" required/>
            </div>
            <div style={s.field}>
              <label style={s.label}>Contraseña</label>
              <input style={s.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/>
            </div>
            <button style={{...s.btn, opacity:loading?0.7:1}} disabled={loading} type="submit">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={s.row}>
              <div style={{...s.field, flex:1}}>
                <label style={s.label}>Nombre</label>
                <input style={s.input} type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="María" required/>
              </div>
              <div style={{...s.field, flex:1}}>
                <label style={s.label}>Apellido</label>
                <input style={s.input} type="text" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Rodríguez" required/>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Correo electrónico</label>
              <input style={s.input} type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="correo@ejemplo.com" required/>
            </div>
            <div style={s.field}>
              <label style={s.label}>Contraseña</label>
              <input style={s.input} type="password" value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6}/>
            </div>
            <button style={{...s.btn, opacity:loading?0.7:1}} disabled={loading} type="submit">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}

        <div style={s.banner} onClick={()=>window.open('https://wa.me/50660464569?text=Hola,%20quisiera%20agendar%20una%20cita','_blank')}>
          <span>¿No tienes cita agendada?</span>
          <span style={s.bannerLink}>Contáctanos por WhatsApp →</span>
        </div>
      </div>
    </div>
  )
}

const s = {
  bg:        { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F4F7F6', fontFamily:'system-ui,-apple-system,sans-serif' },
  card:      { width:380, background:'#fff', borderRadius:16, padding:'32px 28px', boxShadow:'0 4px 32px rgba(0,0,0,0.08)' },
  logoWrap:  { display:'flex', alignItems:'center', gap:10, marginBottom:24 },
  logoMark:  { width:36, height:36, borderRadius:9, background:BRAND_COLOR, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 },
  logoName:  { fontSize:15, fontWeight:600, color:'#1a1a1a', letterSpacing:'0.05em' },
  logoSub:   { fontSize:10, color:'#999' },
  tabs:      { display:'flex', borderBottom:'1px solid #eee', marginBottom:20 },
  tab:       { flex:1, padding:'8px 0', background:'none', border:'none', borderBottom:'2px solid transparent', cursor:'pointer', fontSize:13, color:'#888' },
  tabActive: { color:BRAND_COLOR, borderBottomColor:BRAND_COLOR, fontWeight:500 },
  field:     { marginBottom:14 },
  row:       { display:'flex', gap:10 },
  label:     { display:'block', fontSize:11, color:'#666', marginBottom:4, fontWeight:500 },
  input:     { width:'100%', padding:'9px 11px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a' },
  btn:       { width:'100%', padding:11, background:BRAND_COLOR, color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 },
  alert:     { background:'#FAECE7', color:'#C24B2A', fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:14 },
  alertOk:   { background:'#E1F5EE', color:'#0F6E56' },
  banner:    { marginTop:20, padding:'10px 14px', background:'#F4F7F6', borderRadius:8, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, color:'#666' },
  bannerLink:{ color:BRAND_COLOR, fontWeight:500 },
}
