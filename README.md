# Tapflow

AI-powered lead generation SaaS. Discovers, enriches, scores, and engages your ideal customers on autopilot.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (Postgres + Auth)
- **API**: tRPC v10
- **Background Jobs**: Inngest
- **AI**: Claude (Anthropic)
- **Styling**: Tailwind CSS

## Quick Start

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Once created, go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Create Environment File

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set Up Database

1. In Supabase, go to **SQL Editor**
2. Copy the contents of `supabase/migrations/00001_initial_schema.sql`
3. Paste and run it

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                  # Next.js pages
│   ├── dashboard/        # Protected dashboard routes
│   ├── login/            # Auth pages
│   └── signup/
├── components/           # React components
├── lib/
│   ├── supabase/         # Supabase clients
│   ├── trpc/             # tRPC client & provider
│   └── utils.ts          # Helper functions
├── server/
│   ├── trpc.ts           # tRPC config
│   └── routers/          # API routes
└── middleware.ts         # Auth middleware

supabase/
└── migrations/           # SQL schema
```

## Features

- **Discovery**: Find leads from Google Maps, Yelp, Apollo
- **Enrichment**: Get emails, phone numbers, tech stack
- **AI Scoring**: Automatically rank leads A/B/C/D
- **Outreach**: Generate personalized email sequences
- **Approval Queue**: Review AI-generated emails before sending

## Next Steps

Once the app is running:
1. Sign up for an account
2. Create your first campaign
3. Add your Anthropic API key in Settings
4. Start discovering leads!

## Environment Variables

See `.env.example` for all available configuration options.
