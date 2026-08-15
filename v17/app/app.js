import { createStore } from './storage.js';
import { createRouter } from './router.js';

export function createApp({ root, renderTab }) {
  const store = createStore();
  const router = createRouter({
    initial: location.hash.slice(1) || 'home',
    onChange: page => renderTab(page, { root, store, router })
  });
  renderTab(router.page, { root, store, router });
  return { store, router };
}
