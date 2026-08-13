import { describe, expect, it } from 'vitest';
import { buildHistoryDatasets } from './history';

const NOW = 1700000000000;

function states(list: Array<[string, string]>) {
  return list.map(([state, last_changed]) => ({ state, last_changed }));
}

describe('buildHistoryDatasets', () => {
  it('numeric series gets a linear axis and trailing current point', () => {
    const model = buildHistoryDatasets(
      [states([['20', '2024-01-01T00:00:00Z'], ['21', '2024-01-01T01:00:00Z']])],
      [{ name: 'Temp', unit: '°C', currentState: '22' }],
      NOW,
    );
    expect(model.datasets).toHaveLength(1);
    expect(model.datasets[0].label).toBe('Temp / °C');
    expect(model.datasets[0].yAxisID).toBe('linear-°C');
    expect(model.datasets[0].data).toHaveLength(3);
    expect(model.datasets[0].data[2].x).toBe(NOW);
    expect(model.datasets[0].data[2].y).toBe('22');
    expect(model.yAxes['linear-°C'].type).toBe('linear');
    expect(model.interactionMode).toBe('index');
  });

  it('on/off series gets a category axis with on/off labels', () => {
    const model = buildHistoryDatasets(
      [states([['off', '2024-01-01T00:00:00Z']])],
      [{ name: 'Power', currentState: 'off' }],
      NOW,
    );
    expect(model.datasets[0].yAxisID).toBe('category-');
    expect(model.yAxes['category-'].type).toBe('category');
    expect(model.yAxes['category-'].labels).toEqual(['on', 'off']);
  });

  it('two series with the same unit share one axis', () => {
    const model = buildHistoryDatasets(
      [states([['a', '2024-01-01T00:00:00Z']]), states([['b', '2024-01-01T00:00:00Z']])],
      [
        { name: 'A', unit: 'V', currentState: 'a' },
        { name: 'B', unit: 'V', currentState: 'b' },
      ],
      NOW,
    );
    expect(Object.keys(model.yAxes)).toEqual(['category-V']);
    expect(model.datasets.map((d) => d.yAxisID)).toEqual(['category-V', 'category-V']);
  });

  it('uses nearest interaction mode for multiple datasets', () => {
    const model = buildHistoryDatasets(
      [states([['20', '2024-01-01T00:00:00Z']]), states([['1', '2024-01-01T00:00:00Z']])],
      [
        { name: 'A', currentState: '21' },
        { name: 'B', currentState: '2' },
      ],
      NOW,
    );
    expect(model.interactionMode).toBe('nearest');
  });

  it('pads single non-on/off label with empty strings', () => {
    const model = buildHistoryDatasets(
      [states([['home', '2024-01-01T00:00:00Z']])],
      [{ name: 'Zone', currentState: 'home' }],
      NOW,
    );
    expect(model.yAxes['category-'].labels).toEqual(['', 'home', '']);
  });
});