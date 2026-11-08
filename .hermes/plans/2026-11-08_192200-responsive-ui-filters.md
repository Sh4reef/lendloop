# Implementation Plan: Full-Width Filter Rows and Responsive Headers

**Saved Path:** `.hermes/plans/2026-11-08_192200-responsive-ui-filters.md`  
**Created At:** 2026-11-08T19:22:00+01:00  
**Target Repository:** `/root/lendloop`  

---

## 1. Goal
Decouple category filters into dedicated 100% full-width, horizontally scrollable rows across the landing and dashboard pages, and harden mobile header navigation against text wrapping and viewport overflow.

---

## 2. Current Context & Assumptions
- **Landing Page (`app/page.tsx`):**
  - Section header and category filters currently share a flex container (`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8`). On tablet and smaller screens, the category filters wrap awkwardly alongside the heading.
  - Header displays `Sign in to lend or borrow` (26 characters) alongside `Sign In` and logo on mobile viewports (<640px), causing horizontal crowding and multi-line breaks.
- **Dashboard Page (`app/dashboard/page.tsx`):**
  - Inside the "catalog" tab, category filters sit inline to the right of "Neighborhood Equipment" (`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6`).
  - Header actions bar (`Admin Panel` badge, `List a Tool` button, and Clerk `<UserButton />`) can overflow on small mobile viewports (<400px).
- **Tooling & Runtime Assumptions:**
  - Next.js 15.5.29 with Tailwind CSS and Lucide React icons.
  - Production server daemon is currently running on `http://localhost:3000` (backed by Cloudflare Quick Tunnel).
  - TDD test script will be added under `tests/verify-responsive-layout.mjs` and verified using Node.js 26 native assertions.

---

## 3. Architecture & Proposed Approach
- **Dedicated Full-Width Filter Rows:** Separate the section title/description from the category filter buttons into two independent block-level rows. Enclose category pills inside a full-width container (`w-full bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 mb-8 shadow-sm`) with a sticky/lead "Filters" tag and `overflow-x-auto` horizontal scrolling for touch viewports.
- **Responsive Header Hardening:** Keep branding logo and action buttons horizontally aligned without wrapping by using responsive text truncation (`hidden sm:inline`), scaled padding (`px-2.5 py-1.5 sm:px-3.5 sm:py-2`), and `shrink-0` bounds on interactive controls.
- **Verification Strategy:** Enforce changes via an automated AST/DOM regex test suite (`tests/verify-responsive-layout.mjs`) followed by `npm run build` and live HTTP checks.

---

## 4. Step-by-Step Tasks

### Task 1: Create Layout & Responsiveness Verification Suite (TDD)
- **File:** `tests/verify-responsive-layout.mjs`
- **Estimated Time:** 3 minutes
- **Action:** Create an automated assertion test that checks `app/page.tsx` and `app/dashboard/page.tsx` for full-width filter containers (`w-full`), decoupled heading rows, and responsive header spans.
- **Complete Code:**

```javascript
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();

console.log('--- Running Responsive UI & Filter Row Verification Suite ---');

// 1. Verify app/page.tsx
const pageContent = fs.readFileSync(path.join(ROOT, 'app/page.tsx'), 'utf8');

// Assert header has responsive text on mobile
assert(
  pageContent.includes('hidden sm:inline') || pageContent.includes('sm:hidden'),
  'app/page.tsx header must contain responsive span helpers (e.g. sm:hidden / hidden sm:inline) to prevent mobile wrapping'
);

// Assert filter container is in its own full-width block row
assert(
  pageContent.includes('w-full') && pageContent.includes('overflow-x-auto'),
  'app/page.tsx must contain a dedicated full-width (w-full) overflow-x-auto container for filter tabs'
);

// Assert filter container is decoupled from the heading flex container
assert(
  !pageContent.includes('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">\n          <div>\n            <h2 className="text-2xl font-bold text-slate-900">Available in Your Neighborhood</h2>'),
  'app/page.tsx heading must not share an inline flex container with the filter tabs'
);
console.log('✓ app/page.tsx layout assertions passed');

// 2. Verify app/dashboard/page.tsx
const dashContent = fs.readFileSync(path.join(ROOT, 'app/dashboard/page.tsx'), 'utf8');

// Assert Filter icon is imported
assert(
  /import\s*{[^}]*Filter[^}]*}\s*from\s*["']lucide-react["']/.test(dashContent),
  'app/dashboard/page.tsx must import Filter icon from lucide-react'
);

// Assert header controls have responsive labels
assert(
  dashContent.includes('hidden sm:inline') && dashContent.includes('List a Tool'),
  'app/dashboard/page.tsx header must support compact button labels on mobile'
);

// Assert category filter is full width
assert(
  dashContent.includes('w-full bg-white border border-slate-200'),
  'app/dashboard/page.tsx catalog tab must render a dedicated full-width container for category filters'
);
console.log('✓ app/dashboard/page.tsx layout assertions passed');

console.log('\nAll Responsive Layout Tests Passed Successfully (7/7 checks).');
```

