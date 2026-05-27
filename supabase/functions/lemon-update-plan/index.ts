import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LEMON_API_KEY = Deno.env.get('LEMON_SQUEEZY_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VARIANT_IDS: Record<string, string> = {
  basic: '8f133a2a-6301-488e-9de7-3deee1a46f0a',
  starter: '61d84776-0d2b-42b1-81fd-8355392ad737',
  gold: '39d1c093-2444-4198-bf85-3e6e0dda8735',
  gold_plus: 'b9cfe853-6c36-4353-a797-7d31804873d4',
  enterprise: '3fd628d0-7bd4-4742-a893-7ebd3f496594',
  enterprise_plus: 'f7d3b59a-441c-4ec2-968c-7d7c1c07daf4',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { clinic_id, new_plan } = await req.json()

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Obtener subscription_id de la clínica
    const { data: clinic } = await sb.from('clinics')
      .select('lemon_subscription_id, plan, name')
      .eq('id', clinic_id)
      .single()

    if (!clinic?.lemon_subscription_id) {
      return new Response(JSON.stringify({ error: 'No hay suscripción activa para esta clínica' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const variantId = VARIANT_IDS[new_plan]
    if (!variantId) {
      return new Response(JSON.stringify({ error: 'Plan no válido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Actualizar suscripción en Lemon Squeezy
    const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${clinic.lemon_subscription_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${LEMON_API_KEY}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: clinic.lemon_subscription_id,
          attributes: {
            variant_id: parseInt(variantId),
          }
        }
      })
    })

    const lemonData = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: lemonData }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Actualizar plan en BD
    await sb.from('clinics').update({ plan: new_plan }).eq('id', clinic_id)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
