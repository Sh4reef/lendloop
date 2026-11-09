import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const rootDir = process.cwd();

console.log("▶ Verifying generic loading implementation...");

// 1. Verify app/loading.tsx exists and exports default function Loading
const loadingPath = path.join(rootDir, "app/loading.tsx");
assert.ok(fs.existsSync(loadingPath), "app/loading.tsx must exist");
const loadingSrc = fs.readFileSync(loadingPath, "utf-8");
assert.match(loadingSrc, /export\s+default\s+function\s+Loading/, "app/loading.tsx must export default function Loading");
assert.match(loadingSrc, /animate-spin/, "app/loading.tsx must contain spinner (animate-spin)");
assert.match(loadingSrc, /Loading\.\.\./, "app/loading.tsx must contain generic 'Loading...' text");

// 2. Verify app/admin/page.tsx has no reconnaissance-leaking strings
const adminPath = path.join(rootDir, "app/admin/page.tsx");
const adminSrc = fs.readFileSync(adminPath, "utf-8");
assert.doesNotMatch(adminSrc, /administrator\s+privileges/i, "app/admin/page.tsx must not reveal admin status during loading");
assert.doesNotMatch(adminSrc, /Verifying/i, "app/admin/page.tsx must not contain bespoke 'Verifying...' string");
assert.match(adminSrc, /import\s+Loading\s+from\s+["']\.\.\/loading["']/, "app/admin/page.tsx must import Loading from ../loading");
assert.match(adminSrc, /<\s*Loading\s*\/>/, "app/admin/page.tsx must render <Loading />");
assert.match(adminSrc, /notFound\(\)/, "app/admin/page.tsx must preserve notFound() for unauthorized roles");

// 3. Verify app/dashboard/page.tsx uses generic Loading
const dashboardPath = path.join(rootDir, "app/dashboard/page.tsx");
const dashboardSrc = fs.readFileSync(dashboardPath, "utf-8");
assert.doesNotMatch(dashboardSrc, /Loading\s+LendLoop\s+dashboard/i, "app/dashboard/page.tsx must not use bespoke loading text");
assert.match(dashboardSrc, /import\s+Loading\s+from\s+["']\.\.\/loading["']/, "app/dashboard/page.tsx must import Loading from ../loading");
assert.match(dashboardSrc, /<\s*Loading\s*\/>/, "app/dashboard/page.tsx must render <Loading />");

console.log("✔ Generic loading verification passed!");
