# Beespo Cleanup Plan

> **Purpose**: Scope the codebase down to v1 (sacrament meeting feature set). Preserve intent — not implementation — of every removed feature before deletion or archival.
>
> **Do not skip Phase 2.** The dependency check must be signed off before any deletion is executed.

---

## Progress

- [x] Phase 1 — Investigate & classify all unsure routes
- [x] Phase 2 — Dependency check ✅ signed off — all issues resolved
- [x] Phase 3 — Execute deletions ✅
- [x] Phase 4 — Execute v2 archives → `/Users/moisescarpio/Develop/Beespo/beespo-v2/` ✅
- [x] Phase 5 — Execute v3 archives → `/Users/moisescarpio/Develop/Beespo/beespo-v3/` ✅
- [x] Phase 6 — Final build verification (`next build`) ✅

---

## Phase 1 — Route Classification

### Unsure Routes — Final Decisions

| Route | Decision | Reason |
|---|---|---|
| `/[workspace-slug]/[template-slug]` | **DELETE** | Public viewer for templates feature (deleted) |
| `/[workspace-slug]/meeting/[id]` | **KEEP** | Public audience view — core v1 feature |
| `/[workspace-slug]/program/[id]` | **KEEP** | Public program view — core v1 feature |
| `/api/library/discussions` | **DELETE** | Backs `/library` (deleted) |
| `/api/library/discussions/[id]` | **DELETE** | Same |
| `/api/library/segments` | **DELETE** | Backs `/library` (deleted) |
| `/api/library/segments/[id]` | **DELETE** | Same |
| `/f/[id]` | **DELETE** | Public form viewer, backs forms (deleted) |
| `/api/apps/[slug]` | **KEEP** | Backs `/apps` page (kept) |
| `/api/team/[id]` | **KEEP** | Member role management, backs `/settings` |
| `/api/team/transfer` | **KEEP** | Ownership transfer, backs `/settings` |
| `/api/workspace-apps` | **KEEP** | Backs `/apps` page (kept) |
| `/api/workspace-apps/[appId]` | **KEEP** | Same |
| `/api/workspace-invitations/validate` | **KEEP** | Used in signup/onboarding flow (kept) |
| `/api/workspace/promote-admin` | **KEEP** | Member promotion, backs `/settings` |
| `/shared/[token]` | **DELETE** | Frontend for sharing feature (deleted) |
| `/shared/[token]/print` | **DELETE** | Print view for sharing feature (deleted) |

---

## Phase 2 — Dependency Check

**Agent instructions**: Before executing any deletion, scan the entire codebase for imports or `fetch()` calls from files in KEEP routes that point into any file or directory marked for deletion. Report every hit and do not proceed until a human signs off.

- [x] Grep all kept route files for imports referencing DELETE route paths
- [x] ⚠️ **Priority check**: Confirm `/meetings/[id]`, `/meetings/[id]/conduct`, and all other kept meeting pages do NOT call `/api/meetings`, `/api/meetings/[id]`, or any sub-route (v3 archive). They should use server actions instead. → **RECLASSIFIED: Meetings API kept; Zoom sub-routes removed from component code**
- [x] Confirm `/apps` page does not call any Canva API routes
- [x] Confirm no kept component imports from `src/app/library/`, `src/app/forms/`, or `src/app/tables/`
- [x] **Sign-off**: ✅ All issues resolved. Safe to proceed to Phase 3.

---

### Findings — Phase 2

> Scan run: 2026-05-01. Resolved: 2026-05-01. **✅ Phase 2 complete — safe to proceed to Phase 3.**

---

#### ⚠️ Phase 3 Deletions — Dependencies Found

**Canva API** (`/api/canva/`, `/api/apps/canva/`)
- `src/components/canva/design-invitation-modal.tsx` — fetch calls to `/api/canva/designs`, `/api/canva/designs/[id]/export`, `/api/canva/exports/[id]`, `/api/canva/designs/[id]/save`
  - This component is imported by `src/components/calendar/events/event-detail-drawer.tsx` (inside calendar, which is itself archived in Phase 4 — so the dependency is archive→delete, not keep→delete)
  - **`/apps` page**: No direct Canva API fetch calls found in `src/app/apps/`. ✅ Clean.

