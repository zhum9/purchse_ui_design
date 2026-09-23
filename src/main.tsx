import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import { AppProviders } from '@app/providers';
import '@shared/styles/global.css';

async function enableMocking() {
  if (!import.meta.env.DEV) return;
  const { worker } = await import('@mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><AppProviders><App /></AppProviders></StrictMode>);
});
