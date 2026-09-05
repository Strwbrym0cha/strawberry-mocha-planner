import{selectV5MoneyGig,localDateKey}from'./data.js?v=5.8.0-bill-skip-month';

const app=document.getElementById('app');

function hideArchivedGigCards(){
  try{
    const view=selectV5MoneyGig(localDateKey());
    const archived=(view?.gig?.orders||[]).filter(row=>row?.archivedAt);
    archived.forEach(row=>{
      const id=CSS.escape(String(row.id));
      app.querySelectorAll(`[data-money-open="order-${id}"]`).forEach(card=>card.style.display='none');
    });
  }catch(error){console.warn('KatOS could not hide archived gig cards.',error)}
}

// KatOS replaces the app shell on each save/archive. Watching only direct children
// avoids the render loops caused by older layout-enhancer observers.
new MutationObserver(()=>requestAnimationFrame(hideArchivedGigCards)).observe(app,{childList:true});
hideArchivedGigCards();
