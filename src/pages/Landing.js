import { useState } from 'react'

const G = '#1D9E75'
const BLUE = '#1a3a5c'

const PLANS = [
  { name: 'Basic', price: 14.99, color: '#64748b', professionals: 0, patients: 100, modules: 0, branches: 1, desc: 'Ideal para consultorios individuales que necesitan gestión básica de agenda y pacientes.' },
  { name: 'Starter', price: 49.99, color: G, professionals: 2, patients: 100, modules: 2, branches: 1, desc: 'Perfecto para clínicas pequeñas con un equipo médico en crecimiento.', popular: false },
  { name: 'Gold', price: 109.99, color: '#f59e0b', professionals: 10, patients: 300, modules: 4, branches: 1, desc: 'Para clínicas medianas con múltiples especialidades y mayor volumen de pacientes.', popular: true },
  { name: 'Gold+', price: 249.99, color: '#8b5cf6', professionals: 20, patients: 500, modules: 6, branches: 2, desc: 'Ideal para grupos médicos con varias sucursales y especialidades.' },
  { name: 'Enterprise', price: 499.99, color: BLUE, professionals: 50, patients: 1500, modules: 10, branches: 5, desc: 'Para grandes clínicas y hospitales con operaciones a escala.' },
  { name: 'Enterprise+', price: 999.99, color: '#0f172a', professionals: '∞', patients: '∞', modules: '∞', branches: '∞', desc: 'Acceso ilimitado a todas las funcionalidades. Para redes de salud.' },
]

const FEATURES = [
  { icon: '📅', title: 'Calendario inteligente', desc: 'Agenda de citas con recordatorios automáticos, vistas por día, semana y mes, y gestión de múltiples médicos.' },
  { icon: '📋', title: 'Expedientes clínicos', desc: 'Notas clínicas digitales, antecedentes del paciente, diagnósticos con CIE-10, y exportación en PDF.' },
  { icon: '💊', title: 'Prescripciones digitales', desc: 'Recetas médicas, solicitudes de laboratorio e imágenes médicas con formato de impresión profesional.' },
  { icon: '📊', title: 'Reportes y estadísticas', desc: 'Métricas de tu clínica en tiempo real: citas, pacientes, ausencias, horas pico y más.' },
  { icon: '🏥', title: 'Módulos personalizables', desc: 'Atención integral, metabólica, estética, fisioterapia y enfermería. Activá solo lo que necesitás.' },
  { icon: '👥', title: 'Multi-sucursal', desc: 'Gestioná varias sedes desde un solo sistema, con dashboards independientes por sucursal.' },
]

