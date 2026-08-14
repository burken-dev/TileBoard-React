import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import HeaderItem from './HeaderItem';

let lastActivity = Date.now();

function slideBg(bg: string, cacheBust?: number): string {
  if (!cacheBust) return bg;
  const base = bg.replace(/\?.*$/, '');
  const bucket = Math.floor(Date.now() / 1000 / cacheBust);
  return `${base}?t=${bucket}`;
}

export default function Screensaver() {
  const conf = useAppStore((s) => s.config.screensaver);
  const shown = useAppStore((s) => s.screensaverShown);
  const setScreensaverShown = useAppStore((s) => s.setScreensaverShown);
  const [activeSlide, setActiveSlide] = useState(0);

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
  }, [conf, setScreensaverShown]);

  useEffect(() => {
    if (!conf?.timeout) return;
    const id = window.setInterval(() => {
      if (shown) return;
      const inactivity = Date.now() - lastActivity;
      setScreensaverShown(conf.timeout < inactivity / 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, [conf, setScreensaverShown, shown]);

  useEffect(() => {
    if (!conf?.timeout || !shown) return;
    const slides = conf.slides ?? [];
    if (!slides.length) return;
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, (conf.slidesTimeout ?? 1) * 1000);
    return () => window.clearInterval(id);
  }, [conf, shown]);

  if (!conf?.timeout || !shown) return null;

  const slides = conf.slides ?? [];
  const cacheBust = conf?.slideCacheBust;
  const slideBgUrl = (bg: string) => slideBg(bg, cacheBust);
  const activeBg = conf?.slideCacheBust && slides.length
    ? slideBgUrl(slides[activeSlide]?.bg ?? '')
    : undefined;

  return (
    <div className="screensaver" style={conf.styles} onClick={() => setScreensaverShown(false)}>
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