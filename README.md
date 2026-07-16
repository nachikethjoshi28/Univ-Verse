# Uni-verse — Campus Social Platform

A full-stack social platform built exclusively for university students. Only verified university email addresses can sign up. Features include a social feed, direct messaging, marketplace listings, community groups, a dating tab, and more.

**Live app:** [univ-verse.vercel.app](https://univ-verse.vercel.app)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Backend | Node.js + Express (Vercel serverless) |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Payments | Stripe |
| Email | Resend |
| Deployment | Vercel |

---

## Supported Universities

Sign-up is restricted to these university domains:

| University | Domain |
|---|---|
| University of South Florida | `@usf.edu` |
| University of North Texas | `@unt.edu` |
| UT Dallas | `@utdallas.edu` |
| Rutgers University | `@rutgers.edu` |
| BVRIT | `@bvrit.ac.in` |

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (for payments)
- A [Resend](https://resend.com) account (for transactional email)
- [Vercel CLI](https://vercel.com/docs/cli) (optional, for deployment)

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/uni-verse.git
cd uni-verse
```

### 2. Set up the database

1. Create a new project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** in your Supabase dashboard
3. Run each migration file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_and_trigger_fix.sql
supabase/migrations/003_marketplace_notifications.sql
supabase/migrations/004_repost_support.sql
supabase/migrations/005_archive_posts.sql
supabase/migrations/006_fix_repost_trigger.sql
```

4. (Optional) Run `supabase/seed.sql` to add the university records.

### 3. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
VITE_API_URL=http://localhost:3001
```

Find your Supabase URL and anon key in **Project Settings → API**.

### 4. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=3001
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
RESEND_API_KEY=re_your-resend-api-key
FRONTEND_URL=http://localhost:5173
```

Find the **service role key** in **Project Settings → API → service_role** (keep this secret — never expose it on the frontend).

### 5. Install dependencies and run

Open two terminals:

**Terminal 1 — Frontend**
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

**Terminal 2 — Backend**
```bash
cd backend
npm install
npm run dev
```
Backend runs at `http://localhost:3001`

---

## Project Structure

```
uni-verse/
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # Auth + Theme context
│   │   ├── pages/             # Route-level pages
│   │   │   ├── auth/          # Login, signup, verify
│   │   │   ├── home/          # Social feed
│   │   │   ├── connect/       # Find + manage connections
│   │   │   ├── profile/       # Own profile + other user profiles
│   │   │   ├── chats/         # Direct messages
│   │   │   ├── community/     # Community groups
│   │   │   ├── dates/         # Dating tab
│   │   │   ├── marketspot/    # Marketplace listings
│   │   │   ├── notifications/ # Notification centre
│   │   │   ├── settings/      # Account settings + appearance
│   │   │   └── admin/         # Admin panel
│   │   ├── lib/               # Supabase client + utilities
│   │   └── types/             # TypeScript types
│   ├── .env.example           # Environment variable template
│   └── vercel.json            # Vercel build config
│
├── backend/                   # Express API (Vercel serverless)
│   ├── api/                   # Route handlers
│   ├── lib/                   # Supabase + email helpers
│   ├── middleware/            # Auth middleware
│   ├── .env.example           # Environment variable template
│   └── vercel.json
│
└── supabase/
    ├── migrations/            # SQL migration files (run in order)
    ├── functions/             # Supabase Edge Functions (Stripe webhooks)
    ├── schema.sql             # Full schema reference
    └── seed.sql               # University seed data
```

---

## Deploying to Vercel

### Frontend

```bash
cd frontend
npx vercel --prod
```

Set environment variables in the Vercel dashboard under **Project → Settings → Environment Variables** (same keys as `frontend/.env.example`).

### Backend

```bash
cd backend
npx vercel --prod
```

Set environment variables in the Vercel dashboard (same keys as `backend/.env.example`).

After deploying the backend, update `VITE_API_URL` in the frontend's Vercel environment variables to point to your backend's production URL, then redeploy the frontend.

---

## Supabase Storage Buckets

Create the following public buckets in **Supabase → Storage**:

| Bucket | Use |
|---|---|
| `avatars` | Profile pictures |
| `covers` | Profile cover images |
| `posts` | Post media attachments |
| `listings` | Marketplace listing images |

---

## Stripe Webhooks (for subscriptions)

1. In the Stripe dashboard, add a webhook endpoint pointing to `https://your-backend.vercel.app/api/stripe`
2. Subscribe to the events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the **Signing Secret** into `STRIPE_WEBHOOK_SECRET`

---

## Environment Variable Reference

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `VITE_API_URL` | Backend URL (localhost or production) |

### `backend/.env`

| Variable | Description |
|---|---|
| `PORT` | Local server port (default 3001) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `FRONTEND_URL` | Frontend URL for CORS (localhost or production) |
