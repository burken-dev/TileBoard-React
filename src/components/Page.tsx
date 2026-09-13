import type React from 'react';
import { useRef } from 'react';
import type { PageConfig } from '../config/types';
import { usePageScale } from '../hooks/usePageScale';
import { getAppStore, useAppStore } from '../store';
import { pageBackground } from '../utils/layout';
import Group from './Group';
import Header from './Header';

interface PageProps {
  page: PageConfig;
  index: number;
}

export default function Page({ page, index }: PageProps) {
  const config = useAppStore((s) => s.config);
  const states = useAppStore((s) => s.entities);
  const activePage = useAppStore((s) => s.activePage);
  const setScrolled = useAppStore((s) => s.setScrolled);
  const displayMode = useAppStore((s) => s.displayMode);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scale = usePageScale(viewportRef, contentRef, displayMode === 'scale', index === activePage);

  const transition = config.transition ?? 'animated';
  const menuPosition = config.menuPosition ?? 'left';

  const styles: React.CSSProperties = pageBackground(page, config, states);
  if (transition !== 'simple' && menuPosition !== 'left' && index > 0) {
    styles.position = 'absolute';
    styles.left = `${index * 100}%`;
    styles.top = '0';
  }
  // Scale the inner content, never the viewport: scaling the viewport clips
  // overflowing tiles before the transform and only shrinks the background.
  const scaleStyles: React.CSSProperties = {};
  if (displayMode === 'scale' && scale < 1) {
    scaleStyles.transform = `scale(${scale})`;
    scaleStyles.transformOrigin = 'center center';
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
      ref={viewportRef}
      className={'page' + (index === activePage ? ' -active' : '')}
      style={styles}
      onScroll={onScroll}
    >
      <div ref={contentRef} className="page-scale" style={scaleStyles}>
        <Header header={page.header} />
        <div className="page-content">
          <div className="page-align" />
          {page.groups.map((group, groupIndex) => (
            <Group key={groupIndex} group={group} page={page} />
          ))}
        </div>
      </div>
    </div>
  );
}
