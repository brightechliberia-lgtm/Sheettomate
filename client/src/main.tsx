import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { LowDataProvider } from './context/LowDataContext';
import { flushQueuedApi } from './lib/api';
import { initAnalytics } from './lib/tracking';
import './index.css';

initAnalytics();
registerSW({ immediate: true });

window.addEventListener('online', () => {
  void flushQueuedApi();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === 'SYNC_QUEUE') void flushQueuedApi();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LowDataProvider>
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </LowDataProvider>
    </BrowserRouter>
  </StrictMode>,
);
