import { useEffect } from 'react'

const G = '#1D9E75'
const BLUE = '#1a3a5c'

const sections = [
  {
    title: '1. IDENTIDAD Y DATOS DEL RESPONSABLE DEL TRATAMIENTO',
    content: [
      { type: 'p', text: 'Responsable: MedTrack' },
      { type: 'p', text: 'Plataforma: medtrackcr.com' },
      { type: 'p', text: 'Correo electrónico de contacto: wadgvargas@gmail.com' },
      { type: 'p', text: 'País de operación principal: Costa Rica' },
    ]
  },
  {
    title: '2. DEFINICIONES',
    content: [
      { type: 'b', text: 'Dato personal: Cualquier información relativa a una persona física identificada o identificable.' },
      { type: 'b', text: 'Dato sensible: Aquel que revele estado de salud, origen racial, opiniones políticas, datos biométricos o genéticos. MedTrack maneja datos de salud considerados sensibles conforme a la Ley 8968.' },
      { type: 'b', text: 'Titular: La persona física a quien corresponden los datos personales.' },
      { type: 'b', text: 'Responsable del tratamiento: Quien decide sobre los fines y medios del tratamiento.' },
      { type: 'b', text: 'Usuario: Clínica, consultorio o establecimiento que contrata los servicios de MedTrack.' },
      { type: 'b', text: 'Paciente/Cliente final: La persona natural cuyos datos son gestionados a través de la Plataforma.' },
    ]
  },
  {
    title: '3. DATOS PERSONALES QUE RECOPILAMOS',
    sub: [
      { subtitle: '3.1 Datos de Usuarios (clínicas y profesionales)', items: ['Nombre completo y apellidos', 'Número de cédula jurídica o física', 'Correo electrónico', 'Número de teléfono', 'Dirección física del establecimiento', 'Datos de acceso (correo y contraseña cifrada)'] },
      { subtitle: '3.2 Datos de Pacientes y Clientes Finales', items: ['Nombre completo', 'Cédula o documento de identidad', 'Fecha de nacimiento y sexo biológico', 'Teléfono y correo electrónico', 'Dirección de residencia', 'Diagnósticos médicos (CIE-10)', 'Notas clínicas y antecedentes médicos', 'Prescripciones y solicitudes de laboratorio', 'Historial de citas'] },
      { subtitle: '3.3 Datos recopilados automáticamente', items: ['Dirección IP', 'Tipo de navegador y dispositivo', 'Registros de actividad y acceso', 'Fecha y hora de acceso'] },
    ]
  },
  {
    title: '4. FINALIDAD DEL TRATAMIENTO',
    content: [
      { type: 'b', text: 'Prestación del servicio de gestión clínica y administrativa.' },
      { type: 'b', text: 'Gestión de citas, expedientes y registros de salud en nombre del Usuario.' },
      { type: 'b', text: 'Comunicaciones transaccionales: confirmaciones, recordatorios y notificaciones.' },
      { type: 'b', text: 'Administración de cuentas y control de acceso por roles.' },
      { type: 'b', text: 'Facturación y gestión de suscripciones mediante Lemon Squeezy.' },
      { type: 'b', text: 'Cumplimiento de obligaciones legales aplicables.' },
    ]
  },
  {
    title: '5. BASE LEGAL DEL TRATAMIENTO',
    content: [
      { type: 'b', text: 'Ejecución de contrato: Necesario para prestar el servicio contratado (Art. 5, Ley 8968).' },
      { type: 'b', text: 'Consentimiento informado: El Usuario es responsable de obtener el consentimiento del paciente para datos sensibles.' },
      { type: 'b', text: 'Interés legítimo: Para el mantenimiento y seguridad de la Plataforma.' },
      { type: 'b', text: 'Obligación legal: Para cumplir requerimientos de autoridades competentes.' },
    ]
  },
  {
    title: '6. RESPONSABILIDAD DEL USUARIO',
    content: [
      { type: 'p', text: 'MedTrack actúa como encargado del tratamiento. El Usuario es el responsable del tratamiento de los datos de sus pacientes y, en consecuencia:' },
      { type: 'b', text: 'Es responsable de informar a sus pacientes sobre el uso de MedTrack.' },
      { type: 'b', text: 'Es responsable de obtener el consentimiento de sus pacientes para el tratamiento de datos sensibles.' },
      { type: 'b', text: 'Debe garantizar que los datos ingresados son exactos y pertinentes.' },
    ]
  },
  {
    title: '7. MEDIDAS DE SEGURIDAD',
    content: [
      { type: 'b', text: 'Cifrado SSL/TLS en todas las comunicaciones.' },
      { type: 'b', text: 'Almacenamiento seguro en Supabase con certificaciones de seguridad internacionales.' },
      { type: 'b', text: 'Control de acceso basado en roles (RLS) que garantiza aislamiento de datos entre clínicas.' },
      { type: 'b', text: 'Contraseñas almacenadas con algoritmos de hash seguro (bcrypt).' },
      { type: 'b', text: 'Backups automáticos periódicos.' },
    ]
  },
  {
    title: '8. TRANSFERENCIA INTERNACIONAL DE DATOS',
    content: [
      { type: 'b', text: 'Supabase: Infraestructura en AWS (Amazon Web Services), con certificación SOC 2 Type II.' },
      { type: 'b', text: 'Vercel: Infraestructura de despliegue en servidores globales.' },
      { type: 'b', text: 'Lemon Squeezy: Procesador de pagos con cumplimiento PCI DSS.' },
    ]
  },
  {
    title: '9. DERECHOS DE LOS TITULARES',
    content: [
      { type: 'b', text: 'Derecho de acceso: Conocer qué datos están siendo tratados.' },
      { type: 'b', text: 'Derecho de rectificación: Solicitar corrección de datos inexactos.' },
      { type: 'b', text: 'Derecho de cancelación: Solicitar la eliminación de datos.' },
      { type: 'b', text: 'Derecho de oposición: Oponerse al tratamiento en determinadas circunstancias.' },
      { type: 'b', text: 'Derecho de portabilidad: Recibir datos en formato estructurado (aplica RGPD).' },
      { type: 'p', text: 'Para ejercer estos derechos, contacte a: wadgvargas@gmail.com. MedTrack responderá en un plazo máximo de 5 días hábiles conforme al Artículo 13 de la Ley 8968.' },
    ]
  },
  {
    title: '10. CONSERVACIÓN DE LOS DATOS',
    content: [
      { type: 'b', text: 'Los datos se conservarán mientras el Usuario mantenga activa su suscripción.' },
      { type: 'b', text: 'Al finalizar la relación contractual, los datos serán eliminados en un plazo máximo de 30 días.' },
      { type: 'b', text: 'Se mantendrá una copia cifrada por hasta 90 días adicionales, tras los cuales será eliminada de forma irreversible.' },
    ]
  },
  {
    title: '11. MENORES DE EDAD',
    content: [
      { type: 'p', text: 'MedTrack no está diseñado para uso directo por menores de 18 años. Los datos de menores pacientes deben ser ingresados por el profesional bajo responsabilidad del Usuario, garantizando el consentimiento del padre, madre o tutor legal.' },
    ]
  },
  {
    title: '12. AUTORIDAD DE CONTROL',
    content: [
      { type: 'p', text: 'En Costa Rica, la autoridad competente en materia de protección de datos es la Agencia de Protección de Datos de los Habitantes (PRODHAB), disponible en prodhab.go.cr. Los titulares tienen derecho a presentar reclamaciones ante la PRODHAB.' },
    ]
  },
  {
    title: '13. MODIFICACIONES',
    content: [
      { type: 'p', text: 'MedTrack se reserva el derecho de modificar esta Política. Las modificaciones serán notificadas mediante correo electrónico con al menos 15 días de anticipación.' },
    ]
  },
  {
    title: '14. CONTACTO',
    content: [
      { type: 'p', text: 'Correo electrónico: wadgvargas@gmail.com' },
      { type: 'p', text: 'MedTrack — Costa Rica' },
    ]
  },
]

export default function Privacidad() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div style={{ fontFamily: '"Inter", system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Navbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/medtrack-logo.png" alt="MedTrack" style={{ height: 40 }} />
        </a>
        <a href="/" style={{ fontSize: 13, color: BLUE, textDecoration: 'none', fontWeight: 500 }}>← Volver al inicio</a>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: '0.06em' }}>DOCUMENTO LEGAL</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: BLUE, marginBottom: 12, lineHeight: 1.2 }}>Política de Privacidad</h1>
          <p style={{ fontSize: 14, color: '#888' }}>Versión 1.0 · Vigente desde el {new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginTop: 16, maxWidth: 680 }}>
            La presente Política regula el tratamiento de datos personales y sensibles por parte de MedTrack, en cumplimiento de la Ley N.° 8968 de Costa Rica y estándares internacionales aplicables, incluyendo el RGPD de la Unión Europea.
          </p>
        </div>

        {/* Secciones */}
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
