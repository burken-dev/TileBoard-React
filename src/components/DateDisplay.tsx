import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getDateLocale } from '../utils/locale';
import { useAppStore } from '../store';

interface DateDisplayProps {
  format?: string;
}

export default function DateDisplay({ format: fmt }: DateDisplayProps) {
  const [now, setNow] = useState(() => new Date());
  const locale = useAppStore((s) => s.config.locale);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return <div className="date">{format(now, fmt ?? 'EEEE, LLLL dd', { locale: getDateLocale(locale) })}</div>;
}