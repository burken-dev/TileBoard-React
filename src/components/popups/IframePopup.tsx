import type { CSSProperties } from 'react';
import { useAppStore } from '../../store';
import { entityTitle, getItemEntity } from '../../utils/entity';
import { getItemFieldValue } from '../../utils/fields';
import { callFunction } from '../../utils/functions';

export default function IframePopup() {
  const activeIframe = useAppStore((s) => s.activeIframe);
  const closeIframe = useAppStore((s) => s.closeIframe);
  const states = useAppStore((s) => s.entities);

  if (!activeIframe) return null;
  const entity = getItemEntity(activeIframe, states);
  if (!entity) return null;

  const classes = getItemFieldValue('iframeClasses', states, activeIframe, entity);
  const styles = (getItemFieldValue(
    'iframeStyles',
    states,
    activeIframe,
    entity,
  ) ?? {}) as CSSProperties;
  const url =
    typeof activeIframe.url === 'function'
      ? String(callFunction(activeIframe.url, [activeIframe, entity]))
      : activeIframe.url;

  return (
    <div
      className={
        'iframe-popup' +
        (classes ? ' ' + (Array.isArray(classes) ? classes.join(' ') : String(classes)) : '')
      }
    >
      <div className="iframe-popup-container" style={styles}>
        <div className="iframe-popup-title">
          <div className="iframe-popup-close" onClick={() => closeIframe()}>
            <i className="mdi mdi-close" />
          </div>
          {entityTitle(activeIframe, entity, states)}
        </div>
        <div className="iframe-popup--iframe">
          <iframe src={String(url ?? '')} frameBorder="0" />
        </div>
      </div>
    </div>
  );
}