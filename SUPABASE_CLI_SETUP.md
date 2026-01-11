# Supabase CLI Setup Guide

## Quick Setup

### 1. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### 2. Get Your Project Reference ID

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon) → **General**
4. Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

### 3. Link Your Project

Run this command and paste your Project Ref when prompted:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted for:
- Database password (your Supabase DB password)

### 4. Verify Connection

```bash
npx supabase db remote status
```

Should show: "Connected to remote database"

---

## Useful Commands After Setup

### Apply All Migrations
```bash
npx supabase db push
```

### Check Migration Status
```bash
npx supabase migration list
```

### Create New Migration
```bash
npx supabase migration new migration_name
```

### Pull Remote Schema (backup)
```bash
npx supabase db pull
```

### Reset Local Database (if using local)
```bash
npx supabase db reset
```

---

## Alternative: Create `.env` for CLI

Create a file `.env.local` (gitignored) with:

```bash
SUPABASE_PROJECT_REF=your_project_ref
SUPABASE_DB_PASSWORD=your_db_password
```

---

## Troubleshooting

### "Project ref not found"
- Make sure you're using the Reference ID, not the Project ID
- Found in: Settings → General → Reference ID

### "Connection refused"
- Check your database password
- Ensure your IP is allowed in Supabase (Settings → Database → Connection Pooling)

### "Migration already applied"
- This is fine! It means the migration already exists
- Use `npx supabase migration list` to see status
