import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const PRICE_IDS: Record<string, string> = {
  silver_monthly: Deno.env.get('STRIPE_SILVER_MONTHLY_PRICE_ID')!,
  silver_yearly:  Deno.env.get('STRIPE_SILVER_YEARLY_PRICE_ID')!,
  gold_monthly:   Deno.env.get('STRIPE_GOLD_MONTHLY_PRICE_ID')!,
  gold_yearly:    Deno.env.get('STRIPE_GOLD_YEARLY_PRICE_ID')!,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders })

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { plan, period } = await req.json() as { plan: 'silver' | 'gold'; period: 'monthly' | 'yearly' }

    const priceId = PRICE_IDS[`${plan}_${period}`]
    if (!priceId) return new Response(JSON.stringify({ error: 'Invalid plan or period' }), { status: 400, headers: corsHeaders })

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name, email')
      .eq('id', user.id)
      .single()

    let customerId: string = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email,
        name:  profile?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/settings?payment=success&plan=${plan}`,
      cancel_url:  `${origin}/settings?payment=cancelled`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
