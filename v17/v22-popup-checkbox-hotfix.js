/* KatOS V22.11.2: keep checkbox/radio controls compact inside polished popups. */
(()=>{
  const id='sm-popup-checkbox-hotfix-style';
  if(document.getElementById(id))return;
  const style=document.createElement('style');
  style.id=id;
  style.textContent=`
    .v17-modal-box input[type="checkbox"],
    .v17-modal-box input[type="radio"],
    .v18-event-modal-box input[type="checkbox"],
    .v18-event-modal-box input[type="radio"],
    .v18-day-review-box input[type="checkbox"],
    .v18-day-review-box input[type="radio"],
    .sm-routine-editor input[type="checkbox"],
    .sm-routine-editor input[type="radio"],
    .sm-popup-inline input[type="checkbox"],
    .sm-popup-inline input[type="radio"]{
      width:22px!important;
      min-width:22px!important;
      max-width:22px!important;
      height:22px!important;
      min-height:22px!important;
      max-height:22px!important;
      padding:0!important;
      margin:0!important;
      flex:0 0 22px!important;
      border-radius:7px!important;
      box-shadow:none!important;
    }
    .v18-day-review-box .v17-check,
    .v17-modal-box .v17-check,
    .v18-event-modal-box .v17-check{
      display:flex!important;
      align-items:flex-start!important;
      gap:10px!important;
      width:100%!important;
      min-width:0!important;
    }
    .v18-day-review-box .v17-check>span,
    .v17-modal-box .v17-check>span,
    .v18-event-modal-box .v17-check>span{
      flex:1 1 auto!important;
      min-width:0!important;
      width:auto!important;
      overflow-wrap:anywhere!important;
    }
    .v18-day-review-box .v17-task-row,
    .v17-modal-box .v17-task-row,
    .v18-event-modal-box .v17-task-row{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto!important;
      gap:10px!important;
      align-items:start!important;
      width:100%!important;
      min-width:0!important;
    }
    .v18-day-review-box .sm-routine-parent-details,
    .v17-modal-box .sm-routine-parent-details,
    .v18-event-modal-box .sm-routine-parent-details{
      grid-column:1/-1!important;
      width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
    }
    .v18-day-review-box .sm-routine-parent-step input[type="checkbox"]{
      flex:0 0 18px!important;
      width:18px!important;
      min-width:18px!important;
      max-width:18px!important;
      height:18px!important;
      min-height:18px!important;
      max-height:18px!important;
    }
  `;
  document.head.appendChild(style);
})();
