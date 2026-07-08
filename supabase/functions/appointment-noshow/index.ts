import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const WA_NUMBER = '50660464569'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { patient_email, patient_name, doctor_name, appointment_date, appointment_time, clinic_id } = await req.json()

    let clinicName = 'MedTrack'
    let clinicAddress = ''
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
      let q = sb.from('clinic_settings').select('*')
      if (clinic_id) q = q.eq('clinic_id', clinic_id)
      const { data: cs } = await q.limit(1).single()
      if (cs) {
        clinicName = cs.clinic_name || clinicName
        clinicAddress = [cs.address, cs.district, cs.canton, cs.province, cs.office_number].filter(Boolean).join(', ')
      }
    } catch(_e) {}

    const firstName = patient_name.split(' ')[0]
    const dateFormatted = new Date(appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    const timeFormatted = appointment_time?.substring(0, 5)
    const waText = encodeURIComponent('No pude asistir a mi cita programada, por lo que me gustaría reprogramar con su ayuda')
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${waText}`

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
      <div style="font-size:18px;font-weight:600;color:#1a3a5c;margin-bottom:8px;">Hola, ${firstName}</div>
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">
        Notamos que no pudiste asistir a tu cita del <strong>${dateFormatted}</strong> a las <strong>${timeFormatted}</strong> con <strong>${doctor_name}</strong> en <strong>${clinicName}</strong>.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
        Entendemos que a veces surgen imprevistos. Lo importante es que tu salud y bienestar no se queden en pausa — estamos aquí para ayudarte a retomar cuando estés listo.
      </p>
      <div style="background:#f8fbf9;border:1px solid #e2ede9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:14px;font-weight:600;color:#0F6E56;margin-bottom:6px;">¿Deseas reagendar tu cita?</div>
        <div style="font-size:13px;color:#555;line-height:1.6;">Contáctanos por WhatsApp y con gusto te ayudamos a encontrar el mejor horario.</div>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${waUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
          Reagendar por WhatsApp
        </a>
      </div>
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
        subject: `${firstName}, ¿todo bien? Queremos ayudarte a reagendar · ${clinicName}`,
        html
      })
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
