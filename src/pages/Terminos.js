import { useEffect } from 'react'

const G = '#1D9E75'
const BLUE = '#1a3a5c'

const sections = [
  {
    title: '1. DEFINICIONES',
    content: [
      { type: 'b', text: 'Plataforma: Sistema SaaS MedTrack para gestión clínica y administrativa.' },
      { type: 'b', text: 'Usuario: Clínica, consultorio, centro de bienestar, spa, salón u otro establecimiento que contrata MedTrack.' },
      { type: 'b', text: 'Cuenta: Credenciales de acceso asociadas a un Usuario.' },
      { type: 'b', text: 'Suscripción: Plan de servicio contratado con sus características y límites.' },
      { type: 'b', text: 'Datos clínicos: Información de salud de los pacientes ingresada por el Usuario.' },
    ]
  },
  {
    title: '2. ACEPTACIÓN DE LOS TÉRMINOS',
    content: [
      { type: 'p', text: 'Al utilizar la Plataforma, el Usuario declara haber leído y aceptado íntegramente estos Términos, tener capacidad legal para contratar, y que la información proporcionada es veraz.' },
      { type: 'p', text: 'SI EL USUARIO NO ACEPTA ESTOS TÉRMINOS, DEBERÁ ABSTENERSE DE UTILIZAR LA PLATAFORMA.' },
    ]
  },
  {
    title: '3. DESCRIPCIÓN DEL SERVICIO',
    content: [
      { type: 'b', text: 'Gestión de agenda y citas con calendario interactivo.' },
      { type: 'b', text: 'Expedientes clínicos digitales con notas, diagnósticos y antecedentes.' },
      { type: 'b', text: 'Prescripciones médicas y solicitudes de laboratorio e imágenes.' },
      { type: 'b', text: 'Módulos clínicos personalizables.' },
      { type: 'b', text: 'Reportes y estadísticas de operación.' },
      { type: 'b', text: 'Gestión multi-sucursal y multi-usuario con control de roles.' },
      { type: 'b', text: 'Notificaciones automáticas por correo electrónico.' },
    ]
  },
  {
    title: '4. REGISTRO Y CUENTA',
    content: [
      { type: 'b', text: 'El acceso requiere creación de cuenta por parte del equipo de MedTrack.' },
      { type: 'b', text: 'Las credenciales son personales e intransferibles.' },
      { type: 'b', text: 'El Usuario es responsable de todas las acciones realizadas desde su cuenta.' },
      { type: 'b', text: 'MedTrack puede suspender cuentas por incumplimiento, falta de pago o uso fraudulento.' },
    ]
  },
  {
    title: '5. PLANES Y CONDICIONES ECONÓMICAS',
    sub: [
      {
        subtitle: '5.1 Planes disponibles (precios en USD/mes)',
        items: ['Basic: $9.99 — 1 sucursal, 100 pacientes, sin módulos clínicos.', 'Starter: $39.99 — 1 sucursal, 100 pacientes, 2 profesionales, 2 módulos.', 'Gold: $149.99 — 1 sucursal, 300 pacientes, 10 profesionales, 4 módulos.', 'Gold+: $249.99 — 2 sucursales, 500 pacientes, 20 profesionales, 6 módulos.', 'Enterprise: $599.99 — 5 sucursales, 1500 pacientes, 50 profesionales, 10 módulos.', 'Enterprise+: $899.99 — Todo ilimitado.']
      },
      {
        subtitle: '5.2 Facturación',
        items: ['Facturación mensual mediante Lemon Squeezy.', 'El Usuario autoriza el cobro automático en la fecha de renovación.', 'Los precios pueden cambiar con 30 días de aviso previo.']
      },
      {
        subtitle: '5.3 Reembolsos',
        items: ['No se ofrecen reembolsos por períodos ya facturados.', 'Excepción: falla técnica grave imputable a MedTrack por más de 72 horas continuas, a juicio de MedTrack.']
      }
    ]
  },
  {
    title: '6. OBLIGACIONES DEL USUARIO',
    content: [
      { type: 'b', text: 'Usar la Plataforma únicamente para fines lícitos.' },
      { type: 'b', text: 'No compartir credenciales con personas no autorizadas.' },
      { type: 'b', text: 'Ingresar únicamente datos verdaderos y actualizados.' },
      { type: 'b', text: 'Obtener el consentimiento informado de sus pacientes para el uso de sistemas digitales.' },
      { type: 'b', text: 'Cumplir con la legislación vigente en materia de protección de datos y ejercicio profesional.' },
      { type: 'b', text: 'No intentar acceder a datos de otras clínicas o usuarios.' },
      { type: 'b', text: 'No reproducir, distribuir ni modificar la Plataforma sin autorización.' },
    ]
  },
  {
    title: '7. PROPIEDAD INTELECTUAL',
    content: [
      { type: 'p', text: 'Todos los derechos sobre la Plataforma (código, diseño, logotipos, interfaces, algoritmos) son propiedad exclusiva de MedTrack. La suscripción otorga únicamente una licencia de uso limitada, personal, no exclusiva, no transferible y revocable.' },
      { type: 'p', text: 'El Contenido ingresado por el Usuario (datos de pacientes, notas clínicas) es y permanecerá propiedad del Usuario. MedTrack no reclamará derechos sobre dicho Contenido.' },
    ]
  },
  {
    title: '8. CONFIDENCIALIDAD',
    content: [
      { type: 'b', text: 'MedTrack tratará como estrictamente confidencial toda información clínica y empresarial del Usuario y sus pacientes.' },
      { type: 'b', text: 'No revelará datos a terceros, salvo obligación legal o requerimiento de autoridad competente.' },
    ]
  },
  {
    title: '9. DISPONIBILIDAD DEL SERVICIO',
    content: [
      { type: 'b', text: 'MedTrack procurará una disponibilidad del 99% mensual.' },
      { type: 'b', text: 'No se garantiza disponibilidad del 100%.' },
      { type: 'b', text: 'No es responsable por interrupciones por fuerza mayor, fallas de proveedores de infraestructura o ataques cibernéticos.' },
    ]
  },
  {
    title: '10. LIMITACIÓN DE RESPONSABILIDAD',
    content: [
      { type: 'b', text: 'MedTrack no será responsable por daños indirectos, incidentales o consecuentes.' },
      { type: 'b', text: 'No asume responsabilidad por la exactitud de datos ingresados por el Usuario.' },
      { type: 'b', text: 'La Plataforma es una herramienta de gestión y no sustituye el criterio clínico profesional.' },
      { type: 'b', text: 'La responsabilidad total de MedTrack no excederá el monto pagado por el Usuario en los 3 meses anteriores al evento.' },
    ]
  },
  {
    title: '11. INDEMNIZACIÓN',
    content: [
      { type: 'p', text: 'El Usuario indemnizará a MedTrack ante reclamaciones derivadas del incumplimiento de estos Términos, uso indebido de la Plataforma, violación de derechos de terceros o incumplimiento de normativa profesional aplicable.' },
    ]
  },
  {
    title: '12. MODIFICACIONES',
    content: [
      { type: 'b', text: 'MedTrack notificará cambios por correo electrónico con 15 días de anticipación.' },
      { type: 'b', text: 'El uso continuado tras la notificación implica aceptación tácita.' },
      { type: 'b', text: 'Si el Usuario no acepta los cambios, puede cancelar antes de su entrada en vigencia.' },
    ]
  },
  {
    title: '13. TERMINACIÓN',
    content: [
      { type: 'b', text: 'El Usuario puede cancelar en cualquier momento; la cancelación aplica al final del período en curso.' },
      { type: 'b', text: 'MedTrack puede terminar la relación por incumplimiento grave (efecto inmediato) o con 30 días de aviso previo.' },
      { type: 'b', text: 'El Usuario puede exportar sus datos hasta 15 días después de la terminación.' },
    ]
  },
  {
    title: '14. LEGISLACIÓN APLICABLE',
    content: [
      { type: 'b', text: 'Ley N.° 8968 — Protección de Datos Personales de Costa Rica.' },
      { type: 'b', text: 'Código Civil y Código de Comercio de Costa Rica.' },
      { type: 'b', text: 'Ley de Protección al Consumidor (Ley N.° 7472).' },
      { type: 'p', text: 'Las controversias se resolverán por negociación directa. De no llegarse a acuerdo en 30 días, se someterán a los tribunales competentes de San José, Costa Rica.' },
    ]
  },
  {
    title: '15. CONTACTO',
    content: [
      { type: 'p', text: 'Correo electrónico: wadgvargas@gmail.com' },
      { type: 'p', text: 'MedTrack — Costa Rica' },
    ]
  },
]

