import type { TileBoardConfig } from './config/types';

interface AppProps {
  config: TileBoardConfig;
}

export default function App({ config }: AppProps) {
  void config;
  return <div className="page-container">TileBoard</div>;
}