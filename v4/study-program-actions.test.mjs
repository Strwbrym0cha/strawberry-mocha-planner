import assert from 'node:assert/strict';
import fs from 'node:fs';
import {removeProgramFromEducation} from './study-program-actions.js';

const original={
  programs:[
    {id:'degree-1',name:"Bachelor's degree",completedClasses:[{id:'c1',name:'PSYC 101'}]},
    {id:'degree-2',name:'Certificate'}
  ],
  courses:[
    {id:'course-1',title:'Biology',programId:'degree-1'},
    {id:'course-2',title:'English',programId:'degree-2'},
    {id:'course-3',title:'Math'}
  ],
  sessions:[{id:'session-1'}]
};

const next=removeProgramFromEducation(original,'degree-1');
assert.deepEqual(next.programs.map(p=>p.id),['degree-2']);
assert.equal(next.courses.find(c=>c.id==='course-1').programId,'');
assert.equal(next.courses.find(c=>c.id==='course-2').programId,'degree-2');
assert.equal(next.courses.find(c=>c.id==='course-3').programId,undefined);
assert.deepEqual(next.sessions,original.sessions);
assert.equal(original.programs.length,2,'helper must not mutate original program array');
assert.equal(original.courses[0].programId,'degree-1','helper must not mutate original course');

const source=fs.readFileSync(new URL('./study-program-actions.js',import.meta.url),'utf8');
for(const action of ['edit','archive','delete']){
  assert.match(source,new RegExp(`data-study-program-quick-action=\\"${action}\\"`));
}
assert.match(source,/Archive this program\?/);
assert.match(source,/Delete this program permanently\?/);
assert.match(source,/form\[data-study-program-form="edit-program"\]/);

console.log('study-program-actions: PASS');
