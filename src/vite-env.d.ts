/// <reference types="vite/client" />

declare global {
  interface Window {
    CONFIG?: unknown;
    openPage?: (index: number) => void;
    showScreensaver?: () => void;
    hideScreensaver?: () => void;
  }
}

export {};