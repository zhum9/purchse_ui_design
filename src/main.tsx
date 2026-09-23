import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import { AppProviders } from '@app/providers';
import '@shared/styles/global.css';

async function enableMocking() {
  const shouldEnableMocking = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === 'true';
  if (!shouldEnableMocking) return;
  const { worker } = await import('@mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><AppProviders><App /></AppProviders></StrictMode>);
});
