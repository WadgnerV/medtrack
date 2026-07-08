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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
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

    const firstName = patient_name.split(' ')[0]
    const dateFormatted = new Date(appointment_date + 'T12:00:00').toLocaleDateString('es-CR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const timeFormatted = appointment_time?.substring(0, 5)
    const waText = encodeURIComponent('No pude asistir a mi cita programada, por lo que me gustaría reprogramar con su ayuda')
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${waText}`

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="background:#0F6E56;color:#fff;display:inline-block;padding:10px 24px;border-radius:12px;font-size:18px;font-weight:700;letter-spacing:0.05em;">MEDTRACK</div>
          <div style="color:#888;font-size:13px;margin-top:6px;">${clinicName}</div>
        </div>

        <h2 style="color:#1a1a1a;font-size:20px;margin-bottom:12px;">Hola, ${firstName} 👋</h2>
        
        <p style="color:#444;font-size:15px;line-height:1.7;margin-bottom:16px;">
          Notamos que no pudiste asistir a tu cita del <strong>${dateFormatted}</strong> a las <strong>${timeFormatted}</strong> con <strong>${doctor_name}</strong>.
        </p>

        <p style="color:#444;font-size:15px;line-height:1.7;margin-bottom:24px;">
          Entendemos que a veces surgen imprevistos. Lo importante es que tu salud y bienestar no se queden en pausa — estamos aquí para ayudarte a retomar cuando estés listo.
        </p>

        <div style="background:#f0fdf9;border-left:4px solid #0F6E56;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
          <p style="color:#0F6E56;font-size:14px;font-weight:600;margin:0 0 6px;">¿Deseas reagendar tu cita?</p>
          <p style="color:#555;font-size:14px;margin:0;line-height:1.6;">Contáctanos por WhatsApp y con gusto te ayudamos a encontrar el mejor horario.</p>
        </div>

        <div style="text-align:center;margin-bottom:28px;">
          <a href="${waUrl}" style="background:#25D366;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;display:inline-block;">
            📱 Reagendar por WhatsApp
          </a>
        </div>

        <p style="color:#888;font-size:13px;line-height:1.6;text-align:center;">
          Si ya resolviste tu situación y deseas continuar con tu plan de atención, también puedes escribirnos directamente.
        </p>

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
        subject: `${firstName}, ¿todo bien? Queremos ayudarte a reagendar`,
        html
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
