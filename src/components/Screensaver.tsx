import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store';
import { resolveFieldValue, resolveFields } from '../utils/fields';
import { SCREENSAVER_FIELDS } from '../utils/fields';
import HeaderItem from './HeaderItem';

let lastActivity = Date.now();

function slideBg(bg: string, cacheBust?: number): string {
  if (!cacheBust) return bg;
  const base = bg.replace(/\?.*$/, '');
  const bucket = Math.floor(Date.now() / 1000 / cacheBust);
  return `${base}?t=${bucket}`;
}

export default function Screensaver() {
  const rawConf = useAppStore((s) => s.config.screensaver);
  const states = useAppStore((s) => s.entities);
  const shown = useAppStore((s) => s.screensaverShown);
  const setScreensaverShown = useAppStore((s) => s.setScreensaverShown);
  const [activeSlide, setActiveSlide] = useState(0);

  const conf = useMemo(
    () => (rawConf ? resolveFields(rawConf, SCREENSAVER_FIELDS, states, null) : rawConf),
    [rawConf, states],
  );
  const slides = useMemo(
    () =>
      (conf?.slides ?? []).map((s) => ({
        ...s,
        bg: resolveFieldValue(s.bg, states, s, null) as string,
        styles: resolveFieldValue(s.styles, states, s, null) as CSSProperties | undefined,
      })),
    [conf, states],
  );

  useEffect(() => {
    if (!conf?.timeout) return;
    lastActivity = Date.now();
    const reset = () => {
      lastActivity = Date.now();
    };
    const events: Array<keyof WindowEventMap> = ['click', 'keypress', 'touchstart', 'focus'];
    events.forEach((event) => window.addEventListener(event, reset));
    window.showScreensaver = () => {
      window.setTimeout(() => {
        lastActivity = 0;
        setScreensaverShown(true);
      }, 100);
    };
    window.hideScreensaver = () => {
      window.setTimeout(() => {
        lastActivity = Date.now();
        setScreensaverShown(false);
      }, 100);
    };
    return () => {
      events.forEach((event) => window.removeEventListener(event, reset));
      delete window.showScreensaver;
      delete window.hideScreensaver;
    };
  }, [conf?.timeout, setScreensaverShown]);

  useEffect(() => {
    if (!conf?.timeout) return;
    const id = window.setInterval(() => {
      if (shown) return;
      const inactivity = Date.now() - lastActivity;
      setScreensaverShown((conf.timeout as number) < inactivity / 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, [conf?.timeout, setScreensaverShown, shown]);

  useEffect(() => {
    if (!conf?.timeout || !shown) return;
    const slides = conf.slides ?? [];
    if (!slides.length) return;
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, ((conf.slidesTimeout as number | undefined) ?? 1) * 1000);
    return () => window.clearInterval(id);
  }, [conf?.timeout, conf?.slidesTimeout, shown]);

  if (!conf?.timeout || !shown) return null;

  const cacheBust = conf?.slideCacheBust as number | undefined;
  const slideBgUrl = (bg: string) => slideBg(bg, cacheBust);
  const activeBg = slides.length ? slideBgUrl(slides[activeSlide]?.bg ?? '') : undefined;

  return (
    <div className="screensaver" style={conf.styles as CSSProperties | undefined} onClick={() => setScreensaverShown(false)}>
      <div className="screensaver-slides">
        {slides.map((slide, index) => {
          const wasActive =
            activeSlide === index + 1 || (slides.length === index + 1 && activeSlide === 0);
          return (
            <div
              key={index}
              className={
                'screensaver-slide' +
                (activeSlide === index ? ' -active' : '') +
                (wasActive ? ' -prev' : '')
              }
              style={{
                backgroundImage: `url(${slideBgUrl(slide.bg)})`,
                ...(slide.styles ?? {}),
              }}
            >
              {slide.rightBottom ? (
                <div className="screensaver-content--right-bottom">
                  {slide.rightBottom.map((item, i) => (
                    <HeaderItem key={i} item={item} slideBg={slideBgUrl(slide.bg)} />
                  ))}
                </div>
              ) : null}
              {slide.rightTop ? (
                <div className="screensaver-content--right-top">
                  {slide.rightTop.map((item, i) => (
                    <HeaderItem key={i} item={item} slideBg={slideBgUrl(slide.bg)} />
                  ))}
                </div>
              ) : null}
              {slide.leftBottom ? (
                <div className="screensaver-content--left-bottom">
                  {slide.leftBottom.map((item, i) => (
                    <HeaderItem key={i} item={item} slideBg={slideBgUrl(slide.bg)} />
                  ))}
                </div>
              ) : null}
              {slide.leftTop ? (
                <div className="screensaver-content--left-top">
                  {slide.leftTop.map((item, i) => (
                    <HeaderItem key={i} item={item} slideBg={slideBgUrl(slide.bg)} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="screensaver-content">
        {conf.rightBottom ? (
          <div className="screensaver-content--right-bottom">
            {conf.rightBottom.map((item, i) => (
              <HeaderItem key={i} item={item} slideBg={activeBg} />
            ))}
          </div>
        ) : null}
        {conf.rightTop ? (
          <div className="screensaver-content--right-top">
            {conf.rightTop.map((item, i) => (
              <HeaderItem key={i} item={item} slideBg={activeBg} />
            ))}
          </div>
        ) : null}
        {conf.leftBottom ? (
          <div className="screensaver-content--left-bottom">
            {conf.leftBottom.map((item, i) => (
              <HeaderItem key={i} item={item} slideBg={activeBg} />
            ))}
          </div>
        ) : null}
        {conf.leftTop ? (
          <div className="screensaver-content--left-top">
            {conf.leftTop.map((item, i) => (
              <HeaderItem key={i} item={item} slideBg={activeBg} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}