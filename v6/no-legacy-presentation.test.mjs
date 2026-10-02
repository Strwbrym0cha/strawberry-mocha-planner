import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';

const read=name=>readFile(new URL(name,import.meta.url),'utf8');

test('Pass 1 rooms contain no legacy injection slots or catch-all drawers',async()=>{
 const files=await Promise.all(['./rooms/royal-duties.js','./rooms/royal-calendar.js','./rooms/crown-career.js'].map(read));
 for(const source of files){
  assert.doesNotMatch(source,/data-v6-slot|v6-native-card|v6-native-panel|v6-native-details/);
  assert.doesNotMatch(source,/Advanced controls|Full controls remain available|Full work records|Calendar details & editing/i);
 }
});

test('legacy DOM integration is limited to the explicitly deferred Pass 2 rooms',async()=>{
 const shell=await read('./command-shell.js');
 assert.match(shell,/LEGACY_PRESENTATION_VIEWS=new Set\(\['money','study'\]\)/);
 assert.doesNotMatch(shell,/if\(view==='daily'\)\{|if\(view==='boss'\)\{|if\(view==='time'&&/);
 assert.match(shell,/LEGACY_PRESENTATION_VIEWS\.has\(identity\)/);
 assert.match(shell,/carriageHouseMarkup[\s\S]*?\.replace\(\/<details class="v6-native-details"/);
});

test('Pass 1 controls open native Palace actions backed by canonical action APIs',async()=>{
 const[duties,calendar,career]=await Promise.all(['./rooms/royal-duties.js','./rooms/royal-calendar.js','./rooms/crown-career.js'].map(read));
 for(const token of ['runV5DailyAction','runV5HealthAction','data-v6-duty-form'])assert.match(duties,new RegExp(token));
 for(const token of ['saveV5Workspace','updateV5Record','archiveV5Record','data-v6-calendar-form'])assert.match(calendar,new RegExp(token));
 for(const token of ['runV5WorkAction','data-v6-career-form','SESSION HISTORY'])assert.match(career,new RegExp(token));
});
