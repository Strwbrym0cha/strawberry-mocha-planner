// Reminders are actions now. Keep this route as a friendly compatibility door
// instead of maintaining another editable reminder database.
import { renderTasks } from './tasks.js?v=23.0.0-20260902';
export const renderReminders = renderTasks;
