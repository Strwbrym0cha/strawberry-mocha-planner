import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const app=read('./app.js'),rooms=read('./rooms.js'),styles=read('./styles.css'),modalCss=read('./detailed-rooms.css'),money=read('./money.js'),moneyCss=read('./money.css'),lifestyle=read('./lifestyle-render.js'),lifestyleCss=read('./lifestyle.css');

assert.equal(app.includes("['review','🪷','Daily note']"),false,'Daily note has no separate navigation tab');
assert.equal(app.includes("['people','💕','My loves']"),false,'My Loves has no visible navigation tab');
for(const hook of ['data-daily-note-date','data-daily-note-calendar','Add today’s daily note'])assert.equal(`${app}\n${rooms}`.includes(hook),true,`${hook} keeps notes inside Schedule`);
assert.equal(rooms.includes("loadV5DailyNote(key)"),true,'calendar dates show whether a note exists');
assert.equal(app.includes("fields.date=form.dataset.noteDate||fields.date"),true,'daily notes save to the chosen calendar date');

for(const token of ['RECORD_OPTIONS',"isDate?'date'","isTime?'time'","isMoney?'0.01':'1'",'technicalKey'])assert.equal(app.includes(token),true,`generic saved-entry popup should use ${token}`);
for(const token of ['data-daily-task-edit','data-work-form','data-study-form','data-money-form','data-lifestyle-form'])assert.equal(app.includes(token),true,`${token} remains wired`);
for(const token of ['<select name="category"','name="dueDay" type="number" min="1" max="31" step="1"','<select name="autopay"','<select name="status"'])assert.equal(money.includes(token),true,`bill form keeps the proper control: ${token}`);
for(const token of ['type="date"','type="number" min="0" step="1"','<select name="status"','data-lifestyle-modal'])assert.equal(lifestyle.includes(token),true,`lifestyle popup standard includes ${token}`);
assert.equal(modalCss.includes('max-height:calc(100dvh - 28px)')&&modalCss.includes('.compact-record-modal'),true,'planner-wide modals are compact and viewport bounded');
assert.equal(lifestyleCss.includes('grid-template-columns:repeat(3,minmax(0,1fr))')&&lifestyleCss.includes('@media(max-width:780px)'),true,'iPad gets dense grids and phones collapse safely');
assert.equal(moneyCss.includes('max-height:330px')&&moneyCss.includes('overflow:auto'),true,'long Money lists scroll internally');
assert.equal(lifestyleCss.includes('.bounded-list')&&lifestyleCss.includes('overflow:auto'),true,'long lifestyle lists scroll internally');
assert.equal(/(?:from|url\(|href=)[^\n]*v17\//.test(`${app}\n${rooms}\n${money}\n${lifestyle}`),false,'Pass 5 imports no V17 presentation assets');
for(const selector of ['.sidebar{','.mode-switch{','body.mode-tiny','body.mode-power'])assert.equal(styles.includes(selector),true,`${selector} remains protected`);

console.log('V5 Pass 5 popup, calendar, and dense-layout tests passed');
