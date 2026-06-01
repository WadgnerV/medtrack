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
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

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
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden', background: '#fff' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .login-input:focus { border-color: ${G} !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.12) !important; }
        .login-btn:hover { background: #179e6a !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(29,158,117,0.35) !important; }
        .login-btn { transition: all 0.2s ease !important; }
      `}</style>

      {/* Panel izquierdo */}
      {!isMobile && (
        <div style={{ flex: 1, background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 80px', position: 'relative', overflow: 'hidden' }}>

          {/* Manchas de color */}
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,158,117,0.12) 0%, transparent 65%)', top: -250, left: -200, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,58,92,0.10) 0%, transparent 65%)', bottom: -200, right: -150, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,158,117,0.07) 0%, transparent 65%)', bottom: 100, left: -100, pointerEvents: 'none' }} />



          {/* Contenido central */}
          <div style={{ maxWidth: 480, width: '100%', position: 'relative' }}>

            {/* Cinta de colores */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 40, opacity: mounted ? 1 : 0, animation: mounted ? 'fadeUp 0.6s ease 0.1s both' : 'none' }}>
              {[
                { color: '#1D9E75', width: 48 },
                { color: '#1a3a5c', width: 32 },
                { color: '#2dd4bf', width: 20 },
                { color: '#1a3a5c', width: 56 },
                { color: '#1D9E75', width: 24 },
                { color: '#0d9488', width: 40 },
                { color: '#1a3a5c', width: 16 },
              ].map((b, i) => (
                <div key={i} style={{ height: 4, width: b.width, borderRadius: 2, background: b.color }} />
              ))}
            </div>

            {/* Título principal */}
            <div style={{ marginBottom: 24, opacity: mounted ? 1 : 0, animation: mounted ? 'fadeUp 0.7s ease 0.2s both' : 'none' }}>
              <div style={{
                fontSize: 26,
                fontWeight: 300,
                color: '#666',
                fontStyle: 'italic',
                letterSpacing: '0.04em',
                fontFamily: 'Georgia, "Times New Roman", serif',
                marginBottom: 4,
                lineHeight: 1
              }}>
                Gestión clínica
              </div>
              <div style={{
                fontSize: 86,
                fontWeight: 900,
                color: BLUE,
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                fontFamily: '"Inter", system-ui',
              }}>
                inteligente.
              </div>
            </div>

            {/* Subtítulo */}
            <div style={{ fontSize: 16, color: '#888', lineHeight: 1.7, marginBottom: 52, maxWidth: 400, opacity: mounted ? 1 : 0, animation: mounted ? 'fadeUp 0.7s ease 0.3s both' : 'none' }}>
              La plataforma que <span style={{ color: G, fontWeight: 600 }}>simplifica</span> el trabajo de tu clínica — desde el calendario hasta las notas clínicas.
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: mounted ? 1 : 0, animation: mounted ? 'fadeUp 0.7s ease 0.4s both' : 'none' }}>
              {[
                { icon: '📅', label: 'Calendario', desc: 'Agenda y citas integradas' },
                { icon: '📋', label: 'Expedientes', desc: 'Notas clínicas digitales' },
                { icon: '📊', label: 'Reportes', desc: 'Estadísticas en tiempo real' },
                { icon: '💊', label: 'Prescripciones', desc: 'Recetas y estudios de laboratorio' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: i % 2 === 0 ? 'rgba(29,158,117,0.08)' : 'rgba(26,58,92,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: BLUE }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Divisor vertical sutil */}
      {!isMobile && (
        <div style={{ width: 1, background: 'linear-gradient(180deg, transparent, #e5e7eb 30%, #e5e7eb 70%, transparent)', flexShrink: 0 }} />
      )}

      {/* Panel derecho — formulario */}
      <div style={{ width: isMobile ? '100%' : 420, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '40px 24px' : '48px 52px', opacity: mounted ? 1 : 0, animation: mounted ? 'slideIn 0.6s ease 0.2s both' : 'none' }}>

        <div style={{ width: '100%', maxWidth: 320 }}>

          {!showReset ? (
            <>
              {/* Logo */}
              <div style={{ marginBottom: 36, textAlign: 'left' }}>
                <img src="/medtrack-logo.png" alt="MedTrack" style={{ height: 100, marginBottom: 32, display: 'block', margin: '0 auto 32px' }} />
                <div style={{ fontSize: 26, fontWeight: 700, color: BLUE, marginBottom: 6, letterSpacing: '-0.02em', textAlign: 'center' }}>Bienvenido</div>
                <div style={{ fontSize: 13, color: '#aaa', fontWeight: 400, textAlign: 'center' }}>Iniciá sesión para continuar</div>
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Correo electrónico</label>
                  <input
                    className="login-input"
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="correo@clinica.com"
                    style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', background: '#fafafa', transition: 'all 0.2s' }}
                  />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contraseña</label>
                  <input
                    className="login-input"
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', background: '#fafafa', transition: 'all 0.2s' }}
                  />
                </div>

                <div style={{ textAlign: 'right', marginBottom: 28 }}>
                  <button type="button" onClick={() => setShowReset(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: G, fontWeight: 500 }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button type="submit" disabled={loading} className="login-btn"
                  style={{ width: '100%', padding: '14px', background: loading ? '#9CA3AF' : G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.01em', boxShadow: '0 4px 14px rgba(29,158,117,0.25)' }}>
                  {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => { setShowReset(false); setResetSent(false); setResetEmail('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 28, padding: 0 }}>
                ← Volver
              </button>
              <img src="/medtrack-logo.png" alt="MedTrack" style={{ height: 44, marginBottom: 24, display: 'block' }} />
              <div style={{ fontSize: 22, fontWeight: 700, color: BLUE, marginBottom: 8, letterSpacing: '-0.02em' }}>Recuperar contraseña</div>
              <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6, marginBottom: 28 }}>
                {resetSent ? 'Revisá tu correo — te enviamos un enlace para restablecer tu contraseña.' : 'Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.'}
              </div>
              {!resetSent ? (
                <form onSubmit={handleReset}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Correo electrónico</label>
                    <input
                      className="login-input"
                      type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required
                      placeholder="correo@clinica.com"
                      style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', background: '#fafafa' }}
                    />
                  </div>
                  <button type="submit" disabled={resetLoading} className="login-btn"
                    style={{ width: '100%', padding: '14px', background: resetLoading ? '#9CA3AF' : G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: resetLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(29,158,117,0.25)' }}>
                    {resetLoading ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
                  <button onClick={() => { setShowReset(false); setResetSent(false); setResetEmail('') }} className="login-btn"
                    style={{ background: G, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,158,117,0.25)' }}>
                    Volver al login
                  </button>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 40, fontSize: 11, color: '#ddd', textAlign: 'center' }}>
            © 2026 MedTrack · Todos los derechos reservados
          </div>
        </div>
      </div>
    </div>
  )
}
