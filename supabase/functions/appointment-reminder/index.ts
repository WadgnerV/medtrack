import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_URL = 'https://medtrackcr.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateICS(date, time, doctorName, clinicName, clinicAddress, patientName) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, min] = time.split(':').map(Number)
  const pad = (n) => String(n).padStart(2, '0')
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(min)}00`
  const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(hour+1)}${pad(min)}00`
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MedTrack//ES','CALSCALE:GREGORIAN','METHOD:REQUEST','BEGIN:VEVENT',
    `DTSTART:${dtStart}`,`DTEND:${dtEnd}`,`DTSTAMP:${now}`,
    `SUMMARY:Cita médica - ${doctorName}`,`DESCRIPTION:Cita con ${doctorName} para ${patientName} en ${clinicName}`,
    `LOCATION:${clinicAddress || clinicName}`,'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'].join('\r\n')
}

function googleCalendarUrl(date, time, doctorName, clinicName, clinicAddress) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, min] = time.split(':').map(Number)
  const pad = (n) => String(n).padStart(2, '0')
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(min)}00`
  const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(hour+1)}${pad(min)}00`
  const params = new URLSearchParams({ action:'TEMPLATE', text:`Cita médica - ${doctorName}`, dates:`${dtStart}/${dtEnd}`, details:`Cita con ${doctorName} en ${clinicName}`, location: clinicAddress || clinicName })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: appts, error } = await supabase.from('appointments')
      .select('id, appointment_date, appointment_time, status, clinic_id, patient:patient_id(id, profile:profile_id(first_name, last_name, email)), doctor:doctor_id(first_name, last_name, prefix)')
      .eq('appointment_date', tomorrowStr)
      .eq('status', 'pending_confirmation')

    if (error) throw error

    // Cargar clinic_settings por clínica para soporte multi-tenant
    const clinicCache = {}
    async function getClinicInfo(clinicId) {
      if (clinicCache[clinicId]) return clinicCache[clinicId]
      const { data: cs } = await supabase.from('clinic_settings').select('*').eq('clinic_id', clinicId).limit(1).single()
      const info = {
        clinicName: cs?.clinic_name || 'MedTrack',
        clinicAddress: cs ? [cs.address, cs.district, cs.canton, cs.province, cs.office_number].filter(Boolean).join(', ') : ''
      }
      clinicCache[clinicId] = info
      return info
    }

    let sent = 0
    for (const appt of appts || []) {
      const patient_email = appt.patient?.profile?.email
      const patient_name = `${appt.patient?.profile?.first_name || ''} ${appt.patient?.profile?.last_name || ''}`.trim()
      const prefix = appt.doctor?.prefix ? appt.doctor.prefix + ' ' : 'Dr. '
      const doctor_name = `${prefix}${appt.doctor?.first_name} ${appt.doctor?.last_name}`
      if (!patient_email) continue

      const { clinicName, clinicAddress } = await getClinicInfo(appt.clinic_id)
      const dateFormatted = new Date(appt.appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
      const timeFormatted = appt.appointment_time?.substring(0, 5)
      const confirmUrl = `${APP_URL}/confirm-appointment?id=${appt.id}`
      const gcalUrl = googleCalendarUrl(appt.appointment_date, appt.appointment_time, doctor_name, clinicName, clinicAddress)
      const icsContent = generateICS(appt.appointment_date, appt.appointment_time, doctor_name, clinicName, clinicAddress, patient_name)
      const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)))

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#1a3a5c;padding:28px 32px;">
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">${clinicName}</div>
      <div style="color:rgba(255,255,255,0.65);font-size:13px;margin-top:4px;">Sistema de gestión médica</div>
    </div>
    <div style="padding:32px;">
      <div style="font-size:18px;font-weight:600;color:#1a3a5c;margin-bottom:8px;">Recordatorio de cita</div>
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Hola <strong>${patient_name}</strong>, te recordamos que tenés una cita mañana en <strong>${clinicName}</strong>.
      </p>
      <div style="background:#f8fbf9;border:1px solid #e2ede9;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:12px;color:#888;min-width:80px;padding-top:1px;">Clínica</span>
            <span style="font-size:14px;color:#1a3a5c;font-weight:500;">${clinicName}</span>
          </div>
          ${clinicAddress ? `
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:12px;color:#888;min-width:80px;padding-top:1px;">Dirección</span>
            <span style="font-size:14px;color:#333;">${clinicAddress}</span>
          </div>` : ''}
          <div style="border-top:1px solid #e2ede9;margin:4px 0;"></div>
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:12px;color:#888;min-width:80px;padding-top:1px;">Fecha</span>
            <span style="font-size:14px;color:#333;font-weight:500;">${dateFormatted}</span>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:12px;color:#888;min-width:80px;padding-top:1px;">Hora</span>
            <span style="font-size:14px;color:#333;font-weight:500;">${timeFormatted}</span>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:12px;color:#888;min-width:80px;padding-top:1px;">Médico</span>
            <span style="font-size:14px;color:#333;">${doctor_name}</span>
          </div>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${confirmUrl}" style="display:inline-block;background:#0F6E56;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
          Confirmar asistencia
        </a>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${gcalUrl}" style="display:inline-block;background:#4285F4;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;">
          Agregar a Google Calendar
        </a>
      </div>
      <p style="color:#888;font-size:12px;text-align:center;margin:0;">También podés abrir el archivo adjunto para agregar al calendario de iPhone u Outlook.</p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#aaa;">
      ${clinicName} · Este correo fue generado automáticamente, por favor no responder.
    </div>
  </div>
</body>
</html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${clinicName} <noreply@medtrackcr.com>`,
          to: [patient_email],
          subject: `Recordatorio: tu cita es mañana — ${dateFormatted} a las ${timeFormatted} · ${clinicName}`,
          html,
          attachments: [{ filename: 'cita-medica.ics', content: icsBase64 }]
        })
      })
      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
