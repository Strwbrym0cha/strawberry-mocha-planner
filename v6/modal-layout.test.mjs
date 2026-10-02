import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const css=await readFile(new URL('./pass1-native.css',import.meta.url),'utf8');
const index=await readFile(new URL('./index.html',import.meta.url),'utf8');

test('V6 owns shared popup gutters without changing V5 styles',()=>{
 assert.match(css,/html\[data-katos-version="6"\] \.detail-modal\{/);
 assert.match(css,/--v6-modal-gutter/);
 assert.match(css,/\.detail-modal \.v6-popup-header/);
 assert.match(css,/label:not\(\.daily-field\):not\(\.money-field\)\{grid-column:span 6/);
 assert.match(css,/label\.wide:not\(\.daily-field\):not\(\.money-field\)\{grid-column:1\/-1/);
 assert.match(css,/\.v6-room-modal-backdrop\{[^}]*position:fixed!important/);
 assert.match(css,/\.v6-room-form-grid\{display:grid;grid-template-columns:repeat\(2/);
 assert.doesNotMatch(index,/modal-layout\.css/);
});

test('V6 popup families retain bounded viewport widths',()=>{
 for(const selector of['.v6-native-action-modal','.v6-kitchen-modal .detail-modal','.v6-room-modal','.v6-smart-modal'])assert.ok(css.includes(selector),`missing popup width override for ${selector}`);
 assert.match(css,/calc\(100vw - 28px\)/);
});
