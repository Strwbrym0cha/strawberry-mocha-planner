import{prepareCloudSync}from'./cloud-sync.js?v=5.7.0-phone-sync';

await prepareCloudSync();
await import('./app.js?v=5.6.2-gig-work-home');
await import('./daily-step-popup-fix.js?v=5.6.5-routine-step-modal');
await import('./money-budgets.js?v=5.6.6-spending-budgets');
await import('./study-history-popup-fix.js?v=5.6.7-completed-course-edit');
await import('./schedule-gig-labels.js?v=5.6.9-gig-shift-labels');
await import('./brain-dump-v5.js?v=5.7.2-brain-dump');
await import('./fixed-events-safe.js?v=5.7.8-fixed-events-safe');
await import('./cloud-account.js?v=5.7.6-cloud-account');
await import('./bill-skip-month.js?v=5.8.0-bill-skip-month');
await import('./gig-shift-entry-safe.js?v=5.8.2-doordash-render-fix');
