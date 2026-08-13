export interface StaticMapOptions {
  provider: 'google' | 'mapbox' | 'yandex';
  lat: number;
  lon: number;
  zoom: number;
  widthPx: number;
  heightPx: number;
  state: string;
  friendlyName?: string;
  googleApiKey?: string | null;
  mapboxToken?: string | null;
  mapboxStyle?: string | null;
}

export function staticMapUrl(o: StaticMapOptions): string | null {
  const sizes = `${Math.ceil(o.widthPx)}x${Math.ceil(o.heightPx + 80)}`;
  const name = o.friendlyName || ' ';
  const state = o.state.toLowerCase();

  if (o.provider === 'yandex') {
    const coords = `${o.lon},${o.lat}`;
    let icon = 'round';
    if (state === 'home') icon = 'home';
    else if (state === 'office') icon = 'work';
    return (
      'https://static-maps.yandex.ru/1.x/?lang=en-US&ll=' +
      coords +
      '&z=' +
      o.zoom +
      '&l=map&size=' +
      sizes.replace('x', ',') +
      '&pt=' +
      coords +
      ',' +
      icon
    );
  }

  if (o.provider === 'mapbox') {
    if (!o.mapboxToken) return null;
    const label = name[0].toLowerCase();
    const marker = `pin-s-${label}(${o.lon},${o.lat})`;
    let style = 'mapbox/streets-v11';
    if (o.mapboxStyle) {
      const groups = /^mapbox:\/\/styles\/(.+)$/.exec(o.mapboxStyle);
      if (groups && groups.length > 1) style = groups[1];
    }
    const coords = `${o.lon},${o.lat}`;
    return (
      `https://api.mapbox.com/styles/v1/${style}/static/${marker}/${coords},${o.zoom},0/${sizes}` +
      `?access_token=${o.mapboxToken}`
    );
  }

  if (!o.googleApiKey) return null;
  const label = name[0].toUpperCase();
  const coords = `${o.lat},${o.lon}`;
  const marker = encodeURIComponent(`color:gray|label:${label}|${coords}`);
  return (
    'https://maps.googleapis.com/maps/api/staticmap?center=' +
    coords +
    '&zoom=' +
    o.zoom +
    '&size=' +
    sizes +
    '&scale=2&maptype=roadmap&markers=' +
    marker +
    '&key=' +
    o.googleApiKey
  );
}