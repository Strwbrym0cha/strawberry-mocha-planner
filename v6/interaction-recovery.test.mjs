import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const[source,modal,css]=await Promise.all([
 readFile(new URL('./command-shell.js',import.meta.url),'utf8'),
 readFile(new URL('./rooms/native-modal.js',import.meta.url),'utf8'),
 readFile(new URL('./pass1-native.css',import.meta.url),'utf8')
]);

test('interaction recovery inspects body-level overlays and clears global locks',()=>{
 assert.match(source,/document\.querySelectorAll\('\.detail-modal-backdrop'\)/);
 assert.match(source,/rect\.bottom<=0\|\|rect\.top>=innerHeight/);
 assert.match(source,/document\.documentElement\.style\.pointerEvents=''/);
 assert.match(source,/app\.removeAttribute\('inert'\)/);
});

test('native modal close removes duplicates and releases locks when no dialog remains',()=>{
 assert.match(modal,/querySelectorAll\('\[data-v6-native-modal\]'\)\.forEach/);
 assert.match(modal,/releaseInteractionLocks/);
 assert.match(modal,/document\.body\.style\.pointerEvents=''/);
});

test('hidden backdrops and closed Mochini bubbles cannot intercept touches',()=>{
 assert.match(css,/detail-modal-backdrop\[hidden\].*pointer-events:none!important/);
 assert.match(css,/mc-bubble:not\(\.is-open\)\{pointer-events:none!important\}/);
});