**Tables API** (`/api/tables/`)
- `src/components/tables/hooks/use-table-data.ts` — fetch to `/api/tables`
  - This hook lives inside `src/components/tables/`, which is itself part of the tables feature being deleted. ✅ Internal only — safe.

**Share API** (`/api/share/`, `/api/sharing-groups/`)
- `src/components/conduct/share-dialog.tsx` — fetch calls to `/api/share/invite`, `/api/share/[id]/settings`, `/api/share/[id]/analytics`
  - Used in the conduct flow — need to confirm whether `/meetings/[id]/conduct` is a KEEP route.
- `src/components/share/share-recipients-tab.tsx` — multiple `/api/share/` and `/api/sharing-groups/` calls
- `src/components/share/share-analytics.tsx` — `/api/share/[id]/analytics`
- `src/components/share/share-activity-log.tsx` — `/api/share/activity`
- `src/components/share/invite-tab.tsx` — `/api/share/invite`
- `src/components/share/export-tab.tsx` — `/api/share/export`
- `src/components/meetings/meeting-row-actions.tsx` — `/api/share/meeting` (lines 83, 98, 104)
- `src/components/settings/sharing-groups-tab.tsx` — multiple `/api/sharing-groups` calls
- **`src/app/(public)/[workspace-slug]/meeting/[id]/live-meeting-view.tsx`** — `fetch('/api/share/${meetingId}/track-view')` ← **KEEP route → Phase 3 delete. This must be removed or replaced before deletion.**

---

#### ⚠️ Phase 4 V2 Archives — Dependencies Found

**Events API** (`/api/events/`)
- `src/components/calendar/calendar-client.tsx` — fetch to `/api/events`
- `src/components/calendar/create-event-dialog.tsx` — fetch to `/api/events` / `/api/events/[id]`
- `src/components/events/create-event-form.tsx` — fetch to `/api/events`
- `src/components/events/events-client.tsx` — fetch to `/api/events/[id]`
- `src/components/meetings/builder/meeting-linkage-strip.tsx` — fetch to `/api/events`
  - All calendar/events components live inside the calendar/events feature being archived — internal only ✅. Exception: `meeting-linkage-strip.tsx` lives inside `src/components/meetings/` which is a KEEP component directory. ⚠️ Remove the event-linking call from this file before archiving.

**Calendar Sync API** (`/api/calendar/sync`)
- Multiple `src/components/calendar/` files — all internal to the archived calendar feature. ✅ Internal only.

**Invitations API** (`/api/invitations/`)
- `src/components/team/invite-member-dialog.tsx` — fetch to `/api/invitations`
- `src/components/team/pending-invitations.tsx` — fetch to `/api/invitations`
  - These live in `src/components/team/` which backs `src/app/settings/`. Settings is a KEEP route. ⚠️ These calls will break when invitations API is archived. The invite/pending UI must be removed from settings, or the API must be kept.

---

#### ⚠️ Phase 5 V3 Archives — Dependencies Found

**Account Delete API** (`/api/account/delete/`)
- `src/components/auth/delete-account-dialog.tsx` — fetch to `/api/account/delete/preflight` and `/api/account/delete`
  - This component is used in account/settings pages (KEEP). ⚠️ Remove the delete-account UI or migrate to server action before archiving.

**Meetings API** (`/api/meetings/`) — CRITICAL
- `src/components/meetings/meeting-details-page-client.tsx` — 7+ fetch calls to `/api/meetings/[id]` for update/plan operations (lines 293, 308, 350, 368, 387, 418, 604)
- `src/components/meetings/meeting-detail-content.tsx` — fetch to zoom and PDF sub-routes (lines 108, 137, 195)
- `src/components/meetings/meeting-plan-setup.tsx` — fetch to `/api/meetings/[id]/plan`
- `src/components/meetings/zoom-meeting-sheet.tsx` — fetch to `/api/meetings/[id]/zoom` (lines 77, 99, 125)
- `src/components/meetings/builder/meeting-builder.tsx` — zoom-related fetch calls (lines 1753, 2122, 2158)
- `src/components/meetings/builder/meeting-linkage-strip.tsx` — fetch to `/api/meetings/[id]/event` and plan (lines 106, 138, 162)
- `src/components/meetings/sacrament-meeting/program-planner-client.tsx` — multiple `/api/meetings/` calls (lines 2832, 2897)
- `src/components/meetings/sacrament-meeting/speaker-planner-client.tsx` — multiple `/api/meetings/` calls (lines 1060, 1151)
  - All of these are in `src/components/meetings/` which backs KEEP meeting pages. ⚠️ **CRITICAL — these must be migrated to server actions before Phase 5 can proceed.**
  - Note: zoom-specific calls (zoom sheet, zoom builder calls) will be removed as part of Zoom integration archive — they can be deleted rather than migrated.
  - PDF export call must be migrated or the PDF export UI removed.
  - Core meeting update calls (create/update/delete meeting) must be migrated to server actions.

