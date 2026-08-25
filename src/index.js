import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Tracker from './Tracker';
import reportWebVitals from './reportWebVitals';
import posthog from 'posthog-js';

posthog.init('phc_njN5RPiHnyve9MoZaVp46jujZZozXithFLsMwfMhvBTg', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
});

// /tracker renders the admin project tracker instead of the app.
const isTracker = window.location.pathname.replace(/\/+$/, "") === "/tracker";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isTracker ? <Tracker /> : <App />}
  </React.StrictMode>
);

reportWebVitals();