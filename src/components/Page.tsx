import type React from 'react';
import type { PageConfig } from '../config/types';
import { getAppStore, useAppStore } from '../store';
import { pageBackground } from '../utils/layout';
import Group from './Group';

interface PageProps {
  page: PageConfig;
  index: number;
}

export default function Page({ page, index }: PageProps) {
  const config = useAppStore((s) => s.config);
  const activePage = useAppStore((s) => s.activePage);
  const setScrolled = useAppStore((s) => s.setScrolled);

  const transition = config.transition ?? 'animated';
  const menuPosition = config.menuPosition ?? 'left';

  const styles: React.CSSProperties = pageBackground(page, config);
  if (transition !== 'simple' && menuPosition !== 'left' && index > 0) {
    styles.position = 'absolute';
    styles.left = `${index * 100}%`;
    styles.top = '0';
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>): void {
    const el = e.currentTarget;
    const scrolled = {
      horizontal: el.scrollLeft !== 0,
      vertical: el.scrollTop !== 0,
    };
    const current = getAppStore().scrolled;
    if (
      current.horizontal !== scrolled.horizontal ||
      current.vertical !== scrolled.vertical
    ) {
      setScrolled(scrolled);
    }
  }

  return (
    <div
      className={'page' + (index === activePage ? ' -active' : '')}
      style={styles}
      onScroll={onScroll}
    >
      <div className="page-align" />
      {page.groups.map((group, groupIndex) => (
        <Group key={groupIndex} group={group} page={page} />
      ))}
    </div>
  );
}