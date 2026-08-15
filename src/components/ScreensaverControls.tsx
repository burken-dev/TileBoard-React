import type { ScreensaverButtonConfig, ScreensaverConfig } from '../config/types';

function buttonIcon(button: ScreensaverButtonConfig, paused: boolean): string {
  if (button.type === 'play_pause') return paused ? 'mdi-play' : 'mdi-pause';
  if (button.icon) return button.icon;
  if (button.type === 'previous') return 'mdi-skip-previous';
  if (button.type === 'next') return 'mdi-skip-next';
  return 'mdi-circle';
}

export default function ScreensaverControls({
  buttons,
  position,
  paused,
  onAction,
}: {
  buttons: ScreensaverButtonConfig[];
  position: NonNullable<ScreensaverConfig['buttonsPosition']>;
  paused: boolean;
  onAction: (button: ScreensaverButtonConfig) => void;
}) {
  return (
    <div
      className={'screensaver-controls --' + position}
      onClick={(e) => e.stopPropagation()}
    >
      {buttons
        .filter((b) => b.enabled !== false)
        .map((button, i) => (
          <button key={i} className="screensaver-button" onClick={() => onAction(button)}>
            <i className={'mdi ' + buttonIcon(button, paused)} />
          </button>
        ))}
    </div>
  );
}
