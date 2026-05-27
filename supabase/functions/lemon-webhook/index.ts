import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LEMON_WEBHOOK_SECRET = Deno.env.get('LEMON_WEBHOOK_SECRET')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

const VARIANT_TO_PLAN: Record<string, string> = {
  '1704249': 'basic',
  '1704251': 'gold',
  '1704255': 'enterprise',
  '8f133a2a-6301-488e-9de7-3deee1a46f0a': 'basic',
  '61d84776-0d2b-42b1-81fd-8355392ad737': 'starter',
  '39d1c093-2444-4198-bf85-3e6e0dda8735': 'gold',
  'b9cfe853-6c36-4353-a797-7d31804873d4': 'gold_plus',
  '3fd628d0-7bd4-4742-a893-7ebd3f496594': 'enterprise',
  'f7d3b59a-441c-4ec2-968c-7d7c1c07daf4': 'enterprise_plus',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.text()
    const signature = req.headers.get('x-signature') || ''

    // Verificar firma del webhook
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(LEMON_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSig = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')

    if (signature !== expectedSig) {
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(body)
    const eventName = event.meta?.event_name
    const data = event.data?.attributes
    const variantId = String(data?.first_subscription_item?.variant_id || data?.variant_id || '')
    const customData = event.meta?.custom_data
    const clinicId = customData?.clinic_id

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    if (eventName === 'subscription_created' || eventName === 'subscription_resumed') {
      const plan = VARIANT_TO_PLAN[variantId] || 'basic'
      await sb.from('clinics').update({
        is_active: true,
        subscription_status: 'active',
        plan,
        lemon_subscription_id: String(event.data?.id),
        lemon_customer_id: String(data?.customer_id),
        subscription_ends_at: null,
      }).eq('id', clinicId)
    }

    if (eventName === 'subscription_updated') {
      const plan = VARIANT_TO_PLAN[variantId] || 'basic'
      await sb.from('clinics').update({
        plan,
        subscription_status: data?.status || 'active',
        lemon_subscription_id: String(event.data?.id),
      }).eq('id', clinicId)
    }

    if (eventName === 'subscription_cancelled') {
      await sb.from('clinics').update({
        subscription_status: 'cancelled',
        subscription_ends_at: data?.ends_at,
      }).eq('id', clinicId)
    }

    if (eventName === 'subscription_expired') {
      await sb.from('clinics').update({
        is_active: false,
        subscription_status: 'expired',
      }).eq('id', clinicId)
    }

    if (eventName === 'subscription_paused') {
      await sb.from('clinics').update({
        subscription_status: 'paused',
        is_active: false,
      }).eq('id', clinicId)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