export default function Landing() {
  const [form, setForm] = useState({ name: '', email: '', clinic: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    await fetch('https://formsubmit.co/wadgvargas@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ ...form, _subject: `Demo MedTrack — ${form.clinic || form.name}`, _captcha: 'false' })
    })
    setSent(true)
    setSending(false)
    setForm({ name: '', email: '', clinic: '', message: '' })
  }

  const scrollTo = id => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }

  return (
    <div style={{ fontFamily: '"Inter", system-ui, sans-serif', color: '#1a1a1a', background: '#fff', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .nav-link { cursor: pointer; color: #555; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: ${G}; }
        .plan-card { transition: transform 0.2s, box-shadow 0.2s; }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12) !important; }
        .feature-card { transition: transform 0.2s, box-shadow 0.2s; }
        .feature-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
        .cta-btn { transition: all 0.2s; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(29,158,117,0.35) !important; }
        .input-field:focus { border-color: ${G} !important; outline: none; box-shadow: 0 0 0 3px rgba(29,158,117,0.12); }
        @media (max-width: 768px) {
          .hero-title { font-size: 38px !important; }
          .hero-section { padding: 90px 20px 50px !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .contact-form { padding: 28px 20px !important; }
          .footer-inner { flex-direction: column !important; text-align: center !important; gap: 16px !important; }
          .stats-row { gap: 24px !important; }
          .hero-btns { flex-direction: column !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f0f0f0', padding: '0 40px', height: 88, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => scrollTo('hero')}>
          <img src="/medtrack-logo.png" alt="MedTrack" style={{ height: 78 }} />
        </div>
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <span className="nav-link" onClick={() => scrollTo('features')}>Funcionalidades</span>
          <span className="nav-link" onClick={() => scrollTo('plans')}>Planes</span>
          <span className="nav-link" onClick={() => scrollTo('contact')}>Contacto</span>
          <button className="cta-btn" onClick={() => scrollTo('contact')}
            style={{ background: G, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,158,117,0.25)' }}>
            Solicitar demo
          </button>
          <a href="/login" style={{ background: 'transparent', color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 8, padding: '7px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            Iniciar sesión
          </a>
        </div>
        <button onClick={() => setMenuOpen(p => !p)} className="nav-mobile-btn"
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: BLUE, padding: 4 }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Drawer móvil */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: 72, left: 0, right: 0, background: '#fff', borderBottom: '1px solid #eee', zIndex: 99, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          {[['Funcionalidades', 'features'], ['Planes', 'plans'], ['Contacto', 'contact']].map(([label, id]) => (
            <div key={id} onClick={() => scrollTo(id)}
              style={{ padding: '12px 0', fontSize: 16, fontWeight: 500, color: BLUE, cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}>
              {label}
            </div>
          ))}
          <button onClick={() => scrollTo('contact')}
            style={{ marginTop: 8, width: '100%', padding: '12px', background: G, color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Solicitar demo
          </button>
          <a href="/login"
            style={{ marginTop: 8, display: 'block', width: '100%', padding: '11px', background: 'transparent', color: BLUE, border: `2px solid ${BLUE}`, borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
            Iniciar sesión
          </a>
        </div>
      )}

      {/* HERO */}
      <section id="hero" className="hero-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 24px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: 680 }}>
          {/* Logo protagonista */}
          <div style={{ marginBottom: 32 }}>
            <img src="/medtrack-logo.png" alt="MedTrack" style={{ height: 90, display: 'block' }} />
          </div>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: G, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: G, letterSpacing: '0.04em' }}>PLATAFORMA MÉDICA DIGITAL</span>
          </div>

          {/* Título */}
          <h1 className="hero-title" style={{ fontSize: 64, fontWeight: 900, color: BLUE, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 20 }}>
            Gestión clínica<br />
            <span style={{ color: G }}>inteligente,</span><br />
            diseñada para<br />tu consulta.
          </h1>

          <p style={{ fontSize: 18, color: '#666', lineHeight: 1.7, marginBottom: 36, maxWidth: 520 }}>
            MedTrack centraliza tu agenda, expedientes, prescripciones y reportes en una sola plataforma — adaptada a la forma en que trabajás.
          </p>

          <div className="hero-btns" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="cta-btn" onClick={() => scrollTo('contact')}
              style={{ background: G, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(29,158,117,0.3)' }}>
              Solicitar demo gratuita
            </button>
            <button className="cta-btn" onClick={() => scrollTo('plans')}
              style={{ background: '#fff', color: BLUE, border: `2px solid ${BLUE}`, borderRadius: 10, padding: '14px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              Ver planes →
            </button>
          </div>

          {/* Stats */}
          <div className="stats-row" style={{ display: 'flex', gap: 40, marginTop: 56, flexWrap: 'wrap' }}>
            {[['6', 'Planes disponibles'], ['∞', 'Módulos personalizables'], ['100%', 'Digital y en la nube']].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 28, fontWeight: 800, color: BLUE }}>{n}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: '#f8fafc', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Funcionalidades</div>
            <h2 style={{ fontSize: 40, fontWeight: 800, color: BLUE, letterSpacing: '-0.02em', marginBottom: 14 }}>Todo lo que tu clínica necesita</h2>
            <p style={{ fontSize: 16, color: '#888', maxWidth: 500, margin: '0 auto' }}>Una plataforma completa, modular y fácil de usar para profesionales de la salud.</p>
          </div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card" style={{ background: '#fff', borderRadius: 14, padding: '24px 22px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: BLUE, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Precios</div>
            <h2 style={{ fontSize: 40, fontWeight: 800, color: BLUE, letterSpacing: '-0.02em', marginBottom: 14 }}>Planes que crecen con vos</h2>
            <p style={{ fontSize: 16, color: '#888', maxWidth: 500, margin: '0 auto' }}>Todos los planes incluyen módulos clínicos personalizables. Pagás solo por lo que necesitás.</p>
          </div>
          <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 16 }}>
            {PLANS.map(plan => (
              <div key={plan.name} className="plan-card" style={{ background: plan.popular ? BLUE : '#fff', borderRadius: 16, padding: '28px 24px', border: plan.popular ? 'none' : '1px solid #eee', boxShadow: plan.popular ? '0 8px 32px rgba(26,58,92,0.2)' : '0 2px 8px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                {plan.popular && <div style={{ position: 'absolute', top: 16, right: 16, background: G, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.06em' }}>MÁS POPULAR</div>}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: plan.color, marginBottom: 16 }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: plan.popular ? '#fff' : BLUE, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: plan.popular ? 'rgba(255,255,255,0.7)' : '#888', marginBottom: 20, lineHeight: 1.5 }}>{plan.desc}</div>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: plan.popular ? '#fff' : BLUE }}>${plan.price}</span>
                  <span style={{ fontSize: 13, color: plan.popular ? 'rgba(255,255,255,0.6)' : '#aaa', marginLeft: 4 }}>/mes</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {[
                    [`👨‍⚕️ ${plan.professionals === '∞' ? 'Profesionales ilimitados' : `${plan.professionals} profesionales`}`],
                    [`👥 ${plan.patients === '∞' ? 'Pacientes ilimitados' : `${plan.patients} pacientes`}`],
                    [`🧩 ${plan.modules === '∞' ? 'Módulos ilimitados' : plan.modules === 0 ? 'Sin módulos clínicos' : `${plan.modules} módulos personalizables`}`],
                    [`🏥 ${plan.branches === '∞' ? 'Sucursales ilimitadas' : `${plan.branches} sucursal${plan.branches > 1 ? 'es' : ''}`}`],
                  ].map(([item]) => (
                    <div key={item} style={{ fontSize: 13, color: plan.popular ? 'rgba(255,255,255,0.85)' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>{item}</div>
                  ))}
                </div>
                <button className="cta-btn" onClick={() => scrollTo('contact')}
                  style={{ width: '100%', padding: '11px', background: plan.popular ? G : 'transparent', color: plan.popular ? '#fff' : BLUE, border: plan.popular ? 'none' : `2px solid ${BLUE}`, borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Solicitar demo
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#aaa', marginTop: 16 }}>
            * Todos los precios son en USD. Facturación mensual. Los módulos clínicos son personalizables según las necesidades de tu clínica.
          </p>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: '#f8fafc', padding: '80px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Contacto</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: BLUE, letterSpacing: '-0.02em', marginBottom: 14 }}>¿Listo para transformar tu clínica?</h2>
            <p style={{ fontSize: 16, color: '#888', lineHeight: 1.6 }}>Escribinos y coordinamos una demo personalizada para mostrarte todo lo que MedTrack puede hacer por tu práctica profesional.</p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: 16, padding: '48px 32px', border: '1px solid #eee', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: BLUE, marginBottom: 8 }}>¡Mensaje enviado!</div>
              <div style={{ fontSize: 15, color: '#888', lineHeight: 1.6 }}>Nos pondremos en contacto con vos en las próximas 24 horas para coordinar tu demo.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form" style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', border: '1px solid #eee', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre *</label>
                  <input className="input-field" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required placeholder="Dr. Juan Pérez"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, color: '#1a1a1a', background: '#fafafa', transition: 'all 0.2s' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Correo *</label>
                  <input className="input-field" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required placeholder="correo@clinica.com"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, color: '#1a1a1a', background: '#fafafa', transition: 'all 0.2s' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre de la clínica</label>
                <input className="input-field" value={form.clinic} onChange={e => setForm(p => ({...p, clinic: e.target.value}))} placeholder="Clínica San José"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, color: '#1a1a1a', background: '#fafafa', transition: 'all 0.2s' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mensaje</label>
                <textarea className="input-field" value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} rows={4} placeholder="Contanos sobre tu clínica y qué necesitás..."
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, color: '#1a1a1a', background: '#fafafa', resize: 'vertical', fontFamily: 'inherit', transition: 'all 0.2s' }} />
              </div>
              <button type="submit" disabled={sending} className="cta-btn"
                style={{ width: '100%', padding: '14px', background: sending ? '#9CA3AF' : G, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.25)', marginTop: 4 }}>
                {sending ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: BLUE, color: '#fff', padding: '40px 24px' }}>
        <div className="footer-inner" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/medtrack-logo.png" alt="MedTrack" style={{ height: 32, filter: 'brightness(0) invert(1)' }} />
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>© 2026 MedTrack · Todos los derechos reservados</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Funcionalidades', 'Planes', 'Contacto'].map(l => (
              <span key={l} onClick={() => scrollTo(l.toLowerCase())} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
