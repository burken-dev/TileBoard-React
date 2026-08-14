import { lazy, Suspense, useEffect } from 'react';
import Header from './components/Header';
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
const HistoryPopup = lazy(() => import('./components/popups/HistoryPopup'));
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

  return (
    <div className="page-container">
      <Header header={config.header} />
      <Pages />
      <Suspense fallback={null}>
        <DatetimePopup />
        <CameraPopup />
        <AlarmPopup />
        <DoorEntryPopup />
        <IframePopup />
        <HistoryPopup />
      </Suspense>
      <Notifications />
      <Screensaver />
    </div>
  );
}