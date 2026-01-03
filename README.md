# Beespo MVP

A comprehensive agenda and leadership management platform designed for leaders in The Church of Jesus Christ of Latter-day Saints.

**Note:** This is an independent software product and is not affiliated with or representing The Church of Jesus Christ of Latter-day Saints.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Library:** shadcn/ui (black & white elegant design)
- **Backend:** Next.js API routes (minimal - leveraging Supabase)
- **Database:** Supabase PostgreSQL with Row Level Security
- **Auth:** Supabase Auth
- **Real-time:** Supabase Realtime
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works for MVP)
- Git

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd beespo-mvp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Wait for the database to be provisioned
4. Go to Project Settings > API
5. Copy your project URL and anon key

### 4. Configure environment variables

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Set up the database schema

**Note:** The database schema will be created in Week 2 of the implementation plan. For now, you can run the app but the database operations won't work until the schema is set up.

Once the migration file is created (Week 2):

```bash
# Run migrations in Supabase
npx supabase db push
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
beespo-mvp/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── setup/           # Organization setup
│   │   ├── (dashboard)/         # Dashboard pages
│   │   ├── globals.css          # Global styles with design system
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   └── ui/                  # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/            # Supabase clients
│   │   ├── hooks/               # Custom React hooks
│   │   └── utils.ts             # Utility functions
│   └── types/
│       └── database.ts          # Database types
├── components.json              # shadcn/ui configuration
├── tailwind.config.ts           # Tailwind configuration
└── next.config.ts               # Next.js configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Design System

The app uses a minimal black & white elegant design:

- **Primary:** Pure black (#000000) for text and key elements
- **Background:** Pure white (#ffffff) for clean canvas
- **Grays:** Full spectrum for depth and hierarchy
- **Accent:** Minimal color reserved for critical states only

## Development Timeline

This is a 12-week MVP project. See the implementation plan at `.claude/plans/snappy-honking-anchor.md` for the detailed week-by-week breakdown.

### Current Progress: Week 1

- ✅ Next.js 15 project initialized
- ✅ Tailwind CSS and shadcn/ui configured
- ✅ Black & white design system implemented
- ✅ Supabase client configuration
- ✅ Auth pages (login/signup/setup) built
- ⏳ Database schema (Week 2)

## Contributing

This is a private MVP project. Please coordinate with the project owner before making contributions.

## License

Private - All rights reserved