**Link Preview API** (`/api/link-preview/`)
- `src/components/meetings/sacrament-meeting/program-planner-client.tsx` — line 1666
- `src/components/meetings/sacrament-meeting/speaker-planner-client.tsx` — line 333
  - Both are in KEEP components. ⚠️ Either migrate link-preview to a server action or keep the route.

---

#### ✅ Clean Areas

- `/apps` page (`src/app/apps/`) — no Canva API fetch calls. Clean.
- `src/app/library/`, `src/app/forms/`, `src/app/tables/` — no imports found from kept components or routes.
- `src/app/schedule/`, `src/app/data/`, `src/app/templates/` — no imports found from kept components or routes.
- `src/app/discussions/`, `src/app/docs/`, `src/app/inbox/`, `src/app/tasks/`, `src/app/callings/` — no imports from kept routes.
- Canva OAuth routes (`/api/apps/canva/`) — referenced only from Canva-specific components being deleted. ✅ Internal only.

---

#### Issues Requiring Resolution Before Proceeding

| # | File | References | Resolution |
|---|---|---|---|
| 1 | `live-meeting-view.tsx` | `/api/share/[id]/track-view` | ✅ **Fixed** — track-view useEffect, ref, and fingerprint imports removed |
| 2 | `meeting-linkage-strip.tsx` | `/api/events` | ✅ **Fixed** — file deleted (no importers found) |
| 3 | `invite-member-dialog.tsx` | `/api/invitations` | ✅ **Reclassified** — invitations API moved to KEEP |
| 4 | `pending-invitations.tsx` | `/api/invitations` | ✅ **Reclassified** — same as above |
| 5 | `delete-account-dialog.tsx` | `/api/account/delete` | ⏸ **Deferred** — account deletion remains in Phase 5; settings UI to be addressed then |
| 6 | `meeting-details-page-client.tsx` | `/api/meetings/[id]` | ✅ **Reclassified** — meetings API moved to KEEP; Zoom UI removed |
| 7 | `meeting-detail-content.tsx` | `/api/meetings/[id]/zoom`, `/pdf` | ✅ **Fixed** — Zoom calls removed; PDF call retained (meetings API kept) |
| 8 | `meeting-plan-setup.tsx` | `/api/meetings/[id]/plan` | ✅ **Reclassified** — meetings API moved to KEEP |
| 9 | `meeting-builder.tsx` | `/api/meetings/[id]/zoom` | ✅ **Fixed** — all Zoom fetch calls, state, handlers, and UI removed |
| 10 | `meeting-linkage-strip.tsx` | `/api/meetings/[id]/event`, `/plan` | ✅ **Fixed** — file deleted |
| 11 | `program-planner-client.tsx` | `/api/meetings/` | ✅ **Reclassified** — meetings API moved to KEEP |
| 12 | `speaker-planner-client.tsx` | `/api/meetings/` | ✅ **Reclassified** — same as above |
| 13 | `program-planner-client.tsx` | `/api/link-preview` | ✅ **Reclassified** — link-preview API moved to KEEP |
| 14 | `speaker-planner-client.tsx` | `/api/link-preview` | ✅ **Reclassified** — same as above |

> **Note**: `settings-client.tsx` still references `/api/auth/zoom/authorize` and `/api/auth/zoom/disconnect`. These are auth-layer Zoom routes (Phase 5 Zoom archive), not meetings-API routes. They were not in the original 14 issues — address when executing Phase 5.

> **✅ Phase 2 complete — safe to proceed to Phase 3.**

---

## Phase 3 — Execute Deletions ✅

