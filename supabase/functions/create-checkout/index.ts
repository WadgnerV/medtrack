import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const LEMON_API_KEY = Deno.env.get('LEMON_SQUEEZY_API_KEY')
const VARIANT_ID = Deno.env.get('LEMON_SQUEEZY_VARIANT_ID')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    const { email, userId } = await req.json()

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMON_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email,
              custom: { user_id: userId }
            },
            product_options: {
              redirect_url: 'https://medtrack-gilt.vercel.app/paciente',
            }
          },
          relationships: {
            store: { data: { type: 'stores', id: '339933' } },
            variant: { data: { type: 'variants', id: VARIANT_ID } }
          }
        }
      })
    })

    const data = await response.json()
    const checkoutUrl = data?.data?.attributes?.url

    return new Response(JSON.stringify({ url: checkoutUrl }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
})
