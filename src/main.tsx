import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ConfigError from './components/ConfigError';
import { loadConfig } from './config/load';
import '@mdi/font/css/materialdesignicons.css';
import '../styles/main.less';
import '../styles/themes.less';
import '../styles/weather-icons.css';
import '../styles/custom.css';

const result = loadConfig();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {result.ok ? <App config={result.config} /> : <ConfigError errors={result.errors} />}
  </StrictMode>,
);