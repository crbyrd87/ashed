import React from 'react';
import ReactDOM from 'react-dom/client';
// Bundled, not from a CDN — the PWA has to work offline.
// Spectral for anything a person named, Source Sans 3 for anything the
// interface says, IBM Plex Mono for every number.
import '@fontsource/spectral/300.css';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/500.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/500.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './index.css';
import App from './App';
import Tracker from './Tracker';
import { EmberDefs } from './ui';
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
    {/* The rating flame's gradient, defined once for the whole page. */}
    {!isTracker && <EmberDefs />}
    {isTracker ? <Tracker /> : <App />}
  </React.StrictMode>
);

reportWebVitals();