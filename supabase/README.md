# Supabase Database Setup

This directory contains the database schema and seed data for the Beespo MVP.

## Files

- `migrations/20260103000000_initial_schema.sql` - Complete database schema with tables, indexes, RLS policies, and helper functions
- `seed.sql` - Pre-built templates for 7 common LDS church leadership meetings

## Deployment Steps

### Method 1: Using Supabase Dashboard (Recommended for MVP)

1. Go to your Supabase project: https://app.supabase.com/project/tuekpooasofqfawmpdxj
2. Click on "SQL Editor" in the left sidebar
3. Click "+ New query"
4. Copy the contents of `migrations/20260103000000_initial_schema.sql`
5. Paste into the editor and click "Run"
6. Wait for completion (should see "Success" message)
7. Create another new query
8. Copy the contents of `seed.sql`
9. Paste and click "Run"
10. Verify the templates were created successfully

### Method 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Link to your project
npx supabase link --project-ref tuekpooasofqfawmpdxj

# Push migrations
npx supabase db push

# Seed the database
npx supabase db execute --file supabase/seed.sql
```

## Verification

After deployment, verify the setup:

### Check Tables

Go to "Table Editor" in Supabase dashboard and verify these tables exist:
- organizations
- profiles
- templates
- template_items
- meetings
- agenda_items
- tasks

### Check RLS Policies

Go to "Authentication" > "Policies" and verify each table has RLS policies enabled.

### Check Pre-built Templates

Run this query in SQL Editor:

```sql
SELECT name, calling_type, is_shared
FROM templates
WHERE is_shared = true
ORDER BY name;
```

You should see 7 templates:
1. Bishopric Meeting
2. Elder Quorum Presidency Meeting
3. Primary Presidency Meeting
4. Relief Society Presidency Meeting
5. Ward Council
6. Young Men Presidency Meeting
7. Young Women Presidency Meeting

### Check Template Items

```sql
SELECT t.name, COUNT(ti.id) as item_count
FROM templates t
LEFT JOIN template_items ti ON t.id = ti.template_id
WHERE t.is_shared = true
GROUP BY t.id, t.name
ORDER BY t.name;
```

Each template should have 6-8 agenda items.

## Updating TypeScript Types

After deploying the schema, regenerate the TypeScript types:

```bash
npx supabase gen types typescript --project-id tuekpooasofqfawmpdxj > src/types/database.ts
```

**Note:** The types have been manually created for now. After deployment, you can regenerate them using the command above if needed.

## Schema Overview

### Core Tables

**organizations** - Wards and Stakes (multi-tenancy)
**profiles** - User profiles linked to auth.users
**templates** - Reusable agenda templates
**template_items** - Default agenda items in templates
**meetings** - Meeting instances created from templates
**agenda_items** - Specific agenda items for each meeting
**tasks** - Action items with assignments and due dates

### Key Features

- **Row Level Security (RLS)**: All tables have RLS policies to enforce multi-tenancy
- **Multi-organization support**: Each ward/stake is isolated
- **Role-based access**: Leaders have full access, Members have read-only (+ can update assigned tasks)
- **Pre-built templates**: 7 shared templates available to all organizations
- **Helper functions**: `create_meeting_from_template()` to streamline meeting creation

### Calling Types

The `calling_type` field uses these values:
- `bishopric` - Bishopric Meeting
- `ward_council` - Ward Council
- `rs_presidency` - Relief Society Presidency
- `ym_presidency` - Young Men Presidency
- `yw_presidency` - Young Women Presidency
- `eq_presidency` - Elders Quorum Presidency
- `primary_presidency` - Primary Presidency

## Troubleshooting

**Error: relation "auth.users" does not exist**
- This shouldn't happen on Supabase (auth is built-in)
- If it does, check that you're running on Supabase, not a local Postgres

**Error: permission denied**
- Make sure you're using the service role key for admin operations
- Check that you're logged in to Supabase CLI with correct credentials

**RLS blocking operations**
- RLS policies require authenticated users
- Service role bypasses RLS
- Check policies match your use case in migration file
