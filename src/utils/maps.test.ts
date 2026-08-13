import { describe, expect, it } from 'vitest';
import { staticMapUrl } from './maps';

const base = {
  lat: 51.5,
  lon: -0.12,
  zoom: 13,
  widthPx: 300,
  heightPx: 300,
  state: 'home',
  friendlyName: 'Home',
};

describe('staticMapUrl', () => {
  it('google builds full static map URL', () => {
    const url = staticMapUrl({ ...base, provider: 'google', googleApiKey: 'KEY' });
    expect(url).toContain('https://maps.googleapis.com/maps/api/staticmap');
    expect(url).toContain('center=51.5,-0.12');
    expect(url).toContain('zoom=13');
    expect(url).toContain('size=300x380');
    expect(url).toContain('scale=2&maptype=roadmap');
    expect(url).toContain('markers=' + encodeURIComponent('color:gray|label:H|51.5,-0.12'));
    expect(url).toContain('&key=KEY');
  });

  it('google returns null without api key', () => {
    expect(staticMapUrl({ ...base, provider: 'google' })).toBeNull();
  });

  it('mapbox builds URL with default style and lowercase marker', () => {
    const url = staticMapUrl({ ...base, provider: 'mapbox', mapboxToken: 'TOKEN' });
    expect(url).toBe(
      'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-h(-0.12,51.5)/-0.12,51.5,13,0/300x380?access_token=TOKEN',
    );
  });

  it('mapbox uses custom style path', () => {
    const url = staticMapUrl({
      ...base,
      provider: 'mapbox',
      mapboxToken: 'TOKEN',
      mapboxStyle: 'mapbox://styles/foo/bar',
    });
    expect(url).toContain('styles/v1/foo/bar/static');
  });

  it('mapbox returns null without token', () => {
    expect(staticMapUrl({ ...base, provider: 'mapbox' })).toBeNull();
  });

  it('yandex builds URL with home icon', () => {
    const url = staticMapUrl({ ...base, provider: 'yandex' });
    expect(url).toContain('https://static-maps.yandex.ru/1.x/?lang=en-US');
    expect(url).toContain('ll=-0.12,51.5');
    expect(url).toContain('z=13');
    expect(url).toContain('size=300,380');
    expect(url).toContain('pt=-0.12,51.5,home');
  });

  it('yandex uses work icon for office state', () => {
    const url = staticMapUrl({ ...base, provider: 'yandex', state: 'office' });
    expect(url).toContain(',work');
  });
});