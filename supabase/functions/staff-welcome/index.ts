import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { staff_email, staff_name, staff_role, clinic_name, app_url } = await req.json()

    const roleLabel: Record<string, string> = {
      doctor: 'médico colaborador',
      admin: 'administrador',
      nurse: 'enfermero/a',
      receptionist: 'recepcionista',
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#1a3a5c 0%,#2c5282 100%);padding:36px 32px;">
      <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:0.06em;">MEDTRACK</div>
      <div style="font-size:12px;color:#90bfe0;margin-top:4px;letter-spacing:0.08em;text-transform:uppercase;">Plataforma de gestión clínica</div>
    </div>

    <div style="padding:36px 32px;">
      <div style="font-size:22px;font-weight:700;color:#1a3a5c;margin-bottom:6px;">¡Bienvenido/a, ${staff_name}! 👋</div>
      <div style="width:48px;height:3px;background:#1a3a5c;border-radius:2px;margin-bottom:20px;"></div>

      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 16px;">
        Tu perfil como <strong style="color:#1a3a5c;">${roleLabel[staff_role] || staff_role}</strong> ha sido creado exitosamente en <strong>${clinic_name}</strong>. Estamos muy contentos de que seas parte del equipo.
      </p>

      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 24px;">
        Desde ahora tenés acceso a MedTrack, una plataforma diseñada para que puedas tener toda la información de tus pacientes al alcance de tu mano — donde sea y cuando lo necesités. Queremos que tu experiencia sea simple, ordenada y que realmente te ahorre tiempo en tu día a día.
      </p>

      <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px;margin-bottom:24px;">
        <div style="font-size:12px;color:#718096;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;">Tus credenciales de acceso</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:32px;height:32px;background:#e8f0f8;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">📧</div>
          <div>
            <div style="font-size:11px;color:#a0aec0;margin-bottom:2px;">Usuario</div>
            <div style="font-size:14px;font-weight:600;color:#1a3a5c;">${staff_email}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;background:#e8f0f8;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🔑</div>
          <div>
            <div style="font-size:11px;color:#a0aec0;margin-bottom:2px;">Contraseña</div>
            <div style="font-size:14px;color:#4a5568;">La contraseña temporal fue proporcionada por el administrador de <strong>${clinic_name}</strong>. Te recomendamos cambiarla en tu primer ingreso.</div>
          </div>
        </div>
      </div>

      <div style="background:#edf2f7;border-radius:12px;padding:22px;margin-bottom:28px;">
        <div style="font-size:13px;font-weight:700;color:#1a3a5c;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.06em;">Con MedTrack podés</div>
        ${[
          ['📅', 'Gestionar tu agenda y citas de forma sencilla'],
          ['📋', 'Acceder al expediente clínico de tus pacientes en cualquier momento'],
          ['💬', 'Comunicarte con tu equipo dentro de la plataforma'],
          ['📊', 'Ver el historial completo y el seguimiento de cada paciente'],
        ].map(([icon, text]) => `
          <div style="display:flex;gap:12px;margin-bottom:10px;align-items:flex-start;">
            <div style="font-size:18px;flex-shrink:0;">${icon}</div>
            <div style="font-size:13px;color:#4a5568;line-height:1.6;">${text}</div>
          </div>
        `).join('')}
      </div>

      <p style="font-size:14px;color:#4a5568;line-height:1.8;margin:0 0 28px;">
        Si tenés alguna duda al ingresar o necesitás ayuda para comenzar, no dudés en contactar al administrador de <strong>${clinic_name}</strong>. Estamos aquí para que tu experiencia sea la mejor posible.
      </p>

      <div style="text-align:center;">
        <a href="${app_url || 'https://medtrack-gilt.vercel.app'}" style="background:#1a3a5c;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block;letter-spacing:0.04em;">
          Ingresar a MedTrack →
        </a>
      </div>
    </div>

    <div style="background:#f7fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
      <p style="font-size:11px;color:#a0aec0;margin:0;text-align:center;line-height:1.7;">
        Con gusto, el equipo de <strong style="color:#718096;">MedTrack</strong><br>
        Este es un mensaje automático generado por ${clinic_name}.<br>
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
        to: [staff_email],
        subject: `¡Bienvenido/a a MedTrack, ${staff_name}! — Tu perfil fue creado`,
        html,
      }),
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
