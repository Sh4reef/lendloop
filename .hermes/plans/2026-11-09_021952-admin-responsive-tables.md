# Implementation Plan: Admin Route Responsive Layout & Scrollable Tables

**Saved Path:** `.hermes/plans/2026-11-09_021952-admin-responsive-tables.md`  
**Created At:** 2026-11-09T02:19:52+01:00  
**Target Repository:** `/root/lendloop`  

---

## 1. Goal
Enable horizontal touch-scrolling on all administrative data tables and make the `/admin` control center fully responsive on mobile and narrow viewports without column clipping.

---

## 2. Current Context & Assumptions
- **File:** `app/admin/page.tsx`
- **Current Layout Flaws:**
  - Data table wrappers use `overflow-hidden` rather than `overflow-x-auto` (`<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">`).
  - Tables use `className="w-full text-left text-sm"` without `min-w-[...]` constraints.
  - On viewports <768px, the 5-column listings table and 6-column global loans table compress into narrow, illegible columns, and overflow content is clipped with zero scroll capability.
  - Table cells lack `whitespace-nowrap`, causing button labels (like `✓ Trusted Lender` and `Remove Listing`) to break into awkward multi-line text chunks.
  - No visual loading skeleton or empty-state feedback when `allTools` or `allLoans` are undefined or empty.
- **Security & Route Protection:**
  - Route returns Next.js `notFound()` for unauthorized callers (`viewer?.role !== "admin"`). This anti-enumeration behavior must be preserved intact.

---

## 3. Architecture & Proposed Approach
- **Horizontal Scroll Architecture:** Replace `overflow-hidden` on table card wrappers with `overflow-x-auto` and explicit minimum table widths (`min-w-[640px]` for tool listings, `min-w-[700px]` for global loans) to prevent column squeezing.
- **Cell Integrity:** Apply `whitespace-nowrap` across all `<th>` and `<td>` elements, ensuring status badges, dates, and mutation buttons remain single-line and easily tappable.
- **Responsive Header & Empty States:** Add a responsive return button (`Dashboard`), mobile-friendly padding (`px-3 sm:px-4`), and graceful `colSpan` empty/loading state indicators when queries resolve empty or are pending.

---

## 4. Step-by-Step Tasks

### Task 1: Create Admin Responsive Verification Suite (TDD)
- **File:** `tests/verify-admin-responsive.mjs`
- **Estimated Time:** 3 minutes
- **Action:** Create an automated assertion test verifying that `app/admin/page.tsx` includes `overflow-x-auto` table containers, minimum width classes (`min-w-`), `whitespace-nowrap` cells, and preserves the `notFound()` anti-enumeration guard.
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

// 2. Assert table wrappers have overflow-x-auto (not overflow-hidden)
assert(
  content.includes('overflow-x-auto') && !content.includes('border border-slate-200 overflow-hidden'),
  'app/admin/page.tsx table containers must use overflow-x-auto instead of overflow-hidden'
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

- **Verification Command (Expect Failure Initially):**
```bash
node tests/verify-admin-responsive.mjs
```
- **Expected Output:**
```
AssertionError [ERR_ASSERTION]: app/admin/page.tsx table containers must use overflow-x-auto instead of overflow-hidden
```

---

### Task 2: Update Admin Page Layout & Tables (`app/admin/page.tsx`)
- **File:** `app/admin/page.tsx`
- **Estimated Time:** 5 minutes
- **Action:**
  1. Update header to include a responsive back link to dashboard with icon and label.
  2. Replace table container wrappers with `overflow-x-auto shadow-sm`.
  3. Add `min-w-[640px]` on listings table and `min-w-[700px]` on global loans table.
  4. Add `whitespace-nowrap` to headers and cells.
  5. Add loading skeletons and empty state table rows (`colSpan={5}` and `colSpan={6}`).
- **Complete Replacement Code:**

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ArrowLeft, Wrench, Users, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminPage() {
  const viewer = useQuery(api.users.getViewer);
  const allLoans = useQuery(api.loans.getAllLoans);
  const allTools = useQuery(api.tools.listTools, {});
  const deleteTool = useMutation(api.tools.deleteTool);
  const setTrustedLender = useMutation(api.users.setTrustedLender);

  if (viewer === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="h-8 w-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
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
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10 flex-1 w-full">
        {/* Section 1: Manage Listings */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                Community Listings Moderation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Moderate tool listings, assign trusted lender badges, and remove violating entries.
              </p>
            </div>
            <span className="text-xs text-slate-400 self-start sm:self-auto italic">
              Scroll horizontally on small screens →
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
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
                      Loading community listings...
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
        </section>

        {/* Section 2: Global Loan Monitoring */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
                Global Active Loans Audit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit system-wide equipment loans, due dates, and automated notification counts.
              </p>
            </div>
            <span className="text-xs text-slate-400 self-start sm:self-auto italic">
              Scroll horizontally on small screens →
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
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
                      Loading global loans...
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
        </section>
      </main>
    </div>
  );
}
```

---

### Task 3: Execute Verification Suite & Production Build
- **Estimated Time:** 3 minutes
- **Action:** Run unit layout assertions and Next.js compiler build.
- **Commands:**
```bash
# 1. Run layout assertion suite
node tests/verify-admin-responsive.mjs

# 2. Run Next.js production build check
npm run build
```
- **Expected Output:**
```
✓ Anti-enumeration security check preserved
✓ Table container overflow-x-auto check passed
✓ Minimum table width check passed
✓ whitespace-nowrap column check passed
✓ Responsive header check passed
All Admin Responsive Layout Tests Passed (5/5 checks).
✓ Compiled successfully
✓ Generating static pages (6/6)
```

---

### Task 4: Restart Daemon & Validate Live Mobile Viewport
- **Estimated Time:** 2 minutes
- **Action:** Restart Next.js production server background process and verify HTTP 200 response.
- **Commands:**
```bash
# Identify and restart server
pkill -f "next-server" || true
cd /root/lendloop && npm run start -p 3000 > /tmp/next-server.log 2>&1 &

# Query server
curl -s -I http://localhost:3000/
```
- **Expected Output:** `HTTP/1.1 200 OK`

---

## 5. Risks, Tradeoffs, and Mitigations
- **Table Shadow & Rounded Corner Clipping:**
  - *Risk:* Using `overflow-x-auto` on a container with `rounded-xl` can sometimes cause child table headers or scrollbars to clash with corners on older WebKit browsers.
  - *Mitigation:* Apply background color and subtle border on the scrolling container itself (`bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm`), keeping the table seamless inside.
- **Unauthorized Access Leakage:**
  - *Risk:* Modifying component markup could accidentally alter authorization evaluation or SSR behavior.
  - *Mitigation:* Explicitly preserve `if (viewer?.role !== "admin") { notFound(); }` as the first guard before rendering any JSX, verified in Task 1.