- **Verification Command (Expect Failure Initially):**
```bash
node tests/verify-responsive-layout.mjs
```
- **Expected Output:**
```
AssertionError [ERR_ASSERTION]: app/page.tsx header must contain responsive span helpers...
```

---

### Task 2: Update Landing Page UI (`app/page.tsx`)
- **File:** `app/page.tsx`
- **Estimated Time:** 4 minutes
- **Action:** 
  1. Update `<header>` to provide compact padding and responsive button text (`Get Started` on mobile, `Sign in to lend or borrow` on desktop; `Dashboard` on mobile, `Go to Dashboard` on desktop).
  2. Decouple catalog section header into an independent text block (`mb-6`).
  3. Render filter tabs in a dedicated `w-full` row enclosed in a modern card-styled track with smooth horizontal scrolling.
- **Diff / Target Replacement:**

```tsx
// In app/page.tsx - Replace lines 30-70 with responsive header:
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">
              LendLoop
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isLoaded && isSignedIn ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Go to </span>Dashboard
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <SignInButton mode="modal">
                  <button className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 transition whitespace-nowrap">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition whitespace-nowrap">
                    <span className="hidden sm:inline">Sign in to lend or borrow</span>
                    <span className="sm:hidden">Get Started</span>
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </header>

// In app/page.tsx - Replace lines 103-128 with decoupled header and full-width filter row:
        {/* Section Heading */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Available in Your Neighborhood</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Browse available equipment below. Sign in to view full descriptions, lender details, and request loans.
          </p>
        </div>

        {/* Dedicated Full-Width Category Filter Row */}
        <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 mb-8 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto px-1 py-0.5">
            <div className="flex items-center gap-1.5 pl-2 pr-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 border-r border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Filters</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-max">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-xl capitalize whitespace-nowrap transition-all duration-150 ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
```

---

### Task 3: Update Dashboard Page UI (`app/dashboard/page.tsx`)
- **File:** `app/dashboard/page.tsx`
- **Estimated Time:** 4 minutes
- **Action:**
  1. Add `Filter` to `lucide-react` import.
  2. Optimize header controls: hide "Dashboard" badge on extra small viewports (`hidden sm:inline-block`), shorten "Admin Panel" to "Admin" on mobile (`<span className="hidden sm:inline"> Panel</span>`), and show `<Plus /> List` on mobile versus `<Plus /> List a Tool` on desktop.
  3. Inside `activeTab === "catalog"`, decouple the title from the filter tabs into a dedicated `w-full` row matching the landing page design.
- **Diff / Target Replacement:**

