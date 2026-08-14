import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { HaEntity, TileConfig } from '../../config/types';
import { GAUGE_DEFAULTS } from '../../config/constants';
import { useAppStore, useEntities } from '../../store';
import { entityValue } from '../../utils/entity';
import { parseFieldValue } from '../../utils/fields';
import { callFunction } from '../../utils/functions';

function getGaugeField(
  field: string,
  item: TileConfig,
  entity: HaEntity,
  states: Record<string, HaEntity>,
): unknown {
  let value: unknown;
  if (item.settings && field in item.settings) {
    value = parseFieldValue(item.settings[field], states, item, entity);
  } else if (field in GAUGE_DEFAULTS) {
    value = parseFieldValue((GAUGE_DEFAULTS as Record<string, unknown>)[field], states, item, entity);
  } else {
    return null;
  }
  if (typeof item.filter === 'function') return callFunction(item.filter, [value, item, entity]);
  return value;
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  if (endDeg - startDeg >= 360) {
    const top = polar(cx, cy, r, 0);
    const bottom = polar(cx, cy, r, 180);
    return `M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bottom.x} ${bottom.y} A ${r} ${r} 0 0 1 ${top.x} ${top.y}`;
  }
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

const ARC = {
  full: [0, 360],
  semi: [270, 450],
  arch: [225, 495],
} as const;

function thresholdColor(
  thresholds: Record<string, string> | undefined,
  value: number,
  fallback: string,
): string {
  let color = fallback;
  if (thresholds) {
    for (const [key, c] of Object.entries(thresholds)) {
      if (Number(key) <= value) color = c;
    }
  }
  return color;
}

export const GaugeTile = memo(function GaugeTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const states = useEntities([String(item.id)]);
  const config = useAppStore((s) => s.config);

  const type = String(getGaugeField('type', item, entity, states) ?? 'full');
  const span = (ARC as Record<string, readonly number[]>)[type] ?? ARC.full;
  const min = Number(getGaugeField('min', item, entity, states) ?? 0);
  const max = Number(getGaugeField('max', item, entity, states) ?? 100);
  const thick = Number(getGaugeField('thick', item, entity, states) ?? 6);
  const cap = String(getGaugeField('cap', item, entity, states) ?? 'butt');
  const duration = Number(getGaugeField('duration', item, entity, states) ?? 1500);
  const fractionSize = getGaugeField('fractionSize', item, entity, states) as number | null;
  const backgroundColor = String(
    getGaugeField('backgroundColor', item, entity, states) ?? 'rgba(0, 0, 0, 0.1)',
  );
  const foregroundColor = String(
    getGaugeField('foregroundColor', item, entity, states) ?? 'rgba(0, 150, 136, 1)',
  );
  const thresholds = getGaugeField('thresholds', item, entity, states) as
    | Record<string, string>
    | undefined;
  const label = String(getGaugeField('label', item, entity, states) ?? '');
  const prepend = String(getGaugeField('prepend', item, entity, states) ?? '');
  const append = String(getGaugeField('append', item, entity, states) ?? '');
  const labelOnly = Boolean(getGaugeField('labelOnly', item, entity, states) ?? false);

  const sizeSetting = getGaugeField('size', item, entity, states);
  const size =
    Number(sizeSetting) ||
    0.8 * (config.tileSize ?? 100) * Math.min(item.height ?? 1, item.width ?? 1);

  const rawValue = Number(entityValue(item, entity, states));
  const value = Number.isFinite(rawValue)
    ? Math.min(Math.max(rawValue, min), max)
    : min;
  const fraction = max > min ? (value - min) / (max - min) : 0;

  const d = arcPath(50, 50, 45, span[0], span[1]);
  const color = thresholdColor(thresholds, value, foregroundColor);
  const linecap = cap === 'round' ? 'round' : 'butt';
  const dashoffset = 100 * (1 - fraction);

  const formatted = fractionSize != null ? value.toFixed(fractionSize) : String(value);

  const labelStyles: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  };

  return (
    <div className="item-gauge" style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <path d={d} fill="none" stroke={backgroundColor} strokeWidth={thick} strokeLinecap={linecap} />
        <path
          data-foreground
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={thick}
          strokeLinecap={linecap}
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={dashoffset}
          style={{ transition: `stroke-dashoffset ${duration}ms` }}
        />
      </svg>
      <div style={labelStyles}>
        {!labelOnly ? (
          <div className="item-gauge--value">
            {prepend}
            {formatted}
            {append}
          </div>
        ) : null}
        {label ? <div className="item-gauge--label">{label}</div> : null}
      </div>
    </div>
  );
});