import assert from 'node:assert/strict';
import {linkCourseToProgram,setCourseCompletion} from './study-course-program-link.js';

const base={courses:[{id:'c1',title:'Workplace Communication',progress:80,status:'active'}],programs:[{id:'p1',name:"Bachelor's degree",completedClasses:[]},{id:'p2',name:'Other',completedClasses:[]}]};
let e=linkCourseToProgram(base,'c1','p1','2026-08-25');
assert.equal(e.courses[0].programId,'p1');
assert.equal(e.programs[0].completedClasses.length,0);
e=setCourseCompletion(e,'c1',true,'2026-08-25');
assert.equal(e.courses[0].status,'complete');
assert.equal(e.courses[0].progress,100);
assert.equal(e.programs[0].completedClasses.length,1);
assert.equal(e.programs[0].completedClasses[0].name,'Workplace Communication');
assert.equal(e.programs[0].completedClasses[0].courseId,'c1');
e=setCourseCompletion(e,'c1',true,'2026-08-25');
assert.equal(e.programs[0].completedClasses.length,1,'completion must be duplicate-safe');
e=linkCourseToProgram(e,'c1','p2','2026-08-25');
assert.equal(e.programs[0].completedClasses.length,0,'moving a linked completed course removes the auto entry from the old program');
assert.equal(e.programs[1].completedClasses.length,1,'moving a completed course syncs it into the new program');
e=setCourseCompletion(e,'c1',false,'2026-08-25');
assert.equal(e.courses[0].status,'active');
assert.equal(e.courses[0].progress,80);
assert.equal(e.programs[1].completedClasses.length,0);

const manual={courses:[{id:'c2',title:'English Composition',progress:100,status:'complete'}],programs:[{id:'p1',name:'Degree',completedClasses:[{id:'m1',name:'English Composition',term:'Spring 2026'}]}]};
const linked=linkCourseToProgram(manual,'c2','p1','2026-08-25');
assert.equal(linked.programs[0].completedClasses.length,1,'same-name manual history should be attached, not duplicated');
assert.equal(linked.programs[0].completedClasses[0].courseId,'c2');
const reopened=setCourseCompletion(linked,'c2',false,'2026-08-25');
assert.equal(reopened.programs[0].completedClasses.length,1,'manual completion history survives unlink/reopen');
assert.equal(reopened.programs[0].completedClasses[0].courseId,undefined);

console.log('study course/program linking tests: PASS');
