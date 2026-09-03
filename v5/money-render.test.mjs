import assert from'node:assert/strict';
import{applyMoneyGigAction,selectMoneyGig}from'./money-gig.js';
import{renderMoney}from'./money.js';

const today='2026-09-03';
let state={life:{tasks:[]},work:{},money:{},v4:{archive:[]}};
const run=action=>{const result=applyMoneyGigAction(state,action,today);assert.equal(result.ok,true,result.error);state=result.state;return result.result};
const account=run({type:'account-save',name:'Cute Checking',accountType:'checking',openingBalance:200});
run({type:'transaction-save',transactionType:'expense',accountId:account.id,amount:12,date:today,merchant:'Lunch',status:'posted'});
const platform=state.work.gig.platforms.find(row=>row.name==='Shipt');
run({type:'order-save',platformId:platform.id,date:today,basePay:18,tip:7});
const view=selectMoneyGig(state,today),moneyHtml=renderMoney({today},view,'money'),gigHtml=renderMoney({today},view,'gig');
for(const hook of ['data-money-open="account-','data-money-open="transaction-','data-money-modal="account-','data-money-modal="transaction-'])assert.equal(moneyHtml.includes(hook),true,`${hook} should render`);
for(const hook of ['data-money-open="order-','data-money-open="platform-','data-money-modal="order-','data-money-modal="platform-'])assert.equal(gigHtml.includes(hook),true,`${hook} should render`);
assert.equal(`${moneyHtml}${gigHtml}`.includes('JSON.stringify'),false,'popups show human fields rather than developer-oriented JSON');
assert.equal(moneyHtml.includes('☕ Money Café')&&gigHtml.includes('⚡ Gig Work'),true,'both internal V5-native lanes remain easy to reach');
assert.equal(moneyHtml.includes('Cash flow')||moneyHtml.includes('CASH FLOW'),true,'today/week/month cash flow is presented compactly');

console.log('V5 Money Café + Gig Work presentation tests passed');
