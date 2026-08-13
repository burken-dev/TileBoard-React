import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface DateDisplayProps {
  format?: string;
}

export default function DateDisplay({ format: fmt }: DateDisplayProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return <div className="date">{format(now, fmt ?? 'EEEE, LLLL dd')}</div>;
}