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
    const { patient_email, patient_name, doctor_name, appointment_date, appointment_time, clinic_id } = await req.json()

    const dateFormatted = new Date(appointment_date + 'T12:00:00').toLocaleDateString('es-CR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const timeFormatted = appointment_time?.substring(0, 5)

    let clinicAddress = ''
    let clinicName = 'MedTrack'
    let clinicLogo = ''
    let clinicWhatsapp = ''
    let wazeLink = ''

    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      let q = sb.from('clinic_settings').select('*')
      if (clinic_id) q = q.eq('clinic_id', clinic_id)
      const { data: cs } = await q.limit(1).single()
      if (cs) {
        clinicAddress = [cs.address, cs.district, cs.canton, cs.province, cs.office_number].filter(Boolean).join(', ')
        if (cs.clinic_name) clinicName = cs.clinic_name
        clinicLogo = cs.logo_url || ''
        clinicWhatsapp = (cs.whatsapp || '').replace(/\D/g,'').slice(-8)
        if (cs.waze_link) wazeLink = cs.waze_link
      }
    } catch(_e) {}

    const gcalUrl = googleCalendarUrl(appointment_date, appointment_time, doctor_name, clinicName, clinicAddress)
    const icsContent = generateICS(appointment_date, appointment_time, doctor_name, clinicName, clinicAddress, patient_name)
    const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)))

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    ${clinicLogo
      ? `<div style="background:#f7f7f5;padding:30px 32px;border-bottom:1px solid #ececea;">
        <img src="${clinicLogo}" alt="${clinicName}" width="240" style="display:block;width:240px;max-width:100%;height:auto;border:0;" />
      </div>`
      : `<div style="background:#1a3a5c;padding:28px 32px;">
        <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">${clinicName}</div>
        <div style="color:rgba(255,255,255,0.65);font-size:13px;margin-top:4px;">Sistema de gestión médica</div>
      </div>`}
    <div style="padding:32px;">
      <div style="font-size:18px;font-weight:600;color:#1a3a5c;margin-bottom:8px;">Cita agendada</div>
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Hola <strong>${patient_name}</strong>, tu cita ha sido agendada exitosamente en <strong>${clinicName}</strong>.
      </p>
      <div style="background:#f8fbf9;border:1px solid #e2ede9;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td width="90" valign="top" style="font-size:12px;color:#888;padding:5px 10px 5px 0;">Clínica</td>
            <td valign="top" style="font-size:14px;color:#1a3a5c;font-weight:500;padding:5px 0;">${clinicName}</td>
          </tr>
          ${clinicAddress ? `
          <tr>
            <td width="90" valign="top" style="font-size:12px;color:#888;padding:5px 10px 5px 0;">Dirección</td>
            <td valign="top" style="font-size:14px;color:#333;padding:5px 0;">${clinicAddress}</td>
          </tr>` : ''}
          ${wazeLink ? `
          <tr>
            <td colspan="2" align="center" style="padding:10px 0;">
              <a href="${wazeLink}" target="_blank" style="display:inline-block;background:#1ABCD4;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Cómo llegar en Waze</a>
            </td>
          </tr>` : ''}
          <tr><td colspan="2" style="border-top:1px solid #e2ede9;font-size:0;line-height:0;padding:4px 0;">&nbsp;</td></tr>
          <tr>
            <td width="90" valign="top" style="font-size:12px;color:#888;padding:5px 10px 5px 0;">Fecha</td>
            <td valign="top" style="font-size:14px;color:#333;font-weight:500;padding:5px 0;">${dateFormatted}</td>
          </tr>
          <tr>
            <td width="90" valign="top" style="font-size:12px;color:#888;padding:5px 10px 5px 0;">Hora</td>
            <td valign="top" style="font-size:14px;color:#333;font-weight:500;padding:5px 0;">${timeFormatted}</td>
          </tr>
          <tr>
            <td width="90" valign="top" style="font-size:12px;color:#888;padding:5px 10px 5px 0;">Médico</td>
            <td valign="top" style="font-size:14px;color:#333;padding:5px 0;">${doctor_name}</td>
          </tr>
        </table>
      </div>
      ${clinicWhatsapp ? `
      <div style="background:#f8fbf9;border:1px solid #e2ede9;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:600;color:#0F6E56;margin-bottom:6px;">¿Necesitás reprogramar o tenés alguna consulta?</div>
        <div style="font-size:13px;color:#555;line-height:1.6;">Escribinos por WhatsApp y con gusto te ayudamos.</div>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="https://wa.me/506${clinicWhatsapp}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:11px 24px;border-radius:10px;font-size:13px;font-weight:600;">
          Contactar por WhatsApp
        </a>
      </div>` : ''}
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${gcalUrl}" style="display:inline-block;background:#4285F4;color:#fff;text-decoration:none;padding:11px 24px;border-radius:10px;font-size:13px;font-weight:600;">
          Agregar a Google Calendar
        </a>
      </div>
      <p style="color:#888;font-size:12px;text-align:center;margin:0 0 8px;">También podés abrir el archivo adjunto para agregar al calendario de iPhone u Outlook.</p>
      <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">Recibirás un recordatorio 24 horas antes de tu cita.</p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#aaa;">
      ${clinicName} · Este correo fue generado automáticamente, por favor no responder.
    </div>
  </div>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${clinicName} <noreply@medtrackcr.com>`,
        to: [patient_email],
        subject: `Cita agendada — ${dateFormatted} a las ${timeFormatted} · ${clinicName}`,
        html,
        attachments: [{ filename: 'cita-medica.ics', content: icsBase64 }]
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
