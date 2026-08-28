import { useEffect, useState } from 'react';
import { useAppStore } from '../store';

// ponytail: sync React connection state to the inline offline shell in index.html
// (single UI, no duplicate banner). Inline shell already handles manual Reload + auto-reload.
export default function ConnectionOverlay() {
  const status = useAppStore((s) => s.status);
  const config = useAppStore((s) => s.config);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (config.serverUrl) {
      window.dispatchEvent(
        new CustomEvent('tb-server-url', { detail: config.serverUrl }),
      );
    }
  }, [config.serverUrl]);

  useEffect(() => {
    if (status === 'reconnecting' || (!online && status !== 'ready')) {
      window.dispatchEvent(new CustomEvent('tb-reconnecting'));
    } else if (status === 'error') {
      window.dispatchEvent(new CustomEvent('tb-offline', { detail: 'Connection error' }));
    } else if (status === 'ready' && online) {
      window.dispatchEvent(new CustomEvent('tb-ready'));
    }
  }, [status, online]);

  return null;
}
