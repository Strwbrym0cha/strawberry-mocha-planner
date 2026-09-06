import{prepareCloudSync}from'./cloud-sync.js?v=5.8.0-cross-device-sync';

// Older V5 account UI stored the same Supabase session under legacy keys.
// Adopt it once so existing iPad/phone installs do not look signed in while
// the actual cross-device sync module is offline.
if(!localStorage.getItem('sm_cloud_session')){
  for(const key of['sm_v16_session','sb-sigjwmgekmrwehylvuvu-auth-token']){
    try{
      const raw=localStorage.getItem(key);
      const parsed=raw?JSON.parse(raw):null;
      const session=parsed?.currentSession||parsed?.session||parsed;
      if(session?.access_token&&session?.user?.id){
        localStorage.setItem('sm_cloud_session',JSON.stringify(session));
        break;
      }
    }catch{}
  }
}

await prepareCloudSync();
await import('./app.js?v=6.0.0-canonical-mochini');
await import('./cloud-resume-sync.js?v=5.8.0-cross-device-sync');
await import('./daily-step-popup-fix.js?v=5.6.5-routine-step-modal');
await import('./money-budgets.js?v=5.6.6-spending-budgets');
await import('./study-history-popup-fix.js?v=5.6.7-completed-course-edit');
await import('./schedule-gig-labels.js?v=5.6.9-gig-shift-labels');
await import('./brain-dump-v5.js?v=5.7.2-brain-dump');
await import('./fixed-events-safe.js?v=5.7.8-fixed-events-safe');
await import('./cloud-account.js?v=5.8.0-cross-device-sync');
await import('./bill-skip-month.js?v=5.8.0-bill-skip-month');
await import('./doordash-shift-modal.js?v=5.8.3-doordash-modal');
await import('./gig-archive-display-fix.js?v=5.8.5-gig-archive-filter');
await import('./routine-player.js?v=6.2.0-routine-player-sync');
await import('./mochini-avatar.js?v=6.6.0-approved-atlas-final');
await import('./mochini-companion.js?v=6.3.1-context-aware');
await import('./mochini-face-patch.js?v=6.4.0-face-slots');
await import('./mochini-approved-art.js?v=6.9.0-full-pose-tabs');
await import('./mochini-chat.js?v=6.0.0-canonical-rig');
await import('./mochini-polish.js?v=5.9.5-safari-art-fix');
await import('./shipt-daily-groups.js?v=5.9.2-shipt-persistent-groups');
