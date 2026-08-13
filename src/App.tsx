import { useEffect } from 'react';
import Pages from './components/Pages';
import type { TileBoardConfig } from './config/types';
import { initConnection } from './ha/connection';
import { useAppStore } from './store';
import { bodyClasses } from './utils/layout';

interface AppProps {
  config: TileBoardConfig;
}

export default function App({ config }: AppProps) {
  const scrolled = useAppStore((s) => s.scrolled);

  useEffect(() => {
    initConnection();
  }, []);

  useEffect(() => {
    document.body.className = bodyClasses(config, scrolled).join(' ');
  }, [config, scrolled]);

  return (
    <div className="page-container">
      <Pages />
    </div>
  );
}