import{archiveV5Record,localDateKey,runV5MoneyGigAction,saveV5GigShift,selectV5MoneyGig,snapshotV4,updateV5Record}from'./data.js?v=7.0.14-flex-shift-planner';

const app=document.getElementById('app');
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>`$${(Number(value)||0).toFixed(2)}`;
const getView=()=>selectV5MoneyGig(localDateKey());
const flex=view=>view.gig.platforms.find(row=>/amazon\s*flex|^flex$/i.test(row.name||''));
const isFlex=row=>/amazon\s*flex|\bflex\b/i.test(row?.source||row?.platform||row?.label||row?.shiftLabel||'');
const planRows=()=>list(snapshotV4()?.state?.work?.gigShifts).filter(row=>isFlex(row)&&!row?.archivedAt);
const planById=id=>planRows().find(row=>String(row.id)===String(id));
const summaryRows=view=>{const platform=flex(view);return view.gig.orders.filter(row=>(row?.entryMode==='shift'||row?.aggregateShift===true)&&(platform?String(row.platformId)===String(platform.id):isFlex(row)))};
const summaryById=(view,id)=>summaryRows(view).find(row=>String(row.id)===String(id));
const summaryForPlan=(view,plan)=>summaryById(view,plan?.summaryOrderId)||summaryRows(view).find(row=>String(row?.plannedShiftId)===String(plan?.id));
const formatDate=value=>{if(!value)return'Date not set';const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})};
const formatTime=value=>{if(!/^\d{1,2}:\d{2}$/.test(text(value)))return'';const[hours,minutes]=value.split(':').map(Number),date=new Date;date.setHours(hours,minutes,0,0);return date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const timeRange=row=>[formatTime(row?.startTime),formatTime(row?.endTime)].filter(Boolean).join(' – ')||'Time not set';

function ensureFlexPlatform(){
 const found=flex(getView());if(found)return{ok:true,result:found};
 return runV5MoneyGigAction({type:'platform-save',name:'Amazon Flex',icon:'📦',active:true,notes:'Used by the Flex Shift Planner.'});
}

function plannerModal(plan={},summary={}){
 const hasPlan=Boolean(plan.id),completed=plan.status==='completed'||Boolean(summary.id),expected=plan.targetAmount??summary.basePay??'',actual=summary.basePay??plan.actualAmount??plan.targetAmount??'';
 return`<div class="detail-modal-backdrop money-modal flex-shift-modal" data-flex-shift-modal><section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="flex-shift-title"><div class="detail-modal-head"><div><div class="ey">📦 AMAZON FLEX BLOCK</div><h2 id="flex-shift-title">${hasPlan?'Plan + block summary':'Plan an Amazon Flex block'}</h2><p>${hasPlan?'The same block stays on Schedule until you finish its summary.':'Save the block as soon as you pick it up. Add the package details after delivery.'}</p></div><button type="button" class="detail-modal-close" data-flex-shift-close aria-label="Close Amazon Flex block">×</button></div><form data-flex-shift-form data-plan-id="${esc(plan.id||'')}" data-summary-id="${esc(summary.id||'')}"><section class="flex-stage"><div class="flex-stage-head"><span>1</span><div><b>Plan the block</b><small>This is what appears on Schedule.</small></div></div><div class="room-detail-fields"><label class="money-field"><span>Date</span><input name="date" type="date" value="${esc(plan.date||summary.date||localDateKey())}" required></label><label class="money-field"><span>Start time</span><input name="startTime" type="time" value="${esc(plan.startTime||summary.startTime||'')}" required></label><label class="money-field"><span>End time</span><input name="endTime" type="time" value="${esc(plan.endTime||summary.endTime||'')}" required></label><label class="money-field"><span>Expected pay</span><input name="targetAmount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${esc(expected)}" required></label><label class="money-field"><span>Station · optional</span><input name="station" value="${esc(plan.station||summary.station||'')}" placeholder="Example: DNO2"></label><label class="money-field"><span>Delivery area · optional</span><input name="area" value="${esc(plan.area||summary.deliveryArea||'')}" placeholder="City, neighborhood, or route area"></label><label class="money-field wide"><span>Plan notes · optional</span><textarea name="planNote" rows="2" placeholder="Check-in reminder, route note…">${esc(plan.note||'')}</textarea></label></div><div class="button-row daily-actions"><button class="btn ${hasPlan?'soft':'primary'}" name="intent" value="plan">${hasPlan?'Update plan':'📦 Save Flex block'}</button></div></section>${hasPlan||summary.id?`<section class="flex-stage flex-summary-stage"><div class="flex-stage-head"><span>2</span><div><b>Fill in the delivery summary</b><small>Complete this after the block. It updates Gig Work earnings.</small></div></div><div class="room-detail-fields"><label class="money-field"><span>Actual pay</span><input name="actualPay" type="number" min="0.01" step="0.01" inputmode="decimal" value="${esc(actual)}" required></label><label class="money-field"><span>Packages</span><input name="packageCount" type="number" min="0" step="1" inputmode="numeric" value="${esc(summary.packageCount??plan.packageCount??'')}"></label><label class="money-field"><span>Mileage · optional</span><input name="mileage" type="number" min="0" step="0.1" value="${esc(summary.mileage??'')}"></label><label class="money-field wide"><span>Summary notes · optional</span><textarea name="summaryNotes" rows="2">${esc(summary.notes||'')}</textarea></label></div><div class="flex-total"><span>Actual block pay</span><b data-flex-total>${money(actual)}</b></div><div class="button-row daily-actions"><button class="btn primary" name="intent" value="summary">✓ Save completed block</button>${completed?'<span class="flex-complete-note">This block already has a summary. You can correct it here.</span>':''}</div></section>`:''}<div class="flex-error" data-flex-error aria-live="polite"></div><div class="button-row daily-actions">${hasPlan?'<button type="button" class="btn soft" data-flex-archive>📦 Archive block</button>':''}<button type="button" class="btn soft" data-flex-shift-close>Close</button></div></form></section></div>`;
}

function open(plan={},summary={}){app.querySelector('[data-flex-shift-modal]')?.remove();app.insertAdjacentHTML('beforeend',plannerModal(plan,summary));app.querySelector('[data-flex-shift-modal] input')?.focus()}
function close(){app.querySelector('[data-flex-shift-modal]')?.remove()}
function rerender(){app.querySelector('[data-boss-lane="gig"]')?.click()}
function plannerCard(){
 const today=localDateKey(),pending=planRows().filter(row=>!['completed','canceled','archived'].includes(text(row.status).toLowerCase())).sort((a,b)=>`${a.date||''}${a.startTime||''}`.localeCompare(`${b.date||''}${b.startTime||''}`)),upcoming=pending.filter(row=>!row.date||row.date>=today),unfinished=pending.filter(row=>row.date&&row.date<today),rows=[...upcoming,...unfinished];
 const cards=rows.map(row=>`<button type="button" class="flex-plan-row ${row.date<today?'needs-summary':''}" data-flex-plan-open="${esc(row.id)}"><span class="flex-plan-date"><b>${esc(formatDate(row.date))}</b><small>${esc(timeRange(row))}${row.station?` · ${esc(row.station)}`:''}</small></span><span class="flex-plan-target"><b>${money(row.targetAmount)}</b><small>${row.date<today?'Add packages + summary':'expected pay'}</small></span></button>`).join('');
 return`<section class="card full money-card flex-planner-card"><div class="card-head"><div><div class="ey">📦 AMAZON FLEX PLANNER</div><h2>Save the block now. Finish the details after.</h2><p>Track its time and expected pay when you accept it, then add packages, station, area, and actual pay.</p></div><button type="button" class="btn tiny" data-flex-add>＋ Plan Flex block</button></div><div class="flex-plan-list">${cards||'<div class="empty">No Flex blocks are waiting. Add one when you pick up a shift.</div>'}</div></section>`;
}

function decorate(){
 const hero=app.querySelector('.gig-hero-card');if(!hero)return;
 const unified=document.documentElement.dataset.unifiedGigPlanner==='1',buttons=hero.querySelector('.button-row');if(!unified&&buttons&&!buttons.querySelector('[data-flex-add]'))buttons.insertAdjacentHTML('afterbegin','<button type="button" class="btn primary" data-flex-add>📦 ＋ Plan Flex block</button>');
 if(!unified&&!app.querySelector('.flex-planner-card')){const dash=app.querySelector('.doordash-planner-card');(dash||hero).insertAdjacentHTML('afterend',plannerCard())}
 const view=getView();for(const row of summaryRows(view)){const card=app.querySelector(`[data-money-open="order-${CSS.escape(String(row.id))}"]`);if(!card)continue;const name=card.querySelector('b'),meta=card.querySelector('small');if(name)name.textContent='Amazon Flex block';if(meta)meta.textContent=`${row.packageCount||0} packages · ${row.station||'station not entered'} · ${row.deliveryArea||'area not entered'}`;card.dataset.flexSummaryOpen=String(row.id)}
}

app.addEventListener('click',event=>{
 let button=event.target.closest('[data-flex-add]');if(button){event.preventDefault();event.stopPropagation();open();return}
 button=event.target.closest('[data-flex-plan-open]');if(button){event.preventDefault();event.stopPropagation();const plan=planById(button.dataset.flexPlanOpen),view=getView();if(plan)open(plan,summaryForPlan(view,plan)||{});return}
 button=event.target.closest('[data-flex-summary-open]');if(button){event.preventDefault();event.stopPropagation();const view=getView(),summary=summaryById(view,button.dataset.flexSummaryOpen),plan=summary?.plannedShiftId?planById(summary.plannedShiftId):null;if(summary)open(plan||{date:summary.date,startTime:summary.startTime,endTime:summary.endTime,status:'completed',station:summary.station,area:summary.deliveryArea},summary);return}
 if(event.target.closest('[data-flex-shift-close]')||event.target.matches('[data-flex-shift-modal]')){close();return}
 button=event.target.closest('[data-flex-archive]');if(button){const form=button.closest('[data-flex-shift-form]'),id=form?.dataset.planId;if(!id)return;const result=archiveV5Record('work.gigShifts',id);if(result.ok){close();rerender()}else form.querySelector('[data-flex-error]').textContent=result.error||'Could not archive this Flex block.'}
},true);

app.addEventListener('input',event=>{const form=event.target.closest('[data-flex-shift-form]');if(!form)return;const output=form.querySelector('[data-flex-total]'),input=form.elements.namedItem('actualPay');if(output&&input)output.textContent=money(input.value)});

app.addEventListener('submit',event=>{
 const form=event.target.closest('[data-flex-shift-form]');if(!form)return;event.preventDefault();event.stopPropagation();const data=Object.fromEntries(new FormData(form)),intent=event.submitter?.value||'plan',error=form.querySelector('[data-flex-error]');
 const platformResult=ensureFlexPlatform();if(!platformResult.ok){error.textContent=platformResult.error||'Could not prepare Amazon Flex in Gig Work.';return}
 const planResult=saveV5GigShift({id:form.dataset.planId,source:'Amazon Flex',date:text(data.date),startTime:text(data.startTime),endTime:text(data.endTime),targetAmount:Number(data.targetAmount)||0,station:text(data.station),area:text(data.area),note:text(data.planNote),status:intent==='summary'?'completed':undefined,summaryOrderId:form.dataset.summaryId,packageCount:data.packageCount===''?undefined:Number(data.packageCount)||0});
 if(!planResult.ok){error.textContent=planResult.error||'Could not save this Flex block.';return}
 if(intent==='plan'){close();rerender();return}
 const actualPay=Number(data.actualPay)||0;if(actualPay<=0){error.textContent='Add the actual Flex pay before completing the block.';saveV5GigShift({...planResult.entry,status:'planned'});return}
 const packageCount=Math.max(0,Number(data.packageCount)||0),orderResult=runV5MoneyGigAction({type:'order-save',id:form.dataset.summaryId||'',platformId:platformResult.result.id,date:text(data.date)||localDateKey(),basePay:actualPay,tip:0,bonus:0,promo:0,reimbursement:0,otherPay:0,mileage:Number(data.mileage)||0,activeMinutes:0,onlineMinutes:0,status:'completed',notes:text(data.summaryNotes)});
 if(!orderResult.ok){error.textContent=orderResult.error||'Could not save the Flex earnings.';saveV5GigShift({...planResult.entry,status:'planned'});return}
 const summaryId=orderResult.result?.id||form.dataset.summaryId,attached=updateV5Record('work.gig.orders',summaryId,{entryMode:'shift',aggregateShift:true,packageCount,station:text(data.station),deliveryArea:text(data.area),startTime:text(data.startTime),endTime:text(data.endTime),shiftLabel:'Amazon Flex block',plannedShiftId:planResult.entry.id});
 if(!attached.ok){error.textContent=attached.error||'The earnings saved, but the Flex details could not be linked.';return}
 const completed=saveV5GigShift({...planResult.entry,status:'completed',summaryOrderId:summaryId,actualAmount:actualPay,packageCount,station:text(data.station),area:text(data.area),completedAt:new Date().toISOString()});if(!completed.ok){error.textContent=completed.error||'The summary saved, but the planned block could not be closed.';return}close();rerender();
});

new MutationObserver(()=>requestAnimationFrame(decorate)).observe(app,{childList:true});
decorate();
