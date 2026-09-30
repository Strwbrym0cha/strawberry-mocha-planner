import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const[index,bootstrap,command,intelligence,manifest,companion]=await Promise.all([['./index.html',import.meta.url],['./bootstrap.js',import.meta.url],['./command-shell.js',import.meta.url],['../v5/intelligence-upgrade.js',import.meta.url],['../v5/mochini-face-manifest.js',import.meta.url],['../v5/mochini-companion.js',import.meta.url]].map(([name,base])=>readFile(new URL(name,base),'utf8')));

test('V6 preserves the V5 visual and canonical feature modules',()=>{
 assert.match(index,/KatOS V6/);assert.match(index,/\.\.\/v5\/styles\.css/);assert.match(bootstrap,/\.\.\/v5\/app\.js/);assert.match(bootstrap,/mochini-approved-art\.js/);assert.match(bootstrap,/intelligence-upgrade\.js/);
});

test('V6 uses the narrow render lifecycle without an app-wide observer',()=>{
 assert.match(command,/katos:rendered/);assert.doesNotMatch(command,/MutationObserver/);assert.doesNotMatch(intelligence,/MutationObserver/);
});

test('V6 has a genuinely new Life Command Center information architecture',()=>{
 for(const label of['Today','My Week','Care & Routines','Work Studio','Money Café','School Lab','Fun Central','Mochini','Memory Box'])assert.match(command,new RegExp(label.replace(/[&]/g,'\\&')));
 for(const room of['v6-focus-stage','v6-week-board','v6-care-runway','v6-studio-lanes','v6-money-counter','v6-school-bench','v6-fun-picker','v6-memory-shelf'])assert.match(command,new RegExp(room));
 assert.match(command,/Open full calendar/);assert.match(command,/Enter RBT studio/);assert.match(command,/Enter gig studio/);
});

test('shared Mochini art resolves from the V5 module instead of the active document',()=>{
 assert.match(manifest,/new URL\(`/);assert.match(manifest,/import\.meta\.url/);assert.match(companion,/new URL\(`/);assert.match(companion,/import\.meta\.url/);
});
