/// <reference types="vite/client" />

import type { DisplayMode } from './config/types';

declare global {
  interface Window {
    CONFIG?: unknown;
    openPage?: (index: number) => void;
    setDisplayMode?: (mode: DisplayMode) => void;
    toggleDisplayMode?: () => void;
    showScreensaver?: () => void;
    hideScreensaver?: () => void;
  }
}

export {};
