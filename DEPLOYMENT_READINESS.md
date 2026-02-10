# Deployment Readiness List for Vercel

## 🚨 Critical Items (Must Fix Before Launch)

### 1. Database Performance (✅ COMPLETE)
- [x] **Apply Production Indexes**: Run migration `supabase/migrations/20260111000000_add_performance_indexes.sql` on your production Supabase instance. This adds crucial indexes for `created_at` sorting and composite indexes for `workspace_id`.
- [x] **Verify Indexes**: Verified successfully. All critical performance indexes for Tasks, Announcements, Discussions, Business Items, Meetings, and Templates are present.

### 2. Pagination Implementation
- [ ] **Business Items**: Currently fetches the first 50 items (`.limit(50)`) with no pagination controls. Implement full pagination similar to Tasks/Announcements.
- [ ] **Templates**: Currently loads *all* templates without limits. Add pagination to prevent slow loading as the library grows.
- [ ] **Verify Existing Pagination**: Ensure Tasks, Announcements, and Discussions pagination works correctly with production data volumes.

### 3. User Experience (Loading States)
- [ ] **Create `loading.tsx` Files**: Add loading skeletons for the following routes to prevent blank screens during data fetching:
    - `src/app/(dashboard)/meetings/announcements/loading.tsx`
    - `src/app/(dashboard)/meetings/discussions/loading.tsx`
    - `src/app/(dashboard)/meetings/business/loading.tsx`
    - `src/app/(dashboard)/meetings/templates/loading.tsx`

### 4. Build & Code Quality
- [ ] **Fix Linting Warnings**: Address ESLint warnings, particularly:
    - Replace `<img>` tags with `next/image` for automatic optimization.
    - Fix missing dependencies in `useEffect` hooks to prevent stale closures or infinite loops.
- [ ] **Type Checking**: Ensure `npm run type-check` passes cleanly.

---

## 🔑 Environment Variables (Add to Vercel)

Configure these in your Vercel Project Settings > Environment Variables.

### Core Configuration
| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g., `https://your-app.vercel.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase Anon Key (safe for browser) |
| `SUPABASE_SECRET_KEY` | Your Supabase Service Role Key (server-side only) |

### Integrations
| Variable | Description |
| :--- | :--- |
| `RESEND_API_KEY` | API Key for sending emails via Resend |
| `JIRA_DOMAIN` | Your Jira instance URL (e.g., `https://domain.atlassian.net`) |
| `JIRA_USER_EMAIL` | Email address for Jira authentication |
| `JIRA_API_TOKEN` | Jira API Token (from Atlassian account settings) |
| `JIRA_PROJECT_KEY` | Project Key for Jira issues (e.g., `SUP`) |
| `CANVA_CLIENT_ID` | Client ID from Canva Developer Portal |
| `CANVA_CLIENT_SECRET` | Client Secret from Canva Developer Portal |
| `CANVA_REDIRECT_URI` | `https://your-app.vercel.app/api/apps/canva/callback` |

### Jira Issue Types (Optional/Specific)
*If you use custom issue types, verify these IDs:*
- `JIRA_ISSUE_TYPE_BUG_ID`
- `JIRA_ISSUE_TYPE_STORY_ID`
- `JIRA_ISSUE_TYPE_TASK_ID`

---

## 📝 Pre-Deployment Checklist

1. [ ] **Supabase**: Ensure RLS policies are enabled and tested.
2. [ ] **Supabase**: Confirm `auth.users` table has appropriate triggers if you rely on them.
3. [ ] **Vercel**: Connect your GitHub repository.
4. [ ] **Vercel**: Add all Environment Variables listed above.
5. [ ] **Vercel**: Deploy the `main` branch.
6. [ ] **Verification**: Log in, navigate to all main sections (Meetings, Tasks, etc.), and verify data loading.
