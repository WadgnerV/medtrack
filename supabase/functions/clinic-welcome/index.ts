import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CHECKOUT_UUIDS: Record<string, string> = {
  basic: '8f133a2a-6301-488e-9de7-3deee1a46f0a',
  starter: '61d84776-0d2b-42b1-81fd-8355392ad737',
  gold: '39d1c093-2444-4198-bf85-3e6e0dda8735',
  gold_plus: 'b9cfe853-6c36-4353-a797-7d31804873d4',
  enterprise: '3fd628d0-7bd4-4742-a893-7ebd3f496594',
  enterprise_plus: 'f7d3b59a-441c-4ec2-968c-7d7c1c07daf4',
}

const CHECKOUT_BASE = 'https://medtrack.lemonsqueezy.com/checkout/buy'

function getCheckoutUrl(plan: string, clinicId: string, clinicEmail: string): string {
  const uuid = CHECKOUT_UUIDS[plan] || CHECKOUT_UUIDS.basic
  const params = new URLSearchParams({
    'checkout[email]': clinicEmail,
    'checkout[custom][clinic_id]': clinicId,
  })
  return `${CHECKOUT_BASE}/${uuid}?${params.toString()}`
}

const PLAN_INFO: Record<string, { label: string; price: string; features: string[] }> = {
  basic: { label: 'Basic', price: '$9.99/mes', features: ['Agenda de citas ilimitadas', 'Hasta 100 pacientes', 'Sin módulos clínicos', 'Sin correos automáticos', '1 sucursal activa'] },
  starter: { label: 'Starter', price: '$39.99/mes', features: ['Agenda de citas ilimitadas', 'Hasta 100 pacientes', 'Hasta 2 profesionales', '2 módulos clínicos por paciente', 'Correos automáticos', '1 sucursal activa'] },
  gold: { label: 'Gold', price: '$149.99/mes', features: ['Agenda de citas ilimitadas', 'Hasta 300 pacientes', 'Hasta 10 profesionales', '4 módulos clínicos por paciente', 'Correos automáticos', 'Reportes básicos', '1 sucursal activa'] },
  gold_plus: { label: 'Gold+', price: '$249.99/mes', features: ['Agenda de citas ilimitadas', 'Hasta 500 pacientes', 'Hasta 20 profesionales', '6 módulos por paciente incluyendo exclusivos', 'Correos automáticos', 'Reportes avanzados con exportación', 'Personalización de marca', 'Soporte prioritario', 'Hasta 2 sucursales activas'] },
  enterprise: { label: 'Enterprise', price: '$599.99/mes', features: ['Agenda de citas ilimitadas', 'Hasta 1500 pacientes', 'Hasta 50 profesionales', '10 módulos por paciente incluyendo exclusivos', 'Correos automáticos', 'Reportes avanzados con exportación', 'Personalización de marca', 'Soporte prioritario + marketing', 'Hasta 5 sucursales activas'] },
  enterprise_plus: { label: 'Enterprise+', price: '$899.99/mes', features: ['Agenda de citas ilimitadas', 'Pacientes ilimitados', 'Profesionales ilimitados', 'Módulos ilimitados todos exclusivos', 'Correos automáticos', 'Reportes avanzados con exportación', 'Personalización de marca', 'Soporte dedicado + marketing', 'Sucursales ilimitadas'] },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { clinic_name, clinic_email, plan, legal_name, clinic_id } = await req.json()
    const planInfo = PLAN_INFO[plan] || PLAN_INFO.basic
    const checkoutUrl = getCheckoutUrl(plan, clinic_id, clinic_email)

    const featuresHtml = planInfo.features.map(f => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:18px;height:18px;background:#e8f5f0;border-radius:50%;text-align:center;font-size:11px;line-height:18px;flex-shrink:0;">✓</div>
        <span style="font-size:13px;color:#4a5568;">${f}</span>
      </div>`).join('')

    const stepsHtml = [
      ['📞', 'Nuestro equipo se pondrá en contacto para coordinar la configuración inicial de la plataforma.'],
      ['🔑', 'Recibirán las credenciales de acceso del administrador principal de la clínica.'],
      ['🎓', 'Agendaremos una sesión de onboarding personalizada para familiarizarse con todas las funcionalidades.'],
      ['💬', 'A partir de ahí, tendrán soporte continuo para cualquier consulta o ajuste que necesiten.'],
    ].map(([icon, text]) => `
      <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
        <div style="font-size:18px;flex-shrink:0;">${icon}</div>
        <div style="font-size:13px;color:#4a5568;line-height:1.7;">${text}</div>
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
      <div style="font-size:22px;font-weight:700;color:#1a3a5c;margin-bottom:6px;">Un placer tenerte con nosotros 🤝</div>
      <div style="width:48px;height:3px;background:#1a3a5c;border-radius:2px;margin-bottom:20px;"></div>
      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 16px;">Estimado equipo de <strong style="color:#1a3a5c;">${clinic_name}</strong>${legal_name ? ` <span style="color:#718096;font-size:13px;">(${legal_name})</span>` : ''},</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 16px;">Queremos comenzar diciéndoles algo importante: <strong style="color:#1a3a5c;">gracias por elegirnos.</strong> Sabemos que hay muchas opciones en el mercado, y que la decisión de confiar la gestión clínica de su institución a una plataforma no es algo que se tome a la ligera. Por eso, nos tomamos ese voto de confianza con la mayor seriedad y compromiso.</p>
      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 28px;">Nos alegra confirmarles que <strong>${clinic_name}</strong> ha sido registrada exitosamente en MedTrack. A partir de hoy, son parte de nuestra comunidad, y nos comprometemos a acompañarlos en cada paso del camino.</p>
      <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div>
            <div style="font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Plan adquirido</div>
            <div style="font-size:18px;font-weight:700;color:#1a3a5c;">${planInfo.label}</div>
          </div>
          <div style="background:#1a3a5c;color:#fff;padding:6px 18px;border-radius:20px;font-size:14px;font-weight:700;">${planInfo.price}</div>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding-top:14px;">
          <div style="font-size:12px;color:#718096;margin-bottom:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Su plan incluye:</div>
          ${featuresHtml}
        </div>
      </div>
      <div style="background:#edf2f7;border-radius:12px;padding:22px;margin-bottom:28px;">
        <div style="font-size:13px;font-weight:700;color:#1a3a5c;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.06em;">¿Qué sigue ahora?</div>
        ${stepsHtml}
      </div>
      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 28px;">Estamos genuinamente emocionados de tenerlos a bordo. Si tienen alguna pregunta antes de comenzar, no duden en escribirnos. Estamos aquí para ustedes.</p>
      <div style="text-align:center;">
        <a href="${checkoutUrl}" style="background:#1a3a5c;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;display:inline-block;letter-spacing:0.04em;">🔐 Activar suscripción →</a>
        <div style="font-size:12px;color:#a0aec0;margin-top:10px;">Al completar el pago, su clínica quedará activa automáticamente.</div>
      </div>
    </div>
    <div style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
      <p style="font-size:11px;color:#a0aec0;margin:0;text-align:center;line-height:1.7;">Con gratitud, el equipo de <strong style="color:#718096;">MedTrack</strong><br>Este es un mensaje automático. Para consultas escríbanos a soporte@medtrack.com<br>© 2026 MedTrack. Todos los derechos reservados.</p>
    </div>
  </div>
</body></html>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MedTrack <onboarding@resend.dev>',
        to: [clinic_email],
        subject: `¡Bienvenidos a MedTrack, ${clinic_name}! — Registro confirmado`,
        html,
      }),
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