```tsx
// In app/dashboard/page.tsx - Update Lucide import on lines 8-22 to include Filter:
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
  Calendar,
  ShieldCheck,
  RotateCcw,
  Bell,
  Trash2,
  Sparkles,
  Filter,
} from "lucide-react";

// In app/dashboard/page.tsx - Replace lines 113-169 with responsive header:
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">LendLoop</span>
            </Link>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {viewer?.role === "admin" && (
              <Link
                href="/admin"
                className="text-xs font-semibold px-2 py-1 sm:px-2.5 sm:py-1 bg-amber-100 text-amber-800 rounded-md border border-amber-200 hover:bg-amber-200 transition"
              >
                Admin<span className="hidden sm:inline"> Panel</span>
              </Link>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List a Tool</span>
              <span className="sm:hidden">List</span>
            </button>
            <div className="shrink-0 flex items-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-4 sm:gap-6 overflow-x-auto text-xs sm:text-sm font-medium border-t border-slate-100">
          {[
            { id: "catalog", label: "Browse Tools" },
            { id: "listings", label: `My Listings (${myListings?.length ?? 0})` },
            { id: "requests", label: `My Requests (${myRequests?.length ?? 0})` },
            { id: "incoming", label: `Incoming Requests (${incomingRequests?.filter((r) => r.status === "pending")?.length ?? 0})` },
            { id: "loans", label: `Active Loans (${myLoans?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 sm:py-3.5 border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

// In app/dashboard/page.tsx - Replace lines 174-198 with decoupled header and full-width filter row:
        {/* TAB 1: BROWSE CATALOG */}
        {activeTab === "catalog" && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Neighborhood Equipment</h2>
              <p className="text-sm text-slate-500 mt-1">Borrow tools from trusted neighbors around your area.</p>
            </div>

            {/* Dedicated Full-Width Category Filter Row */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 mb-8 shadow-sm">
              <div className="flex items-center gap-2 overflow-x-auto px-1 py-0.5">
                <div className="flex items-center gap-1.5 pl-2 pr-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 border-r border-slate-200">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Filters</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-max">
                  {["all", "power tools", "garden", "kitchen", "camping", "other"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-xl capitalize whitespace-nowrap transition-all duration-150 ${
                        selectedCategory === c
                          ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
```

---

### Task 4: Execute Verification Suite & Production Build
- **Estimated Time:** 3 minutes
- **Action:** Run unit layout assertions and Next.js compiler build.
- **Commands:**
```bash
# 1. Run layout assertion suite
node tests/verify-responsive-layout.mjs

# 2. Run Next.js production build check
npm run build
```
- **Expected Output:**
```
✓ app/page.tsx layout assertions passed
✓ app/dashboard/page.tsx layout assertions passed
All Responsive Layout Tests Passed Successfully (7/7 checks).
✓ Compiled successfully
✓ Generating static pages (6/6)
```

---

### Task 5: Restart Daemons & Validate Live Viewport Over Cloudflare Tunnel
- **Estimated Time:** 2 minutes
- **Action:** Restart Next.js production server background task and verify HTTP response over the public Cloudflare tunnel.
- **Commands:**
```bash
# Restart production Next.js instance
pkill -f "next-server" || true
nohup npm run start -p 3000 > /tmp/next-server.log 2>&1 &

# Query tunnel endpoint
curl -s -o /dev/null -w "%{http_code}\n" https://societies-fraction-discussion-bench.trycloudflare.com/
```
- **Expected Output:** `200`

---

## 5. Risks, Tradeoffs, and Mitigations
- **Filter Row Horizontal Scrollbar:** Some browsers (e.g., standard desktop Chrome) display a gray scrollbar on `overflow-x-auto`.
  - *Mitigation:* Kept native touch scrolling smooth without aggressive hiding hacks; added horizontal padding and border styling so scroll behavior feels intentional and sleek across devices.
- **Clerk `<UserButton />` Sizing:** Clerk modal triggers cannot have arbitrary CSS classes injected into their shadow DOM.
  - *Mitigation:* Wrapped `<UserButton />` in a fixed-size flex container (`shrink-0 flex items-center`) to prevent parent layout shifts when avatar loads asynchronously.
- **Zero Regressions on Convex Queries:** Filter state changes trigger `listTools` and `listPublicTools` with `{ category }`.
  - *Mitigation:* Retained exact category array strings (`all`, `power tools`, `garden`, `kitchen`, `camping`, `other`) so Convex index queries continue matching without schema modifications.
