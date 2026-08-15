import type { ScreensaverButtonConfig, ScreensaverConfig } from '../config/types';

function buttonIcon(button: ScreensaverButtonConfig, paused: boolean): string {
  if (button.type === 'play_pause') return paused ? 'mdi-play' : 'mdi-pause';
  if (button.icon) return button.icon;
  if (button.type === 'previous') return 'mdi-skip-previous';
  if (button.type === 'next') return 'mdi-skip-next';
  return 'mdi-circle';
}

function buttonLabel(button: ScreensaverButtonConfig, paused: boolean): string {
  if (button.type === 'previous') return 'Previous slide';
  if (button.type === 'play_pause') return paused ? 'Play slideshow' : 'Pause slideshow';
  if (button.type === 'next') return 'Next slide';
  return button.icon ?? 'Custom action';
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
  const visible = buttons.filter((b) => b.enabled !== false);
  if (!visible.length) return null;
  return (
    <div
      className={'screensaver-controls --' + position}
      onClick={(e) => e.stopPropagation()}
    >
      {visible.map((button, i) => {
        const label = buttonLabel(button, paused);
        return (
          <button
            key={i}
            className="screensaver-button"
            aria-label={label}
            title={label}
            onClick={() => onAction(button)}
          >
            <i className={'mdi ' + buttonIcon(button, paused)} />
          </button>
        );
      })}
    </div>
  );
}
