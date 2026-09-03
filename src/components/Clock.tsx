import { memo, useEffect, useState } from 'react';
import { getAppStore } from '../store';
import { leadZero } from '../utils/misc';

function currentTime(): { h: string; postfix: string; m: string } {
  const d = new Date();
  let h = d.getHours();
  let postfix = '';
  if (getAppStore().config.timeFormat === 12) {
    postfix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
  } else {
    h = Number(leadZero(h));
  }
  return { h: String(h), postfix, m: String(leadZero(d.getMinutes())) };
}

function Clock() {
  const [time, setTime] = useState(currentTime);

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      setTime(currentTime());
    };
    const id = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  return (
    <div className="clock">
      <div className="clock--h">{time.h}</div>
      <div className="clock--colon">:</div>
      <div className="clock--m">{time.m}</div>
      <div className="clock--postfix">{time.postfix}</div>
    </div>
  );
}

export default memo(Clock);