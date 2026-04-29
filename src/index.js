import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import posthog from 'posthog-js';

posthog.init('phc_njN5RPiHnyve9MoZaVp46jujZZozXithFLsMwfMhvBTg', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();