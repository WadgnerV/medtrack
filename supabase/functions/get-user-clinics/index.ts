import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { email } = await req.json()
    if (!email) return new Response(JSON.stringify({ clinics: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profile } = await sb.from('profiles').select('id, clinic_id').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (!profile) return new Response(JSON.stringify({ clinics: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: memberships } = await sb
      .from('professional_clinic_memberships')
      .select('clinic_id, clinic:clinic_id(id, name)')
      .eq('profile_id', profile.id)
      .eq('is_active', true)

    if (memberships && memberships.length > 0) {
      return new Response(JSON.stringify({ clinics: memberships }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (profile.clinic_id) {
      const { data: clinic } = await sb.from('clinics').select('id, name').eq('id', profile.clinic_id).single()
      return new Response(JSON.stringify({ clinics: [{ clinic_id: profile.clinic_id, clinic }] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ clinics: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message, clinics: [] }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
