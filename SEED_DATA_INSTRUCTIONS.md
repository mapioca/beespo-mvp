# Beespo MVP - Seed Data Instructions

This guide explains how to load realistic demo data that simulates 3 months of app usage.

## What You'll Get

After running the seed migrations, you'll have:

- **1 Workspace**: Riverside Ward (Bishopric)
- **4 User Profiles**: Including you as an admin
- **3 Meeting Templates**: Bishopric Meeting, Ward Council, PEC Meeting
- **9 Meetings**: Mix of completed and scheduled meetings spanning 3 months
- **10 Discussions**: Various statuses (active, resolved, deferred, new) including follow-ups
- **15+ Discussion Notes**: Notes from various meetings
- **7 Business Items**: Mix of sustainings, releases, ordinations (completed and pending)
- **7 Announcements**: Active, draft, and stopped announcements
- **5 Speakers**: Confirmed and unconfirmed speakers
- **10 Tasks**: Mix of completed, in-progress, and pending tasks with realistic relationships
- **Task Comments & Activities**: Full activity history

## Quick Start (3 Simple Steps)

### Step 1: Run First Migration (Workspace & Templates)

In Supabase SQL Editor, run:
```sql
-- Copy and paste contents of:
supabase/migrations/01_seed_workspace_and_templates.sql
```

This clears all tables and creates the workspace and templates.

### Step 2: Sign Up

Go to your app and sign up with:
- **Email**: `demo@beespo.com`
- **Password**: `Demo123!`

### Step 3: Get Your User ID and Run Second Migration

**3a.** In Supabase SQL Editor, get your user ID:
```sql
SELECT id FROM auth.users WHERE email = 'demo@beespo.com';
```

**3b.** Copy the UUID that's returned (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

**3c.** Open `supabase/migrations/02_seed_demo_data.sql` and find this line near the top:
```sql
v_user_id UUID := 'YOUR_USER_ID_HERE'::UUID;  -- REPLACE THIS!
```

**3d.** Replace `YOUR_USER_ID_HERE` with your actual UUID:
```sql
v_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID;  -- Your actual ID
```

**3e.** Copy the ENTIRE modified file and run it in Supabase SQL Editor

### Step 4: Login and Explore!

Login with:
- **Email**: `demo@beespo.com`
- **Password**: `Demo123!`
- **Role**: Admin (full access)

That's it! You now have 3 months of realistic demo data.

---

## Why Two Migrations?

The seed data is split into two parts because:

1. **Part 1** creates the workspace and templates (no user dependencies)
2. **Part 2** creates all the user-dependent data (meetings, discussions, tasks, etc.)

This approach works around the foreign key constraint between `profiles` and `auth.users` - we can't create profiles for users that don't exist yet!

---

## What to Explore

Once logged in, check out:

### Dashboard
- Overview of upcoming meetings, active discussions, and pending tasks

### Meetings
- **Past Meetings**: 7 completed meetings with full agendas
- **Upcoming Meetings**: 2 scheduled meetings

### Discussions
- **Active**: Youth camp planning, budget review, temple night
- **Monitoring**: New family integration
- **Resolved**: Christmas service project, RS President calling
- **Deferred**: Building expansion proposal
- **Follow-ups**: Transportation arrangements for youth camp

### Tasks
- **Completed**: Christmas donations, welcome visits
- **In Progress**: Camp permits, temple reservation, budget proposal
- **Pending**: Transportation arrangements, follow-ups, signup sheets

### Business Items
- **Completed**: Sustainings and releases from past months
- **Pending**: Upcoming sustainings and confirmations

### Announcements
- **Active**: Stake conference, youth conference registration, temple interviews
- **Draft**: Easter service project planning
- **Stopped**: Past Christmas events

### Speakers
- Multiple speakers with various topics, both confirmed and unconfirmed

---

## Resetting the Data

If you want to reset and start fresh:

1. Run migration 01 again (clears everything)
2. Sign up with a new account OR use the same email
3. Run migration 02 again with your user ID

---

## Troubleshooting

### Problem: "User ID not found in auth.users"

**Cause**: You didn't replace `YOUR_USER_ID_HERE` with your actual user ID, or you made a typo.

**Solution**:
1. Run: `SELECT id FROM auth.users WHERE email = 'demo@beespo.com';`
2. Copy the exact UUID
3. Replace `YOUR_USER_ID_HERE` in the migration file
4. Make sure you save the file before copying it to SQL Editor

### Problem: "Cannot login with demo@beespo.com"

**Cause**: The signup didn't complete properly.

**Solution**: Try signing up again, or check the auth.users table to see if the user exists:
```sql
SELECT * FROM auth.users WHERE email = 'demo@beespo.com';
```

### Problem: "Foreign key violation errors"

**Cause**: You might have run the migrations out of order.

**Solution**: Run migration 01 first to clear everything, then follow the steps in order.

### Problem: "User has no workspace"

**Cause**: The profile wasn't created or linked properly.

**Solution**: Check the profile:
```sql
SELECT id, email, workspace_id, role FROM profiles WHERE email = 'demo@beespo.com';
```

If the workspace_id is NULL, run migration 02 again with the correct user ID.

---

## Alternative: Quick Script Method

If you're comfortable with bash scripts, you can use:

```bash
# Step 1: Run first migration
./scripts/seed-via-supabase.sh

# Step 2: Sign up at your app with demo@beespo.com / Demo123!

# Step 3: Manually edit 02_seed_demo_data.sql with your user ID

# Step 4: Run second migration in Supabase SQL Editor
```

---

## Customizing the Seed Data

You can modify the migration files to:
- Change workspace name and type (edit migration 01)
- Adjust dates to match your testing needs (edit migration 02)
- Add more or fewer records (edit migration 02)
- Change user names and emails (edit migration 02)
- Modify discussion topics to match your organization (edit migration 02)

---

## Notes

- All dates are relative to NOW(), so the data will always appear fresh
- The seed data represents realistic 3-month usage patterns
- Discussion notes are linked to meetings showing the flow of ongoing items
- Tasks are properly linked to discussions and meetings
- Follow-up discussions demonstrate the relationship feature
- Task activities show the full audit trail
- The main user (you) is set as an admin with full access
- 3 additional users are created for display purposes (they can't login)

---

## Need Help?

If you encounter issues:
1. Make sure you followed the steps in exact order
2. Check that you replaced YOUR_USER_ID_HERE correctly
3. Verify the user exists in auth.users
4. Check the Supabase logs in your dashboard
5. Ensure all migrations ran successfully

---

**Happy Testing!** 🚀