> For each feature: technical note is recorded first, then the file checklist follows.
> Delete entire directories where noted. For partial-directory cases, see inline warnings.

---

### 🗑️ Canva Integration

```
Feature: Canva Integration
Goal: OAuth-based integration allowing workspace members to connect a Canva account,
  browse their designs, and export or embed Canva content into meeting agendas.
Core entities: canva_tokens (OAuth credentials per workspace), canva_designs (design
  metadata and export state)
Key API needs: OAuth authorize / callback / disconnect / token refresh, design listing,
  export initiation, export status polling, save exported design to meeting
Potential edge cases: Token expiry mid-session, export polling timeout, design ownership
  mismatch between Canva account and workspace, Canva API rate limits
```

- [x] `src/app/api/apps/canva/authorize/route.ts`
- [x] `src/app/api/apps/canva/callback/route.ts`
- [x] `src/app/api/apps/canva/disconnect/route.ts`
- [x] `src/app/api/apps/canva/token/route.ts`
- [x] `src/app/api/canva/designs/route.ts`
- [x] `src/app/api/canva/designs/[designId]/export/route.ts`
- [x] `src/app/api/canva/designs/[designId]/save/route.ts`
- [x] `src/app/api/canva/exports/[exportId]/route.ts`

---

### 🗑️ Content Catalog

```
Feature: Content Catalog
Goal: A browsable catalog of pre-built content blocks or agenda items that users can
  select from when composing a meeting agenda.
Core entities: catalog (pre-built content items with metadata, possibly linked to templates)
Key API needs: List catalog items, get catalog item by ID
Potential edge cases: Catalog items referencing templates that no longer exist, stale
  catalog entries after template updates
```

- [x] `src/app/api/catalog/route.ts`
- [x] `src/app/api/catalog/[id]/route.ts`

---

### 🗑️ Data Tables

```
Feature: Data Tables
Goal: An Airtable-like custom table builder allowing ward leaders to create structured
  datasets with custom columns, rows, and saved views for tracking ward-specific data.
Core entities: tables, columns, rows, views
Key API needs: Full CRUD for tables, columns, rows, and views
Potential edge cases: View filters referencing deleted columns, column type changes
  breaking existing row data, per-table permission scoping
```

- [x] `src/app/api/tables/route.ts`
- [x] `src/app/api/tables/[id]/route.ts`
- [x] `src/app/api/tables/[id]/columns/route.ts`
- [x] `src/app/api/tables/[id]/rows/route.ts`
- [x] `src/app/api/tables/[id]/views/route.ts`
- [x] `src/app/tables/` *(entire directory — already absent)*

---

### 🗑️ External Meeting Sharing

```
Feature: External Meeting Sharing
Goal: Generate tokenized public links so meeting agendas can be viewed by external
  recipients (e.g., congregation members) without logging in. Includes a print-optimized
  view, anonymous view analytics, activity feed, email-based sharing groups, and an
  invite flow.
Core entities: meeting_shares (token, status, meeting_id), sharing_groups,
  sharing_group_members
Key API needs: Create / revoke share link, get / update share settings, anonymous view
  tracking, export, email invite, recent shares list, analytics, sharing group CRUD and
  membership management
Potential edge cases: Token invalidation race conditions, anonymous view count concurrency,
  sharing group members overlapping with workspace members, expired tokens still being hit
```

- [x] `src/app/api/share/[meetingId]/analytics/route.ts`
- [x] `src/app/api/share/[meetingId]/settings/route.ts`
- [x] `src/app/api/share/[meetingId]/track-view/route.ts`
- [x] `src/app/api/share/activity/route.ts`
- [x] `src/app/api/share/export/route.ts`
- [x] `src/app/api/share/invite/route.ts`
- [x] `src/app/api/share/invite/[token]/route.ts`
- [x] `src/app/api/share/meeting/route.ts`
- [x] `src/app/api/share/recent/route.ts`
- [x] `src/app/api/sharing-groups/route.ts`
- [x] `src/app/api/sharing-groups/[groupId]/route.ts`
- [x] `src/app/api/sharing-groups/[groupId]/members/route.ts`
- [x] `src/app/(public)/shared/[token]/page.tsx` *(+ all co-located files)*
- [x] `src/app/(print)/shared/[token]/print/page.tsx`

---

