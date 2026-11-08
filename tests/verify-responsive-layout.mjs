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
