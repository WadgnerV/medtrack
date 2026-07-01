import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'

export default function ConfirmAppointment() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const [status, setStatus] = useState('loading')
  const [appt, setAppt] = useState(null)

  useEffect(() => {
    if (id) confirm()
  }, [id])

  async function confirm() {
    const { data, error } = await supabase.from('appointments')
      .select('*, patient:patient_id(profile:profile_id(first_name, last_name)), doctor:doctor_id(first_name, last_name, prefix)')
      .eq('id', id).single()

    if (error || !data) { setStatus('error'); return }
    if (data.status === 'confirmed_patient') { setAppt(data); setStatus('already'); return }
    if (data.status === 'cancelled') { setStatus('cancelled'); return }

    const { error: e2 } = await supabase.from('appointments')
      .update({ status: 'confirmed_patient' }).eq('id', id)

    if (e2) { setStatus('error'); return }
    setAppt(data)
    setStatus('confirmed')
  }

  const dateStr = appt?.appointment_date
    ? new Date(appt.appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    : ''
  const timeStr = appt?.appointment_time?.substring(0, 5) || ''
  const doctorName = appt?.doctor
    ? `${appt.doctor.prefix ? appt.doctor.prefix + ' ' : ''}${appt.doctor.first_name} ${appt.doctor.last_name}`
    : ''
  const patientName = appt?.patient
    ? `${appt.patient.profile?.first_name || ''} ${appt.patient.profile?.last_name || ''}`.trim()
    : ''

  return (
    <div style={{ minHeight:'100vh', background:'#f4f7f6', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'40px 36px', maxWidth:440, width:'100%', textAlign:'center', border:'0.5px solid #e2ede9' }}>

        <div style={{ marginBottom:24 }}>
          <div style={{ background:G, color:'#fff', display:'inline-block', padding:'8px 20px', borderRadius:10, fontSize:16, fontWeight:700, letterSpacing:'0.05em', marginBottom:8 }}>
            MEDTRACK
          </div>
        </div>

        {status === 'loading' && (
          <div style={{ color:'#888', fontSize:14 }}>Confirmando tu cita...</div>
        )}

        {status === 'confirmed' && (
          <>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:'#1a3a5c', marginBottom:8 }}>Cita confirmada</div>
            <div style={{ fontSize:14, color:'#555', lineHeight:1.7, marginBottom:20 }}>
              {patientName && <span>Hola <strong>{patientName}</strong>, tu </span>}
              {!patientName && <span>Tu </span>}
              asistencia ha sido confirmada exitosamente.
            </div>
            <div style={{ background:'#f5f5f5', borderRadius:12, padding:'16px 20px', textAlign:'left' }}>
              <div style={{ marginBottom:8, fontSize:14, color:'#555' }}><strong>Fecha:</strong> {dateStr}</div>
              <div style={{ marginBottom:8, fontSize:14, color:'#555' }}><strong>Hora:</strong> {timeStr}</div>
              {doctorName && <div style={{ fontSize:14, color:'#555' }}><strong>Médico:</strong> {doctorName}</div>}
            </div>
          </>
        )}

        {status === 'already' && (
          <>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:'#1a3a5c', marginBottom:8 }}>Ya estás confirmado</div>
            <div style={{ fontSize:14, color:'#555', lineHeight:1.7, marginBottom:20 }}>Tu asistencia a esta cita ya había sido confirmada anteriormente.</div>
            <div style={{ background:'#f5f5f5', borderRadius:12, padding:'16px 20px', textAlign:'left' }}>
              <div style={{ marginBottom:8, fontSize:14, color:'#555' }}><strong>Fecha:</strong> {dateStr}</div>
              <div style={{ marginBottom:8, fontSize:14, color:'#555' }}><strong>Hora:</strong> {timeStr}</div>
              {doctorName && <div style={{ fontSize:14, color:'#555' }}><strong>Médico:</strong> {doctorName}</div>}
            </div>
          </>
        )}

        {status === 'cancelled' && (
          <>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#FAECE7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D85A30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:'#1a3a5c', marginBottom:8 }}>Cita cancelada</div>
            <div style={{ fontSize:14, color:'#555', lineHeight:1.7 }}>Esta cita fue cancelada. Si tenés alguna consulta contactá a tu clínica.</div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize:20, fontWeight:700, color:'#1a3a5c', marginBottom:8 }}>Enlace no válido</div>
            <div style={{ fontSize:14, color:'#555', lineHeight:1.7 }}>No pudimos encontrar esta cita. El enlace puede haber expirado o ser incorrecto.</div>
          </>
        )}

        <div style={{ marginTop:28, fontSize:12, color:'#bbb' }}>MedTrack · Sistema de gestión médica</div>
      </div>
    </div>
  )
}
