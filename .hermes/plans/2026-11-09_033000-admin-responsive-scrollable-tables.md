# Implementation Plan: Admin Route Responsive Layout & Scrollable Tables

**Saved Path:** `.hermes/plans/2026-11-09_033000-admin-responsive-scrollable-tables.md`  
**Created At:** 2026-11-09T03:30:00+01:00  
**Target Repository:** `/root/lendloop`  

---

## 1. Goal
Make all administrative data tables on `/admin` horizontally scrollable on narrow viewports without column clipping, and make the administrative control center interface fully responsive across mobile, tablet, and desktop viewports.

---

## 2. Current Context & Assumptions
- **File Under Modification:** [`app/admin/page.tsx`](file:///root/lendloop/app/admin/page.tsx)
- **Current Deficiencies:**
  - Table card containers use `overflow-hidden` without an inner `overflow-x-auto` wrapper (`<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">`).
  - Tables use `className="w-full text-left text-sm"` without `min-w-[...]` constraints, causing 5-column listings and 6-column loan tables to compress into illegible, squeezed cells on mobile (<768px). Any overflow is permanently clipped with zero touch or mouse scrolling capability.
  - Table cells lack `whitespace-nowrap`, causing action buttons (`✓ Trusted Lender`, `Remove Listing`), dates, and status badges to wrap into awkward multi-line text fragments.
  - Header navigation bar has rigid spacing and lacks responsive text labels (`Back to Dashboard` vs. `Back`).
  - No empty-state or loading skeletons when `allTools` or `allLoans` are undefined or have 0 entries.
- **Security & Authorization Invariant:**
  - The page protects against reconnaissance and endpoint enumeration by invoking Next.js `notFound()` when `viewer?.role !== "admin"`. This behavior must remain strictly intact.
- **Tooling & Environment:**
  - Next.js 15.1.0 with React 19, Tailwind CSS, Lucide React, and Convex client.
  - Automated verification test will be created at [`tests/verify-admin-responsive.mjs`](file:///root/lendloop/tests/verify-admin-responsive.mjs) using Node.js `node:assert/strict`.

---

## 3. Architecture & Proposed Approach
- **Nested Card & Scroll Architecture:** Retain the clean rounded card border on the parent wrapper (`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm`) while placing each `<table>` inside a dedicated `overflow-x-auto overscroll-x-contain` container with explicit minimum widths (`min-w-[640px]` for tool listings, `min-w-[700px]` for global active loans).
- **Cell Integrity & Column Readability:** Apply `whitespace-nowrap` across all `<th>` and `<td>` elements, ensuring that action buttons, borrower/lender identities, status badges, and date intervals remain legible and single-line during horizontal scroll.
- **Mobile-First Responsive Polish:** Optimize padding (`px-3 sm:px-4 py-6 sm:py-8`), add responsive header labels (`Back` on mobile vs. `Back to Dashboard` on desktop), add item count badges and mobile swipe hints (`Swipe table horizontally →`), and provide clean fallback rows for empty and loading states.

---

## 4. Step-by-Step Tasks

### Task 1: Create Admin Responsive Verification Suite (TDD)
- **File:** [`tests/verify-admin-responsive.mjs`](file:///root/lendloop/tests/verify-admin-responsive.mjs)
- **Estimated Time:** 3 minutes
- **Action:** Create an automated assertion test that checks [`app/admin/page.tsx`](file:///root/lendloop/app/admin/page.tsx) for:
  1. Preservation of the `notFound()` anti-enumeration authorization guard.
  2. Presence of `overflow-x-auto` table scroll wrappers.
  3. Minimum table widths (`min-w-[640px]` and `min-w-[700px]`).
  4. Cell text wrapping protection (`whitespace-nowrap`).
  5. Responsive header viewports (`hidden sm:inline`, `px-3 sm:px-4`).
- **Complete Code:**

```javascript
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const adminPath = path.join(ROOT, 'app/admin/page.tsx');

console.log('--- Running Admin Responsive Layout Verification Suite ---');

const content = fs.readFileSync(adminPath, 'utf8');

// 1. Assert security guard is preserved
assert(
  content.includes('notFound()') && content.includes('viewer?.role !== "admin"'),
  'app/admin/page.tsx must preserve the notFound() anti-enumeration authorization guard'
);
console.log('✓ Anti-enumeration security check preserved');

// 2. Assert table wrappers have overflow-x-auto
assert(
  content.includes('overflow-x-auto'),
  'app/admin/page.tsx table containers must use overflow-x-auto to enable horizontal scrolling'
);
console.log('✓ Table container overflow-x-auto check passed');

// 3. Assert minimum table widths exist to enforce horizontal scrolling
assert(
  /min-w-\[\d+px\]/.test(content),
  'app/admin/page.tsx tables must declare a minimum width (e.g., min-w-[640px]) to allow horizontal scroll on mobile'
);
console.log('✓ Minimum table width check passed');

// 4. Assert cells prevent text wrapping
assert(
  content.includes('whitespace-nowrap'),
  'app/admin/page.tsx tables must apply whitespace-nowrap to keep columns legible when scrolled'
);
console.log('✓ whitespace-nowrap column check passed');

// 5. Assert responsive navigation header improvements
assert(
  content.includes('hidden sm:inline') || content.includes('gap-2 sm:gap-3'),
  'app/admin/page.tsx header must support responsive viewport classes'
);
console.log('✓ Responsive header check passed');

console.log('\nAll Admin Responsive Layout Tests Passed (5/5 checks).');
```

- **Verification Command (Run before implementation to verify red failure):**
```bash
cd /root/lendloop && node tests/verify-admin-responsive.mjs
```
- **Expected Output:**
```
AssertionError [ERR_ASSERTION]: app/admin/page.tsx table containers must use overflow-x-auto to enable horizontal scrolling
```

---

### Task 2: Implement Responsive UI & Scrollable Tables in `app/admin/page.tsx`
- **File:** [`app/admin/page.tsx`](file:///root/lendloop/app/admin/page.tsx)
- **Estimated Time:** 5 minutes
- **Action:**
  1. Retain the strict `viewer === undefined` loading spinner and `if (viewer?.role !== "admin") notFound();` security check.
  2. Implement responsive header with back-button text toggle (`Back` on mobile, `Back to Dashboard` on desktop), compact spacing, and role badge.
  3. Wrap each data table in an inner `<div className="overflow-x-auto">` inside a rounded, bordered card container.
  4. Assign `min-w-[640px]` to the Tool Listings table and `min-w-[700px]` to the Global Active Loans table.
  5. Add `whitespace-nowrap` to headers and table cells to maintain column spacing and prevent awkward button/status breaks.
  6. Add loading skeleton rows and empty-state rows (`colSpan={5}` and `colSpan={6}`).
  7. Add subtle mobile swipe hints (`Swipe table horizontally →`) visible only on mobile viewports (`sm:hidden`).
- **Complete Replacement Code:**

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ArrowLeft, Wrench, Users } from "lucide-react";

export default function AdminPage() {
  const viewer = useQuery(api.users.getViewer);
  const allLoans = useQuery(api.loans.getAllLoans);
  const allTools = useQuery(api.tools.listTools, {});
  const deleteTool = useMutation(api.tools.deleteTool);
  const setTrustedLender = useMutation(api.users.setTrustedLender);

  if (viewer === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2.5 text-slate-500 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span>Verifying administrator privileges...</span>
        </div>
      </div>
    );
  }

  // Prevent endpoint enumeration / reconnaissance by returning 404 for unauthorized users
  if (viewer?.role !== "admin") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="h-8 w-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none truncate">
                Admin Control Center
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                Moderation, trust verification, and global loan audit
              </p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
            RBAC: admin
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-8 sm:space-y-10 flex-1 w-full">
        {/* Section 1: Manage Listings */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                <span>Community Listings Moderation</span>
                {allTools && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {allTools.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Moderate tool listings, assign trusted lender badges, and remove violating entries.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 sm:hidden self-start italic">
              Swipe table horizontally →
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Tool Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Owner & Trust Status</th>
                    <th className="px-4 py-3 whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {allTools === undefined ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          <span>Loading community listings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : allTools.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No tool listings currently found in the system.
                      </td>
                    </tr>
                  ) : (
                    allTools.map((tool: any) => (
                      <tr key={tool._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {tool.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{tool.ownerName}</span>
                            <button
                              onClick={() =>
                                setTrustedLender({
                                  userId: tool.ownerId,
                                  isTrusted: !tool.isTrustedLender,
                                })
                              }
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold transition whitespace-nowrap ${
                                tool.isTrustedLender
                                  ? "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                              }`}
                            >
                              {tool.isTrustedLender ? "✓ Trusted Lender" : "Make Trusted"}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {tool.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              tool.status === "available"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            {tool.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => deleteTool({ toolId: tool._id })}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded font-medium transition"
                          >
                            Remove Listing
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 2: Global Loan Monitoring */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
                <span>Global Active Loans Audit</span>
                {allLoans && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {allLoans.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit system-wide equipment loans, due dates, and automated notification counts.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 sm:hidden self-start italic">
              Swipe table horizontally →
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Tool Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Borrower</th>
                    <th className="px-4 py-3 whitespace-nowrap">Lender</th>
                    <th className="px-4 py-3 whitespace-nowrap">Loan Dates</th>
                    <th className="px-4 py-3 whitespace-nowrap">Reminders</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {allLoans === undefined ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          <span>Loading global loans...</span>
                        </div>
                      </td>
                    </tr>
                  ) : allLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No active loans currently recorded across the neighborhood.
                      </td>
                    </tr>
                  ) : (
                    allLoans.map((loan: any) => (
                      <tr key={loan._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {loan.toolName}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {loan.borrowerName}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {loan.lenderName}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {loan.startDate} → {loan.endDate}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap font-mono">
                          {loan.reminderCount} sent
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full capitalize font-medium ${
                              loan.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : loan.status === "overdue"
                                ? "bg-rose-50 text-rose-700 font-semibold border border-rose-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
```

---

### Task 3: Execute Test Suite and Next.js Build
- **Estimated Time:** 3 minutes
- **Action:** Run unit assertions, RBAC audit, and Next.js compiler build.
- **Commands:**
```bash
# 1. Run admin responsive layout assertion suite
cd /root/lendloop && node tests/verify-admin-responsive.mjs

# 2. Run existing responsive layout suite to prevent regressions
cd /root/lendloop && node tests/verify-responsive-layout.mjs

# 3. Run RBAC audit suite
cd /root/lendloop && npm run test:rbac

# 4. Run Next.js production build check
cd /root/lendloop && npm run build
```
- **Expected Output:**
```
✓ Anti-enumeration security check preserved
✓ Table container overflow-x-auto check passed
✓ Minimum table width check passed
✓ whitespace-nowrap column check passed
✓ Responsive header check passed
All Admin Responsive Layout Tests Passed (5/5 checks).

All Responsive Layout Tests Passed Successfully (7/7 checks).
Audit Result: 7/7 checks passed.

✓ Compiled successfully
✓ Generating static pages (6/6)
```

---

### Task 4: Restart Daemon & Validate Live Mobile Viewport
- **Estimated Time:** 2 minutes
- **Action:** Restart Next.js production server daemon and verify HTTP response.
- **Commands:**
```bash
# Restart production Next.js instance
pkill -f "next-server" || true
cd /root/lendloop && nohup npm run start -p 3000 > /tmp/next-server.log 2>&1 &
sleep 2

# Verify local server response
curl -s -I http://localhost:3000/
```
- **Expected Output:**
```
HTTP/1.1 200 OK
```

---

## 5. Risks, Tradeoffs, and Mitigations
- **Scrollbar Appearance Across Browsers:**
  - *Risk:* Different mobile and desktop browsers render horizontal scrollbars differently, sometimes overlaying rounded card edges.
  - *Mitigation:* Placing `overflow-x-auto` on an inner `<div>` separate from the outer `rounded-xl border border-slate-200 overflow-hidden shadow-sm` card prevents scrollbars from bleeding past the card's boundary radius.
- **Data Truncation vs. Full Visibility:**
  - *Risk:* Compacting columns with `truncate` could hide critical moderation information like full tool names, borrower names, or dates.
  - *Mitigation:* Using explicit minimum widths (`min-w-[640px]`, `min-w-[700px]`) and `whitespace-nowrap` guarantees no data is hidden or broken; users simply swipe horizontally to inspect all columns in full fidelity.
- **Security Guard Preservation:**
  - *Risk:* Layout restructuring could accidentally displace or bypass `notFound()` checks.
  - *Mitigation:* Task 1 automated test explicitly asserts that `notFound()` and `viewer?.role !== "admin"` remain active at the top of the component.
