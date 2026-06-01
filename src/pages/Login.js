import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const G = '#1D9E75'
const BLUE = '#1a3a5c'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [gradientPos, setGradientPos] = useState({ x: 50, y: 50 })

  // Gradiente animado que sigue el mouse
  useEffect(() => {
    const handler = e => {
      const x = Math.round((e.clientX / window.innerWidth) * 100)
      const y = Math.round((e.clientY / window.innerHeight) * 100)
      setGradientPos({ x, y })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await signIn(email, password)
    if (err) { setError('Correo o contraseña incorrectos'); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role
    if (role === 'superadmin') navigate('/superadmin')
    else if (role === 'admin' || role === 'clinic_admin' || role === 'branch_admin') navigate('/admin')
    else if (role === 'receptionist') navigate('/recepcion')
    else if (role === 'doctor') navigate('/doctor')
    else navigate('/paciente')
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${window.location.origin}/reset-password` })
    setResetSent(true)
    setResetLoading(false)
  }

  const isMobile = window.innerWidth < 768

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Panel izquierdo — visual */}
      {!isMobile && (
        <div style={{
          flex: 1,
          background: '#ffffff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 60, position: 'relative', overflow: 'hidden'
        }}>
          {/* Manchas de color en esquinas */}
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 70%)', top: -200, left: -200, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,58,92,0.14) 0%, transparent 70%)', bottom: -150, right: -100, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,158,117,0.10) 0%, transparent 70%)', bottom: 100, left: -100, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,58,92,0.08) 0%, transparent 70%)', top: 50, right: -80, pointerEvents: 'none' }} />
          {/* Círculos decorativos */}
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(26,58,92,0.08)', top: -100, left: -100 }} />
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', border: '1px solid rgba(29,158,117,0.06)', top: -200, left: -200 }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(26,58,92,0.08)', bottom: -80, right: -80 }} />
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', border: '1px solid rgba(29,158,117,0.05)', bottom: -180, right: -180 }} />

          {/* Contenido */}
          <div style={{ position: 'relative', textAlign: 'center', maxWidth: 420 }}>


            {/* Cinta de colores */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 32, justifyContent: 'center' }}>
              {['#1D9E75','#1a3a5c','#2dd4bf','#1a3a5c','#1D9E75','#0d9488','#1a3a5c'].map((c,i) => (
                <div key={i} style={{ height: 5, flex: 1, borderRadius: 3, background: c, opacity: 0.85 + i*0.02 }} />
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 400, color: '#1a3a5c', fontStyle: 'italic', letterSpacing: '0.02em', marginBottom: 4, fontFamily: 'Georgia, serif' }}>Gestión clínica</div>
              <div style={{ fontSize: 52, fontWeight: 900, color: '#1a3a5c', lineHeight: 1, letterSpacing: '-0.03em', fontFamily: '"Inter", system-ui' }}>inteligente.</div>
            </div>

            <div style={{ fontSize: 15, color: '#555', lineHeight: 1.7, marginBottom: 40, maxWidth: 360 }}>
              La plataforma que <span style={{ color: '#1D9E75', fontWeight: 600 }}>simplifica</span> el trabajo de tu clínica, desde el calendario hasta las notas clínicas.
            </div>

            {/* Features */}
            {[
              { icon: '📅', text: 'Calendario y agenda integrados' },
              { icon: '📋', text: 'Expedientes clínicos digitales' },
              { icon: '📊', text: 'Reportes y estadísticas en tiempo real' },
              { icon: '💊', text: 'Recetas y solicitudes de laboratorio' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, textAlign: 'left' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26,58,92,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                <div style={{ fontSize: 14, color: '#444' }}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel derecho — formulario */}
      <div style={{ width: isMobile ? '100%' : 440, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '40px 24px' : '48px 48px' }}>

        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>+</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: BLUE }}>MedTrack</div>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 340 }}>

          {!showReset ? (
            <>
              <div style={{ marginBottom: 32 }}>
                <img src="/medtrack-logo.png" alt="MedTrack" style={{ width: 130, marginBottom: 20, display: 'block' }} />
                <div style={{ fontSize: 24, fontWeight: 700, color: BLUE, marginBottom: 6 }}>Bienvenido</div>
                <div style={{ fontSize: 14, color: '#888' }}>Iniciá sesión para continuar</div>
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Correo electrónico</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="correo@clinica.com"
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', transition: 'border 0.2s' }}
                    onFocus={e => e.target.style.borderColor = G}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Contraseña</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', transition: 'border 0.2s' }}
                    onFocus={e => e.target.style.borderColor = G}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div style={{ textAlign: 'right', marginBottom: 24 }}>
                  <button type="button" onClick={() => setShowReset(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: G, fontWeight: 500 }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px', background: loading ? '#9CA3AF' : G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', letterSpacing: '0.01em' }}>
                  {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => { setShowReset(false); setResetSent(false); setResetEmail('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24, padding: 0 }}>
                ← Volver
              </button>

              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: BLUE, marginBottom: 6 }}>Recuperar contraseña</div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>
                  {resetSent ? 'Revisá tu correo — te enviamos un enlace para restablecer tu contraseña.' : 'Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.'}
                </div>
              </div>

              {!resetSent ? (
                <form onSubmit={handleReset}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>Correo electrónico</label>
                    <input
                      type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required
                      placeholder="correo@clinica.com"
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1a1a1a' }}
                      onFocus={e => e.target.style.borderColor = G}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  <button type="submit" disabled={resetLoading}
                    style={{ width: '100%', padding: '13px', background: resetLoading ? '#9CA3AF' : G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: resetLoading ? 'not-allowed' : 'pointer' }}>
                    {resetLoading ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                  <button onClick={() => { setShowReset(false); setResetSent(false); setResetEmail('') }}
                    style={{ background: G, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Volver al login
                  </button>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 40, textAlign: 'center', fontSize: 11, color: '#bbb' }}>
            © 2026 MedTrack · Todos los derechos reservados
          </div>
        </div>
      </div>
    </div>
  )
}
