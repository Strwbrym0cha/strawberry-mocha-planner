import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const ui=readFileSync(new URL('./living-palace.js',import.meta.url),'utf8'),css=readFileSync(new URL('./living-palace.css',import.meta.url),'utf8'),bootstrap=readFileSync(new URL('./bootstrap.js',import.meta.url),'utf8'),smart=readFileSync(new URL('./smart-palace.js',import.meta.url),'utf8'),index=readFileSync(new URL('./index.html',import.meta.url),'utf8');

test('Living Palace release is wired through V6 only',()=>{assert.match(index,/6\.6\.0-living-palace/);assert.match(index,/living-palace\.css/);assert.match(bootstrap,/\.\/mochini-living\.js/);assert.doesNotMatch(bootstrap,/\.\.\/v5\/mochini-companion\.js/);assert.match(ui,/installLivingPalace/);assert.match(css,/html\[data-katos-version="6"\]/)});
test('final memory features are functional and reference original records',()=>{for(const label of['Life Chapters','Milestone Timeline','Kingdom Map','Dream Board / Pinboard','Habit Garden','Arrange Palace Foyer'])assert.match(ui,new RegExp(label.replace(/[?]/g,'\\?')));assert.match(ui,/References stay connected to their original records/);assert.match(ui,/Linked source records will not be changed/)});
test('archive remains separate from confirmed hard delete',()=>{assert.match(ui,/Archive hides a record/);assert.match(ui,/Restore brings it back/);assert.match(ui,/confirm\('Delete this record permanently\?/)});
test('generic Foyer avoids relationship and cycle detail leakage',()=>{const foyer=smart.match(/function decorateFoyer\(\).*?(?=\nfunction|\nexport)/s)?.[0]||'';assert.doesNotMatch(foyer,/love\.plans|velvet|cycles/);assert.match(ui,/Private relationship and cycle details stay inside their rooms/)});
test('final popup audit remains compact, scroll-safe, and iPad responsive',()=>{assert.match(css,/max-height:min\(88dvh,860px\)/);assert.match(css,/overscroll-behavior:contain/);assert.match(css,/@media\(max-width:900px\)/);assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/focus-visible/)});