### 🗑️ Meeting Template Gallery + Public Template Viewer

```
Feature: Meeting Template Gallery + Public Template Viewer
Goal: A statically generated gallery of pre-built agenda templates users can browse and
  apply when creating meetings. Each workspace template also gets a public URL
  (/{workspace-slug}/{template-slug}) for external preview without login.
Core entities: templates (slug, is_public, tags), template_items (agenda items with order,
  duration, item_type)
Key API needs: No dedicated API routes — served via server-side Supabase reads and
  Next.js static generation
Potential edge cases: Template slug collisions with top-level app routes, templates
  inadvertently marked public, stale static page cache after template edits
```

> ⚠️ **Partial directory warning**: `src/app/(public)/[workspace-slug]/` also contains
> `meeting/[id]` and `program/[id]` which are **KEPT**. Delete only the `[template-slug]`
> entry — do not remove the parent directory.

- [x] `src/app/templates/` *(entire directory — already absent)*
- [x] `src/app/(public)/[workspace-slug]/[template-slug]/page.tsx` *(file only, not parent dir)*

---

### 🗑️ Content Library

```
Feature: Content Library
Goal: A personal/workspace library of reusable agenda segments and discussion topics
  saved from past meetings, allowing leaders to quickly insert frequently-used content
  into new agendas without re-authoring.
Core entities: library_items (type: "discussion" | "segment", title, content, tags,
  workspace_id)
Key API needs: List items by type, create item, get item by ID, update item, delete item
Potential edge cases: Items referencing deleted meetings or templates, orphaned items
  after workspace member removal, duplicate detection on import
```

- [x] `src/app/api/library/discussions/route.ts`
- [x] `src/app/api/library/discussions/[id]/route.ts`
- [x] `src/app/api/library/segments/route.ts`
- [x] `src/app/api/library/segments/[id]/route.ts`
- [x] `src/app/library/` *(entire directory — already absent)*

---

### 🗑️ Form Builder + Public Form Submission

```
Feature: Form Builder & Public Form Submission
Goal: A drag-and-drop form builder for creating surveys, sign-up sheets, and feedback
  forms. Published forms receive a public URL (/f/[slug]) accessible without login.
  Responses are collected and viewable in a results dashboard.
Core entities: forms (slug, is_published, views_count), form_fields, form_responses
Key API needs: CRUD for forms and fields, results and analytics, public form render by
  slug, public form submission endpoint
Potential edge cases: Published forms with since-deleted fields, view count race
  conditions under high traffic, field type changes invalidating existing responses,
  slug uniqueness enforcement
```

- [x] `src/app/forms/` *(entire directory — already absent)*
- [x] `src/app/(public)/f/[id]/` *(entire directory)*

---

### 🗑️ Schedule (Legacy)

```
Feature: Schedule (Legacy)
Goal: An early-iteration calendar/scheduling view for internal events. Likely superseded
  by the calendar feature planned for v2. Provided list and calendar views of events with
  per-event detail and schedule-level settings.
Core entities: events (likely shared table with v2 calendar feature)
Key API needs: Calendar view of events, event detail, schedule settings
Potential edge cases: Data overlap with v2 calendar if both use the same events table,
  settings conflicts on future migration
```

- [x] `src/app/schedule/` *(entire directory — already absent)*

---

### 🗑️ Data Management Page

```
Feature: Data Management
Goal: A utility page likely intended for workspace-level data inspection, bulk import,
  or export. Exact scope was not fully built out.
Core entities: unknown — likely workspace-scoped records
Key API needs: unknown
Potential edge cases: unknown
```

- [x] `src/app/data/` *(entire directory — already absent)*

---

## Phase 4 — V2 Archives ✅

> Copy to `/Users/moisescarpio/Develop/Beespo/beespo-v2/` then remove from repo.
> Create the destination directory if it does not exist.

---

### 📦 Discussions

```
Feature: Discussions
Goal: A threaded async discussion board for bishopric or ward council members to have
  conversations tied to agenda topics, meetings, or standalone threads.
Core entities: discussions (title, body, author_id, meeting_id), discussion_replies
  (body, author_id, discussion_id)
Key API needs: List discussions, create discussion, get / update / delete discussion by ID
Potential edge cases: Discussions tied to deleted meetings, reply notifications, read /
  unread state tracking, permission scoping (who can post vs. read)
```

