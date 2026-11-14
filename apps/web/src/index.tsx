import './app/trustedTypes'; // 1º: política de Trusted Types antes de qualquer sink
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyTheme, readTheme } from './app/theme';

applyTheme(readTheme()); // antes do 1º render: evita piscar no tema errado

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