export default function Terminos() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div style={{ fontFamily: '"Inter", system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/medtrack-logo.png" alt="MedTrack" style={{ height: 40 }} />
        </a>
        <a href="/" style={{ fontSize: 13, color: BLUE, textDecoration: 'none', fontWeight: 500 }}>← Volver al inicio</a>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: '0.06em' }}>DOCUMENTO LEGAL</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: BLUE, marginBottom: 12, lineHeight: 1.2 }}>Términos y Condiciones de Uso</h1>
          <p style={{ fontSize: 14, color: '#888' }}>Versión 1.0 · Vigente desde el {new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginTop: 16, maxWidth: 680 }}>
            Los presentes Términos regulan el acceso y uso de la plataforma MedTrack. Al utilizar la Plataforma, el Usuario acepta íntegra e incondicionalmente estas condiciones.
          </p>
        </div>

        {sections.map((sec, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', marginBottom: 16, border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: BLUE, marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${G}20` }}>{sec.title}</h2>
            {sec.content?.map((item, j) => (
              item.type === 'p'
                ? <p key={j} style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 8 }}>{item.text}</p>
                : <div key={j} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: G, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>•</span>
                    <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: 0 }}>{item.text}</p>
                  </div>
            ))}
            {sec.sub?.map((s, j) => (
              <div key={j} style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>{s.subtitle}</h3>
                {s.items.map((item, k) => (
                  <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                    <span style={{ color: G, fontWeight: 700, flexShrink: 0 }}>•</span>
                    <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: 0 }}>{item}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        <p style={{ textAlign: 'center', fontSize: 13, color: '#bbb', marginTop: 32 }}>© {new Date().getFullYear()} MedTrack · Todos los derechos reservados</p>
      </div>
    </div>
  )
}
