import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { to_email, to_name, clinic_name, requester_name, items, notes, order_id } = await req.json()

  const itemsHtml = items.map((i: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:center;">${i.quantity} ${i.unit}</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <div style="background:#0F6E56;padding:28px 32px;">
          <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">${clinic_name}</div>
          <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">Sistema de gestión médica</div>
        </div>
        <div style="padding:32px;">
          <div style="font-size:18px;font-weight:600;color:#1a3a5c;margin-bottom:8px;">Nueva solicitud de compra</div>
          <p style="color:#555;font-size:14px;margin:0 0 20px;">
            <strong>${requester_name}</strong> ha generado una solicitud de compra que requiere tu aprobación.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fbf9;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ítem</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Cantidad</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          ${notes ? `<div style="background:#f8fbf9;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#555;"><strong>Nota:</strong> ${notes}</div>` : ''}
          <div style="text-align:center;margin-top:24px;">
            <a href="https://medtrackcr.com/admin" style="display:inline-block;background:#0F6E56;color:#fff;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">
              Revisar y aprobar en el sistema
            </a>
          </div>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#aaa;">
          Este correo fue generado automáticamente por ${clinic_name} · MedTrack
        </div>
      </div>
    </body>
    </html>
  `

  await resend.emails.send({
    from: 'noreply@medtrackcr.com',
    to: [to_email],
    subject: `Nueva solicitud de compra pendiente — ${clinic_name}`,
    html,
  })

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
