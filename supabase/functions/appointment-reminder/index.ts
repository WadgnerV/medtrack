import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_URL = 'https://medtrack-gilt.vercel.app'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

    // Buscar citas de mañana que estén en pending_confirmation
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: appts, error } = await supabase
      .from('appointments')
      .select(`
        id, appointment_date, appointment_time, status,
        patient:patient_id(id, profile:profile_id(first_name, last_name, email)),
        doctor:doctor_id(first_name, last_name)
      `)
      .eq('appointment_date', tomorrowStr)
      .eq('status', 'pending_confirmation')

    if (error) throw error

    let sent = 0
    for (const appt of appts || []) {
      const patient_email = appt.patient?.profile?.email
      const patient_name = `${appt.patient?.profile?.first_name} ${appt.patient?.profile?.last_name}`
      const doctor_name = `Dr. ${appt.doctor?.first_name} ${appt.doctor?.last_name}`
      const dateFormatted = new Date(appt.appointment_date + 'T12:00:00').toLocaleDateString('es-CR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
      const timeFormatted = appt.appointment_time?.substring(0, 5)
      const confirmUrl = `${APP_URL}/confirm-appointment?id=${appt.id}`

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

      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="background:#0F6E56;color:#fff;display:inline-block;padding:10px 24px;border-radius:12px;font-size:18px;font-weight:700;letter-spacing:0.05em;">MEDTRACK</div>
            <div style="color:#888;font-size:13px;margin-top:6px;">by Glow Clinic</div>
          </div>
          <h2 style="color:#1a1a1a;font-size:18px;margin-bottom:8px;">Recordatorio de cita 🗓️</h2>
          <p style="color:#555;font-size:14px;line-height:1.6;">Hola <strong>${patient_name}</strong>, te recordamos que tienes una cita mañana.</p>
          <div style="background:#f5f5f5;border-radius:12px;padding:16px 20px;margin:20px 0;">
            ${clinicAddress ? `<div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>📍 Dirección:</strong> ${clinicAddress}</div>` : ''}
          <div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>📅 Fecha:</strong> ${dateFormatted}</div>
            <div style="margin-bottom:8px;font-size:14px;color:#555;"><strong>🕐 Hora:</strong> ${timeFormatted}</div>
            <div style="font-size:14px;color:#555;"><strong>👨‍⚕️ Médico:</strong> ${doctor_name}</div>
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}" style="background:#0F6E56;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:600;display:inline-block;">
              ✅ Confirmar mi asistencia
            </a>
          </div>
          <p style="color:#888;font-size:13px;line-height:1.6;text-align:center;">Si no puedes asistir, por favor contáctanos con anticipación.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#bbb;font-size:12px;text-align:center;">Glow Clinic · MedTrack</p>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'MedTrack <onboarding@resend.dev>',
          to: [patient_email],
          subject: `Recordatorio: tu cita es mañana ${dateFormatted} a las ${timeFormatted}`,
          html
        })
      })
      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