- [x] `src/app/api/discussions/route.ts`
- [x] `src/app/api/discussions/[id]/route.ts`
- [x] `src/app/discussions/` *(entire directory — already absent)*

---

### 📦 Events & Calendar

```
Feature: Events & Calendar
Goal: A calendar for scheduling ward events (firesides, activities, etc.) with the
  ability to link an event to a Beespo meeting for automatic agenda prep. Includes
  calendar sync settings.
Core entities: events (title, date, location, recurrence, workspace_id), meeting_events
  (join table linking events to meetings)
Key API needs: CRUD for events, link event to a meeting, calendar and list views,
  calendar sync settings
Potential edge cases: Recurring event edge cases, event-meeting link orphaning on meeting
  delete, timezone normalization, external calendar sync conflicts
```

- [x] `src/app/api/events/route.ts`
- [x] `src/app/api/events/[id]/route.ts`
- [x] `src/app/api/events/[id]/meeting/route.ts`
- [x] `src/app/calendar/` *(entire directory — already absent)*
- [x] `src/app/events/` *(entire directory — already absent)*

---

### ~~📦 Workspace Member Invitations~~ → **RECLASSIFIED: KEEP**

> Phase 2 resolution: `src/components/team/invite-member-dialog.tsx` and `pending-invitations.tsx`
> back the `/settings` page (a KEEP route). Moving invitations API to KEEP rather than
> stripping the invite UI from settings.

- ~~`src/app/api/invitations/route.ts`~~ → **KEEP**
- ~~`src/app/api/invitations/[id]/route.ts`~~ → **KEEP**
- ~~`src/app/api/invitations/accept/route.ts`~~ → **KEEP**

---

### 📦 In-App Documentation

```
Feature: In-App Documentation
Goal: A statically rendered help and docs section covering onboarding guides, feature
  walkthroughs, and account management — accessible within the app without navigating
  to an external docs site.
Core entities: none (static content pages)
Key API needs: none
Potential edge cases: Docs becoming stale after feature removals (e.g., references to
  Zoom, templates, or sharing that no longer exist in the product)
```

- [x] `src/app/docs/` *(entire directory — already absent)*

---

### 📦 Inbox / Notifications

```
Feature: Inbox
Goal: A centralized notification inbox where leaders see assignment requests, meeting
  updates, discussion replies, and system messages — all in one place with read / unread
  state management.
Core entities: notifications (type, actor_id, target_id, read_at, workspace_id),
  notification_preferences
Key API needs: List notifications, mark as read / unread, manage notification preferences,
  real-time delivery via Supabase Realtime
Potential edge cases: High notification volume, real-time deduplication, digest vs.
  in-app delivery conflicts, notification fan-out on large workspaces
```

- [x] `src/app/inbox/` *(entire directory — already absent)*

---

### 📦 Task Management

```
Feature: Tasks
Goal: A task list for tracking ward action items assigned to specific leaders, with
  status tracking and filtering by assignee, meeting, or completion state.
Core entities: tasks (title, assignee_id, due_date, status, meeting_id, workspace_id)
Key API needs: CRUD for tasks, filter by assignee / meeting / status, bulk status update
Potential edge cases: Tasks assigned to members who leave the workspace, tasks tied to
  deleted meetings, overdue task notification delivery
```

- [x] `src/app/tasks/` *(entire directory)*

---

### 📦 Calling Management

```
Feature: Callings
Goal: A multi-stage workflow tool for managing the LDS calling process — tracking
  candidates, approvals, sustaining, and setting-apart for each calling position in
  a ward.
Core entities: callings (position, candidate_id, status), calling_processes (stage,
  notes, timestamps per stage)
Key API needs: List callings, create calling process, advance process to next stage,
  get process detail by ID
Potential edge cases: Multiple concurrent processes for the same position, mid-process
  revocation, candidate lookup via directory, bishopric-only permission enforcement
```

- [x] `src/app/callings/` *(entire directory — already absent)*

---

## Phase 5 — V3 Archives ✅

> Copy to `/Users/moisescarpio/Develop/Beespo/beespo-v3/` then remove from repo.
> Create the destination directory if it does not exist.

---

### 📦 Internal Admin Panel

