import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_INFO: Record<string, { label: string; price: string; features: string[] }> = {
  basic: { label: 'Básico', price: '$49/mes', features: ['Hasta 2 médicos', 'Hasta 100 pacientes', '2 módulos activos', 'Soporte por email'] },
  gold: { label: 'Gold', price: '$199/mes', features: ['Hasta 10 médicos', 'Hasta 500 pacientes', 'Hasta 5 módulos personalizables', 'Reportes avanzados', 'Soporte prioritario'] },
  enterprise: { label: 'Enterprise', price: '$449/mes', features: ['Médicos ilimitados', 'Pacientes ilimitados', 'Módulos personalizados ilimitados', 'Reportes + exportación', 'Soporte dedicado', 'Personalización de marca'] },
}

const PLAN_ORDER: Record<string, number> = { basic: 1, gold: 2, enterprise: 3 }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { clinic_name, clinic_email, old_plan, new_plan, legal_name } = await req.json()

    const oldInfo = PLAN_INFO[old_plan] || PLAN_INFO.basic
    const newInfo = PLAN_INFO[new_plan] || PLAN_INFO.basic
    const isUpgrade = PLAN_ORDER[new_plan] > PLAN_ORDER[old_plan]

    const featuresHtml = newInfo.features.map(f => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:18px;height:18px;background:#e8f5f0;border-radius:50%;text-align:center;font-size:11px;line-height:18px;flex-shrink:0;">✓</div>
        <span style="font-size:13px;color:#4a5568;">${f}</span>
      </div>`).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#1a3a5c 0%,#2c5282 100%);padding:36px 32px;">
      <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:0.06em;">MEDTRACK</div>
      <div style="font-size:12px;color:#90bfe0;margin-top:4px;letter-spacing:0.08em;text-transform:uppercase;">Plataforma de gestión clínica</div>
    </div>

    <div style="padding:36px 32px;">
      <div style="font-size:22px;font-weight:700;color:#1a3a5c;margin-bottom:6px;">
        ${isUpgrade ? '🚀 ¡Su plan fue actualizado!' : '📋 Actualización de plan'}
      </div>
      <div style="width:48px;height:3px;background:#1a3a5c;border-radius:2px;margin-bottom:20px;"></div>

      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 16px;">
        Estimado equipo de <strong style="color:#1a3a5c;">${clinic_name}</strong>${legal_name ? ` <span style="color:#718096;font-size:13px;">(${legal_name})</span>` : ''},
      </p>

      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 24px;">
        ${isUpgrade
          ? `Nos complace informarles que el plan de su clínica ha sido <strong style="color:#1a3a5c;">actualizado exitosamente</strong>. Gracias por continuar confiando en nosotros y por apostar por más herramientas para su equipo. Este cambio refleja el crecimiento de su clínica, y estamos aquí para acompañarlos en cada etapa.`
          : `Le informamos que el plan de su clínica ha sido <strong style="color:#1a3a5c;">ajustado</strong>. Si tiene alguna consulta sobre este cambio o necesita información adicional, no dude en contactarnos. Seguimos comprometidos con brindarles el mejor servicio posible.`
        }
      </p>

      <!-- Cambio de plan -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
        <div style="flex:1;background:#f7fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;min-width:120px;">
          <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Plan anterior</div>
          <div style="font-size:16px;font-weight:700;color:#718096;">${oldInfo.label}</div>
          <div style="font-size:13px;color:#a0aec0;">${oldInfo.price}</div>
        </div>
        <div style="font-size:24px;color:#1a3a5c;">→</div>
        <div style="flex:1;background:#1a3a5c;border-radius:10px;padding:16px;text-align:center;min-width:120px;">
          <div style="font-size:11px;color:#90bfe0;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Plan nuevo</div>
          <div style="font-size:16px;font-weight:700;color:#fff;">${newInfo.label}</div>
          <div style="font-size:13px;color:#a0c4e8;">${newInfo.price}</div>
        </div>
      </div>

      <!-- Nuevo plan incluye -->
      <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px;margin-bottom:28px;">
        <div style="font-size:12px;color:#718096;margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Su nuevo plan incluye:</div>
        ${featuresHtml}
      </div>

      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 28px;">
        ${isUpgrade
          ? 'Ahora tienen acceso a todas las herramientas de su nuevo plan. Si necesitan orientación para aprovecharlas al máximo, con gusto los acompañamos.'
          : 'Si en algún momento desean explorar nuevamente un plan superior, estaremos encantados de orientarlos. Seguimos aquí para lo que necesiten.'
        }
      </p>

      <div style="text-align:center;">
        <a href="https://medtrack-gilt.vercel.app" style="background:#1a3a5c;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block;">Acceder a MedTrack →</a>
      </div>
    </div>

    <div style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
      <p style="font-size:11px;color:#a0aec0;margin:0;text-align:center;line-height:1.7;">
        Con gratitud, el equipo de <strong style="color:#718096;">MedTrack</strong><br>
        Este es un mensaje automático. Para consultas escríbanos a soporte@medtrack.com<br>
        © 2026 MedTrack. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body></html>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MedTrack <onboarding@resend.dev>',
        to: [clinic_email],
        subject: `${isUpgrade ? '🚀' : '📋'} Actualización de plan — ${clinic_name}`,
        html,
      }),
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
