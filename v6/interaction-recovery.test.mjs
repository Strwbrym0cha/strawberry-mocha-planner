import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const[source,modal,css,career]=await Promise.all([
 readFile(new URL('./command-shell.js',import.meta.url),'utf8'),
 readFile(new URL('./rooms/native-modal.js',import.meta.url),'utf8'),
 readFile(new URL('./pass1-native.css',import.meta.url),'utf8'),
 readFile(new URL('./rooms/crown-career.js',import.meta.url),'utf8')
]);

test('interaction recovery inspects body-level overlays and clears global locks',()=>{
 assert.match(source,/document\.querySelectorAll\('\.detail-modal-backdrop'\)/);
 assert.match(source,/rect\.bottom<=0\|\|rect\.top>=innerHeight/);
 assert.match(source,/document\.documentElement\.style\.pointerEvents=''/);
 assert.match(source,/app\.removeAttribute\('inert'\)/);
 assert.match(source,/document\.addEventListener\('touchstart',recoverOnContact/);
 assert.match(source,/document\.elementFromPoint\(clientX,clientY\)/);
 assert.match(source,/queueMicrotask\(\(\)=>control\.isConnected&&control\.click\(\)\)/);
});

test('Palace navigation closes transient surfaces before changing rooms',()=>{
 assert.match(source,/function closeTransientSurfaces\(\)/);
 assert.match(source,/querySelectorAll\('\.detail-modal-backdrop,\.sidebar-backdrop'\)/);
 assert.match(source,/if\(palaceNav\)\{closeTransientSurfaces\(\)/);
 assert.match(source,/if\(route&&!palaceNav\)\{closeTransientSurfaces\(\)/);
});

test('room render failures preserve a clickable native recovery surface',()=>{
 assert.match(source,/catch\(error\).*data-v6-retry-room/s);
 assert.match(source,/const retryRoom=event\.target\.closest\('\[data-v6-retry-room\]'\)/);
});

test('native modal close removes duplicates and releases locks when no dialog remains',()=>{
 assert.match(modal,/querySelectorAll\('\[data-v6-native-modal\]'\)\.forEach/);
 assert.match(modal,/releaseInteractionLocks/);
 assert.match(modal,/document\.body\.style\.pointerEvents=''/);
});

test('hidden backdrops and closed Mochini bubbles cannot intercept touches',()=>{
 assert.match(css,/detail-modal-backdrop\[hidden\].*pointer-events:none!important/);
 assert.match(css,/mc-bubble:not\(\.is-open\)\{pointer-events:none!important\}/);
 assert.match(css,/v6-overview-mode>\.v6-source-section.*pointer-events:none!important/);
});

test('Crown and Career rejects malformed legacy display rows without locking the Palace',()=>{
 assert.match(career,/const objects=value=>list\(value\)\.filter/);
 assert.match(career,/function careerFailure\(error\)/);
 assert.match(career,/function openCareer\(kind,source\)\{try\{/);
 assert.match(career,/objects\(work\.hq\?\.clients\)/);
 assert.doesNotMatch(career,/work\.hq\.clients\.find/);
 assert.doesNotMatch(career,/row\.label\|\|row/);
});
