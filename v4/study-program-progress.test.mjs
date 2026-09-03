import assert from 'node:assert/strict';
import {normalizeProgram,programProgress,validTotalClasses} from './study-program-progress.js';

const legacy=normalizeProgram({id:'p1',name:"Bachelor's degree",status:'active',targetDate:'2028-05-01'});
assert.equal(legacy.name,"Bachelor's degree");
assert.equal(legacy.status,'active');
assert.equal(legacy.totalClasses,0);
assert.deepEqual(legacy.completedClasses,[]);
assert.deepEqual(programProgress(legacy),{completedCount:0,totalClasses:0,remainingCount:null,progressPercent:null});

const three={name:'Degree',totalClasses:40,completedClasses:[{id:'1',name:'PSYC 101'},{id:'2',name:'English Composition'},{id:'3',name:'Biology I'}]};
assert.deepEqual(programProgress(three),{completedCount:3,totalClasses:40,remainingCount:37,progressPercent:8});

const overflow={name:'Degree',totalClasses:2,completedClasses:[{name:'A'},{name:'B'},{name:'C'}]};
assert.deepEqual(programProgress(overflow),{completedCount:3,totalClasses:2,remainingCount:0,progressPercent:100});

const custom=normalizeProgram({name:'Degree',totalClasses:'42',completedClasses:[{title:'Transfer class',term:'Fall 2025'}],customField:'keep me'});
assert.equal(custom.totalClasses,42);
assert.equal(custom.completedClasses[0].name,'Transfer class');
assert.equal(custom.customField,'keep me');

assert.equal(validTotalClasses(''),true);
assert.equal(validTotalClasses('40'),true);
assert.equal(validTotalClasses('0'),true);
assert.equal(validTotalClasses('-1'),false);
assert.equal(validTotalClasses('3.5'),false);
assert.equal(validTotalClasses('nope'),false);

console.log('study-program-progress tests passed');