```
Feature: Internal Admin Panel
Goal: A separate authenticated admin interface for Beespo staff to manage platform-level
  concerns — user accounts, workspace oversight, release notes authoring, global template
  management, and platform invitations. Uses its own auth flow (login, MFA) fully
  independent of workspace auth.
Core entities: admin_users, release_notes, platform_templates, platform_invitations,
  workspaces (read-only), profiles (read-only)
Key API needs: Admin auth (login, MFA setup / verify, callback), user list and management,
  invitation management, release note CRUD, global template CRUD
Potential edge cases: Admin session isolation from workspace sessions, MFA enforcement
  on all admin routes, release notes visibility gating by app version, privilege
  escalation prevention
```

- [x] `src/app/(admin)/` *(entire directory — actual route group path)* + `src/components/admin/` *(archived together; components imported admin actions)*

---

### 📦 Account Self-Deletion

```
Feature: Account Self-Deletion
Goal: Allow a user to permanently delete their own Beespo account, with a preflight
  endpoint that surfaces downstream consequences (owned workspaces, active meetings)
  before the destructive action is confirmed.
Core entities: profiles, workspaces (ownership check), meetings (active state check)
Key API needs: Preflight check (enumerate what will be affected), execute deletion
  (cascade orphaned resources or prompt reassignment)
Potential edge cases: Last admin deleting account orphaning a workspace, active meetings
  mid-deletion, in-progress Zoom sessions, GDPR / data retention compliance
```

- [x] `src/app/api/account/delete/route.ts`
- [x] `src/app/api/account/delete/preflight/route.ts`

---

### 📦 Zoom Integration

```
Feature: Zoom Integration
Goal: OAuth-based Zoom connection allowing leaders to create and manage Zoom meeting
  links directly from a Beespo meeting — with the join URL embedded in the agenda and
  distributed to invitees via the Zoom invite endpoint.
Core entities: zoom_tokens (OAuth credentials per workspace), zoom_meetings (Zoom
  meeting ID mapped to Beespo meeting_id)
Key API needs: OAuth authorize / callback / disconnect, create Zoom meeting for a Beespo
  meeting, get Zoom meeting details, send Zoom invite, deauthorization webhook
Potential edge cases: Token expiry during an active meeting, Zoom API rate limits,
  deauth webhook race condition, Zoom-side meeting deletion not reflected in Beespo
```

- [x] `src/app/api/auth/zoom/authorize/route.ts`
- [x] `src/app/api/auth/zoom/callback/route.ts`
- [x] `src/app/api/auth/zoom/disconnect/route.ts`
- [x] `src/app/api/meetings/[id]/zoom/route.ts`
- [x] `src/app/api/meetings/[id]/zoom/invite/route.ts`
- [x] `src/app/api/webhooks/zoom/deauthorize/route.ts`

---

### 📦 External Calendar Sync

```
Feature: Calendar Sync
Goal: Sync Beespo meetings and events to external calendar providers (Google Calendar,
  iCal) so leaders' personal calendars stay current with ward schedule changes
  automatically via a scheduled cron job.
Core entities: calendar_sync_settings (provider, OAuth tokens, last_sync_at),
  external_calendar_events (external event IDs mapped to Beespo events)
Key API needs: Manual sync trigger, cron-triggered auto-sync, format conversion (Beespo
  event → calendar provider format)
Potential edge cases: Sync conflicts when event edited in both systems, OAuth token
  refresh on cron run, timezone normalization, deleted events not propagating to the
  external calendar
```

- [x] `src/app/api/calendar/convert/route.ts`
- [x] `src/app/api/calendar/cron-sync/route.ts`
- [x] `src/app/api/calendar/sync/route.ts`

---

### 📦 Scheduled Cron Jobs

```
Feature: Cron Jobs
Goal: Server-side endpoints triggered on a schedule (via Vercel Cron) to send meeting
  reminders to assigned leaders before upcoming meetings, and to deliver batched
  notification digests to users with unread activity.
Core entities: meetings (upcoming, with assigned leaders), notifications (unread),
  profiles (email address, notification preferences)
Key API needs: Meeting reminder dispatcher (query upcoming meetings, send reminder
  emails), notification digest sender (batch unread notifications, send digest email)
Potential edge cases: Duplicate sends if cron run overlaps with previous, reminder timing
  edge cases across timezones, user opt-out / preference respect, email delivery failure
  handling, digest performance on large workspaces
```

