import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const BLUE = '#185FA5'
const GREEN = '#0F6E56'

export default function ContextSelector() {
  const { profile, setActiveContext } = useAuth()
  const navigate = useNavigate()
  const [hoveredOut, setHoveredOut] = useState(false)
  const [hoveredHosp, setHoveredHosp] = useState(false)

  const contexts = profile?.contexts || ['outpatient']
  const hasOutpatient = contexts.includes('outpatient')
  const hasHospital = contexts.includes('hospitalization')

  function goOutpatient() {
    setActiveContext('outpatient')
    const role = profile?.role
    if (role === 'superadmin') navigate('/superadmin')
    else if (['admin','clinic_admin','branch_admin'].includes(role)) navigate('/admin')
    else if (role === 'doctor') navigate('/doctor')
    else if (role === 'receptionist') navigate('/recepcion')
    else navigate('/paciente')
  }

  function goHospital() {
    setActiveContext('hospitalization')
    navigate('/hospitalizacion')
  }

  const nombre = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f4f7f6', fontFamily:'Inter, sans-serif', padding:24 }}>
      <div style={{ width:'100%', maxWidth:520 }}>

        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#1a3a5c', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <span style={{ fontSize:20, fontWeight:600, color:'#1a3a5c' }}>MedTrack</span>
          </div>
          <div style={{ fontSize:15, fontWeight:500, color:'#1a1a1a', marginBottom:4 }}>Bienvenido, {nombre}</div>
          <div style={{ fontSize:13, color:'#888' }}>¿A cuál contexto desea ingresar?</div>
        </div>

        <div style={{ display:'flex', gap:16 }}>
          {hasOutpatient && (
            <div
              onClick={goOutpatient}
              onMouseEnter={() => setHoveredOut(true)}
              onMouseLeave={() => setHoveredOut(false)}
              style={{ flex:1, background:'#fff', border: hoveredOut ? `2px solid ${GREEN}` : '1.5px solid #e2ede9', borderRadius:14, padding:'28px 20px', cursor:'pointer', textAlign:'center', transition:'border-color 0.15s' }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                  <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                  <circle cx="20" cy="10" r="2"/>
                </svg>
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:'#1a3a5c', marginBottom:8 }}>Consulta externa</div>
              <div style={{ fontSize:12, color:'#6b8f7e', lineHeight:1.6 }}>Agenda, expedientes clínicos y módulos de atención ambulatoria</div>
              <div style={{ marginTop:18, padding:'8px 0', background: hoveredOut ? GREEN : '#E1F5EE', borderRadius:8, fontSize:13, fontWeight:500, color: hoveredOut ? '#fff' : '#085041', transition:'all 0.15s' }}>
                Ingresar
              </div>
            </div>
          )}

          {hasHospital && (
            <div
              onClick={goHospital}
              onMouseEnter={() => setHoveredHosp(true)}
              onMouseLeave={() => setHoveredHosp(false)}
              style={{ flex:1, background:'#fff', border: hoveredHosp ? `2px solid ${BLUE}` : '1.5px solid #e2ede9', borderRadius:14, padding:'28px 20px', cursor:'pointer', textAlign:'center', transition:'border-color 0.15s' }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/>
                  <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/>
                  <path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>
                </svg>
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:'#1a3a5c', marginBottom:8 }}>Hospitalización</div>
              <div style={{ fontSize:12, color:'#6b8f7e', lineHeight:1.6 }}>Panel de camas, evoluciones clínicas e indicaciones de enfermería</div>
              <div style={{ marginTop:18, padding:'8px 0', background: hoveredHosp ? BLUE : '#E6F1FB', borderRadius:8, fontSize:13, fontWeight:500, color: hoveredHosp ? '#fff' : '#0C447C', transition:'all 0.15s' }}>
                Ingresar
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#aaa' }}>
          Podés cambiar de contexto en cualquier momento desde el menú superior
        </div>
      </div>
    </div>
  )
}
