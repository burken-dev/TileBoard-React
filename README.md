# TileBoard

This is a simple yet highly customizable dashboard for Home Assistant. The main goal of this project was to create a simple dashboard with an easy way to edit and add functionality with minimum knowledge of javascript and html.

This repository is a React + TypeScript rewrite of the original AngularJS [TileBoard](https://github.com/resoai/TileBoard) by [resoai](https://github.com/resoai). All configuration formats, tile types, and behaviors from the original have been ported; the config file keeps the same shape, but uses plain string literals instead of the legacy global constants.

Should you have any ideas or questions please post them on the home-assistant forum or create an issue on github.

## Links

* [Original TileBoard](https://github.com/resoai/TileBoard)
* [Discussion on Home Assistant Community](https://community.home-assistant.io/t/new-dashboard-for-ha/57173)
* [Demo Video](https://youtu.be/L8JwzWNAPr8)

## Screenshots

![screen](./images/screenshots/default.png)
![screen](./images/screenshots/transparent.png)
![screen](./images/screenshots/homekit.jpg)

## How to use

* Make sure that you have Home Assistant 0.77 or greater installed as only new authentication system is supported from now on
* Clone/download this repository
* Install dependencies and build: `npm install`, `npm run build`
* Create a directory called `tileboard` inside `www` directory in HA's config path and copy the contents of `dist/` there
* TileBoard will be available at `http://HASS_IP:8123/local/tileboard/` and will prompt you for your login credentials after restarting Home Assistant

For development against a local Home Assistant instance run `npm run dev` and open the printed URL.

## Docker

A Docker image is provided. It builds the app and serves the static files with nginx on port `80`.

```sh
docker build -t tileboard .
docker run -d \
  -p 8080:80 \
  -v /path/to/config:/usr/share/nginx/html/config:ro \
  --name tileboard \
  tileboard
```

Then open `http://localhost:8080`.

If you previously mounted single files (at `/usr/share/nginx/html/config.js` and `/usr/share/nginx/html/styles/custom.css`), put those files into a mounted `config/` folder instead.

The image ships defaults inside `config/`: `config.js` (a copy of the example),
an empty `config/styles/custom.css`, the `config/manifest.webmanifest`, and
example backgrounds in `config/images/`. Mount your own `config/` folder to
override any of them at once:

* `config/config.js` — your dashboard configuration. Start from the shipped example (`/usr/share/nginx/html/config/config.example.js`) if you want a reference.
* `config/styles/custom.css` — your custom CSS, loaded at runtime (see *Custom CSS Styles* below). The image ships an empty placeholder so the no-mount default is clean; include `styles/custom.css` (even empty) in your mounted folder to avoid a 404.
* `config/images/` — any additional images your config references (reference them as `config/images/...`).
* `config/manifest.webmanifest` — the PWA manifest.

Everything else under the served root is bundled and should not be overridden.

## Configuration

TileBoard is configured with a `config.js` file that sets the global `window.CONFIG`. It is loaded at runtime, so editing it does not require a rebuild.

* **Development:** copy `public/config/config.example.js` to `public/config/config.js`
* **Deployed build:** copy `dist/config/config.example.js` to `dist/config/config.js` (before or after `npm run build`)
* **Docker:** mount your own `config/` folder at `/usr/share/nginx/html/config` (see the Docker section)

Every field is optional unless noted. The full config object:

```js
var CONFIG = {
   /* customTheme: specify a custom theme for your dashboard.
    * Valid options: null, 'transparent', 'material', 'mobile', 'compact',
    * 'homekit', 'winphone', 'win95', 'fresh-air', 'white-paper',
    * or a custom theme you have created. Array supported.
    */
   customTheme: null,
   /* transition: The transition effect used between pages.
    * Valid options: 'animated', 'animated_gpu', 'simple'
    */
   transition: 'animated',
   /* tileSize: The default size (in pixels) of a tile */
   tileSize: 100,
   /* tileMargin: The default margin (in pixels) between tiles */
   tileMargin: 10,
   /* entitySize: Enum size of tile's content ('small', 'normal', 'big') */
   entitySize: 'normal',
   /* groupMarginCss: CSS margin statement to override the default margin for groups */
   groupMarginCss: '20px 40px',
   /* serverUrl: The URL to your HomeAssistant server */
   serverUrl: 'http://hassio.local:8123',
   /* authToken: Optional long-lived token that you can create in your HomeAssistant.
    * Only recommended when TileBoard is not exposed to the internet.
    */
   authToken: null,
   /* pingConnection: Set to false to disable pinging of the websocket connection.
    * Otherwise, a ping will be sent every five seconds, and if a response is not
    * received in 3 seconds, a reconnect will be attempted. Defaults to true.
    */
   pingConnection: true,
   /* debug: Toggle for extra debugging information (state changes, entities). */
   debug: false,
   /* timeFormat: 12 for AM/PM marker, 24 for 24 hour time (default) */
   timeFormat: 24,

   /* googleApiKey: Required if you use device tracker tiles with Google Maps.
    * https://developers.google.com/maps/documentation/maps-static/usage-and-billing
    */
   googleApiKey: null,
   /* mapboxToken: Required if you use device tracker tiles with Mapbox.
    * https://www.mapbox.com/account/access-tokens/
    */
   mapboxToken: null,
   /* mapboxStyle: Style URL to change the mapbox style for device tracker tiles.
    * Format: mapbox://styles/username/style-id. Defaults to mapbox/streets-v11.
    */
   mapboxStyle: null,
   /* menuPosition: 'left' (default) or 'bottom' */
   menuPosition: 'left',
   /* hideScrollbar: Hide the horizontal scrollbar */
   hideScrollbar: false,
   /* groupsAlign: Align groups 'horizontally' (default) or 'vertically' */
   groupsAlign: 'horizontally',

   /* Called when connected to the API and the state has been fetched.
    * Can be called multiple times in case of reconnecting.
    */
   onReady: function () {},

   /* pages: A list of page objects. See documentation on Pages below */
   pages: [],
   /* events: A list of events. See documentation on Events below */
   events: [],
   /* screensaver: A digital picture frame with a clock. Appears when
    * the dashboard has been idle. (optional)
    */
   screensaver: {
     /* timeout: Idle time (in seconds) before the screensaver will show */
     timeout: 300,
     /* slidesTimeout: Amount of time (in seconds) to show each slide */
     slidesTimeout: 10,
     styles: { fontSize: '40px' },
     /* corner items for the static screensaver content */
     leftBottom: [{ type: 'datetime' }],
     /* slides: Array of slide objects (bg + optional corner items) */
     slides: [
       { bg: 'images/bg1.jpeg' },
       { bg: 'images/bg2.png' },
       { bg: 'images/bg3.jpg' }
     ]
   },

   /* header: object of header. Will be applied globally. (optional) */
   header: {
      styles: { padding: '30px 130px 0', fontSize: '28px' },
      left: [{ type: 'datetime', dateFormat: 'EEEE, LLLL dd' }],
      right: [{ type: 'custom_html', html: 'Welcome to the <b>TileBoard</b>' }]
   },
   /* notiesPosition: position of the toast notifications: 'left' or 'right' (default) */
   notiesPosition: 'right',
   /* ignoreErrors: suppress connection error toasts and unknown-entity warnings */
   ignoreErrors: false,
   /* doorEntryTimeout: seconds before the door entry popup closes automatically */
   doorEntryTimeout: 60,
}
```

### Pages

Page object can have the following fields:

```js
{
  /* title: The page title (not currently used) */
  title: 'Page title',
  /* bg: Link to the background image */
  bg: 'images/bg1.jpg',
  /* icon: Page icon for the side menu */
  icon: 'mdi-home-outline',
  /* header: object of header for the current page (replaces the global one) */
  header: { /* same shape as the global header */ },
  /* tileSize: Override the global tileSize value for the current page (optional) */
  tileSize: 100,
  /* groupMarginCss: Override global groupMarginCss for the current page (optional) */
  groupMarginCss: '20px 40px',
  /* hidden: hide page (optional). Boolean or function returning a boolean. */
  hidden: false,
  /* groups: A list of tile groups. See documentation on Tile Groups below */
  groups: []
}
```

### Tile Groups

We divide tiles (cells) into groups on every page. Group object can have the following fields:

```js
{
  /* title: Title to display above the group */
  title: 'Group title',
  /* width: Number of tiles horizontally (optional, can be calculated automatically) */
  width: 3,
  /* height: Number of tiles vertically (optional, can be calculated automatically) */
  height: 4,
  /* groupMarginCss: Override default margin of tiles for the current group (optional) */
  groupMarginCss: '20px 40px',
  /* hidden: hide group (optional). Boolean or function returning a boolean. */
  hidden: false,
  /* items: A list of Tile objects. See documentation on Tiles below */
  items: [],
}
```

### Tiles

Tile object. [Click here for some real-life examples](TILE_EXAMPLES.md)

```js
{
  /* position: The x,y position of the tile inside the group */
  position: [1, 0],
  /* type: The type of a tile. Valid types are listed below */
  type: 'device_tracker',
  /* id: The entity_id of the device from HomeAssistant (e.g. switch.xyz),
   * or an object literal with static fields for tiles without an entity
   */
  id: 'device_tracker.google_maps_228',
  // OPTIONAL
  /* title: Title for the entity. Uses the friendly_name from HomeAssistant
   * if not specified. Can be a string, a field string, or a function.
   */
  title: 'Tile title',
  /* subtitle: A subtitle to display on the tile */
  subtitle: 'Tile subtitle',
  /* width: How many tiles wide this tile should be (default=1) */
  width: 2,
  /* height: How many tiles tall this tile should be (default=1) */
  height: 2,
  /* states: Map a state from HomeAssistant to a different value to display. */
  states: { on: 'Enabled', off: 'Disabled' },
  states: function (item, entity) { return entity.state; },
  /* state: Set a custom state for the tile. Set to false to disable the state element. */
  state: 'Working',
  state: function (item, entity) { return entity.state; },
  /* icons: Map states to icons (object or function). Any material design icon
   * from https://materialdesignicons.com/ works.
   */
  icons: { on: 'mdi-volume-high', off: 'mdi-volume-off' },
  icons: function (item, entity) { return entity.attributes.icon; },
  /* icon: Set a static icon for a tile */
  icon: 'mdi-phone',
  /* bg: Link to a background image for the tile. @ and & prefixes explained below. */
  bg: '@attributes.entity_picture',
  /* bgSuffix: Same as bg, but with the serverUrl included */
  bgSuffix: '@attributes.entity_picture',
  /* bgOpacity: A decimal between 0 and 1 for the background opacity */
  bgOpacity: 0.5,
  /* slides: A list of slide images to use for the background (max 3) */
  slides: [{}, { bg: 'images/slide.jpg' }],
  /* action: Define a custom action on click, overriding the default for the type.
   * Called with (item, entity).
   */
  action: function (item, entity) { window.openPage(0); },
  /* secondaryAction: Define a custom secondary action (on long press, ~600 ms). */
  secondaryAction: function (item, entity) {},
  /* hidden: hide tile (optional). Boolean or function returning a boolean. */
  hidden: false,
  /* classes: A list of classes to append to the tile element (e.g. '-compact'). */
  classes: ['-compact'],
  /* customStyles: Additional styles, as an object or a function(item, entity)
   * returning an object.
   */
  customStyles: { 'background-color': '#FF0000' },
  customStyles: function (item, entity) { return { 'background-color': '#FF0000' }; },
  /* history: If present, a history chart popup opens on long press. */
  history: {
     entity: 'sensor.temperature', // Entity ID or array of IDs. Default: the tile's own id
     offset: 24 * 3600 * 1000 * 5, // Start point of the history counting from now. Default: one day
     options: { elements: { point: { radius: 3 } } }, // Chart.js options
     styles: { border: '1px solid red' }, // Styles for the popup container
     classes: '-my-class', // Classes for the popup container
  },
  /*** TILE SPECIFIC SETTINGS ***/
  /** type: 'sensor' **/
  value: '&sensor.bathroom_temp.state', // Override the sensor value
  unit: 'kWh', // Override the unit of measurement
  filter: function (value) { return value; }, // Filter/format the value
  /** type: 'device_tracker' **/
  slidesDelay: 2, // Delay before slide animation starts
  map: 'google', // Map provider: 'google', 'mapbox' or 'yandex'
  zoomLevels: [9, 13], // Zoom levels of the map slides
  hideEntityPicture: false, // Hide the entity picture slide
  /** type: 'text_list' **/
  list: [{ title: 'Kitchen temp', icon: 'mdi-home', value: '&sensor.kitchen_temp.state' }],
  /** type: 'media_player' **/
  hideSource: false, // Hide the source selector
  /** type: 'slider' **/
  filter: function (value) { return value; },
  bottom: true, // Put the slider at the bottom
  slider: {}, // Slider config, see below
  /** type: 'camera', 'camera_thumbnail', 'camera_stream' **/
  bgSize: 'cover',
  filter: function (url) { return url; }, // Filter the camera URL
  fullscreen: {}, // Object of type 'camera'/'camera_thumbnail' for fullscreen view
  refresh: 5000, // Refresh interval in ms (number or function)
  /** type: 'light' **/
  sliders: [{}], // List of slider objects, see below
  colorpicker: true, // Show the color picker (needs the rgb_color attribute)
  /** type: 'popup_iframe' / 'iframe' **/
  url: 'https://example.com', // String or function(item, entity)
  iframeStyles: {}, // Styles for the popup iframe container
  iframeClasses: [], // Classes for the popup iframe container
  refresh: 5000, // Reload interval for 'iframe' tiles (number or function)
  /** type: 'dimmer_switch' **/
  actionPlus: function (item, entity) {}, // Called with context on the plus button
  actionMinus: function (item, entity) {}, // Called with context on the minus button
  /** type: 'weather' / 'weather_list' **/
  fields: {}, // Object mapping available fields and their values, see below
  list: [], // Rows for 'weather_list'
  /** type: 'gauge' **/
  value: function (item, entity) { return entity.state; },
  settings: {
     size: 200, // Defaults to 50% of the smaller tile dimension
     type: 'full', // 'full', 'semi' or 'arch'
     min: 0,
     max: 25000,
     cap: 'round', // 'round' or 'butt'
     thick: 8,
     label: 'My Gauge',
     append: '@attributes.unit_of_measurement',
     prepend: '$',
     duration: 1500,
     thresholds: { 0: { color: 'green' }, 80: { color: 'red' } },
     labelOnly: false,
     foregroundColor: 'rgba(0, 150, 136, 1)',
     backgroundColor: 'rgba(0, 0, 0, 0.1)',
     fractionSize: 0
  },
  /** type: 'alarm' **/
  /* the alarm popup keypad sends arm/disarm service calls to
   * alarm_control_panel automatically; a code is included when the entity
   * exposes a code_format attribute and a code was entered */
}
```

### Function context

Every anonymous function in a tile/config is called with a context (`this`) that exposes:

```js
{
   states: {}, // list of current entity states
   parseFieldValue: Function, // the @/& template parser
   callService: Function, // (domain, service, data) -> Promise; call a HA service
   sendMessage: Function, // (data) -> Promise; send a raw websocket message
   openPage: Function, // (index) -> void; switch to a page
}
```

Note: the legacy `api` service and `$scope` are gone — use `callService` instead of `api.callService`.

### Tile types

The `type` field accepts the following string literals:

```js
'device_tracker', 'script', 'automation', 'sensor', 'sensor_icon', 'switch', 'lock',
'cover', 'cover_toggle', 'fan', 'input_boolean', 'light', 'text_list', 'input_number',
'input_select', 'input_datetime', 'camera', 'camera_thumbnail', 'camera_stream', 'scene',
'slider', 'iframe', 'door_entry', 'weather', 'climate', 'media_player', 'custom', 'alarm',
'weather_list', 'vacuum', 'popup_iframe', 'dimmer_switch', 'gauge', 'image'
```

### Slider config (used for 'slider' tiles and 'light'.sliders)

```js
{
   title: "Color temp",
   field: "color_temp", // attribute to read
   max: 588,
   min: 153,
   step: 15,
   request: {
      type: "call_service",
      domain: "light",
      service: "turn_on",
      field: "color_temp"
   }
}
```

### Supported weather fields

```js
fields: {
   summary: '&sensor.dark_sky_summary.state',
   temperature: '&sensor.dark_sky_temperature.state',
   temperatureUnit: '&sensor.dark_sky_temperature.attributes.unit_of_measurement',
   highTemperature: '&sensor.dark_sky_daytime_high_temperature.state',
   highTemperatureUnit: '&sensor.dark_sky_daytime_high_temperature.attributes.unit_of_measurement',
   lowTemperature: '&sensor.dark_sky_overnight_low_temperature.state',
   lowTemperatureUnit: '&sensor.dark_sky_overnight_low_temperature.attributes.unit_of_measurement',
   windSpeed: '&sensor.dark_sky_wind_speed.state',
   windSpeedUnit: '&sensor.dark_sky_wind_speed.attributes.unit_of_measurement',
   humidity: '&sensor.dark_sky_humidity.state',
   humidityUnit: '&sensor.dark_sky_humidity.attributes.unit_of_measurement',
   list: [ // array of strings, rendered as extra lines
      'Feels like ' + '&sensor.dark_sky_apparent_temperature.state'
         + '&sensor.dark_sky_apparent_temperature.attributes.unit_of_measurement',
   ]
}
```

### @/& Prefixes

As you may notice we use `@`/`&` prefixes to get a value inside objects (entities).

* `@` is relative to the current entity: `@attributes.friendly_name`, `@state`
* `&` is global and requires at least three dot-separated segments: `&sensor.kitchen_temp.state`, `&sensor.kitchen_temp.attributes.unit_of_measurement`

Read more in the [original wiki article](https://github.com/resoai/TileBoard/wiki/Templates).

### Events

Events can be fired from Home Assistant to control TileBoard. Useful for automation to do things like opening a camera view if it detects motion, or turning the screen off on a tablet at night or when everyone leaves.

Events in HomeAssistant must be fired with `tileboard` as the event type, and a `command` included in the event data.

```js
events: [
    {
      /* command: The command sent from Home Assistant */
      command: 'screen_off',
      /* action: Function to execute when the command is received.
       * The argument contains the full event_data from HomeAssistant.
       */
      action: function (e) {
        window.hideScreensaver();
      },
    },
    {
      command: 'open_page',
      action: function (e) {
        window.openPage(e.page);
      }
    }
  ],
```

Example to fire an event in a [Home Assistant automation](https://www.home-assistant.io/docs/automation/). The page number is determined by the order of the pages in your CONFIG file, the first one is `0`:

```yaml
- alias: aquarium_ok
  initial_state: true
  trigger:
    platform: state
    entity_id: binary_sensor.seneye_param_status
    from: 'on'
    to: 'off'
  action:
    - event: tileboard
      event_data:
        page: 0
        command: 'open_page'
```

### Notifications

TileBoard has built-in support for toast notification popups in the lower corner. To set them up, add the following to `events` in `CONFIG`:

```js
{
   command: 'notify',
   action: function (e) {
      /* the event data maps directly to a notification:
       * { id, type, title, message, icon, lifetime } */
      this.addNotification(e);
   }
}
```

Example to fire a notification in a Home Assistant automation. This example fires a persistent red notification when a specific `binary_sensor` state changes from `on` to `off`:

```yaml
- alias: PC2_offline
  trigger:
    platform: state
    entity_id: binary_sensor.pc2
    from: 'on'
    to: 'off'
  action:
    - event: tileboard
      event_data:
        command: 'notify'
        id: 'PC2'
        icon: 'mdi-desktop-tower'
        type: 'error'
        title: 'Status - PC2'
        message: 'PC2 is offline, restart the left computer (big one)'
```

`id`: Notification ID. Sending multiple notifications with the same `id` overwrite each other (and reset the lifetime timer).

`type`: One of `error`, `info`, `success`, `warning`.

`lifetime`: Length of time (in seconds) for the notification to persist before automatically dismissing. Leave it out for persistent messages.

### Globals for automations

* `window.openPage(index)` — switch to the page at `index`
* `window.showScreensaver()` — force the screensaver on
* `window.hideScreensaver()` — force the screensaver off

## Custom CSS Styles

Several classes are added to each tile depending on the type of tile and state. Custom CSS styles can be applied by creating a `custom.css` file. It is loaded at runtime from `/config/styles/custom.css`, so no rebuild is needed:

* **Development:** place it at `public/config/styles/custom.css`
* **Deployed build:** place it at `dist/config/styles/custom.css`
* **Docker:** place it inside your mounted `config/styles/` folder

The body also carries `-theme-{name}` classes and layout classes (`-menu-left`, `-groups-align-horizontally`, ...) for styling.

## Themes

All legacy themes are supported via `customTheme`: `transparent`, `material`, `win95`, `winphone`, `mobile`, `compact`, `homekit`, `fresh-air`, `white-paper`. Multiple themes can be combined by using an array.

## Tablet and mobile configuration

For tablet configuration use the `'compact'` theme and reduce padding. For mobile setups check the [original wiki article](https://github.com/resoai/TileBoard/wiki/Mobile-configuration).

## Breaking changes vs the original

* String literals replace the legacy global constants (`TYPES.SWITCH` → `'switch'`, `CUSTOM_THEMES.HOMEKIT` → `'homekit'`, `TRANSITIONS.ANIMATED` → `'animated'`, ...).
* Function context has changed: no `$scope`, no `api`; use `callService(domain, service, data)`, `sendMessage(data)`, `parseFieldValue(value)`, `states`, `openPage(index)`.
* `window.openPage`, `window.showScreensaver`, `window.hideScreensaver` are the supported automation entry points.
* The `date` header item format uses date-fns tokens (the documented default `'EEEE, LLLL dd'` works as-is; exotic Angular tokens may need adjustment).

## Contribution

Please feel free to post an issue or pull request and we will sort it out.

## License

MIT License