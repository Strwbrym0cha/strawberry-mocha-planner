/* KatOS V22.10: compact Berry Busy weeks + category-correct Course Corner. */
(()=>{
  const STYLE_ID='sm-ui-polish-2210';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .sm-week-grid{align-items:stretch!important}
      .sm-week-day{height:520px!important;max-height:520px!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
      .sm-week-day>header,.sm-week-day>footer{flex:0 0 auto!important}
      .sm-week-day>section{min-height:0!important}
      .sm-week-day>section:first-of-type{max-height:145px!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;padding-right:4px}
      .sm-week-day>section:last-of-type{flex:1 1 auto!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;padding-right:5px}
      .sm-week-day>section::-webkit-scrollbar{width:5px}.sm-week-day>section::-webkit-scrollbar-thumb{background:#e7bfd0;border-radius:99px}.sm-week-day>section::-webkit-scrollbar-track{background:transparent}
      .sm-course-corner>.sm-popup-category-badge{margin:18px 22px 0!important;background:linear-gradient(110deg,#f3efff,#fffdfb 58%,#f1f8ec)!important;border-color:#d9cfef!important}
      @media(max-width:760px){.sm-week-day{height:470px!important;max-height:470px!important}.sm-week-day>section:first-of-type{max-height:125px!important}}
    `;
    document.head.appendChild(style);
  }

  const patchPlanner=()=>{
    const planner=document.querySelector('#tab-root .v18-planner');
    if(!planner)return;
    const badge=planner.querySelector('.v17-planner-hero .v18-badge');
    if(badge&&badge.textContent!=="📅 WHAT WE PLANNIN'? • WEEKLY")badge.textContent="📅 WHAT WE PLANNIN'? • WEEKLY";
    const intro=planner.querySelector('.v17-planner-hero p');
    if(intro&&intro.textContent!=='Pick the day now. TaskBot can handle the order later. ♡')intro.textContent='Pick the day now. TaskBot can handle the order later. ♡';
  };

  const patchCourseCorner=()=>{
    document.querySelectorAll('.sm-course-corner').forEach(card=>{
      card.dataset.popupCategory='school';
      const badge=card.querySelector(':scope > .sm-popup-category-badge');
      if(badge)badge.innerHTML='<span class="sm-popup-category-icon" aria-hidden="true">🎓</span><span class="sm-popup-category-copy"><b>COURSE CORNER</b><span>Course details, next moves, and reflection all stay in Study Nook.</span></span>';
    });
  };

  let queued=false;
  const scan=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      patchPlanner();
      patchCourseCorner();
    });
  };
  scan();
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
