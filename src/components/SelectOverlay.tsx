import type React from 'react';
import type { CSSProperties } from 'react';

export function selectStyles(options: string[] | undefined): CSSProperties {
  return { marginTop: -Math.min((options?.length ?? 0) * 17, 180) + 'px' };
}

export function SelectOverlay({
  options,
  active,
  onChoose,
  style,
}: {
  options: string[] | undefined;
  active?: string;
  onChoose: (option: string) => void;
  style?: CSSProperties;
}) {
  if (!options) return null;
  return (
    <div className="item-select" style={style}>
      {options.map((option, index) => (
        <div
          key={index}
          className={'item-select--option' + (option === active ? ' -active' : '')}
          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onChoose(option);
          }}
        >
          <span>{option}</span>
        </div>
      ))}
    </div>
  );
}