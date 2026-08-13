import type { HeaderConfig } from './types';

export const FEATURES = {
  LIGHT: {
    BRIGHTNESS: 1,
  },
  MEDIA_PLAYER: {
    PAUSE: 1,
    SEEK: 2,
    VOLUME_SET: 4,
    VOLUME_STEP: 1024,
    VOLUME_MUTE: 8,
    PREVIOUS_TRACK: 16,
    NEXT_TRACK: 32,
    YOUTUBE: 64,
    TURN_ON: 128,
    TURN_OFF: 256,
    STOP: 4096,
  },
  VACUUM: {
    TURN_ON: 1,
    TURN_OFF: 2,
    PAUSE: 4,
    STOP: 8,
    RETURN_HOME: 16,
    FAN_SPEED: 32,
    BATTERY: 64,
    STATUS: 128,
    SEND_COMMAND: 256,
    LOCATE: 512,
    CLEAN_SPOT: 1024,
    MAP: 2048,
    STATE: 4096,
    START: 8192,
  },
} as const;

export const GAUGE_DEFAULTS = {
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  foregroundColor: 'rgba(0, 150, 136, 1)',
  duration: 1500,
  thick: 6,
  type: 'full',
  min: 0,
  max: 100,
  cap: 'butt',
  thresholds: {},
  labelOnly: false,
  fractionSize: undefined as number | undefined,
} as const;

export const DEFAULT_HEADER: HeaderConfig = {
  styles: {
    padding: '30px 130px 0',
    fontSize: '28px',
  },
  left: [
    {
      type: 'datetime',
      dateFormat: 'EEEE, LLLL dd',
      styles: {
        margin: '0',
      },
    },
  ],
  right: [
    {
      type: 'custom_html',
      html: 'Welcome to the <b>TileBoard</b>',
      styles: {
        margin: '40px 0 0',
      },
    },
  ],
};