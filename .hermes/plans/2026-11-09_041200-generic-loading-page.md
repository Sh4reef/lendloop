# Implementation Plan: Unified Generic Loading Page & Tunnel Verification Policy

**Saved Path:** `.hermes/plans/2026-11-09_041200-generic-loading-page.md`  
**Created At:** 2026-11-09T04:12:00+01:00 (Updated: 2026-11-09T04:18:00+01:00)  
**Target Repository:** `/root/lendloop`  

---

## 1. Goal
Replace the bespoke "Verifying administrator privileges..." loading screen in `/admin` with a unified, brand-aligned generic loading screen (`app/loading.tsx`) rendered across all Next.js routes and client loading states to prevent reconnaissance leakage, while restricting alternative preview links exclusively to encrypted HTTPS tunnels (removing direct server IP exposure).

---

## 2. Current Context & Assumptions
- **Current State in `app/admin/page.tsx`:**
  - When `viewer === undefined` during Convex auth resolution, lines 16–25 render:
    ```tsx
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex items-center gap-2.5 text-slate-500 text-sm font-medium">
        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span>Verifying administrator privileges...</span>
      </div>
    </div>
    ```
  - This explicit text confirms the existence and administrative nature of `/admin` to unauthenticated visitors or reconnaissance scanners before the `notFound()` anti-enumeration guard evaluates.
- **Current State in `app/dashboard/page.tsx`:**
  - Lines 100–109 render a separate bespoke loading state:
    ```tsx
    <span>Loading LendLoop dashboard...</span>
    ```
- **App Router Missing Root Fallback:**
  - Next.js App Router currently lacks an `app/loading.tsx` file, meaning route transitions and React Suspense boundaries lack an automatic, unified loading screen for other routes.
- **Preview Link Policy Update:**
  - Direct server IP endpoints (`http://5.189.154.212:3000`) are removed from all alternative links to enforce origin IP masking and prevent plain HTTP transmission. Only encrypted HTTPS tunnels (`*.trycloudflare.com` and `*.lhr.life`) are permitted.
- **Assumptions & Invariants:**
  - Next.js 15 App Router supports root `app/loading.tsx` as the suspense boundary fallback for all routes.
  - The security guard `if (viewer?.role !== "admin") notFound();` in `app/admin/page.tsx` must remain untouched immediately following the viewer check.
  - TDD suite will be created at `tests/verify-generic-loading.mjs`.

---

## 3. Architecture & Proposed Approach
- **Global Next.js Suspense Boundary (`app/loading.tsx`):** Create a clean, centered generic loading component exporting `Loading` with a subtle emerald spinner and neutral "Loading..." indicator.
- **Shared Client Hydration Fallback:** Import and render `<Loading />` in client-side auth resolution blocks across both `app/admin/page.tsx` (when `viewer === undefined`) and `app/dashboard/page.tsx` (when `!isLoaded`).
- **Information Leak Elimination:** Remove all privileged phrases ("administrator privileges", "admin") from pre-authorization loading states, making loading states across public, user, and administrative routes completely indistinguishable.
- **Strict HTTPS Tunnel Delivery:** Route all alternative and external access exclusively through encrypted TLS tunnels, shielding the VPS host IP from public disclosure.

---

## 4. Step-by-Step Tasks

