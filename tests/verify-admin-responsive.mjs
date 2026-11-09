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
