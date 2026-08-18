import { useEffect, useState } from 'react';
import { format, parse } from 'date-fns';
import { getDateLocale } from '../utils/locale';
import { useAppStore } from '../store';

interface PhotoDateProps {
  bg?: string;
  format?: string;
}

export default function PhotoDate({ bg, format: fmt = 'dd MMMM yyyy' }: PhotoDateProps) {
  const locale = useAppStore((s) => s.config.locale);
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!bg) {
      setText('');
      return;
    }
    const url = new URL(bg, location.href).href;
    import('exifreader')
      .then(({ default: ExifReader }) => ExifReader.load(url))
      .then((tags: Record<string, unknown>) => {
        if (cancelled) return;
        const tag = tags['DateTimeOriginal'] as
          | { value?: unknown; description?: unknown }
          | undefined;
        const raw = tag && typeof tag === 'object' ? (tag.value ?? tag.description) : tag;
        if (typeof raw !== 'string') return;
        const date = parse(raw, 'yyyy:MM:dd HH:mm:ss', new Date());
        if (!isNaN(date.getTime())) setText(format(date, fmt, { locale: getDateLocale(locale) }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bg, fmt, locale]);

  if (!text) return null;
  return <div className="photo-date">{text}</div>;
}
