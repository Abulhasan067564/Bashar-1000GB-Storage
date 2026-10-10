// Suppress third-party extension errors from halting app execution
if (typeof window !== 'undefined') {
  try {
    const origFetch = window.fetch ? window.fetch.bind(window) : null;
    let currentFetch = origFetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return currentFetch;
      },
      set(val) {
        currentFetch = val;
      }
    });
  } catch {
    // Ignore if already patched
  }

  window.addEventListener('error', (event) => {
    if (event.filename && (event.filename.includes('chrome-extension://') || event.filename.includes('moz-extension://'))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
