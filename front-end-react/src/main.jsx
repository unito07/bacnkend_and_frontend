import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Changed from './style.css' to './index.css'
import App from './App.jsx';
import { ScraperFormProvider } from './contexts/ScraperFormContext'; // Import the provider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ScraperFormProvider> {/* Wrap App with the provider */}
      <App />
    </ScraperFormProvider>
  </StrictMode>,
);
