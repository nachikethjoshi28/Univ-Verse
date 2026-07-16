import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  if (!signature) return new Response('Missing Stripe-Signature header', { status: 400 })

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`Stripe event: ${event.type}`)

  try {
    switch (event.type) {

      // Payment succeeded → activate subscription
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.client_reference_id
        if (!userId) break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const plan = subscription.metadata.plan as string

        if (!plan) break

        await supabase.from('profiles').update({
          subscription_plan:       plan,
          subscription_status:     'active',
          subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq('id', userId)

        console.log(`Activated ${plan} plan for user ${userId}`)
        break
      }

      // Subscription renewed or changed (e.g., Silver → Gold via portal)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id
        if (!userId) break

        const plan = subscription.metadata.plan as string
        const isActive = subscription.status === 'active'

        await supabase.from('profiles').update({
          subscription_plan:       isActive && plan ? plan : 'free',
          subscription_status:     subscription.status,
          subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq('id', userId)

        console.log(`Updated subscription for user ${userId}: status=${subscription.status}, plan=${plan}`)
        break
      }

      // Subscription cancelled or expired → downgrade to free
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id
        if (!userId) break

        await supabase.from('profiles').update({
          subscription_plan:       'free',
          subscription_status:     'cancelled',
          subscription_period_end: null,
        }).eq('id', userId)

        console.log(`Cancelled subscription for user ${userId}`)
        break
      }

      // Payment failed → optionally notify user; keep plan until period ends
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (profile) {
          await supabase.from('notifications').insert({
            user_id: profile.id,
            type:    'payment_failed',
            title:   'Payment failed',
            body:    'Your subscription payment failed. Please update your payment method to keep your plan.',
            data:    { invoice_id: invoice.id },
          })
        }
        break
      }
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    return new Response(`Handler error: ${err.message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
