import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import stripeRouter from './api/stripe/index.js'
import notificationsRouter from './api/notifications/index.js'

const app = express()
const PORT = process.env.PORT ?? 3001

// Security
app.use(helmet())
app.use(cors({
  origin: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
  credentials: true,
}))

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }))

// Body parsing (raw for Stripe webhooks, JSON for everything else)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/stripe', stripeRouter)
app.use('/api/notifications', notificationsRouter)

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'uni-verse-api' }))

app.listen(PORT, () => {
  console.log(`Uni-verse API running on http://localhost:${PORT}`)
})
