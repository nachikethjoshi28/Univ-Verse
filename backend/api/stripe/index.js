import { Router } from 'express'
import Stripe from 'stripe'
import { supabase } from '../../lib/supabase.js'
import { requireAuth } from '../../middleware/auth.js'
import 'dotenv/config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const router = Router()

// Create Stripe Connect onboarding link for sellers
router.post('/connect/onboard', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single()

    let accountId = profile?.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: req.user.email,
        capabilities: { transfers: { requested: true } },
      })
      accountId = account.id

      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', req.user.id)
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/market?stripe=refresh`,
      return_url: `${process.env.FRONTEND_URL}/market?stripe=success`,
      type: 'account_onboarding',
    })

    res.json({ url: accountLink.url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create payment intent for marketplace purchase
router.post('/payment-intent', requireAuth, async (req, res) => {
  const { listing_id } = req.body
  if (!listing_id) return res.status(400).json({ error: 'listing_id is required' })

  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('*, seller:profiles!marketplace_listings_seller_id_fkey(stripe_account_id)')
    .eq('id', listing_id)
    .single()

  if (!listing) return res.status(404).json({ error: 'Listing not found' })
  if (!listing.price) return res.status(400).json({ error: 'Listing has no price' })
  if (!listing.seller?.stripe_account_id) return res.status(400).json({ error: 'Seller has not set up payments' })

  const amount = Math.round(listing.price * 100)
  const platformFee = Math.round(amount * 0.05) // 5% platform fee

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      application_fee_amount: platformFee,
      transfer_data: { destination: listing.seller.stripe_account_id },
      metadata: { listing_id, buyer_id: req.user.id },
    })

    res.json({ client_secret: paymentIntent.client_secret })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Stripe webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  if (event.type === 'payment_intent.succeeded') {
    const { listing_id, buyer_id } = event.data.object.metadata
    await supabase
      .from('marketplace_listings')
      .update({ status: 'sold' })
      .eq('id', listing_id)

    await supabase.from('notifications').insert({
      user_id: buyer_id,
      type: 'purchase_complete',
      title: 'Purchase Complete!',
      body: 'Your payment was processed. Contact the seller for pickup details.',
    })
  }

  res.json({ received: true })
})

export default router
