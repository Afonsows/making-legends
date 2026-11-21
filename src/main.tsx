import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initAppUpdates } from './utils/appUpdates';

// Procura versão nova ao abrir e ao voltar para o app (essencial no iPhone)
initAppUpdates();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
