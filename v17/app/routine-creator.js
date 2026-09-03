const q=(root,sel)=>root?.querySelector?.(sel)||null;

const css=`
.sm-routine-create-backdrop{position:fixed;inset:0;z-index:965;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(103,73,65,.25);backdrop-filter:blur(7px)}
.sm-routine-create-modal{width:min(620px,100%);max-height:min(88vh,820px);overflow:auto;margin:0!important;padding:0!important;border:2px solid #efc3d5!important;border-radius:32px!important;background:linear-gradient(150deg,#fff8fc 0%,#fffdf9 55%,#f3f9ee 100%)!important;box-shadow:0 28px 85px rgba(103,73,65,.27)!important;color:#674941}
.sm-routine-create-modal>header{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:19px 21px 16px!important;margin:0!important;background:linear-gradient(135deg,rgba(255,238,246,.97),rgba(255,253,250,.97) 62%,rgba(239,248,234,.97));border-bottom:1px solid #efd5de;backdrop-filter:blur(14px)}
.sm-routine-create-title{display:flex;align-items:center;gap:11px}.sm-routine-create-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:16px;background:linear-gradient(145deg,#ffe3ee,#f2f8ed);border:1px solid #efc7d7;font-size:23px}.sm-routine-create-copy h2{margin:0!important;font-size:24px!important;color:#604038!important}.sm-routine-create-copy small{display:block;margin-top:3px;color:#b06a83;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.sm-routine-create-modal [data-close-form]{width:38px;height:38px;padding:0!important;border:1px solid #eacdd7!important;border-radius:50%!important;background:#fff!important;color:#8f6570!important;font-size:20px!important}
.sm-routine-create-modal .v17-money-form{display:grid!important;gap:14px!important;padding:20px 21px 22px!important;margin:0!important}
.sm-routine-create-modal .v17-money-form>input,.sm-routine-create-modal .v17-money-form>textarea,.sm-routine-create-modal .v17-money-form>label{width:100%;box-sizing:border-box}
.sm-routine-create-modal .v17-money-form>input,.sm-routine-create-modal .v17-money-form>textarea,.sm-routine-create-modal select,.sm-routine-create-modal label>input{border:1px solid #ead4dc!important;border-radius:15px!important;background:rgba(255,255,255,.94)!important;color:#674941!important;padding:11px 12px!important;font:inherit!important}
.sm-routine-create-modal #rName{font-weight:800;font-size:16px}.sm-routine-create-modal #rSteps{min-height:185px;resize:vertical;line-height:1.55}
.sm-routine-create-modal label{display:grid;gap:6px;color:#9a756c;font-size:10px;font-weight:850}.sm-routine-create-modal label:has(#rTaskBot){display:flex;align-items:flex-start;gap:9px;padding:12px 13px;border:1px solid #ead9d2;border-radius:16px;background:rgba(255,255,255,.7)}.sm-routine-create-modal label:has(#rTaskBot) input{width:auto!important;margin-top:2px!important}.sm-routine-create-modal label small{font-weight:600;line-height:1.35}
.sm-routine-create-help{margin:-2px 0 0;padding:10px 12px;border-radius:15px;background:#fff1f7;color:#9d6378;font-size:11px;line-height:1.4}.sm-routine-create-help b{color:#7f5061}
.sm-routine-create-modal [data-save-routine]{justify-self:stretch!important;width:100%!important;border-radius:16px!important;padding:12px 15px!important;font-size:14px!important;box-shadow:0 10px 24px rgba(220,132,166,.16)}
@media(max-width:600px){.sm-routine-create-backdrop{align-items:flex-end;padding:10px}.sm-routine-create-modal{max-height:90vh;border-radius:26px 26px 18px 18px!important}.sm-routine-create-modal>header{padding:16px 17px 14px!important}.sm-routine-create-modal .v17-money-form{padding:17px!important}.sm-routine-create-copy h2{font-size:21px!important}.sm-routine-create-icon{width:41px;height:41px;border-radius:14px}}
`;

function installStyle(){if(document.getElementById('sm-routine-create-style'))return;const el=document.createElement('style');el.id='sm-routine-create-style';el.textContent=css;document.head.appendChild(el)}

function transform(root){
 const name=q(root,'#rName');if(!name)return;
 const card=name.closest('.v17-card');if(!card||card.classList.contains('sm-routine-create-modal'))return;
 const header=card.querySelector(':scope > header'),form=card.querySelector('.v17-money-form');if(!header||!form)return;
 const backdrop=document.createElement('div');backdrop.className='sm-routine-create-backdrop';card.before(backdrop);backdrop.appendChild(card);card.classList.add('sm-routine-create-modal');
 const heading=header.querySelector('h2');if(heading){const wrap=document.createElement('div');wrap.className='sm-routine-create-title';const icon=document.createElement('div');icon.className='sm-routine-create-icon';icon.textContent='🎀';const copy=document.createElement('div');copy.className='sm-routine-create-copy';heading.textContent='Routine Recipe';copy.appendChild(heading);const sub=document.createElement('small');sub.textContent='Build your own repeatable steps';copy.appendChild(sub);wrap.append(icon,copy);header.insertBefore(wrap,header.firstChild)}
 if(!form.querySelector('.sm-routine-create-help')){const help=document.createElement('div');help.className='sm-routine-create-help';help.innerHTML='<b>One step per line.</b> These become routine steps, not separate Sweet To-Dos.';const steps=q(form,'#rSteps');steps?.insertAdjacentElement('afterend',help)}
 const steps=q(form,'#rSteps');if(steps){steps.placeholder='Make bed\nBrush teeth\nTake meds\nGet dressed';steps.setAttribute('aria-label','Routine steps, one per line')}
 backdrop.addEventListener('pointerup',event=>{if(event.target!==backdrop)return;const close=card.querySelector('[data-close-form]');close?.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true}))});
 setTimeout(()=>name.focus?.(),50);
}

export function installRoutineCreator({root}){installStyle();let queued=false;const run=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;transform(root)})};new MutationObserver(run).observe(root,{childList:true,subtree:true});run()}
