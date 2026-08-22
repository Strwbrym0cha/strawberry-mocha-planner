const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const num=v=>Math.max(0,Number(v)||0);
const money=v=>Math.round(num(v)*100)/100;
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

function paycheckById(id){return list(rt.getState()?.money?.earnings).find(x=>String(x.id)===String(id))||null}
function calcGross(hours,rate){return money(num(hours)*num(rate))}
function field(label,name,value,step='0.01',placeholder=''){const el=document.createElement('label');el.className='field paycheck-calc-field';el.innerHTML=`<span>${label}</span><input name="${name}" type="number" min="0" step="${step}" value="${value??''}" placeholder="${placeholder}">`;return el}

function syncGross(form,force=false){
 const hours=form.querySelector('[name="hours"]'),rate=form.querySelector('[name="hourlyRate"]'),gross=form.querySelector('[name="gross"]');
 if(!hours||!rate||!gross)return;
 const h=num(hours.value),r=num(rate.value);
 if((h>0&&r>0)||force){gross.value=calcGross(h,r).toFixed(2)}
 const note=form.querySelector('[data-gross-math]');
 if(note)note.textContent=h&&r?`${h} hr × $${r.toFixed(2)} = $${calcGross(h,r).toFixed(2)}`:'Enter hours + pay rate and KatOS will calculate gross.';
}
function decorate(form){
 if(!form||form.dataset.paycheckCalc)return;
 const gross=form.querySelector('[name="gross"]');if(!gross)return;
 const p=paycheckById(form.dataset.id),hours=p?.hours??'',rate=p?.hourlyRate??'';
 const grossField=gross.closest('.field');if(!grossField)return;
 grossField.parentNode.insertBefore(field('Hours worked','hours',hours,'0.01','31'),grossField);
 grossField.parentNode.insertBefore(field('Hourly pay rate','hourlyRate',rate,'0.01','17.25'),grossField);
 const label=grossField.querySelector('span');if(label)label.textContent='Gross · calculated automatically';
 gross.readOnly=true;gross.setAttribute('aria-readonly','true');gross.style.background='#fff8fb';
 const math=document.createElement('small');math.dataset.grossMath='1';math.className='meta';math.style.display='block';math.style.marginTop='4px';grossField.appendChild(math);
 form.dataset.paycheckCalc='1';
 syncGross(form,false);
}
function decorateAll(){document.querySelectorAll('form[data-paycheck-form]').forEach(decorate)}

function saveCalculatedPaycheck(form){
 const fd=new FormData(form),state=clone(rt.getState()),rows=list(state.money?.earnings),id=text(form.dataset.id)||makeId('earning'),prior=rows.find(x=>String(x.id)===String(id));
 const hours=num(fd.get('hours')),hourlyRate=num(fd.get('hourlyRate'));
 const calculated=hours>0&&hourlyRate>0?calcGross(hours,hourlyRate):num(fd.get('gross'));
 const expected=num(fd.get('expected')),received=num(fd.get('received')),status=text(fd.get('status'))==='received'?'received':'expected';
 const next={...prior,id,kind:'paycheck',label:text(fd.get('label'))||'Paycheck',employer:text(fd.get('label'))||text(prior?.employer),status,hours,hourlyRate,grossAmount:calculated,estimatedGross:calculated,expectedAmount:expected,receivedAmount:received,expectedDate:text(fd.get('expectedDate')),receivedDate:text(fd.get('receivedDate')),note:text(fd.get('note')),createdAt:prior?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 state.money={...(state.money||{}),earnings:prior?rows.map(x=>String(x.id)===String(id)?next:x):[...rows,next]};
 rt.setState(state,prior?'Paycheck updated · gross recalculated 💸':'Paycheck added · gross calculated 💸');
 if(prior)setTimeout(()=>document.querySelector('[data-paycheck-action="cancel"]')?.click(),60);
}

document.addEventListener('input',e=>{const input=e.target.closest?.('form[data-paycheck-form] [name="hours"], form[data-paycheck-form] [name="hourlyRate"]');if(!input)return;const form=input.closest('form[data-paycheck-form]');syncGross(form,true)},true);
document.addEventListener('submit',e=>{const form=e.target.closest?.('form[data-paycheck-form]');if(!form||!form.dataset.paycheckCalc)return;e.preventDefault();e.stopImmediatePropagation();saveCalculatedPaycheck(form)},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorateAll()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
