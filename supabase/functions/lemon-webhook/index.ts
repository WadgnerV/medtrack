import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()
    const eventName = body?.meta?.event_name
    const userId = body?.meta?.custom_data?.user_id
    const status = body?.data?.attributes?.status

    if (!userId) {
      return new Response('No user_id', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const isPro = status === 'active'
      await supabase.from('profiles').update({
        plan: isPro ? 'pro' : 'free'
      }).eq('id', userId)
    }

    if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      await supabase.from('profiles').update({
        plan: 'free'
      }).eq('id', userId)
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
