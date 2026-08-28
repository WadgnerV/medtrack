import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response(errorPage('No se encontró el ID de la cita.'), { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Obtener info de la cita y clínica
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select('id, clinic_id, status')
      .eq('id', id)
      .single()

    if (apptError || !appt) {
      return new Response(errorPage('No se encontró la cita en el sistema.'), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    // Actualizar estado
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'confirmed_patient' })
      .eq('id', id)

    if (updateError) {
      return new Response(errorPage('Error al confirmar la cita. Por favor contactá a tu clínica directamente.'), { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    // Obtener nombre de la clínica
    let clinicName = 'MedTrack'
    if (appt.clinic_id) {
      const { data: cs } = await supabase
        .from('clinic_settings')
        .select('clinic_name')
        .eq('clinic_id', appt.clinic_id)
        .maybeSingle()
      if (cs?.clinic_name) clinicName = cs.clinic_name
    }

    return new Response(successPage(clinicName), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (e) {
    return new Response(errorPage('Error inesperado. Por favor contactá a tu clínica directamente.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
})

function successPage(clinicName: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita confirmada</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: #fff; border-radius: 20px; padding: 40px 32px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .icon { width: 64px; height: 64px; background: #E1F5EE; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .icon svg { width: 32px; height: 32px; stroke: #0F6E56; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
    .sub { font-size: 14px; color: #666; line-height: 1.7; margin-bottom: 28px; }
    .clinic-badge { background: #1a3a5c; color: #fff; display: inline-block; padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; }
    .footer { margin-top: 16px; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <div class="title">¡Asistencia confirmada!</div>
    <div class="sub">Tu asistencia ha sido registrada exitosamente. Te esperamos en tu cita.</div>
    <div class="clinic-badge">${clinicName}</div>
    <div class="footer">Este enlace es de uso único.</div>
  </div>
</body>
</html>`
}

function errorPage(msg: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: #fff; border-radius: 20px; padding: 40px 32px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .icon { width: 64px; height: 64px; background: #FAECE7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .icon svg { width: 32px; height: 32px; stroke: #D85A30; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
    .sub { font-size: 14px; color: #666; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </div>
    <div class="title">No se pudo confirmar</div>
    <div class="sub">${msg}</div>
  </div>
</body>
</html>`
}
