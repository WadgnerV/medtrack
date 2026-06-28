import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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
    `SUMMARY:Cita medica - ${doctorName}`,`DESCRIPTION:Cita con ${doctorName} para ${patientName}`,
    `LOCATION:${clinicAddress || clinicName}`,'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'].join('\r\n')
}

function googleCalendarUrl(date, time, doctorName, clinicName, clinicAddress) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, min] = time.split(':').map(Number)
  const pad = (n) => String(n).padStart(2, '0')
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(min)}00`
  const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(hour+1)}${pad(min)}00`
  const params = new URLSearchParams({ action:'TEMPLATE', text:`Cita medica - ${doctorName}`, dates:`${dtStart}/${dtEnd}`, details:`Cita con ${doctorName}`, location: clinicAddress || clinicName })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { patient_email, patient_name, doctor_name, appointment_date, appointment_time, visit_type } = await req.json()
    console.log('Confirmation para:', patient_email, appointment_date, appointment_time)

    const dateFormatted = new Date(appointment_date + 'T12:00:00').toLocaleDateString('es-CR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const timeFormatted = appointment_time?.substring(0, 5)

    let clinicAddress = ''
    let clinicName = 'Glow Clinic'
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const { data: cs } = await sb.from('clinic_settings').select('*').limit(1).single()
      if (cs) {
        clinicAddress = [cs.address, cs.district, cs.canton, cs.province, cs.office_number].filter(Boolean).join(', ')
        if (cs.clinic_name) clinicName = cs.clinic_name
      }
    } catch(_e) {}

    const gcalUrl = googleCalendarUrl(appointment_date, appointment_time, doctor_name, clinicName, clinicAddress)
    const icsContent = generateICS(appointment_date, appointment_time, doctor_name, clinicName, clinicAddress, patient_name)
    const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)))
    console.log('ICS generado, enviando a Resend...')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MedTrack <noreply@medtrackcr.com>',
        to: [patient_email],
        subject: `Cita agendada - ${dateFormatted} a las ${timeFormatted}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
          <div style="text-align:center;margin-bottom:24px;"><div style="background:#0F6E56;color:#fff;display:inline-block;padding:10px 24px;border-radius:12px;font-size:18px;font-weight:700;">MEDTRACK</div>
          <div style="color:#888;font-size:13px;margin-top:6px;">by ${clinicName}</div></div>
          <h2 style="color:#1a1a1a;font-size:18px;margin-bottom:8px;">Cita agendada</h2>
          <p style="color:#555;font-size:14px;line-height:1.6;">Hola <strong>${patient_name}</strong>, tu cita ha sido agendada exitosamente.</p>
          <div style="background:#f5f5f5;border-radius:12px;padding:16px 20px;margin:20px 0;">
            ${clinicAddress ? `<div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>Direccion:</strong> ${clinicAddress}</div>` : ''}
            <div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>Fecha:</strong> ${dateFormatted}</div>
            <div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>Hora:</strong> ${timeFormatted}</div>
            <div style="font-size:14px;color:#555;"><strong>Medico:</strong> ${doctor_name}</div>
          </div>
          <div style="text-align:center;margin:20px 0;">
            <a href="${gcalUrl}" style="background:#4285F4;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;">Agregar a Google Calendar</a>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;">Tambien podes abrir el archivo adjunto para agregar al calendario de iPhone u Outlook.</p>
          <p style="color:#888;font-size:13px;line-height:1.6;">Recibiras un recordatorio 24 horas antes de tu cita.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#bbb;font-size:12px;text-align:center;">${clinicName} · MedTrack</p>
        </div>`,
        attachments: [{ filename: 'cita-medica.ics', content: icsBase64 }]
      })
    })
    const data = await res.json()
    console.log('Resend response:', JSON.stringify(data))
    return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch(e) {
    console.error('Error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
