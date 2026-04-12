# Performance Audit & Optimization Report

## Executive Summary
The Beespo application is currently experiencing significant latency, with page load times frequently exceeding 4-5 seconds. This audit identifies four primary technical bottlenecks that, when addressed, are expected to reduce load times by 60-80%.

---

## 🔴 Issue 1: Triple-Redundant Authentication & Profile Fetching
**Impact: CRITICAL** (~1500ms - 2500ms added per request)

### Description:
On every protected route request, the application performs redundant network calls to Supabase to verify the user and fetch their profile. This happens at three distinct layers:
1.  **Middleware** (`src/middleware.ts`): Calls `supabase.auth.getUser()`.
2.  **Dashboard Layout** (`src/app/(dashboard)/layout.tsx`): Calls `supabase.auth.getUser()` and `getProfile()`.
3.  **Page Components** (e.g., `tasks/page.tsx`, `business/page.tsx`): Calls `supabase.auth.getUser()` and queries `profiles` again.

### Impact Analysis:
Each Supabase auth/DB call introduces ~300-600ms of latency depending on network conditions and database load. Compounding these three times before any page content is even fetched creates a massive "floor" for response times.

### Solution:
Refactor the authentication flow to fetch the user and profile exactly **once** at the highest possible level (Layout) and pass it down via React Server Component props or use React's `cache()` to memoize the database query within a single request lifecycle.

---

## 🔴 Issue 2: Sequential Database Query Waterfalls
**Impact: HIGH** (~500ms - 1500ms added per page)

### Description:
Most page components execute database queries sequentially using `await` one after another.
Example from `business/page.tsx`:
```typescript
const { data: user } = await supabase.auth.getUser(); // 1st
const { data: profile } = await supabase.from('profiles')... // 2nd
const { data: items } = await supabase.from('business_items')... // 3rd
const { data: views } = await supabase.from('agenda_views')... // 4th
```

### Impact Analysis:
The total time to load the page is the **sum** of all query times. If each query takes 400ms, the page takes at least 1600ms just for data fetching, even before rendering starts.

### Solution:
Implement `Promise.all()` to fire independent queries concurrently. This reduces the data fetching time to the duration of the **slowest single query** rather than the sum.

---

## 🟡 Issue 3: Data Over-fetching (`select("*")`)
**Impact: MEDIUM** (~200ms - 500ms + Memory Overhead)

### Description:
Over 50 instances of `select("*")` exist in the codebase. This fetches all columns, including large text fields (descriptions, notes, JSON blobs) that are often not required for list views.

### Impact Analysis:
- **Network Payload:** Increased data transfer size.
- **Serialization:** Next.js spends more time serializing/deserializing large strings (as noted in webpack warnings).
- **Database Load:** More I/O required from the database server.

### Solution:
Narrow all list-view queries to specific columns required for the UI. For example, in `business/page.tsx`, only select columns used by `BusinessClient`.

---

## 🟡 Issue 4: Missing Server-Side Caching
**Impact: LOW-MEDIUM** (Variable)

### Description:
Pages like "Templates" and "Announcements" contain data that does not change frequently but are currently set to `revalidate = 0` or `force-dynamic`, forcing a fresh fetch on every visit.

### Solution:
Implement Next.js `revalidate` (ISR) for stable pages. Use `revalidate = 60` (or higher) for data that can tolerate being slightly stale in exchange for near-instant loads.

---

## Priority Task Roadmap

| Priority | Task | Target Files |
| :--- | :--- | :--- |
| **P0** | **Unify Auth/Profile Fetching** | `middleware.ts`, `layout.tsx` |
| **P1** | **Parallelize Page Queries** | `tasks/page.tsx`, `business/page.tsx`, `directory/page.tsx` |
| **P2** | **Narrow Query Column Selection** | `business/page.tsx`, `tasks/page.tsx`, etc. |
| **P3** | **Enable ISR Caching** | `announcements/page.tsx`, `templates/page.tsx` |
