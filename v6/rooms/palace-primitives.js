const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export const escapeRoomText=esc;

export function roomHeader({icon='♕',title,subtitle='',aside='',actions=''}){
 return`<header class="v6-room-header"><div class="v6-room-brand"><span aria-hidden="true">♕</span><div><b>KatOS V6</b><small>A softer, kinder you</small></div></div><div class="v6-room-identity"><span aria-hidden="true">· · ${esc(icon)} · ·</span><h1>${esc(title)}</h1><small>${esc(subtitle)}</small></div><div class="v6-room-utilities">${aside?`<em>${esc(aside)}</em>`:''}<div>${actions}</div></div></header>`;
}

export function roomRibbon({date,items=[],actions=[]}){
 const label=new Date(`${date}T12:00:00`).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
 return`<section class="v6-room-ribbon" aria-label="Room status"><div class="v6-room-ribbon-date"><b>${esc(label)}</b><time>${esc(new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}))}</time></div><div class="v6-room-ribbon-status">${items.map(item=>`<span><small>${esc(item.label)}</small><b>${esc(item.value||'—')}</b>${item.note?`<i>${esc(item.note)}</i>`:''}</span>`).join('')}</div><div class="v6-room-ribbon-actions">${actions.map(action=>`<button type="button" ${action.attrs||''}><span>${action.icon||'✦'}</span><b>${esc(action.label)}</b></button>`).join('')}</div></section>`;
}

export function sectionHeader(icon,title,subtitle='',action=''){
 return`<header class="v6-palace-section-head"><div><span aria-hidden="true">${icon}</span><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div></div>${action}</header>`;
}

export function softEmpty(title,copy=''){
 return`<div class="v6-palace-empty"><span aria-hidden="true">♡</span><div><b>${esc(title)}</b>${copy?`<p>${esc(copy)}</p>`:''}</div></div>`;
}

// Normalize the two legacy labels still emitted by Batch 1 markup before the
// canonical Smart Palace and shell click handlers inspect the same event.
if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const control=event.target.closest?.('[data-smart-action="prep-manager"],[data-smart-action="calendar-link"],[data-v6-slot-open]');
 if(!control)return;
 if(control.dataset.smartAction==='prep-manager')control.dataset.smartAction='pack-manager';
 else{delete control.dataset.smartAction;control.dataset.v6Jump=control.dataset.v6SlotOpen||'calendar';delete control.dataset.v6SlotOpen}
},true);
