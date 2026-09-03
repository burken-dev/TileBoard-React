import { lazy, Suspense, type CSSProperties } from 'react';
import type { TileConfig } from '../../config/types';
import { useAppStore } from '../../store';
import { entityTitle, getItemEntity } from '../../utils/entity';
import { getItemFieldValue } from '../../utils/fields';
import { useGraphData } from '../charts/useGraphData';

// ponytail: lazy Graph so the chart chunk only loads when the popup opens,
// not at startup (App mounts GraphPopup which returns null when closed).
const Graph = lazy(() => import('../charts/Graph'));

export default function GraphPopup() {
  const activeGraph = useAppStore((s) => s.activeGraph);
  if (!activeGraph) return null;
  return <GraphPopupContent item={activeGraph.item} />;
}

function GraphPopupContent({ item }: { item: TileConfig }) {
  const closeGraph = useAppStore((s) => s.closeGraph);
  const states = useAppStore((s) => s.entities);

  const entity = getItemEntity(item, states);
  const { model, options, isLoading, error } = useGraphData(item, entity, 'history');

  const classes = getItemFieldValue('history.classes', states, item, entity);
  const styles = (getItemFieldValue('history.styles', states, item, entity) ?? {}) as CSSProperties;

  return (
    <div
      className={
        'history-popup' +
        (classes ? ' ' + (Array.isArray(classes) ? classes.join(' ') : String(classes)) : '')
      }
    >
      <div className="history-popup-container" style={styles}>
        <div className="history-popup-title">
          <div className="history-popup-close" onClick={() => closeGraph()}>
            <i className="mdi mdi-close" />
          </div>
          {entityTitle(item, entity, states)}
        </div>
        <div className="history-popup-container history-popup-container--canvas">
          <div className="history-popup--canvas">
            <div className="history-popup--placeholder">
              {isLoading && !error && <span>Loading history data...</span>}
              {error && <span>{error}</span>}
            </div>
            {!isLoading && !error && model && (
              <Suspense fallback={null}>
                <Graph model={model} options={options} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}