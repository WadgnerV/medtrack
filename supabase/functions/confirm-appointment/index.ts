import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_URL = 'https://medtrack-gilt.vercel.app'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response('ID de cita no encontrado', { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed_patient' })
      .eq('id', id)

    if (error) throw error

    // Redirigir a una página de éxito
    return new Response(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cita confirmada</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #fff; border-radius: 20px; padding: 40px 32px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .icon { font-size: 48px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
          .sub { font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 24px; }
          .badge { background: #0F6E56; color: #fff; display: inline-block; padding: 8px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; letter-spacing: 0.05em; }
          .clinic { color: #888; font-size: 12px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <div class="title">¡Asistencia confirmada!</div>
          <div class="sub">Tu asistencia a la cita ha sido confirmada exitosamente. Te esperamos.</div>
          <div class="badge">MEDTRACK</div>
          <div class="clinic">by Glow Clinic</div>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (e) {
    return new Response(`
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>Error</title></head>
      <body style="font-family:system-ui;text-align:center;padding:40px;">
        <h2>Hubo un error al confirmar la cita</h2>
        <p>Por favor contactá a Glow Clinic directamente.</p>
      </body>
      </html>
    `, { status: 500, headers: { 'Content-Type': 'text/html' } })
  }
})
