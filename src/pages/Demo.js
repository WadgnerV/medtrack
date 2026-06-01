import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const G = '#1D9E75'
const BLUE = '#1a3a5c'

export default function Demo() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDemo() {
    setLoading(true); setError('')
    const { error: err } = await signIn('demo@medtrack.app', 'Demo2026')
    if (err) { setError('Error al iniciar la demo. Intentá de nuevo.'); setLoading(false); return }
    navigate('/admin')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: '"Inter", system-ui, sans-serif', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .demo-btn:hover { background: #179e6a !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(29,158,117,0.35) !important; }
        .demo-btn { transition: all 0.2s !important; }
      `}</style>

      {/* Badge demo */}
      <div style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.25)', borderRadius: 20, padding: '6px 16px', marginBottom: 32, animation: 'fadeUp 0.5s ease both' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: G, letterSpacing: '0.06em' }}>🎯 MODO DEMO</span>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '48px 44px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', maxWidth: 420, width: '100%', animation: 'fadeUp 0.6s ease 0.1s both', opacity: 0 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/medtrack-logo.png" alt="MedTrack" style={{ height: 72, marginBottom: 16 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: BLUE, marginBottom: 6 }}>Bienvenido al demo</div>
          <div style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>Explorá MedTrack con datos de prueba. Todo lo que ves aquí es ficticio.</div>
        </div>

        {/* Credenciales visibles */}
        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Credenciales de acceso</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#666' }}>Usuario</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: BLUE, fontFamily: 'monospace' }}>demo@medtrack.app</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#666' }}>Contraseña</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: BLUE, fontFamily: 'monospace' }}>Demo2026</span>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Botón entrar */}
        <button onClick={handleDemo} disabled={loading} className="demo-btn"
          style={{ width: '100%', padding: '14px', background: loading ? '#9CA3AF' : G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.25)', marginBottom: 16 }}>
          {loading ? 'Ingresando...' : 'Entrar al demo →'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <a href="/login" style={{ fontSize: 13, color: '#aaa', textDecoration: 'none' }}>← Volver al inicio de sesión</a>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: 24, fontSize: 12, color: '#bbb', textAlign: 'center', maxWidth: 360, animation: 'fadeUp 0.6s ease 0.2s both', opacity: 0 }}>
        Los datos mostrados son ficticios y solo tienen fines demostrativos. Esta sesión puede ser cerrada en cualquier momento.
      </div>
    </div>
  )
}
