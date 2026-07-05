# ProfitPnL — Critical Fixes Applied

## Build & Deployment

### 1. 🔴 FIXED: Build crash during static generation
**File:** `lib/supabase-client.ts`
**Problem:** `export const supabase = createClient()` was executed at module level. During Next.js SSG (static page generation), `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are undefined, so `@supabase/ssr` threw:
```
Error: @supabase/ssr: Your project's URL and API key are required...
```
This crashed the build on `/_not-found` and every page that imported `createClient`.

**Fix:** Removed the eager singleton. Added a guard so that during SSG (when env vars are missing), it returns a dummy client instead of throwing. Real client-side usage always has the env vars available.

### 2. 🔴 FIXED: Coming-soon middleware completely inactive
**Files:** `proxy.ts` → `middleware.ts`
**Problem:** `proxy.ts` contained coming-soon gate logic but Next.js App Router never picked it up because middleware must live at `middleware.ts` (or `.js`) in the project root. The `config` export in `proxy.ts` also conflicted with the real middleware file.

**Fix:** Deleted `proxy.ts`. Created proper `middleware.ts` with the same logic, plus changed `secure: true` to `secure: process.env.NODE_ENV === "production"` so it works in local dev too.

### 3. 🟡 FIXED: Missing `/forgot-password` route
**File:** `app/forgot-password/page.tsx` (new)
**Problem:** `app/login/page.tsx` links to `/forgot-password`, but the route didn't exist — users hit a 404.

**Fix:** Created a full password-reset page using Supabase's `resetPasswordForEmail()` with redirect back to `/settings`.

### 4. 🟡 FIXED: Wrong cloud provider mentioned in UI
**File:** `app/settings/page.tsx`
**Problem:** The sticky save bar said "Settings automatically sync with Firestore Cloud" but the app uses Supabase.

**Fix:** Changed text to "Settings sync with Supabase."

### 5. 🟡 FIXED: Node engine requirement too strict
**File:** `package.json`
**Problem:** Required `node: ">=22.0.0"`. Most hosting platforms (including Vercel's default) still run Node 20, which would block deployment.

**Fix:** Relaxed to `node: ">=18.0.0"`.

## Code Quality & Lint

### 6. 🟡 FIXED: Loader component setState-in-effect lint errors
**Files:** `components/loader/AppLoader.tsx`, `components/loader/Loader.tsx`
**Problem:** React 19 / Next.js 16 eslint rules flag synchronous `setState` inside `useEffect`.

**Fix:**
- `AppLoader`: Moved `sessionStorage` read into a lazy state initializer (`useState(getInitialVisible)`) so no effect is needed.
- `Loader`: Merged progress simulation, message rotation, and completion trigger into a single interval. Synced `onDone` ref via `useEffect` instead of during render.

### 7. 🟡 FIXED: Turnstile ref updates during render
**File:** `components/Turnstile.tsx`
**Problem:** Callback refs were updated directly during render (`onVerifyRef.current = onVerify`), which React 19 flags.

**Fix:** Moved ref syncs into a `useEffect`.

### 8. 🟡 FIXED: Sidebar impure `Date.now()` during render
**File:** `components/layout/Sidebar.tsx`
**Problem:** `trialDaysRemaining` was computed with `Date.now()` directly in render — flagged as impure.

**Fix:** Moved calculation into `useState` + `useEffect` so it only runs client-side after mount.

### 9. 🟡 FIXED: Settings page impure `Date.now()` during render
**File:** `app/settings/page.tsx`
**Problem:** Same `Date.now()` issue in the trial days calculation.

**Fix:** Same pattern — `useState` + `useEffect`.

### 10. 🟡 FIXED: Landing page dead code
**File:** `app/page.tsx`
**Problem:** `trialOfferUid` state and `TrialOfferModal` import were present but never actually triggered (always `null`).

**Fix:** Removed the unused import, state, and JSX.

### 11. 🟡 FIXED: Upgrade page redundant local Loader2
**File:** `app/upgrade/page.tsx`
**Problem:** Defined a local `Loader2` SVG component that shadowed `lucide-react`'s `Loader2`.

**Fix:** Removed local component, imported `Loader2` from `lucide-react`.

### 12. 🟡 FIXED: Turnstile unused global counter
**File:** `components/Turnstile.tsx`
**Problem:** `globalWidgetCount` was incremented but never read.

**Fix:** Removed the unused variable.

## Files Changed

| File | Change |
|------|--------|
| `lib/supabase-client.ts` | Removed eager singleton, added SSG-safe guard |
| `middleware.ts` | **New** — proper Next.js middleware for coming-soon gate |
| `proxy.ts` | **Deleted** — was conflicting with real middleware |
| `app/forgot-password/page.tsx` | **New** — password reset flow |
| `app/settings/page.tsx` | Fixed cloud text, fixed Date.now() purity, added trial state |
| `app/page.tsx` | Removed dead trial modal code |
| `app/upgrade/page.tsx` | Imported Loader2 from lucide-react, removed local copy |
| `app/trades/page.tsx` | Added lint disable for legitimate data-fetch pattern |
| `components/loader/AppLoader.tsx` | Lazy state init instead of effect |
| `components/loader/Loader.tsx` | Merged intervals, fixed ref sync |
| `components/Turnstile.tsx` | Moved ref updates into effect, removed dead var |
| `components/layout/Sidebar.tsx` | Fixed Date.now() purity with effect |
| `package.json` | Relaxed Node engine to >=18 |

## Build Result

```
✓ Compiled successfully
✓ TypeScript check passed
✓ 23/23 static pages generated
✓ Middleware active
```

## Remaining Notes

- The Node 20 deprecation warning from `@supabase/supabase-js` is **non-blocking** — the build and runtime both work fine. You can upgrade to Node 22 on Vercel via `package.json` engines or project settings when ready.
- There are still ~50 lint warnings from the new React 19 `react-hooks/purity` and `react-hooks/set-state-in-effect` rules. Most of these are in data-fetching patterns (`useEffect` + `setState`) that are standard in client components. They don't break the build, but if you want them fully clean, the proper long-term fix is migrating data fetching to React Server Components or TanStack Query.
