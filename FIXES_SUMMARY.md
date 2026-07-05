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

### 13. 🔴 FIXED: Pro Plan not updating after Stripe test card checkout
**Files:** `app/api/payments/checkout/route.ts`, `app/api/payments/verify/route.ts` (new), `components/providers/AuthProvider.tsx`, `app/settings/page.tsx`, `app/upgrade/page.tsx`
**Problem:** When a user upgraded to Pro using a Stripe test card and returned to `/settings` or `/dashboard`, the UI still displayed "Free trial" or "Upgrade to Pro". This happened because webhooks (`checkout.session.completed`) often arrive after the browser redirect or fail to reach local/preview servers during testing. When the browser returned to `success_url`, the app did not verify the session or update user state.

**Fix:**
- Updated `app/api/payments/checkout/route.ts` to include `&session_id={CHECKOUT_SESSION_ID}` in `success_url`.
- Created `app/api/payments/verify/route.ts` to retrieve checkout sessions or query active subscriptions directly from Stripe and update Supabase `profiles` (`plan: "Pro Plan"`, `plan_source: "paid"`).
- Updated `AuthProvider.tsx` to automatically trigger payment verification when returning with `?upgrade=success` or `?session_id=...`, immediately refreshing React state and user profile data.
- Added visual upgrade confirmations on `/settings` and `/upgrade`.

### 14. 🔴 FIXED: React Error #418 (Hydration Mismatch) in AppLoader
**File:** `components/loader/AppLoader.tsx`
**Problem:** `getInitialVisible()` inspected `sessionStorage` directly during initial render state declaration. On SSR, `typeof window === "undefined"` returned `null` (rendering `<div style="visibility: hidden">`), while initial browser hydration rendered `<Loader />` or children directly. React 19 threw Error #418 because initial client DOM didn't match server HTML.

**Fix:** Initialized `visible` strictly to `null` during both SSR and initial client hydration so HTML always matches. Immediately post-hydration, a `useEffect` checks `sessionStorage` and reveals either the loader or application.

### 15. 🔴 FIXED: 401 Unauthorized on Checkout, AI Coach, and Verify Endpoints
**Files:** `app/upgrade/page.tsx`, `app/ai-coach/page.tsx`, `components/providers/AuthProvider.tsx`, `app/api/payments/verify/route.ts`
**Problem:** Backend API routes were hardened with `getAuthenticatedUser(req)`, requiring an `Authorization: Bearer <access_token>` header. Frontend client calls on `/upgrade` and `/ai-coach` omitted this header, causing `401 Unauthorized`.

**Fix:**
- Updated frontend fetch requests (`/upgrade`, `/ai-coach`, `AuthProvider`) to retrieve the user session (`await createClient().auth.getSession()`) and attach `Authorization: Bearer ${session.access_token}`.
- Hardened `/api/payments/verify` to require JWT authentication (`getAuthenticatedUser(req)`) and enforce strict ownership (`targetUid === authUser.id`), preventing cross-user session checks.

### 16. 🔴 FIXED: AI Coach "[System Error: Please try again later.]"
**File:** `app/api/ai/claude/route.ts`
**Problem:** When AI Coach (`/api/ai/claude`) encountered missing/unfunded `ANTHROPIC_API_KEY` or message role formatting errors (Anthropic requires strict alternating user/assistant roles starting with user), it swallowed the error and emitted `[System Error: Please try again later.]`. Additionally, it ignored the frontend's enriched live trading statistics `systemPrompt`.

**Fix:**
- Added explicit check for missing or unconfigured `ANTHROPIC_API_KEY`, returning a clear instruction banner instead of failing silently.
- Added strict message role normalization (merging consecutive roles and ensuring the sequence begins with `'user'`).
- Wired up dynamic `systemPrompt` support so live trading journal context is passed to Claude.
- Implemented automatic model fallback (`claude-3-5-sonnet-20241022` -> `claude-3-5-sonnet-latest` -> `claude-3-haiku-20240307`) to resolve 404 model deprecation/restriction errors seamlessly.
- Streamed explicit error messages (`[AI Coach Error: ...]`) on failure so issues can be diagnosed instantly.

### 17. 🔴 FIXED: Supabase Password Reset Link Redirecting to Homepage
**Files:** `app/reset-password/page.tsx` (new), `app/api/auth/forgot-password/route.ts`, `components/providers/AuthProvider.tsx`
**Problem:** When users clicked a Supabase password reset link, they were redirected to the homepage (`/`) or `/settings` without any UI to enter a new password.

**Fix:**
- Created a dedicated password update UI at `app/reset-password/page.tsx` allowing users to securely set a new password via `supabase.auth.updateUser({ password })`.
- Updated `app/api/auth/forgot-password/route.ts` so `resetPasswordForEmail` sets `redirectTo: ${appUrl}/reset-password`.
- Added an automated recovery interceptor in `AuthProvider.tsx`: if a user lands on the homepage or any other route with `type=recovery` or triggers a `PASSWORD_RECOVERY` event (e.g., due to restrictive Supabase Dashboard redirect rules), they are automatically routed to `/reset-password`.

### 18. 🟡 FIXED: Instant Sign Out Without Confirmation
**Files:** `app/settings/page.tsx`, `components/layout/Sidebar.tsx`
**Problem:** Clicking "Log Out" instantly signed users out without confirmation or accidental click prevention.

**Fix:** Added a dedicated Sign Out icon button next to the user profile card in the Sidebar and added a confirmation modal dialog ("Sign out of ProfitPnL? [No, Stay Logged In] [Yes, Sign Out]") across both the Sidebar and Settings page.

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
| `app/api/payments/checkout/route.ts` | Added `session_id` template param to checkout return URL |
| `app/api/payments/verify/route.ts` | **New** — endpoint to verify checkout session & active subscriptions directly |
| `components/providers/AuthProvider.tsx` | Auto-verify checkout completion on return & sync state immediately |
| `app/settings/page.tsx` | Added upgrade notification popup when returning from checkout |
| `components/loader/AppLoader.tsx` | Fixed React Error #418 SSR/hydration mismatch |
| `app/upgrade/page.tsx` | Added Bearer authorization header to checkout API calls |
| `app/ai-coach/page.tsx` | Added Bearer authorization header to Claude AI API calls |
| `app/api/payments/verify/route.ts` | Enforced strict JWT authentication and user ownership guards |
| `app/api/ai/claude/route.ts` | Fixed message role formatting, dynamic system prompt, and API key error reporting |
| `app/reset-password/page.tsx` | **New** — dedicated password update screen for recovery email links |
| `app/api/auth/forgot-password/route.ts` | Updated recovery email redirect to point to `/reset-password` |
| `components/layout/Sidebar.tsx` | Added quick Sign Out button and logout confirmation dialog |
| `app/settings/page.tsx` | Added logout confirmation modal dialog before signing out |
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
