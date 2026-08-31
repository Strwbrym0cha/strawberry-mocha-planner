import assert from'node:assert/strict';
import{adjustAccountBalance,applyLedgerEntryToAccounts,normalizeLedgerAccountLinks,syncPaycheckAccountBalance}from'./money-account-balance.js';

const base={money:{accounts:[{id:'capital',name:'Capital One',balance:0},{id:'other',name:'Other',balance:100}],ledger:[]}};
assert.equal(adjustAccountBalance(base,'capital',25).money.accounts[0].balance,25);
assert.equal(base.money.accounts[0].balance,0);

let state=applyLedgerEntryToAccounts(base,{kind:'income',amount:50,balanceAccountId:'other'},1);
assert.equal(state.money.accounts[1].balance,150);
state=applyLedgerEntryToAccounts(state,{kind:'expense',amount:20,balanceAccountId:'other'},1);
assert.equal(state.money.accounts[1].balance,130);
state=applyLedgerEntryToAccounts(state,{kind:'transfer',amount:30,balanceAccountId:'other',balanceToAccountId:'capital'},1);
assert.equal(state.money.accounts[1].balance,100);
assert.equal(state.money.accounts[0].balance,30);

const migrated=normalizeLedgerAccountLinks({money:{accounts:base.money.accounts,ledger:[{id:'l1',kind:'income',amount:10,accountId:'capital'}]}});
assert.equal(migrated.changed,true);
assert.equal(migrated.state.money.ledger[0].accountId,'');
assert.equal(migrated.state.money.ledger[0].balanceAccountId,'capital');
assert.equal(migrated.state.money.accounts[0].balance,0);

const paycheck={id:'p1',status:'received',received:true,receivedAmount:397.98,accountId:''};
const unassigned=syncPaycheckAccountBalance(base,paycheck,null);
assert.equal(unassigned.money.accounts[0].balance,0);

const assigned=syncPaycheckAccountBalance(base,{...paycheck,accountId:'other'},null);
assert.equal(assigned.money.accounts[1].balance,497.98);
const edited=syncPaycheckAccountBalance(assigned,{...paycheck,receivedAmount:400,accountId:'other'},{...paycheck,accountId:'other'});
assert.equal(edited.money.accounts[1].balance,500);
const moved=syncPaycheckAccountBalance(edited,{...paycheck,receivedAmount:400,accountId:'capital'},{...paycheck,receivedAmount:400,accountId:'other'});
assert.equal(moved.money.accounts[1].balance,100);
assert.equal(moved.money.accounts[0].balance,400);

console.log('money-account-balance tests passed');
