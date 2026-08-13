import type { HeaderConfig } from '../config/types';
import HeaderItem from './HeaderItem';

export default function Header({ header }: { header?: HeaderConfig }) {
  if (!header) return null;
  return (
    <div className="header">
      <div className="header-content" style={header.styles}>
        <div className="header--left">
          {(header.left ?? []).map((item, index) => (
            <HeaderItem key={index} item={item} />
          ))}
        </div>
        <div className="header--right">
          {(header.right ?? []).map((item, index) => (
            <HeaderItem key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}