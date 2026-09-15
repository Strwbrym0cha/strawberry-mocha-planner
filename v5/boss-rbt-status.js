import{renderBoss as renderBaseBoss}from'./boss.js?base=5.6.0-final-integration';

const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function careerFlags(work){
  const career=work?.hq?.career||{},journey=list(career.rbtJourney);
  const examPassed=text(career.exam?.result)==='passed'||journey.some(row=>row?.id==='exam'&&row?.status==='complete');
  const certified=career.certified===true||text(career.currentStage)==='rbt'||journey.some(row=>row?.id==='certification'&&row?.status==='complete');
  return{career,examPassed,certified};
}

export function renderBoss(snapshot,lane='rbt',work){
  let html=renderBaseBoss(snapshot,lane,work);
  const{examPassed,certified}=careerFlags(work),current=certified?'RBT':work?.currentMilestone?.label||'BT / RLT';
  const dashboardStatus=certified?'RBT certified ✓':examPassed?'RBT exam passed · certification next':'RBT exam pending';
  const panelCopy=certified?'You did it. RBT certification is complete, and Career Climb can move on to your next milestone.':examPassed?'RBT exam passed ✓. Certification is the final RBT milestone.':'The RBT exam is the next unlock. Certification remains pending until explicitly confirmed.';
  const modalCopy=certified?'You are officially an RBT. Your completed RBT milestones stay here as part of Career Climb.':examPassed?'The RBT exam is passed. Confirm certification once your RBT credential is active.':'You are currently a BT / RLT. RBT is the active certification target, and the exam is the next unlock.';

  html=html.replace('<span>RBT exam pending</span>',`<span>${esc(dashboardStatus)}</span>`);
  html=html.replace('<p>The RBT exam is the next unlock. Certification remains pending until explicitly confirmed.</p>',`<p>${esc(panelCopy)}</p>`);
  html=html.replace('<span class="pill current">Current: BT / RLT</span>',`<span class="pill current">Current: ${esc(current)}</span>`);
  html=html.replace('You are currently a BT / RLT. RBT is the active certification target, and the exam is the next unlock.',esc(modalCopy));
  html=html.replace(/(<option value="scheduled"[^>]*>Scheduled<\/option>)/,`$1<option value="passed"${examPassed?' selected':''}>Passed ✓</option>`);

  if(certified){
    html=html.replace('<h2>BT / RLT → RBT</h2>','<h2>RBT → next chapter</h2>');
    html=html.replace(/<form class="work-pass-confirm" data-work-exam-pass>[\s\S]*?<\/form>/,'<div class="work-pass-confirm"><b>🍓 Official RBT ✓</b><span>Your exam and certification milestones are complete.</span></div>');
    html=html.replace('<p class="privacy-strip">Passing the exam does not automatically label you as an RBT. Certification remains a separate pending milestone.</p>','<p class="privacy-strip"><b>Career Climb updated:</b> Current stage is RBT. Your completed steps stay saved.</p>');
    html=html.replace('🧠 BT/RLT → RBT','🧠 RBT Career');
  }else if(examPassed){
    html=html.replace('<h2>BT / RLT → RBT</h2>','<h2>RBT exam passed → certification</h2>');
    html=html.replace(/<form class="work-pass-confirm" data-work-exam-pass>[\s\S]*?<\/form>/,'<form class="work-pass-confirm" data-work-form="career-certify"><label><input type="checkbox" name="confirmed" required> I confirm that my RBT certification is active.</label><button class="btn primary">🍓 I’m officially an RBT</button></form>');
    html=html.replace('<p class="privacy-strip">Passing the exam does not automatically label you as an RBT. Certification remains a separate pending milestone.</p>','<p class="privacy-strip"><b>Exam passed ✓</b> Your Boss Bitch tab now reflects the result. Confirm certification above when your credential is active.</p>');
    html=html.replace('🧠 BT/RLT → RBT','🧠 Exam passed → RBT');
  }

  html=html.replace('Your BT / RLT work and RBT target keep the front seat.',certified?'Your RBT career keeps the front seat.':'Your ABA career keeps the front seat.');
  return html;
}
