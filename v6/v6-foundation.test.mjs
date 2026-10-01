import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const[index,bootstrap,command,palace,intelligence,manifest,companion]=await Promise.all([['./index.html',import.meta.url],['./bootstrap.js',import.meta.url],['./command-shell.js',import.meta.url],['./palace.css',import.meta.url],['../v5/intelligence-upgrade.js',import.meta.url],['../v5/mochini-face-manifest.js',import.meta.url],['../v5/mochini-companion.js',import.meta.url]].map(([name,base])=>readFile(new URL(name,base),'utf8')));

test('V6 preserves the V5 visual and canonical feature modules',()=>{
 assert.match(index,/KatOS V6/);assert.match(index,/\.\.\/v5\/styles\.css/);assert.match(bootstrap,/\.\.\/v5\/app\.js/);assert.match(bootstrap,/mochini-approved-art\.js/);assert.match(bootstrap,/intelligence-upgrade\.js/);
 assert.ok(bootstrap.indexOf('./command-shell.js')<bootstrap.indexOf('intelligence-upgrade.js'),'V6 shell must mount before optional enhancements');
});

test('V6 uses render events without app-wide mutation observers',()=>{
 assert.match(command,/katos:v6-refresh/);assert.match(command,/katos:rendered/);assert.match(command,/pageshow/);assert.match(command,/recoverInteractivity/);assert.doesNotMatch(command,/MutationObserver/);assert.doesNotMatch(intelligence,/MutationObserver/);
});

test('V6 has a genuinely new Life Command Center information architecture',()=>{
 for(const label of['Palace Foyer','Royal Duties','Royal Calendar','Bell Tower','Crown & Career','Carriage House','Scholar’s Tower','Royal Treasury','Rose Garden','Moon Garden','Love Letters','Wishing Tower','Keepsake Chest','Royal Archives','Mochini'])assert.match(command,new RegExp(label.replace(/[&]/g,'\\&')));
 for(const room of['v6-foyer-primary','v6-foyer-secondary','v6-calendar-primary','v6-duty-command-strip','v6-duty-main','v6-career-layout','v6-treasury-band','v6-scholar-columns','v6-fun-picker','v6-memory-shelf'])assert.match(command,new RegExp(room));
 assert.match(command,/integrateSource/);assert.match(command,/data-v6-slot/);assert.match(command,/data-duty-later/);assert.match(command,/COURSE PATH/);assert.match(command,/More Treasury tools/);assert.match(command,/money right now\|balance/);
 assert.match(command,/existing\.dataset\.v6Room===identity/);assert.match(command,/\['accounts','goals','ledger'\]\.includes\(target\).*classList\.remove\('tiny-hide'\)/);assert.match(command,/treasuryOpen=.*\[data-v6-room="money"\].*\[data-money-open\]/);assert.match(command,/adaptiveGoals:list\(roomStore\.load/);assert.match(command,/data-flex-shift-form.*data-doordash-shift-form.*data-money-form.*data-smart-form/);assert.match(command,/data-flex-plan-open/);assert.match(command,/data-doordash-plan-open/);assert.match(command,/data-gig-checkin-modal/);assert.match(command,/data-flex-shift-modal/);assert.match(index,/6\.8\.0-palace-batch1/);assert.match(command,/archiveV5Record\('work\.gig\.goals'/);assert.match(command,/smart-palace\.js\?v=6\.7\.7-adaptive-goal-archive/);
 assert.doesNotMatch(command,/DETAIL_KEY/);assert.doesNotMatch(command,/showDetail/);
});

test('V6 Palace styling is centralized and scoped away from V5',()=>{
 assert.match(index,/palace\.css/);assert.match(index,/The Palace/);
 for(const token of['--v6-pearl:#fff9fd','--v6-ballet:#f8c8dc','--v6-strawberry:#f5afc9','--v6-lavender:#d9c4f5','--v6-violet:#b99be8','--v6-matcha:#bfd6aa'])assert.match(palace,new RegExp(token));
 assert.match(palace,/html\[data-katos-version="6"\]/);assert.match(command,/6\.8\.0 · Palace Batch 1/);assert.match(command,/renderNewRoom/);assert.match(command,/decorateSmartPalace/);assert.match(command,/decorateLivingPalace/);
});

test('shared Mochini art resolves from the V5 module instead of the active document',()=>{
 assert.match(manifest,/new URL\(`/);assert.match(manifest,/import\.meta\.url/);assert.match(companion,/new URL\(`/);assert.match(companion,/import\.meta\.url/);
});
