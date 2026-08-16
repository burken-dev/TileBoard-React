import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAppStore, getAppStore, useEntities } from './index';

function probe(ids: string[]) {
  const entities = useEntities(ids);
  return (
    <span>
      {entities['sensor.a']?.state ?? ''}|{entities['sensor.b']?.state ?? ''}
    </span>
  );
}

function Probe({ ids }: { ids: string[] }) {
  return probe(ids);
}

describe('useEntities', () => {
  it('re-renders when a watched entity changes', () => {
    createAppStore({ serverUrl: 'http://h', pages: [] });
    getAppStore().setEntities([{ entity_id: 'sensor.a', state: 'on', attributes: {} }]);
    const { container } = render(<Probe ids={['sensor.a']} />);
    expect(container.textContent).toBe('on|');
    act(() => {
      getAppStore().setEntities([
        { entity_id: 'sensor.a', state: 'off', attributes: {} },
        { entity_id: 'sensor.b', state: 'on', attributes: {} },
      ]);
    });
    expect(container.textContent).toBe('off|on');
  });

  it('refreshes with other entities when a subscribed id never appears', () => {
    createAppStore({ serverUrl: 'http://h', pages: [] });
    getAppStore().setEntities([]);
    const { container } = render(<Probe ids={['never.present']} />);
    expect(container.textContent).toBe('|');
    act(() => {
      getAppStore().setEntities([{ entity_id: 'sensor.a', state: 'x', attributes: {} }]);
    });
    expect(container.textContent).toBe('x|');
  });

  it('does not re-render when only unrelated entities change', () => {
    createAppStore({ serverUrl: 'http://h', pages: [] });
    const a = { entity_id: 'sensor.a', state: 'on', attributes: {} };
    const b = { entity_id: 'sensor.b', state: 'off', attributes: {} };
    getAppStore().setEntities([a]);
    let renders = 0;
    function CountingProbe() {
      renders++;
      const entities = useEntities(['sensor.a']);
      return <span>{entities['sensor.a']?.state ?? ''}</span>;
    }
    render(<CountingProbe />);
    expect(renders).toBe(1);
    act(() => {
      getAppStore().setEntities([a, b]);
    });
    expect(renders).toBe(1);
    act(() => {
      getAppStore().setEntities([{ ...a, state: 'off' }, b]);
    });
    expect(renders).toBe(2);
  });
});