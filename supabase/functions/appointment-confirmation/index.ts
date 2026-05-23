import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const WA_NUMBER = '50660464569'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { patient_email, patient_name, doctor_name, appointment_date, appointment_time, visit_type } = await req.json()

    const dateFormatted = new Date(appointment_date + 'T12:00:00').toLocaleDateString('es-CR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const timeFormatted = appointment_time?.substring(0, 5)

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:#0F6E56;color:#fff;display:inline-block;padding:10px 24px;border-radius:12px;font-size:18px;font-weight:700;letter-spacing:0.05em;">MEDTRACK</div>
          <div style="color:#888;font-size:13px;margin-top:6px;">by Glow Clinic</div>
        </div>
        <h2 style="color:#1a1a1a;font-size:18px;margin-bottom:8px;">Cita agendada ✅</h2>
        <p style="color:#555;font-size:14px;line-height:1.6;">Hola <strong>${patient_name}</strong>, tu cita ha sido agendada exitosamente.</p>
        <div style="background:#f5f5f5;border-radius:12px;padding:16px 20px;margin:20px 0;">
          <div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>📅 Fecha:</strong> ${dateFormatted}</div>
          <div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>🕐 Hora:</strong> ${timeFormatted}</div>
          <div style="font-size:14px;color:#555;"><strong>👨‍⚕️ Médico:</strong> ${doctor_name}</div>
        </div>
        <p style="color:#888;font-size:13px;line-height:1.6;">Recibirás un recordatorio 24 horas antes de tu cita para confirmar tu asistencia.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#bbb;font-size:12px;text-align:center;">Glow Clinic · MedTrack</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MedTrack <onboarding@resend.dev>',
        to: [patient_email],
        subject: `Cita agendada - ${dateFormatted} a las ${timeFormatted}`,
        html
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