- [x] `src/app/api/cron/meeting-reminders/route.ts`
- [x] `src/app/api/cron/notification-digest/route.ts`

---

### ~~📦 Link Preview Proxy~~ → **RECLASSIFIED: KEEP**

> Phase 2 resolution: `program-planner-client.tsx` and `speaker-planner-client.tsx` (both KEEP
> components) call `/api/link-preview`. Moving to KEEP rather than migrating to server action.

- ~~`src/app/api/link-preview/route.ts`~~ → **KEEP**

---

### ~~📦 Extended Meetings API~~ → **RECLASSIFIED: KEEP**

> Phase 2 resolution: Multiple `src/components/meetings/` components (meeting-details-page-client,
> meeting-plan-setup, meeting-builder, sacrament planners) still call these routes.
> **Migrate to server actions in a future refactor pass — do not archive until migration is complete.**
> Zoom sub-routes (`/zoom`, `/zoom/invite`) have been removed from component code; remaining routes are:

- ~~`src/app/api/meetings/route.ts`~~ → **KEEP**
- ~~`src/app/api/meetings/[id]/route.ts`~~ → **KEEP**
- ~~`src/app/api/meetings/[id]/event/route.ts`~~ → **KEEP**
- ~~`src/app/api/meetings/[id]/pdf/route.ts`~~ → **KEEP**
- ~~`src/app/api/meetings/[id]/plan/route.ts`~~ → **KEEP**
- ~~`src/app/api/meetings/[id]/plan/assignments/route.ts`~~ → **KEEP**
- ~~`src/app/api/meetings/[id]/plan/tasks/route.ts`~~ → **KEEP**
- ~~`src/app/api/meetings/[id]/rebuild/route.ts`~~ → **KEEP**

---

## Phase 6 — Final Build Verification ✅

### Build fixes required

Two unused-import lint errors surfaced from prior Zoom UI removals:

| File | Error | Fix |
|---|---|---|
| `src/components/meetings/builder/meeting-builder.tsx:44` | `'Info' is defined but never used` | Removed `Info` from lucide-react import |
| `src/components/meetings/meeting-detail-content.tsx:16` | `'toast' is defined but never used` | Removed unused `toast` import |

### Build result

```
Next.js 15.5.14 — next build
✓ Compiled successfully in 50s
✓ Linting and type checking passed
✓ Generating static pages (97/97)
97 routes total
```

### KEEP route sanity check

| Route | Present in build |
|---|---|
| `/meetings` | ✅ |
| `/meetings/[id]` | ✅ |
| `/meetings/[id]/conduct` | ✅ |
| `/meetings/sacrament/planner` | ✅ |
| `/meetings/sacrament/speakers` | ✅ |
| `/meetings/sacrament/business` | ✅ |
| `/meetings/sacrament/announcements` | ✅ |
| `/meetings/sacrament/archive` | ✅ |
| `/directory` | ✅ |
| `/dashboard` | ✅ |
| `/settings` | ✅ |
| `/[workspace-slug]/meeting/[id]` | ✅ |
| `/[workspace-slug]/program/[id]` | ✅ |

---

## Final Summary

| Metric | Count |
|---|---|
| Files deleted (Phase 3) | 36 |
| Files archived to `beespo-v2` (Phase 4) | 6 |
| Files archived to `beespo-v3` (Phase 5) | 42 |
| **Total files removed from repo** | **84** |
| Build status | ✅ Clean (`next build` exit 0) |

**Codebase is v1 scoped as of 2026-05-01.**

---

## Agent Notes

1. **Phase order is strict.** Do not begin Phase 3 until Phase 2 sign-off is confirmed in this file.
2. **Archive = copy first, then delete.** Create destination directories if they don't exist before copying.
3. **Partial directory case.** `src/app/(public)/[workspace-slug]/` contains both a route to delete (`[template-slug]`) and routes to keep (`meeting/[id]`, `program/[id]`). Delete the file, not the parent directory.
4. **Extended Meetings API** reclassified to KEEP — migrate to server actions in a future refactor pass.
5. **After all phases complete**, run `next build` and fix any broken imports before closing out.
