import { useEffect } from 'react';
import { initConnection } from './ha/connection';
import { createAppStore } from './store';
import type { TileBoardConfig } from './config/types';

interface AppProps {
  config: TileBoardConfig;
}

export default function App({ config }: AppProps) {
  useEffect(() => {
    createAppStore(config);
    initConnection();
  }, [config]);

  return <div className="page-container">TileBoard</div>;
}