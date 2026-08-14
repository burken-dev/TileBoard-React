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
    const id = window.setInterval(() => setTime(currentTime()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <div className="clock--h">{time.h}</div>
      <div className="clock--colon">:</div>
      <div className="clock--m">{time.m}</div>
      <div className="clock--postfix">{time.postfix}</div>
    </>
  );
}

export default memo(Clock);