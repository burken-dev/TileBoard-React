import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ConfigError from './components/ConfigError';
import ConfigNotFound from './components/ConfigNotFound';
import { configName, loadConfig, loadConfigScript, loadScript } from './config/load';
import { createAppStore, getAppStore } from './store';
import '@mdi/font/css/materialdesignicons.css';
import '../styles/main.less';
import '../styles/themes.less';
import '../styles/weather-icons.css';

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

async function start() {
  const name = configName();
  try {
    await loadConfigScript(name);
  } catch {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ConfigNotFound name={name} />
      </StrictMode>,
    );
    return;
  }

  const result = loadConfig();
  if (result.ok) {
    createAppStore(result.config);
    for (const url of result.config.scripts ?? []) {
      try {
        await loadScript(url);
      } catch {
        getAppStore().addNotification({
          type: 'error',
          title: 'Failed to load script',
          message: url,
          lifetime: 12,
        });
      }
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {result.ok ? <App config={result.config} /> : <ConfigError errors={result.errors} />}
    </StrictMode>,
  );
}

start();