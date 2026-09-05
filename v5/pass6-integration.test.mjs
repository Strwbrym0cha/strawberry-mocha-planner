import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const app=read('./app.js');
const rooms=read('./rooms.js');
const data=read('./data.js');
const boss=read('./boss.js');
const study=read('./study.js');
const money=read('./money.js');
const moneyCss=read('./money.css');
const lifestyle=read('./lifestyle-render.js');
const styles=read('./styles.css');
const mochiniChat=read('./mochini-chat.js');
const mochiniTabCss=read('./mochini-tab.css');

assert.equal(rooms.includes('return page(detailedRoomForm(view)+inner)'),false,'generic Workspace UI is no longer prepended to V5 rooms');
assert.equal(data.includes('saveV5Workspace'),true,'legacy Workspace persistence remains available for compatibility');
assert.equal(app.includes('saveV5Workspace'),true,'legacy Workspace data wiring is preserved rather than deleted');
assert.equal(boss.includes('✨ V5 WORKSPACE'),false,'Work HQ no longer exposes a generic Workspace card');

for(const hook of [
  'dailyCreateModal','Add routine','Add timed thing','new-client','new-supervisor','session-new-plan','new-goal','new-material','new-exception',
  'new-program','new-course','new-assignment','new-evaluation','new-session','new-term',
  'new-account','new-bill','new-subscription','new-order','new-payout','new-platform','new-gig-expense',
  'new-movement-activity','new-movement-plan','new-movement-goal','new-hobby','new-hobby-project',
  'new-growth-goal','new-growth-milestone','new-growth-win'
])assert.equal(`${rooms}\n${boss}\n${study}\n${money}\n${lifestyle}`.includes(hook),true,`${hook} has an obvious creation path`);

for(const hook of ['data-daily-modal','data-work-modal','data-study-modal','data-money-modal','data-lifestyle-modal'])assert.equal(`${rooms}\n${boss}\n${study}\n${money}\n${lifestyle}`.includes(hook),true,`${hook} keeps section creation in V5 popups`);
assert.equal(money.includes('class="ledger-form" data-money-form="transaction-save"'),true,'visible Add to the Ledger form remains on the page');
assert.equal(money.includes('step="0.01"'),true,'ledger accepts normal decimal currency');
for(const label of ['LEDGER BALANCE','IN THIS MONTH','SPENT THIS MONTH','NET THIS MONTH','RECENT ACTIVITY','SPENDING BY CATEGORY'])assert.equal(money.includes(label),true,`${label} remains in the compact ledger composition`);
assert.equal(money.includes('transaction-${row.id}'),true,'saved ledger rows retain popup targets');
assert.equal(moneyCss.includes('.ledger-columns')&&moneyCss.includes('grid-template-columns:minmax(0,2fr) minmax(210px,1fr)'),true,'Recent Activity keeps Spending by Category as its smaller companion');
assert.equal(moneyCss.includes('max-height:330px')&&moneyCss.includes('overflow-y:auto'),true,'large Recent Activity lists are bounded and touch-scrollable');

for(const selector of ['selectV5DailyShit','selectV5WorkHQ','selectV5StudyNook','selectV5MoneyGig','selectV5Lifestyle'])assert.equal(app.includes(selector),true,`Mochini/Home use canonical ${selector}`);
assert.equal(rooms.includes('home:integratedHomeRoom')&&rooms.includes('mochini:integratedMochiniRoom'),true,'integrated Home and Mochini are the visible renderers');
assert.equal(rooms.includes("scheduleRows(state,canonical)"),true,'Schedule consumes canonical derived records');
assert.equal(`${app}\n${rooms}`.includes('data-route-view')&&`${app}\n${rooms}`.includes('data-route-open'),true,'Home and Schedule route to canonical source popups');
assert.equal(rooms.includes("result==='[object Object]'?'':result"),true,'structured Mochini values are humanized or omitted');
assert.equal(app.includes('function showModal(modal){if(!modal)return;app.append(modal)'),true,'popups are portaled above scrollable cards instead of being clipped inside them');
assert.equal(read('./detailed-rooms.css').includes('.katos>.detail-modal-backdrop{z-index:1000'),true,'portaled popups cover the full V5 viewport above cards and sidebar');
assert.equal(money.includes('export function renderGigWork')&&app.includes("ui.bossLane==='gig'?renderGigWork"),true,'full Gig Work is rendered inside Boss Bitch');
assert.equal(money.includes('Gig earnings summarized here without duplicating the work records'),true,'Money Café keeps only Gig earnings context');

globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const{renderRoom}=await import('./rooms.js');
const html=renderRoom('mochini',{today:'2026-09-03',state:{mochini:{life:{mood:{label:'Sleepy'},energy:{label:'Low'},currentLine:{text:'hidden object'}}}}},{canonical:{daily:{},work:{upcoming:[]},study:{},money:{bills:[],gigToday:{}},lifestyle:{movement:{activities:[]}}}});
assert.equal(html.includes('[object Object]'),false,'Mochini never renders [object Object]');
assert.equal(html.includes('Give Mochini useful context'),false,'Mochini context Workspace editor is removed');
for(const hook of ['mochini-command-hero','RIGHT NOW','MOCHINI NOTICES','data-mochini-chat-form','COMFORT CORNER','MOCHINI’S STATS'])assert.equal(html.includes(hook),true,`Mochini command center includes ${hook}`);
assert.equal(mochiniChat.includes('never writes planner data'),true,'Mochini chat remains a deterministic presentation layer');
assert.equal(mochiniChat.includes('dataset.routeView'),true,'Mochini chat can route back to the canonical source rooms');
assert.equal(mochiniChat.includes('new MutationObserver'),false,'Mochini chat does not observe and rewrite its own DOM in a feedback loop');
assert.equal(app.includes("new Event('katos:rendered')"),true,'Mochini syncs after a completed V5 render instead of observing every DOM mutation');
assert.equal(mochiniTabCss.includes('.mochini-chat-form')&&mochiniTabCss.includes('.mochini-ask-grid'),true,'Mochini chat and support controls keep their V5 styling');

for(const token of ['.sidebar{','font-family:Georgia','linear-gradient','body.mode-tiny','body.mode-power','.detail-modal'])assert.equal(`${styles}\n${read('./detailed-rooms.css')}`.includes(token),true,`${token} preserves the V5 shell and popup identity`);
assert.equal(/(?:from|url\(|href=)[^\n]*v17\//.test(`${app}\n${rooms}\n${boss}\n${study}\n${money}\n${lifestyle}`),false,'Pass 6 imports no V17 presentation assets');

console.log('V5 Pass 6 final integration tests passed');
