# Supabase Database Setup

This directory contains the database schema and seed data for the Beespo MVP.

## Project References

| Environment | Project Reference | Description |
|-------------|-------------------|-------------|
| **Development** | `tuekpooasofqfawmpdxj` | beespo-mvp |
| **Production** | `ojublgytgutvlxcmgvkj` | beespo-prod |

## Directory Structure

```
supabase/
├── migrations/
│   └── 0000_production_baseline.sql   # Single source of truth (schema + seed data)
├── archived_migrations/               # Historical migrations (reference only)
├── seed.sql                          # Legacy seed file
└── README.md                         # This file
```

## Migration Strategy

This project uses a **Schema Snapshot** approach:
- `0000_production_baseline.sql` contains the complete database schema dumped from Development
- Legacy migrations (74 files with timestamp collisions) are archived for reference
- New changes should be added as sequential migrations after the baseline

## Deployment Steps

### Deploy to a New Environment

```bash
# 1. Link to the target project
supabase link --project-ref <PROJECT_REF>

# 2. Push the baseline migration
supabase db push

# 3. Verify deployment
supabase migration list
```

### Add New Migrations

```bash
# Create a new migration
supabase migration new <migration_name>

# Edit the migration file in supabase/migrations/
# Then push to the linked project
supabase db push
```

## Verification Queries

After deployment, run these queries to verify the setup:

### Table Count Verification
```sql
SELECT schemaname, COUNT(*) as table_count
FROM pg_tables
WHERE schemaname IN ('public', 'auth', 'storage')
GROUP BY schemaname;
```

Expected: `public: 63`, `auth: 20`, `storage: 8`

### Seed Data Verification
```sql
SELECT 'apps' as table_name, COUNT(*) FROM apps
UNION ALL
SELECT 'hymns', COUNT(*) FROM hymns
UNION ALL
SELECT 'procedural_item_types', COUNT(*) FROM procedural_item_types;
```

Expected: `apps: 1`, `hymns: 398`, `procedural_item_types: 12`

### Storage Bucket Verification
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'event-invitations';
```

Expected: `event-invitations | event-invitations | true`

### Constraint Verification
```sql
SELECT COUNT(*) as constraint_count
FROM information_schema.table_constraints
WHERE constraint_schema = 'public';
```

Expected: ~498 constraints

## Updating TypeScript Types

After schema changes, regenerate TypeScript types:

```bash
# Development
npx supabase gen types typescript --project-id tuekpooasofqfawmpdxj > src/types/database.ts

# Production
npx supabase gen types typescript --project-id ojublgytgutvlxcmgvkj > src/types/database.ts
```

## Schema Overview

### Core Tables (63 tables in public schema)

**Workspaces & Users:**
- `workspaces` - Multi-tenant organizations
- `profiles` - User profiles linked to auth.users
- `workspace_members` - Workspace membership

**Meetings:**
- `meetings` - Meeting instances
- `agenda_items` - Meeting agenda items
- `speakers`, `hymns`, `procedural_item_types` - Meeting components

**Tasks & Notes:**
- `tasks`, `task_comments` - Task management
- `notes`, `notebooks` - Note-taking system

**Events & Forms:**
- `events`, `event_invitations` - Event management
- `forms`, `form_fields`, `form_responses` - Dynamic forms

**Apps & Templates:**
- `apps` - Integrated applications (Canva, etc.)
- `templates`, `template_items` - Meeting templates

### Storage Buckets

- `event-invitations` - Public bucket for Canva design exports (5MB limit, PNG/JPEG/WebP)

### Key Features

- **Row Level Security (RLS)**: All tables have RLS policies
- **Multi-workspace support**: Isolated data per workspace
- **Seed data included**: Apps, hymns, procedural item types

## Troubleshooting

**Error: permission denied for schema storage**
- Storage schema is managed by Supabase - don't include storage schema structure in migrations
- Only INSERT into storage.buckets is allowed

**Error: foreign key constraint violation**
- Check that seed data doesn't reference workspace-specific entities
- Only include global/core reference data in baseline

**Docker not running**
- `supabase db diff` requires Docker
- Use direct psql queries for verification if Docker is unavailable

**Version mismatch with pg_dump**
- Supabase uses PostgreSQL 17
- Install postgresql@17 via Homebrew: `brew install postgresql@17`
- Use `/opt/homebrew/opt/postgresql@17/bin/pg_dump`

## Archived Migrations

The `archived_migrations/` directory contains 74 historical migration files for reference. These are not executed but preserved for:
- Understanding historical changes
- Forensic analysis if needed
- Reference for future migrations

**Do not move files from archived_migrations back to migrations.**
