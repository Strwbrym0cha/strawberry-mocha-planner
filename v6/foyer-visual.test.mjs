import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const[command,styles,index,scene]=await Promise.all([
 ['./command-shell.js','utf8'],['./foyer-visual.css','utf8'],['./index.html','utf8'],['./assets/foyer-right-now-scene.png',null]
].map(([file,encoding])=>readFile(new URL(file,import.meta.url),encoding)));

test('Palace Foyer follows the approved asymmetrical hierarchy',()=>{
 for(const region of['v6-foyer-header','v6-daily-ribbon','v6-foyer-primary','v6-foyer-right-now','v6-foyer-support-stack','v6-foyer-next','v6-foyer-flavor','v6-foyer-secondary','v6-foyer-today','v6-foyer-wins','v6-foyer-thought','v6-foyer-around'])assert.match(command,new RegExp(region));
 assert.match(styles,/\.v6-foyer-primary\{display:grid;grid-template-columns:minmax\(0,var\(--v6-feature-ratio\)\) minmax\(260px,var\(--v6-support-ratio\)\)/);
 assert.match(styles,/\.v6-foyer-secondary\{display:grid;grid-template-columns:minmax\(0,1\.32fr\) minmax\(300px,1fr\)/);
 assert.match(styles,/\.v6-foyer-utility-stack\{display:grid;grid-template-columns:1fr;grid-template-rows:1\.12fr \.88fr/);
 assert.match(command,/v6-foyer-scene/);
 assert.ok(scene.length>100000,'Right Now scene should be a real project asset');
});

test('Foyer layout tokens are V6 scoped and the live app loads the final layer',()=>{
 for(const token of['--v6-canvas-max','--v6-gap-sm','--v6-gap-md','--v6-card-pad-sm','--v6-card-pad-lg','--v6-header-height','--v6-dock-height','--v6-mochini-reserve','--v6-feature-ratio','--v6-support-ratio'])assert.match(styles,new RegExp(token));
 assert.match(styles,/html\[data-katos-version="6"\]\{/);
 assert.match(index,/foyer-visual\.css\?v=6\.7\.16-foyer-parity/);
});

test('Daily Ribbon and support cards use real data fallbacks instead of invented times',()=>{
 for(const label of['CAPACITY','DAY TYPE','NEXT','PREP','LEAVE','Not entered','Nothing fixed'])assert.match(command,new RegExp(label));
 assert.match(command,/enteredPrepMinutes/);
 assert.match(command,/leaveTime:text\(row\.leaveTime\|\|row\.leaveBy\)/);
 assert.doesNotMatch(command,/drive time|commute/i);
});

test('Foyer actions preserve the popup-first and Palace navigation contracts',()=>{
 assert.match(command,/data-smart-action="brain"/);
 assert.match(command,/data-foyer-anchor="right-now"/);
 assert.match(command,/data-v6-nav="bell-tower"/);
 assert.match(command,/data-v6-nav="royal-archives"/);
 assert.match(command,/data-foyer-preview-modal/);
 assert.match(command,/data-foyer-tiny-win/);
 assert.match(command,/runV5LifestyleAction\(\{type:'growth-win-save'/);
 assert.match(command,/stopImmediatePropagation\(\)/);
});

test('iPad portrait fallback stacks hierarchy without a page-level horizontal layout',()=>{
 assert.match(styles,/@media\(max-width:860px\)/);
 assert.match(styles,/\.v6-foyer-primary,html\[data-katos-version="6"\] \.v6-foyer-secondary\{grid-template-columns:1fr\}/);
 assert.match(styles,/\.v6-foyer-around>div\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);padding-bottom:var\(--v6-mochini-reserve\)/);
 assert.doesNotMatch(styles,/\bblue\b|#00f|#06f|#09f|#0af|#1e90ff/i);
});
