import type { ReactElement } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';

export function TileBody({ item }: { item: TileConfig; entity: HaEntity }): ReactElement | null {
  switch (item.type) {
    default:
      return null;
  }
}