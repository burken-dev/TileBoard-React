import { useEffect, useState } from 'react';
import type { SliderRuntime } from '../../utils/sliders';

export function SliderInput({
  conf,
  onChange,
}: {
  conf: SliderRuntime;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState(conf.value);
  useEffect(() => {
    setValue(conf.value);
  }, [conf.value]);

  return (
    <div className="item-slider">
      <input
        type="range"
        min={conf.min}
        max={conf.max}
        step={conf.step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          setValue(v);
          onChange(v);
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}