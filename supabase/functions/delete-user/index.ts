import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient('https://mdcqdigxbmfajlmaxrta.supabase.co', SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { user_id } = await req.json()
  if (!user_id) return new Response(JSON.stringify({ error: 'user_id requerido' }), { status: 400, headers: corsHeaders })

  // Borrar todos los registros relacionados con el service role (bypassa RLS)
  await supabase.from('aesthetic_procedures').delete().eq('created_by', user_id)
  await supabase.from('clinical_notes').delete().eq('recorded_by', user_id)
  await supabase.from('preconsult_records').delete().eq('recorded_by', user_id)
  await supabase.from('inventory_history').delete().eq('recorded_by', user_id)
  await supabase.from('ticket_comments').delete().eq('author_id', user_id)
  await supabase.from('tickets').delete().eq('created_by', user_id)
  await supabase.from('tickets').update({ assigned_to: null }).eq('assigned_to', user_id)
  await supabase.from('informed_consents').delete().eq('signed_by', user_id)
  await supabase.from('purchase_orders').update({ approved_by: null }).eq('approved_by', user_id)
  await supabase.from('purchase_orders').delete().eq('created_by', user_id)
  await supabase.from('notifications').delete().eq('sender_id', user_id)
  await supabase.from('notifications').delete().eq('profile_id', user_id)
  await supabase.from('appointments').update({ doctor_id: null }).eq('doctor_id', user_id)
  await supabase.from('patient_documents').delete().eq('uploaded_by', user_id)

  // Borrar perfil
  await supabase.from('profiles').delete().eq('id', user_id)

  // Borrar de auth
  const res = await fetch(`https://mdcqdigxbmfajlmaxrta.supabase.co/auth/v1/admin/users/${user_id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    }
  })

  if (!res.ok) {
    const body = await res.text()
    return new Response(JSON.stringify({ error: body }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
