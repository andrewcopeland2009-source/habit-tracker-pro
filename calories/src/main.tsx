import '@fontsource-variable/inter';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { StoreProvider } from './lib/store';
import { UIProvider } from './lib/ui';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </StoreProvider>
  </React.StrictMode>,
);
