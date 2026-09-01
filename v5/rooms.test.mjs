import assert from'node:assert/strict';
import{currentMonthBillTotal,roomMetrics}from'./rooms.js';

const today='2026-09-01';
const state={
  life:{
    tasks:[{id:'t1',text:'Open',done:false},{id:'t2',text:'Done',done:true}],
    reminders:[{id:'r1',title:'Open ping',completed:false},{id:'r2',title:'Done ping',completed:true}]
  },
  money:{bills:[
    {id:'b1',name:'September unpaid',amount:35,dueDate:'2026-09-15',paid:false},
    {id:'b2',name:'September paid',amount:10,dueDate:'2026-09-20',paid:true},
    {id:'b3',name:'October unpaid',amount:925,dueDate:'2026-10-01',paid:false},
    {id:'b4',name:'Recurring due day',amount:30,dueDay:5,paid:false},
    {id:'b5',name:'Undated mystery bill',amount:999,paid:false}
  ]}
};

assert.equal(currentMonthBillTotal(state,today),65);
assert.deepEqual(roomMetrics(state,today),{
  openTasks:1,
  openReminders:1,
  currentMonthBills:2,
  currentMonthBillTotal:65
});

console.log('V5 room metric tests passed');
