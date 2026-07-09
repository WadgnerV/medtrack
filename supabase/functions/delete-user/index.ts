import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const { user_id } = await req.json()

  if (!user_id) return new Response(JSON.stringify({ error: 'user_id requerido' }), { status: 400, headers: corsHeaders })

  // Borrar perfil — las FK se manejan automáticamente con ON DELETE SET NULL
  const delRes = await fetch(`https://mdcqdigxbmfajlmaxrta.supabase.co/rest/v1/profiles?id=eq.${user_id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    }
  })

  if (!delRes.ok) {
    const body = await delRes.text()
    return new Response(JSON.stringify({ error: body }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Borrar usuario de auth
  const authRes = await fetch(`https://mdcqdigxbmfajlmaxrta.supabase.co/auth/v1/admin/users/${user_id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    }
  })

  if (!authRes.ok) {
    const body = await authRes.text()
    return new Response(JSON.stringify({ error: body }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
