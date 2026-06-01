import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabase maneja el token automáticamente via URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // sesión activa, listo para resetear
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true); setLoading(false)
    setTimeout(() => navigate('/'), 2500)
  }

  const s = {
    bg: { minHeight:'100vh', background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px', fontFamily:"Inter, system-ui, sans-serif" },
    card: { width:'100%', maxWidth:400, background:'#fff', borderRadius:20, padding:'32px 28px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' },
    label: { fontSize:12, fontWeight:500, color:'#555', marginBottom:4, display:'block' },
    input: { width:'100%', padding:'9px 12px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
    btn: { width:'100%', padding:'11px', background:G, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 },
    field: { marginBottom:12 },
    alert: { background:'#fdecea', color:'#c0392b', borderRadius:8, padding:'9px 12px', fontSize:13, marginBottom:14 },
    alertOk: { background:'#E1F5EE', color:'#0F6E56', borderRadius:8, padding:'9px 12px', fontSize:13, marginBottom:14 },
  }

  return (
    <div style={s.bg}>
      <div style={s.card}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>💊</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#1a1a1a', letterSpacing:'0.05em' }}>MEDTRACK</div>
            
          </div>
        </div>

        {done ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:8 }}>Contraseña actualizada</div>
            <div style={{ fontSize:13, color:'#666' }}>Redirigiendo al inicio de sesión...</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:4 }}>Nueva contraseña</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:20 }}>Ingresá tu nueva contraseña para continuar.</div>
            {error && <div style={s.alert}>{error}</div>}
            <form onSubmit={handleReset}>
              <div style={s.field}>
                <label style={s.label}>Nueva contraseña</label>
                <input style={s.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Confirmar contraseña</label>
                <input style={s.input} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" required />
              </div>
              <button style={s.btn} type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar contraseña'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
