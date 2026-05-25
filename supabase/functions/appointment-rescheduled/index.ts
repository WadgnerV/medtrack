import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { patient_email, patient_name, doctor_name, appointment_date, appointment_time } = await req.json()

    let clinicAddress = ''
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
      const { data: cs } = await sb.from('clinic_settings').select('*').limit(1).single()
      if (cs) {
        const parts = [cs.address, cs.district, cs.canton, cs.province, cs.office_number].filter((x: unknown) => !!x)
        clinicAddress = parts.join(', ')
      }
    } catch(_e) {
      clinicAddress = ''
    }

    const dateFormatted = new Date(appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    const [h, m] = appointment_time.split(':')
    const hour = parseInt(h)
    const timeFormatted = `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
        <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="background:#1a3a5c;padding:28px 32px;">
            <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;">Tu cita fue reprogramada</div>
            <div style="font-size:14px;color:#a0c4e8;">Glow Clinic · MedTrack</div>
          </div>
          <div style="padding:28px 32px;">
            <p style="font-size:15px;color:#333;margin:0 0 20px;">Hola <strong>${patient_name}</strong>, te informamos que tu cita médica ha sido reprogramada con los siguientes datos:</p>
            <div style="background:#f0f4f8;border-radius:8px;padding:18px 20px;margin-bottom:20px;">
              ${clinicAddress ? `<div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>📍 Dirección:</strong> ${clinicAddress}</div>` : ''}
              <div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>📅 Fecha:</strong> ${dateFormatted}</div>
              <div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>🕐 Hora:</strong> ${timeFormatted}</div>
              <div style="font-size:14px;color:#555;"><strong>👨‍⚕️ Médico:</strong> ${doctor_name}</div>
            </div>
            <p style="font-size:13px;color:#777;margin:0 0 20px;">Si este cambio no fue solicitado por vos o tenés alguna consulta, por favor contactanos por WhatsApp.</p>
            <div style="text-align:center;margin-top:24px;">
              <a href="https://wa.me/50660464569" style="background:#1a3a5c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Contactar por WhatsApp</a>
            </div>
          </div>
          <div style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;">
            <p style="font-size:11px;color:#aaa;margin:0;text-align:center;">Glow Clinic · Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MedTrack <onboarding@resend.dev>',
        to: [patient_email],
        subject: '📅 Tu cita fue reprogramada · Glow Clinic',
        html,
      })
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status:500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
