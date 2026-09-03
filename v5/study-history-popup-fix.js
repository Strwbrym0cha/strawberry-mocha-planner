// V5 cleanup: completed/dropped courses live inside a <details> history block.
// The main Study click guard treats <details> as a control, so those rows never
// reach the normal popup opener. Intercept only history-course rows and use the
// existing V5 modal that already belongs to the course.
const app=document.getElementById('app');

function openHistoryCourse(event){
  const row=event.target.closest?.('.study-completed [data-study-open^="course-"]');
  if(!row||!app?.contains(row))return;
  if(event.target.closest?.('button,input,select,textarea,a,summary'))return;
  const id=row.dataset.studyOpen;
  const modal=[...app.querySelectorAll('[data-study-modal]')].find(node=>node.dataset.studyModal===id);
  if(!modal)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  app.append(modal);
  modal.hidden=false;
  modal.querySelector('input,select,textarea')?.focus();
}

app?.addEventListener('click',openHistoryCourse,true);
