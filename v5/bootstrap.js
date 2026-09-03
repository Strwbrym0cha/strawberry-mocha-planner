import{prepareCloudSync}from'./cloud-sync.js?v=5.7.0-phone-sync';

await prepareCloudSync();
await import('./app.js?v=5.6.2-gig-work-home');
await import('./daily-step-popup-fix.js?v=5.6.5-routine-step-modal');
await import('./money-budgets.js?v=5.6.6-spending-budgets');
await import('./study-history-popup-fix.js?v=5.6.7-completed-course-edit');
await import('./schedule-gig-labels.js?v=5.6.9-gig-shift-labels');
