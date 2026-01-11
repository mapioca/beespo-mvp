# Performance Analysis & Optimization Plan

## Current Performance Issues

**Symptom:** 4000-5000 ms page load times across the application

**Warning:** 
```
[webpack.cache.PackFileCacheStrategy] Serializing big strings (130kiB) 
impacts deserialization performance (consider using Buffer instead and decode when needed)
```

---

## Root Causes Identified

### 🔴 **Critical Issue #1: Redundant Authentication Queries**

**Problem:** Authentication is performed **3 times** on every protected page load:

1. **Middleware** (`src/middleware.ts`): Lines 33-46
   - Calls `supabase.auth.getUser()`
   - Queries profiles table for `hasProfile` check
   
2. **Layout** (`src/app/(dashboard)/layout.tsx`): Lines 12-27
   - Calls `supabase.auth.getUser()` again
   - Queries profiles table again
   
3. **Page** (e.g., `src/app/dashboard/page.tsx`): Lines 7-21
   - Calls `supabase.auth.getUser()` **again**
   - Queries profiles table **again**

**Impact:** Each request makes 3 Supabase auth calls + 3 database queries before even loading page data. This alone could add **1500-2000ms** to every page load.

---

### 🔴 **Critical Issue #2: Over-fetching with `select("*")`**

**Problem:** Many pages use `select("*")` which fetches ALL columns including large text fields.

**Locations:** 19 instances found across:
- `/announcements/*`
- `/discussions/*`
- `/business/*`
- `/speakers/*`
- `/templates/*`
- `/meetings/*`

**Impact:** Fetching unnecessary large columns (descriptions, content, notes) increases:
- Network transfer time
- Serialization/deserialization overhead
- Memory usage
- The webpack warning about "big strings (130kiB)"

---

### 🟡 **Issue #3: Missing Next.js Caching**

**Problem:** No caching configuration in `next.config.ts`

**Missing optimizations:**
- No image optimization configuration
- No webpack caching strategy
- No compression enabled
- No bundle analyzer to identify large dependencies

---

### 🟡 **Issue #4: Sequential Database Queries**

**Problem:** In `tasks/page.tsx` (and likely others):
- Line 15-24: Fetch tasks
- Line 49-53: Fetch user profile 
- Line 59-63: Fetch workspace profiles

These queries run **sequentially** instead of in parallel, adding ~300-500ms per page.

---

### 🟡 **Issue #5: No Server-Side Caching**

**Problem:** User profile and workspace data is fetched on **every single request** even though it rarely changes.

---

## Optimization Strategy

### Phase 1: Quick Wins (Est. improvement: 2000-3000ms)

#### 1.1 Remove Redundant Middleware Queries
**Action:** Since layout and pages already check authentication, simplify middleware to only handle redirects:

```typescript
// middleware.ts - SIMPLIFIED VERSION
export async function middleware(request: NextRequest) {
  // Only do auth check, let layout handle profile
  const supabaseResponse = NextResponse.next({ request });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { ... } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  // Simple routing logic only
  const protectedRoutes = ["/dashboard", "/templates", ...];
  const isProtectedRoute = protectedRoutes.some(r => 
    request.nextUrl.pathname.startsWith(r)
  );
  
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  if (user && ["/login", "/signup"].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  
  return supabaseResponse;
}
```

#### 1.2 Use Layout Data in Pages
**Action:** Create a context or pass down user/profile data from layout to prevent duplicate queries

#### 1.3 Replace `select("*")` with Specific Columns
**Action:** For every query, only select needed columns:

```typescript
// BEFORE
.select("*")

// AFTER - Example for announcements
.select("id, title, content, created_at, updated_at, author:profiles(full_name)")
```

---

### Phase 2: Caching (Est. improvement: 500-1000ms)

#### 2.1 Enable Next.js Data Caching
```typescript
// In page components
export const revalidate = 60; // Cache for 60 seconds

// Or for specific fetches
const { data } = await supabase
  .from('profiles')
  .select('id, full_name, workspace_id')
  .eq('id', user.id)
  .single();
  
// Add Next.js cache
fetch(supabaseUrl, {
  next: { revalidate: 300 } // 5 minutes for profile data
});
```

#### 2.2 Update next.config.ts
```typescript
const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  
  // Performance optimizations
  compress: true,
  
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          }
        }
      };
    }
    return config;
  },
};
```

---

### Phase 3: Parallel Queries (Est. improvement: 300-500ms)

#### 3.1 Use Promise.all for Independent Queries
```typescript
// BEFORE (Sequential - SLOW)
const { data: tasks } = await supabase.from('tasks').select('*');
const { data: profile } = await supabase.from('profiles').select('*');
const { data: profiles } = await supabase.from('profiles').select('*');

// AFTER (Parallel - FAST)
const [
  { data: tasks },
  { data: profile },
  { data: profiles }
] = await Promise.all([
  supabase.from('tasks').select('...specific columns...'),
  supabase.from('profiles').select('workspace_id').eq('id', user.id).single(),
  supabase.from('profiles').select('id, full_name, email')
]);
```

---

## Implementation Priority

### 🚨 **DO FIRST** (Expected: 50-70% improvement)
1. ✅ Simplify middleware (remove duplicate auth/profile queries)
2. ✅ Replace all `select("*")` with specific column selections
3. ✅ Parallelize independent database queries with `Promise.all`

### 🔧 **DO SECOND** (Expected: 10-20% improvement)  
4. ✅ Add Next.js data caching with `revalidate`
5. ✅ Update `next.config.ts` with webpack optimizations

### 📊 **DO THIRD** (Monitor and measure)
6. ✅ Add bundle analyzer to identify large dependencies
7. ✅ Consider adding React Suspense boundaries for better UX
8. ✅ Monitor with web vitals

---

## Expected Results

| Optimization | Current | Expected | Improvement |
|-------------|---------|----------|-------------|
| Current baseline | 4000-5000ms | - | - |
| After Phase 1 | - | 1500-2000ms | **60-70%** |
| After Phase 2 | - | 1000-1500ms | **75-80%** |
| After Phase 3 | - | 800-1200ms | **80-85%** |

---

## Next Steps

Would you like me to:
1. **Start implementing Phase 1 optimizations** (recommended)
2. **Add performance monitoring first** to establish baseline metrics
3. **Create a detailed migration plan** for each file that needs changes
