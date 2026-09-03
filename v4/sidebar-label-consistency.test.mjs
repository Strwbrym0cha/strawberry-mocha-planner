import assert from 'node:assert/strict';
import fs from 'node:fs';

const meta = fs.readFileSync(new URL('./parts/app-08.txt', import.meta.url), 'utf8');
const preserve = fs.readFileSync(new URL('./preserve.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('./parts/app-01.txt', import.meta.url), 'utf8');

assert.match(meta, /const KATOS_PAGE_META\s*=\s*\{/);
assert.match(meta, /function applyKatosMeta\(\)\{document\.querySelectorAll\('\.nav-btn\[data-view\]'\)/,
  'sidebar labels are applied before page-specific metadata');
assert.ok(meta.indexOf("document.querySelectorAll('.nav-btn[data-view]')") < meta.indexOf("const spec=KATOS_PAGE_META[view]"),
  'unknown pages must not skip the canonical sidebar pass');
assert.match(meta, /item\.tab/);

for (const legacy of ['Home Sweet Home', 'Berry Busy', 'Sweet To-Dos', 'Little Pings', 'Day in Review']) {
  assert.doesNotMatch(preserve, new RegExp(`(?:textContent|innerHTML)[^\\n]*${legacy.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`),
    `preserve.js must not rewrite sidebar labels to ${legacy}`);
}
assert.match(meta, /data-view/);
assert.match(shell, /data-view="\$\{id\}"/);
assert.match(preserve, /pageTitle\(\)/);
assert.doesNotMatch(preserve, /querySelectorAll\('\.nav-btn/);

console.log('sidebar label consistency: PASS');
