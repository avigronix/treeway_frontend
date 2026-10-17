import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import './fonts';
import './index.css';
import './lib/install'; // keeps the browser's install prompt for the More page
import { makeQueryClient } from '@/api/queryClient';
import { router } from '@/routes';
import { setUpdateReady } from '@/lib/swUpdate';

const queryClient = makeQueryClient();

if (import.meta.env.PROD) {
  // Static files only (see vite.config.ts). A new build shows the "new version" toast; Update reloads.
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => setUpdateReady(() => updateSW(true)),
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
