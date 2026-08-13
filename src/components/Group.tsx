import type { GroupConfig, PageConfig } from '../config/types';
import { useAppStore } from '../store';
import { isHidden } from '../utils/functions';
import { groupMargin, groupSizeStyles, pageOpts } from '../utils/layout';
import Tile from './Tile';

interface GroupProps {
  group: GroupConfig;
  page: PageConfig;
}

export default function Group({ group, page }: GroupProps) {
  const config = useAppStore((s) => s.config);
  const opts = pageOpts(page, config);

  const styles = {
    ...groupSizeStyles(group, opts),
    margin: groupMargin(page, group, config),
  };

  return (
    <div className="group" style={styles}>
      {group.title ? <div className="group-title">{group.title}</div> : null}
      {group.items
        .filter((item) => !isHidden(item))
        .map((item, index) => (
          <Tile key={index} item={item} page={page} />
        ))}
    </div>
  );
}