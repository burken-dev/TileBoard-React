import { memo } from 'react';
import type { GroupConfig, PageConfig } from '../config/types';
import { useAppStore } from '../store';
import { GROUP_FIELDS, isHidden, resolveFields } from '../utils/fields';
import { groupMargin, groupSizeStyles, pageOpts } from '../utils/layout';
import Tile from './Tile';

interface GroupProps {
  group: GroupConfig;
  page: PageConfig;
}

function Group({ group, page }: GroupProps) {
  const config = useAppStore((s) => s.config);
  const states = useAppStore((s) => s.entities);
  const resolved = resolveFields(group, GROUP_FIELDS, states, null);
  const opts = pageOpts(page, config, states);

  const styles = {
    ...groupSizeStyles(resolved, opts, states),
    margin: groupMargin(page, resolved, config, states),
  };

  return (
    <div className="group" style={styles}>
      {resolved.title ? <div className="group-title">{String(resolved.title)}</div> : null}
      {resolved.items
        .filter((item) => !isHidden(item, states))
        .map((item, index) => (
          <Tile key={index} item={item} page={page} />
        ))}
    </div>
  );
}

export default memo(Group);