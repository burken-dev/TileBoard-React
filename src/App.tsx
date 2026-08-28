import { lazy, Suspense, useEffect } from 'react';
import ConnectionOverlay from './components/ConnectionOverlay';
import Notifications from './components/Notifications';
import Pages from './components/Pages';
import Screensaver from './components/Screensaver';
import type { TileBoardConfig } from './config/types';
import { initConnection } from './ha/connection';
import { useAppStore } from './store';
import { bodyClasses } from './utils/layout';

const AlarmPopup = lazy(() => import('./components/popups/AlarmPopup'));
const CameraPopup = lazy(() => import('./components/popups/CameraPopup'));
const DatetimePopup = lazy(() => import('./components/popups/DatetimePopup'));
const DoorEntryPopup = lazy(() => import('./components/popups/DoorEntryPopup'));
const GraphPopup = lazy(() => import('./components/popups/GraphPopup'));
const IframePopup = lazy(() => import('./components/popups/IframePopup'));

interface AppProps {
  config: TileBoardConfig;
}

export default function App({ config }: AppProps) {
  const scrolled = useAppStore((s) => s.scrolled);

  useEffect(() => {
    initConnection();
  }, []);

  useEffect(() => {
    document.body.className = bodyClasses(config, scrolled).join(' ');
  }, [config, scrolled]);

  useEffect(() => {
    if (!config.autoReloadInterval || config.autoReloadInterval <= 0) return;
    const id = window.setInterval(
      () => window.location.reload(),
      config.autoReloadInterval * 1000,
    );
    return () => window.clearInterval(id);
  }, [config.autoReloadInterval]);

  return (
    <div className="page-container">
      <Pages />
      <Suspense fallback={null}>
        <DatetimePopup />
        <CameraPopup />
        <AlarmPopup />
        <DoorEntryPopup />
        <IframePopup />
        <GraphPopup />
      </Suspense>
      <Notifications />
      <Screensaver />
      <ConnectionOverlay />
    </div>
  );
}