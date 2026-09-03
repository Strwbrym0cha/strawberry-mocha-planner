import assert from'node:assert/strict';
import{completeAction,createAction}from'./unified-actions.js';
import{publishStudyAction}from'./study-nook.js';
import{publishWorkAction}from'./work-hq.js';
import{addAccount,addGigOrder,addGigPayout,addGigPlatform,markGigPayoutPaid}from'./finance-engine.js';

let state={tasks:[],studyNook:{assignments:[{id:'touchstone',title:'Touchstone 3',status:'drafting'}]}};
const store={get:()=>state,update:change=>{state=change(state)},createAction:draft=>createAction(store,draft)};

publishStudyAction(store,{kind:'assignment',id:'touchstone',title:'Finish Touchstone 3',scheduledDate:'2026-09-02'});
publishStudyAction(store,{kind:'assignment',id:'touchstone',title:'Finish Touchstone 3',scheduledDate:'2026-09-02'});
assert.equal(state.tasks.length,1,'Study action uses a stable external ID');
completeAction(store,state.tasks[0].id,'2026-09-02');
assert.equal(state.studyNook.assignments.length,1,'Completing Daily Shit action preserves assignment');

publishWorkAction(store,{kind:'session-prep',id:'session-1',title:'Pack session materials',scheduledDate:'2026-09-02'});
publishWorkAction(store,{kind:'session-prep',id:'session-1',title:'Pack session materials',scheduledDate:'2026-09-02'});
assert.equal(state.tasks.filter(item=>item.source==='rbt').length,1,'Work action uses a stable external ID');

let financial={finance:{}};
let result=addAccount(financial,{id:'checking',name:'Checking',type:'checking'});financial=result.state;
result=addGigPlatform(financial,{id:'shipt',name:'Shipt'});financial=result.state;
result=addGigOrder(financial,{id:'order-1',platformId:'shipt',date:'2026-09-02',basePay:20,tip:5,status:'completed'});financial=result.state;
assert.equal(financial.finance.ledger.length,0,'Gig earnings do not alter accounts before payout');
result=addGigPayout(financial,{id:'payout-1',platformId:'shipt',orderIds:['order-1'],payoutAmount:25,destinationAccountId:'checking'});financial=result.state;
result=markGigPayoutPaid(financial,'payout-1',{accountId:'checking',date:'2026-09-02'});financial=result.state;
assert.equal(financial.finance.ledger.length,1,'A payout creates one received-income ledger entry');
result=markGigPayoutPaid(financial,'payout-1',{accountId:'checking',date:'2026-09-02'});financial=result.state;
assert.equal(financial.finance.ledger.length,1,'Repeated payout confirmation does not duplicate deposit');
console.log('V5 cross-module integration tests: PASS');
