import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppClerkProvider } from './auth/ClerkProvider';
import AuthGuard from './auth/AuthGuard';
import './src/i18n';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppClerkProvider>
      <AuthGuard>
        <App />
      </AuthGuard>
    </AppClerkProvider>
  </React.StrictMode>
);