### Task 1: Create Generic Loading Verification Suite (TDD)
- **File:** [`tests/verify-generic-loading.mjs`](file:///root/lendloop/tests/verify-generic-loading.mjs)
- **Estimated Time:** 3 minutes
- **Action:** Create an automated assertion test asserting:
  1. `app/loading.tsx` exists and renders a generic loading UI (contains `Loading` / `animate-spin`).
  2. `app/admin/page.tsx` does NOT contain any reference to "administrator privileges".
  3. `app/admin/page.tsx` imports and renders `Loading` from `../loading`.
  4. `app/dashboard/page.tsx` uses the generic `Loading` component.
  5. Anti-enumeration `notFound()` guard in `app/admin/page.tsx` remains intact.
- **Complete Code:**

```javascript
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const loadingPath = path.join(ROOT, 'app/loading.tsx');
const adminPath = path.join(ROOT, 'app/admin/page.tsx');
const dashPath = path.join(ROOT, 'app/dashboard/page.tsx');

console.log('--- Running Generic Loading Verification Suite ---');

// 1. Assert app/loading.tsx exists and has generic loading markup
assert(fs.existsSync(loadingPath), 'app/loading.tsx must exist as the root loading boundary');
const loadingContent = fs.readFileSync(loadingPath, 'utf8');
assert(
  loadingContent.includes('animate-spin') && loadingContent.includes('Loading'),
  'app/loading.tsx must render an animated spinner and generic loading text'
);
console.log('✓ app/loading.tsx exists and exports generic loading UI');

// 2. Assert app/admin/page.tsx does NOT contain "administrator privileges"
const adminContent = fs.readFileSync(adminPath, 'utf8');
assert(
  !/administrator\s+privileges/i.test(adminContent),
  'app/admin/page.tsx must NOT contain "verifying administrator privileges" to prevent reconnaissance leakage'
);
console.log('✓ "administrator privileges" leak removed from app/admin/page.tsx');

// 3. Assert app/admin/page.tsx uses the generic loading component
assert(
  adminContent.includes('import Loading from "../loading"') || adminContent.includes('<Loading'),
  'app/admin/page.tsx must use the generic Loading component while viewer state resolves'
);
console.log('✓ app/admin/page.tsx imports and renders generic Loading component');

// 4. Assert anti-enumeration guard remains intact
assert(
  adminContent.includes('notFound()') && adminContent.includes('viewer?.role !== "admin"'),
  'app/admin/page.tsx must preserve the notFound() anti-enumeration authorization guard'
);
console.log('✓ Anti-enumeration guard preserved in app/admin/page.tsx');

// 5. Assert app/dashboard/page.tsx uses generic Loading component
const dashContent = fs.readFileSync(dashPath, 'utf8');
assert(
  !dashContent.includes('Loading LendLoop dashboard...'),
  'app/dashboard/page.tsx must use the generic Loading component instead of bespoke text'
);
assert(
  dashContent.includes('import Loading from "../loading"') || dashContent.includes('<Loading'),
  'app/dashboard/page.tsx must import and render the generic Loading component'
);
console.log('✓ app/dashboard/page.tsx unified with generic Loading component');

console.log('\nAll Generic Loading Tests Passed (5/5 checks).');
```

- **Verification Command (Run before implementation to verify red failure):**
```bash
cd /root/lendloop && node tests/verify-generic-loading.mjs
```
- **Expected Output:**
```
AssertionError [ERR_ASSERTION]: app/loading.tsx must exist as the root loading boundary
```

---

### Task 2: Create Universal Loading Component (`app/loading.tsx`)
- **File:** [`app/loading.tsx`](file:///root/lendloop/app/loading.tsx)
- **Estimated Time:** 3 minutes
- **Action:** Create `app/loading.tsx` as a clean, responsive, neutral loading indicator that serves both as Next.js's route Suspense fallback and as an exportable client component for query/auth resolution.
- **Complete Code:**

```tsx
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
```

---

### Task 3: Update `app/admin/page.tsx`
- **File:** [`app/admin/page.tsx`](file:///root/lendloop/app/admin/page.tsx)
- **Estimated Time:** 3 minutes
- **Action:**
  1. Import `Loading` from `../loading`.
  2. Replace the bespoke "Verifying administrator privileges..." block with `<Loading />`.
  3. Ensure `notFound()` guard evaluates immediately when `viewer !== undefined`.
- **Target Replacement (Lines 1–25):**

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ArrowLeft, Wrench, Users } from "lucide-react";
import Loading from "../loading";

export default function AdminPage() {
  const viewer = useQuery(api.users.getViewer);
  const allLoans = useQuery(api.loans.getAllLoans);
  const allTools = useQuery(api.tools.listTools, {});
  const deleteTool = useMutation(api.tools.deleteTool);
  const setTrustedLender = useMutation(api.users.setTrustedLender);

  if (viewer === undefined) {
    return <Loading />;
  }

  // Prevent endpoint enumeration / reconnaissance by returning 404 for unauthorized users
  if (viewer?.role !== "admin") {
    notFound();
  }

  return (
    // ... remaining layout unchanged ...
```

---

### Task 4: Update `app/dashboard/page.tsx`
- **File:** [`app/dashboard/page.tsx`](file:///root/lendloop/app/dashboard/page.tsx)
- **Estimated Time:** 3 minutes
- **Action:**
  1. Import `Loading` from `../loading`.
  2. Replace the bespoke "Loading LendLoop dashboard..." block with `<Loading />`.
- **Target Replacement (Lines 99–110):**

```tsx
  if (!isLoaded) {
    return <Loading />;
  }
```

---

### Task 5: Execute Test Suites & Production Build
- **Estimated Time:** 3 minutes
- **Action:** Run unit assertions, regression suites, and Next.js compiler build.
- **Commands:**
```bash
# 1. Run new generic loading verification suite
cd /root/lendloop && node tests/verify-generic-loading.mjs

# 2. Run admin responsive layout assertion suite
cd /root/lendloop && node tests/verify-admin-responsive.mjs

# 3. Run responsive layout suite
cd /root/lendloop && node tests/verify-responsive-layout.mjs

# 4. Run RBAC audit suite
cd /root/lendloop && npm run test:rbac

# 5. Run Next.js production build check
cd /root/lendloop && npm run build
```
- **Expected Output:**
```
✓ app/loading.tsx exists and exports generic loading UI
✓ "administrator privileges" leak removed from app/admin/page.tsx
✓ app/admin/page.tsx imports and renders generic Loading component
✓ Anti-enumeration guard preserved in app/admin/page.tsx
✓ app/dashboard/page.tsx unified with generic Loading component
All Generic Loading Tests Passed (5/5 checks).

All Admin Responsive Layout Tests Passed (5/5 checks).
All Responsive Layout Tests Passed Successfully (7/7 checks).
RBAC AUDIT SUMMARY: 7/7 checks passed.
✓ Compiled successfully
✓ Generating static pages (6/6)
```

---

### Task 6: Restart Daemon & Verify Encrypted HTTPS Tunnels Only
- **Estimated Time:** 2 minutes
- **Action:** Restart Next.js production server daemon, verify local port 3000 health, and validate via public encrypted HTTPS tunnels only (excluding direct server IP from public reports).
- **Commands:**
```bash
# 1. Restart production Next.js instance
pkill -f "next-server" || true
cd /root/lendloop && nohup npm run start -p 3000 > /tmp/next-server.log 2>&1 &
sleep 2

# 2. Verify local health loopback
curl -s -I http://localhost:3000/

# 3. Verify public HTTPS tunnels (Cloudflare & localhost.run)
curl -s -I https://buffer-edmonton-optimal-spencer.trycloudflare.com/
curl -s -I https://b0fff0ee904c4b.lhr.life/
```
- **Expected Output:**
```
HTTP/1.1 200 OK
HTTP/2 200
HTTP/1.1 200 OK
```

---

## 5. Risks, Tradeoffs, and Mitigations
- **Server vs. Client Component Compatibility:**
  - *Risk:* In Next.js App Router, `app/loading.tsx` is typically evaluated on the server as a Suspense boundary fallback, while `app/admin/page.tsx` and `app/dashboard/page.tsx` are `"use client"` components.
  - *Mitigation:* Writing `app/loading.tsx` without server-only or client-only hooks allows it to be used natively by Next.js as the Suspense boundary and imported directly into client components without bundling conflicts.
- **Security Invariant:**
  - *Risk:* Removing the viewer loading check could cause an early redirect or false positive 404 before auth identity is established.
  - *Mitigation:* Retain the exact condition `if (viewer === undefined) return <Loading />;` so that identity resolution completes before `if (viewer?.role !== "admin") notFound();` executes.
- **Origin IP Privacy & Security:**
  - *Risk:* Publishing the direct server IP (`5.189.154.212`) exposes the host infrastructure to direct port probing, DDoS attacks, and unencrypted HTTP traffic bypassing TLS.
  - *Mitigation:* The direct server IP is completely omitted from all alternative links and user-facing endpoints. Only encrypted HTTPS tunnels (`trycloudflare.com` and `lhr.life`) are provided.
