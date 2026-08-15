import { memo } from 'react';
import type React from 'react';
import type { HeaderConfig } from '../config/types';
import { useAppStore } from '../store';
import { resolveFields } from '../utils/fields';
import HeaderItem from './HeaderItem';

function Header({ header }: { header?: HeaderConfig }) {
  const states = useAppStore((s) => s.entities);
  const resolved = header ? resolveFields(header, ['styles'], states, null) : header;
  if (!resolved) return null;
  return (
    <div className="header">
      <div className="header-content" style={resolved.styles as React.CSSProperties}>
        <div className="header--left">
          {(resolved.left ?? []).map((item, index) => (
            <HeaderItem key={index} item={item} />
          ))}
        </div>
        <div className="header--right">
          {(resolved.right ?? []).map((item, index) => (
            <HeaderItem key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(Header);