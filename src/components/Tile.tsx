import type { PageConfig, TileConfig } from '../config/types';
import { useAppStore } from '../store';
import { itemPositionStyles, pageOpts } from '../utils/layout';

interface TileProps {
  item: TileConfig;
  page: PageConfig;
}

export default function Tile({ item, page }: TileProps) {
  const config = useAppStore((s) => s.config);
  const styles = itemPositionStyles(item, pageOpts(page, config));
  return <div className="item" style={styles} />;
}