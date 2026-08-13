import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@mdi/font/css/materialdesignicons.css';
import '../styles/main.less';
import '../styles/themes.less';
import '../styles/weather-icons.css';
import '../styles/custom.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
