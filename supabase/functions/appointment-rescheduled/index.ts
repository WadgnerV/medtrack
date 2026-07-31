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
    const { patient_email, patient_name, doctor_name, appointment_date, appointment_time, clinic_id } = await req.json()

    let clinicName = 'MedTrack'
    let clinicAddress = ''
    let wazeLink = ''
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
      let q = sb.from('clinic_settings').select('*')
      if (clinic_id) q = q.eq('clinic_id', clinic_id)
      const { data: cs } = await q.limit(1).single()
      if (cs) {
        clinicName = cs.clinic_name || clinicName
        clinicAddress = [cs.address, cs.district, cs.canton, cs.province, cs.office_number].filter(Boolean).join(', ')
        if (cs.waze_link) wazeLink = cs.waze_link
      }
    } catch(_e) {}

    const dateFormatted = new Date(appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    const timeFormatted = appointment_time?.substring(0, 5)

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
      <div style="font-size:18px;font-weight:600;color:#1a3a5c;margin-bottom:8px;">Tu cita fue reprogramada</div>
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Hola <strong>${patient_name}</strong>, te informamos que tu cita en <strong>${clinicName}</strong> ha sido reprogramada con los siguientes datos:
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
          ${wazeLink ? `
          <div style="margin-top:8px;">
            <a href="${wazeLink}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;background:#1ABCD4;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
              <img src="https://www.waze.com/favicon.ico" width="16" height="16" style="border-radius:3px;" />
              Cómo llegar en Waze
            </a>
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
      <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 20px;">Si este cambio no fue solicitado por vos o tenés alguna consulta, por favor contáctanos por WhatsApp.</p>
      <div style="text-align:center;">
        <a href="https://wa.me/50660464569" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:11px 24px;border-radius:10px;font-size:13px;font-weight:600;">
          Contactar por WhatsApp
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
        subject: `Tu cita fue reprogramada · ${clinicName}`,
        html,
      })
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
