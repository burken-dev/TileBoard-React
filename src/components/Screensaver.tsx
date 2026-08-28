import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store';
import { resolveFieldValue, resolveFields } from '../utils/fields';
import { SCREENSAVER_FIELDS } from '../utils/fields';
import { callFunction } from '../utils/functions';
import type { ScreensaverButtonConfig } from '../config/types';
import HeaderItem from './HeaderItem';
import ScreensaverControls from './ScreensaverControls';

let lastActivity = Date.now();

function slideBg(bg: string, cacheBust?: number): string {
  if (!bg) return bg;
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
  const activeSlide = useAppStore((s) => s.screensaverSlide);
  const paused = useAppStore((s) => s.screensaverPaused);
  const setScreensaverSlide = useAppStore((s) => s.setScreensaverSlide);
  const setScreensaverPaused = useAppStore((s) => s.setScreensaverPaused);
  const setScreensaverBg = useAppStore((s) => s.setScreensaverBg);

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
    if (!conf?.timeout || !shown || paused) return;
    const slides = conf.slides ?? [];
    if (!slides.length) return;
    const id = window.setInterval(() => {
      setScreensaverSlide((activeSlide + 1) % slides.length);
    }, ((conf.slidesTimeout as number | undefined) ?? 1) * 1000);
    return () => window.clearInterval(id);
  }, [conf?.timeout, conf?.slidesTimeout, shown, paused, activeSlide, setScreensaverSlide]);

  const cacheBust = conf?.slideCacheBust as number | undefined;
  const ambient = Boolean(conf?.ambient_backdrop);
  const safeActive = slides.length ? ((activeSlide % slides.length) + slides.length) % slides.length : 0;
  const activeBg = slides.length ? slideBg(slides[safeActive]?.bg ?? '', cacheBust) : undefined;

  useEffect(() => {
    setScreensaverBg(activeBg ?? null);
  }, [activeBg, setScreensaverBg]);

  const handleControl = (button: ScreensaverButtonConfig): void => {
    const len = slides.length;
    if (!len) return;
    switch (button.type) {
      case 'previous':
        setScreensaverSlide((safeActive - 1 + len) % len);
        return;
      case 'next':
        setScreensaverSlide((safeActive + 1) % len);
        return;
      case 'play_pause':
        setScreensaverPaused(!paused);
        return;
      default:
        if (button.action) {
          callFunction(button.action, [
            { bg: activeBg ?? '', index: safeActive, total: len },
          ]);
        }
    }
  };

  if (!conf?.timeout || !shown) return null;

  const slideBgUrl = (bg: string) => slideBg(bg, cacheBust);

  return (
    <div className="screensaver" style={conf.styles as CSSProperties | undefined} onClick={() => setScreensaverShown(false)}>
      <div
        className={'screensaver-slides' + (ambient ? ' -ambient' : '')}
        style={ambient && activeBg ? { backgroundImage: `url(${activeBg})` } : undefined}
      >
        {slides.map((slide, index) => {
          const wasActive =
            safeActive !== index &&
            (safeActive === index + 1 || (slides.length === index + 1 && safeActive === 0));
          return (
            <div
              key={index}
              className={
                'screensaver-slide' +
                (safeActive === index ? ' -active' : '') +
                (wasActive ? ' -prev' : '')
              }
              style={{
                ...(slide.bg ? { backgroundImage: `url(${slideBgUrl(slide.bg)})` } : {}),
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

      {slides.length ? (
        <ScreensaverControls
          buttons={
            conf.buttons ?? [{ type: 'previous' }, { type: 'play_pause' }, { type: 'next' }]
          }
          position={conf.buttonsPosition ?? 'bottom-center'}
          paused={paused}
          onAction={handleControl}
        />
      ) : null}
    </div>
  );
}
