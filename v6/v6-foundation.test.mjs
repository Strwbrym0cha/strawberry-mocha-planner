import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const[index,bootstrap,adaptive,intelligence]=await Promise.all([['./index.html',import.meta.url],['./bootstrap.js',import.meta.url],['./adaptive-day.js',import.meta.url],['../v5/intelligence-upgrade.js',import.meta.url]].map(([name,base])=>readFile(new URL(name,base),'utf8')));

test('V6 preserves the V5 visual and canonical feature modules',()=>{
 assert.match(index,/KatOS V6/);assert.match(index,/\.\.\/v5\/styles\.css/);assert.match(bootstrap,/\.\.\/v5\/app\.js/);assert.match(bootstrap,/mochini-approved-art\.js/);assert.match(bootstrap,/intelligence-upgrade\.js/);
});

test('V6 uses the narrow render lifecycle without an app-wide observer',()=>{
 assert.match(adaptive,/katos:rendered/);assert.doesNotMatch(adaptive,/MutationObserver/);assert.doesNotMatch(intelligence,/MutationObserver/);assert.match(adaptive,/ADAPTIVE LAUNCH PAD/);assert.match(adaptive,/V6 DAY PULSE/);
});
