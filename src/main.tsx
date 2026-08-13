import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ConfigError from './components/ConfigError';
import { loadConfig } from './config/load';
import { createAppStore, getAppStore } from './store';
import '@mdi/font/css/materialdesignicons.css';
import '../styles/main.less';
import '../styles/themes.less';
import '../styles/weather-icons.css';
import '../styles/custom.css';

window.onerror = (error, file, line, col) => {
  try {
    getAppStore().addNotification({
      type: 'error',
      title: 'JS error',
      message: [String(error), `File: ${file}`, `Line: ${line}:${col}`].join('<br>'),
      lifetime: 12,
      id: String(error),
    });
  } catch {
    // store not ready yet
  }
};

const result = loadConfig();
if (result.ok) createAppStore(result.config);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {result.ok ? <App config={result.config} /> : <ConfigError errors={result.errors} />}
  </StrictMode>,
);