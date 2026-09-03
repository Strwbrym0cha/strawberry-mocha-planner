import assert from'node:assert/strict';
import{existsSync,readFileSync}from'node:fs';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';

const folder=dirname(fileURLToPath(import.meta.url));
const index=readFileSync(resolve(folder,'index.html'),'utf8');
const app=readFileSync(resolve(folder,'app.js'),'utf8');
const styles=readFileSync(resolve(folder,'styles.css'),'utf8');
const daily=readFileSync(resolve(folder,'daily-shit.js'),'utf8');
const dailyCss=readFileSync(resolve(folder,'daily-shit.css'),'utf8');
const boss=readFileSync(resolve(folder,'boss.js'),'utf8');
const bossCss=readFileSync(resolve(folder,'boss.css'),'utf8');
const work=readFileSync(resolve(folder,'work-hq.js'),'utf8');
const modalCss=readFileSync(resolve(folder,'detailed-rooms.css'),'utf8');

for(const href of [...index.matchAll(/href="\.\/([^"?]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]))assert.equal(existsSync(resolve(folder,href)),true,`${href} should exist`);
assert.equal(index.includes('light-text.css'),false,'the orphaned stylesheet link should be gone');
for(const selector of ['.sidebar{','.topbar{','.mode-switch{','.detail-modal-backdrop{','body.mode-tiny','body.mode-power'])assert.equal(styles.includes(selector)||modalCss.includes(selector),true,`${selector} should remain in the V5 shell`);
for(const hook of ['data-mode="normal"','data-mode="tiny"','data-mode="power"','data-detail-open','data-detail-modal'])assert.equal(app.includes(hook),true,`${hook} should remain wired`);
assert.equal(/(?:from|href=)[^\n]*v17\//.test(`${index}\n${app}\n${styles}`),false,'V5 shell must not import the V17 presentation');
for(const hook of ['data-daily-open','data-daily-modal','data-daily-task-edit','data-daily-routine-edit'])assert.equal(`${app}\n${dailyCss}`.includes(hook),true,`${hook} should keep Daily Shit in V5 popups`);
assert.equal(dailyCss.includes('.daily-shit-row[data-daily-open]'),true,'Daily Shit rows should remain tappable V5 cards');
assert.equal(daily.includes('v17/'),false,'Daily Shit logic must not import the V17 presentation');
for(const hook of ['data-work-open','data-work-modal','data-work-form','data-work-close'])assert.equal(`${app}\n${boss}`.includes(hook),true,`${hook} should keep Work records in V5 popups`);
assert.equal(bossCss.includes('.work-open-card'),true,'saved Work cards remain visibly tappable');
assert.equal(modalCss.includes('max-height')&&modalCss.includes('overflow:auto'),true,'V5 modals remain viewport-bounded and scrollable');
assert.equal(`${boss}\n${bossCss}\n${work}`.includes('V5 • LIFE OS'),false,'the Codex-built V17 presentation shell is not copied into Work HQ');
assert.equal(/(?:from|url\(|href=)[^\n]*v17\//.test(`${boss}\n${bossCss}\n${work}`),false,'Work HQ must not import V17 presentation assets');
for(const label of ['BT / RLT','RBT exam','Use aliases/codes only'])assert.equal(boss.includes(label),true,`${label} should remain explicit in the Work HQ presentation`);

console.log('V5 shell preservation tests passed');
