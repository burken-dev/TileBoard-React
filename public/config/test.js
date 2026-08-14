/*
  Test config for TileBoard development.
  Load with:  ?config=test
  Covers every tile type across 4 pages/groups with varied layouts, backed by
  mock entities that match the Home Assistant websocket entity shape.
  mock.interval controls how often simulated updates fire (ms).
*/
var CONFIG = {
   customTheme: null,
   transition: 'animated_gpu',
   entitySize: 'normal',
   tileSize: 150,
   tileMargin: 6,
   serverUrl: window.location.origin,
   authToken: null,
   debug: false,
   pingConnection: false,
   timeFormat: 24,
   menuPosition: 'left',
   hideScrollbar: false,
   groupsAlign: 'horizontally',

   mock: {
      interval: 2000,
      entities: [
         // ---- numeric sensors (jittered by the simulator) ----
         { entity_id: 'sensor.outdoor_temperature', state: '18.5', attributes: { unit_of_measurement: '°C', friendly_name: 'Outdoor temperature' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.living_room_humidity', state: '45', attributes: { unit_of_measurement: '%', friendly_name: 'Living room humidity' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.energy_consumption', state: '1234.5', attributes: { unit_of_measurement: 'kWh', friendly_name: 'Energy consumption' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.battery_level', state: '87', attributes: { unit_of_measurement: '%', friendly_name: 'Battery level' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.my_sample_sensor', state: '12345', attributes: { friendly_name: 'Sample sensor' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- weather sensors ----
         { entity_id: 'sensor.weather_temperature', state: '18', attributes: { unit_of_measurement: '°C', friendly_name: 'Temperature' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_humidity', state: '62', attributes: { unit_of_measurement: '%', friendly_name: 'Humidity' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_wind_speed', state: '12', attributes: { unit_of_measurement: 'km/h', friendly_name: 'Wind speed' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_pressure', state: '1013', attributes: { unit_of_measurement: 'hPa', friendly_name: 'Pressure' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_summary', state: 'Partly Cloudy', attributes: { friendly_name: 'Summary' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_icon', state: 'partly-cloudy-day', attributes: { friendly_name: 'Icon' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_apparent_temperature', state: '17', attributes: { unit_of_measurement: '°C', friendly_name: 'Apparent temperature' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_precip_probability', state: '20', attributes: { unit_of_measurement: '%', friendly_name: 'Precip probability' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // 3-day forecast sensors for weather_list
         { entity_id: 'sensor.weather_day_high_1d', state: '21', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 1 high' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_low_1d', state: '12', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 1 low' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_icon_1d', state: 'rain', attributes: { friendly_name: 'Day 1 icon' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_high_2d', state: '19', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 2 high' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_low_2d', state: '11', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 2 low' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_icon_2d', state: 'cloudy', attributes: { friendly_name: 'Day 2 icon' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_high_3d', state: '17', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 3 high' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_low_3d', state: '10', attributes: { unit_of_measurement: '°C', friendly_name: 'Day 3 low' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'sensor.weather_day_icon_3d', state: 'snow', attributes: { friendly_name: 'Day 3 icon' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- sensor_icon (binary-style state) ----
         { entity_id: 'sensor.hot_water', state: 'on', attributes: { friendly_name: 'Hot water' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- inputs ----
         { entity_id: 'input_number.volume', state: '50', attributes: { min: 0, max: 100, step: 1, friendly_name: 'Volume' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'input_select.house_mode', state: 'Normal', attributes: { options: ['Normal', 'Vacation', 'Sick', 'Travel'], friendly_name: 'House mode' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'input_select.climate_mode', state: 'Auto', attributes: { options: ['Auto', 'Cool', 'Heat', 'Dry', 'Fan only'], friendly_name: 'Climate mode' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'input_datetime.both_date_and_time', state: '2026-08-14 12:30:00', attributes: { has_date: true, has_time: true, friendly_name: 'Date & time' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'input_boolean.play_radio', state: 'off', attributes: { friendly_name: 'Play radio' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- switches / cover / fan / lock ----
         { entity_id: 'switch.kitchen_spotlights', state: 'off', attributes: { friendly_name: 'Kitchen spotlights' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'switch.outdoor_lights', state: 'off', attributes: { friendly_name: 'Outdoor lights' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'switch.intercom', state: 'off', attributes: { friendly_name: 'Intercom' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'cover.garage_door', state: 'closed', attributes: { current_position: 0, friendly_name: 'Garage door' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'cover.living_room_blinds', state: 'open', attributes: { current_position: 100, friendly_name: 'Living room blinds' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'fan.living_room_fan', state: 'on', attributes: { speed_list: ['off', 'low', 'medium', 'high'], speed: 'medium', percentage: 66, supported_features: 1, friendly_name: 'Living room fan' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'lock.front_door', state: 'locked', attributes: { friendly_name: 'Front door' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- lights ----
         { entity_id: 'light.living_room_lamp', state: 'on', attributes: { brightness: 200, color_temp: 300, min_mireds: 153, max_mireds: 588, rgb_color: [255, 150, 50], supported_features: 1, friendly_name: 'Living room lamp' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'light.floor_lamp', state: 'off', attributes: { supported_features: 1, friendly_name: 'Floor lamp' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- climate / media_player / alarm / vacuum ----
         { entity_id: 'climate.kitchen', state: 'heat', attributes: { current_temperature: 19, temperature: 21, preset_modes: ['none', 'eco', 'comfort'], preset_mode: 'comfort', hvac_modes: ['off', 'heat', 'cool', 'auto'], min_temp: 5, max_temp: 35, target_temp_step: 1, unit_of_measurement: '°C', friendly_name: 'Kitchen climate' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'media_player.living_room_speaker', state: 'playing', attributes: { supported_features: 1469, volume_level: 0.7, is_volume_muted: false, source_list: ['Spotify', 'Radio', 'Bluetooth'], source: 'Spotify', media_title: 'Hotel California', media_artist: 'Eagles', friendly_name: 'Living room speaker' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'alarm_control_panel.home_alarm', state: 'disarmed', attributes: { code_format: 'number', friendly_name: 'Home alarm' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'automation.sunrise_actions', state: 'on', attributes: { friendly_name: 'Sunrise actions' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'script.front_gate_open', state: 'off', attributes: { friendly_name: 'Open front gate' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'scene.movie_time', state: 'idle', attributes: { friendly_name: 'Movie time' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'vacuum.roborock', state: 'docked', attributes: { battery_level: 80, fan_speed: 'Balanced', status: 'Docked', supported_features: 4351, friendly_name: 'Roborock' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         // ---- camera / device tracker / weather ----
         { entity_id: 'camera.front_gate', state: 'idle', attributes: { entity_picture: 'config/images/bg3.jpg', friendly_name: 'Front gate' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'device_tracker.phone', state: 'home', attributes: { latitude: 59.3293, longitude: 18.0686, source: 'gps', friendly_name: 'Phone' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' },
         { entity_id: 'weather.home', state: 'partlycloudy', attributes: { temperature: 18, humidity: 62, wind_speed: 12, pressure: 1013, friendly_name: 'Home weather' }, last_changed: '2026-08-14T10:00:00.000Z', last_updated: '2026-08-14T10:00:00.000Z' }
      ]
   },

   header: {
      styles: { padding: '30px 130px 0', fontSize: '28px' },
      left: [{ type: 'datetime', dateFormat: 'EEEE, LLLL dd' }],
      right: [{ type: 'custom_html', html: 'Test config — <b>?config=test</b>' }]
   },

   screensaver: {
      timeout: 120,
      slidesTimeout: 10,
      styles: { fontSize: '40px' },
      leftBottom: [{ type: 'datetime' }],
      slides: [
         { bg: 'config/images/bg1.jpeg' },
         { bg: 'config/images/bg2.png', rightTop: [{ type: 'custom_html', html: 'Slide <b>2</b>', styles: { fontSize: '40px' } }] },
         { bg: 'config/images/bg3.jpg' }
      ]
   },

   events: [
      {
         command: 'hello',
         action: function (event) {
            this.addNotification({ type: 'info', title: 'Event', message: 'hello received' });
         }
      }
   ],

   pages: [
      {
         title: 'Core tiles',
         bg: 'config/images/bg1.jpeg',
         icon: 'mdi-home-outline',
         tileSize: 130,
         groups: [
            {
               title: 'Buttons & switches',
               width: 4,
               height: 4,
               items: [
                  { position: [0, 0], type: 'switch', id: 'switch.kitchen_spotlights', title: 'Spotlights', subtitle: 'switch', icons: { on: 'mdi-lightbulb-on', off: 'mdi-lightbulb' }, states: { on: 'On', off: 'Off' } },
                  { position: [0, 1], type: 'switch', id: 'switch.outdoor_lights', title: 'Outdoor', subtitle: 'switch', icons: { on: 'mdi-lightbulb-on', off: 'mdi-lightbulb' } },
                  { position: [0, 2], type: 'input_boolean', id: 'input_boolean.play_radio', title: 'Radio', subtitle: 'input_boolean', icons: { on: 'mdi-stop', off: 'mdi-play' }, states: { on: 'Playing', off: 'Stopped' } },
                  { position: [0, 3], type: 'lock', id: 'lock.front_door', title: 'Front door', subtitle: 'lock', icons: { locked: 'mdi-lock', unlocked: 'mdi-lock-open' }, states: { locked: 'Locked', unlocked: 'Unlocked' } },
                  { position: [1, 0], type: 'script', id: 'script.front_gate_open', title: 'Gate', subtitle: 'script', icon: 'mdi-gate' },
                  { position: [1, 1], type: 'automation', id: 'automation.sunrise_actions', title: 'Sunrise', subtitle: 'automation', icon: 'mdi-weather-sunny' },
                  { position: [1, 2], type: 'scene', id: 'scene.movie_time', title: 'Movie time', subtitle: 'scene', icon: 'mdi-movie-roll', state: false },
                  { position: [1, 3], type: 'sensor_icon', id: 'sensor.hot_water', title: 'Hot water', subtitle: 'sensor_icon', icons: { on: 'mdi-hot-tub', off: 'mdi-hot-tub' }, states: { on: 'On', off: 'Off' } },
                  { position: [2, 0], width: 2, type: 'vacuum', id: 'vacuum.roborock', title: 'Roborock', subtitle: 'vacuum', icon: 'mdi-roomba', state: '@attributes.status' },
                  { position: [2, 2], type: 'custom', id: {}, title: 'Custom', subtitle: 'custom', icon: 'mdi-monitor', state: false, customHtml: '<b>Hi</b>' },
                  { position: [3, 0], width: 2, height: 2, type: 'gauge', id: 'sensor.my_sample_sensor', title: 'Energy', subtitle: 'gauge', state: false, settings: { type: 'full', min: 0, max: 25000, thick: 8, label: 'kWh', append: ' W', thresholds: { 0: { color: 'green' }, 80: { color: 'red' } } } }
               ]
            },
            {
               title: 'Light & climate',
               width: 4,
               height: 4,
               items: [
                  { position: [0, 0], width: 2, type: 'light', id: 'light.living_room_lamp', title: 'Floor lamp', subtitle: 'light', icons: { on: 'mdi-lightbulb-on', off: 'mdi-lightbulb' }, states: { on: 'On', off: 'Off' }, colorpicker: true, sliders: [
                     { title: 'Brightness', field: 'brightness', min: 0, max: 255, step: 5, request: { type: 'call_service', domain: 'light', service: 'turn_on', field: 'brightness' } },
                     { title: 'Color temp', field: 'color_temp', min: 153, max: 588, step: 15, request: { type: 'call_service', domain: 'light', service: 'turn_on', field: 'color_temp' } }
                  ] },
                  { position: [2, 0], type: 'dimmer_switch', id: 'light.floor_lamp', title: 'Dimmer', subtitle: 'dimmer_switch', icon: 'mdi-lightbulb-on' },
                  { position: [3, 0], height: 2, type: 'climate', id: 'climate.kitchen', title: 'Kitchen', subtitle: 'climate', unit: 'C', state: function (item, entity) { return 'Target ' + entity.attributes.temperature; } },
                  { position: [0, 1], type: 'cover', id: 'cover.garage_door', title: 'Garage', subtitle: 'cover', icons: { open: 'mdi-garage-open', closed: 'mdi-garage' } },
                  { position: [1, 1], type: 'cover_toggle', id: 'cover.living_room_blinds', title: 'Blinds', subtitle: 'cover_toggle', icons: { open: 'mdi-blinds-open', closed: 'mdi-blinds' } },
                  { position: [2, 1], type: 'fan', id: 'fan.living_room_fan', title: 'Fan', subtitle: 'fan', icon: 'mdi-fan' },
                  { position: [3, 1], type: 'alarm', id: 'alarm_control_panel.home_alarm', title: 'Home alarm', subtitle: 'alarm', icons: { disarmed: 'mdi-bell-off', pending: 'mdi-bell', armed_home: 'mdi-bell-plus', armed_away: 'mdi-bell', triggered: 'mdi-bell-ring' }, states: { disarmed: 'Disarmed', pending: 'Pending', armed_home: 'Armed home', armed_away: 'Armed away', triggered: 'Triggered' } }
               ]
            },
            {
               title: 'Inputs & sensors',
               width: 4,
               height: 4,
               items: [
                  { position: [0, 0], type: 'sensor', id: 'sensor.outdoor_temperature', title: 'Outdoor', subtitle: 'sensor', unit: 'C' },
                  { position: [1, 0], type: 'sensor', id: 'sensor.living_room_humidity', title: 'Humidity', subtitle: 'sensor' },
                  { position: [0, 1], type: 'sensor', id: 'sensor.energy_consumption', title: 'Energy', subtitle: 'sensor' },
                  { position: [1, 1], type: 'sensor', id: 'sensor.battery_level', title: 'Battery', subtitle: 'sensor' },
                  { position: [2, 0], type: 'slider', id: 'input_number.volume', title: 'Volume', subtitle: 'slider', unit: '%', slider: { min: 0, max: 100, step: 1, request: { type: 'call_service', domain: 'input_number', service: 'set_value', field: 'value' } } },
                  { position: [2, 1], type: 'input_number', id: 'input_number.volume', title: 'Input number', subtitle: 'input_number', icon: 'mdi-numeric' },
                  { position: [3, 0], type: 'input_select', id: 'input_select.house_mode', title: 'House mode', subtitle: 'input_select', icons: { Normal: 'mdi-home', Vacation: 'mdi-palm-tree', Sick: 'mdi-medical-bag', Travel: 'mdi-airplane' } },
                  { position: [3, 1], type: 'input_select', id: 'input_select.climate_mode', title: 'Climate mode', subtitle: 'input_select', state: false },
                  { position: [0, 2], width: 2, type: 'input_datetime', id: 'input_datetime.both_date_and_time', title: 'Date & time', subtitle: 'input_datetime', state: false },
                  { position: [2, 2], type: 'sensor_icon', id: 'sensor.battery_level', title: 'Battery icon', subtitle: 'sensor_icon', icon: 'mdi-battery' }
               ]
            }
         ]
      },
      {
         title: 'Media & lists',
         bg: 'config/images/bg2.png',
         icon: 'mdi-numeric-2-box-outline',
         tileSize: 150,
         groups: [
            {
               title: 'Media & weather',
               width: 4,
               height: 3,
               items: [
                  { position: [0, 0], width: 2, height: 2, type: 'media_player', id: 'media_player.living_room_speaker', title: 'Speaker', subtitle: 'media_player', state: false, hideSource: false, hideMuteButton: false },
                  { position: [2, 0], height: 2, type: 'weather', id: 'weather.home', subtitle: 'weather', icon: '&sensor.weather_icon.state', icons: { 'clear-day': 'clear', 'cloudy': 'cloudy', 'rain': 'rain', 'snow': 'snow', 'partly-cloudy-day': 'partlycloudy' }, fields: {
                     summary: '&sensor.weather_summary.state',
                     temperature: '&sensor.weather_temperature.state',
                     temperatureUnit: '&sensor.weather_temperature.attributes.unit_of_measurement',
                     windSpeed: '&sensor.weather_wind_speed.state',
                     windSpeedUnit: '&sensor.weather_wind_speed.attributes.unit_of_measurement',
                     humidity: '&sensor.weather_humidity.state',
                     humidityUnit: '&sensor.weather_humidity.attributes.unit_of_measurement',
                     apparentTemperature: '&sensor.weather_apparent_temperature.state',
                     apparentTemperatureUnit: '&sensor.weather_apparent_temperature.attributes.unit_of_measurement',
                     pressure: '&sensor.weather_pressure.state',
                     pressureUnit: '&sensor.weather_pressure.attributes.unit_of_measurement',
                     precipProbability: '&sensor.weather_precip_probability.state',
                     precipProbabilityUnit: '&sensor.weather_precip_probability.attributes.unit_of_measurement'
                  } },
                  { position: [0, 2], type: 'image', id: {}, title: 'Image', subtitle: 'image', url: 'config/images/bg5.jpg' },
                  { position: [2, 2], width: 2, type: 'sensor', id: 'sensor.outdoor_temperature', title: 'Outdoor', subtitle: 'sensor (filter)', filter: function (value) { return value + ' C'; } }
               ]
            },
            {
               title: 'Lists',
               width: 4,
               height: 3,
               items: [
                  { position: [0, 0], width: 2, height: 2, type: 'text_list', id: {}, title: 'House', subtitle: 'text_list', state: false, list: [
                     { title: 'Outdoor', icon: 'mdi-thermometer', value: '&sensor.outdoor_temperature.state &sensor.outdoor_temperature.attributes.unit_of_measurement' },
                     { title: 'Humidity', icon: 'mdi-water-percent', value: '&sensor.living_room_humidity.state &sensor.living_room_humidity.attributes.unit_of_measurement' },
                     { title: 'Energy', icon: 'mdi-lightning-bolt', value: '&sensor.energy_consumption.state &sensor.energy_consumption.attributes.unit_of_measurement' },
                     { title: 'Weather', icon: 'mdi-weather-partly-cloudy', value: '&sensor.weather_summary.state' }
                  ] },
                  { position: [2, 0], width: 2, height: 2, type: 'weather_list', id: {}, title: 'Forecast', subtitle: 'weather_list', hideHeader: false, icons: { 'clear-day': 'clear', 'cloudy': 'cloudy', 'rain': 'rain', 'snow': 'snow', 'partly-cloudy-day': 'partlycloudy' }, list: [
                     { date: 'Tomorrow', icon: '&sensor.weather_day_icon_1d.state', primary: '&sensor.weather_day_low_1d.state - &sensor.weather_day_high_1d.state&sensor.weather_day_high_1d.attributes.unit_of_measurement', secondary: '&sensor.weather_day_high_1d.attributes.unit_of_measurement' },
                     { date: 'Day 2', icon: '&sensor.weather_day_icon_2d.state', primary: '&sensor.weather_day_low_2d.state - &sensor.weather_day_high_2d.state&sensor.weather_day_high_2d.attributes.unit_of_measurement', secondary: '&sensor.weather_day_high_2d.attributes.unit_of_measurement' },
                     { date: 'Day 3', icon: '&sensor.weather_day_icon_3d.state', primary: '&sensor.weather_day_low_3d.state - &sensor.weather_day_high_3d.state&sensor.weather_day_high_3d.attributes.unit_of_measurement', secondary: '&sensor.weather_day_high_3d.attributes.unit_of_measurement' }
                  ] },
                  { position: [0, 2], width: 4, type: 'text_list', id: {}, title: 'Gauge target', subtitle: 'text_list (2)', state: false, list: [
                     { title: 'Sample', icon: 'mdi-gauge', value: '&sensor.my_sample_sensor.state' }
                  ] }
               ]
            }
         ]
      },
      {
         title: 'Network & cameras',
         bg: 'config/images/bg3.jpg',
         icon: 'mdi-numeric-3-box-outline',
         tileSize: 160,
         groups: [
            {
               title: 'Cameras',
               width: 4,
               height: 4,
               items: [
                  { position: [0, 0], width: 2, height: 2, type: 'camera', id: 'camera.front_gate', subtitle: 'camera', refresh: 5000, bgSize: 'cover' },
                  { position: [2, 0], type: 'camera_thumbnail', id: 'camera.front_gate', title: 'Thumbnail', subtitle: 'camera_thumbnail', state: false, bgSize: 'cover', fullscreen: { type: 'camera', refresh: 1500, bgSize: 'contain' }, refresh: 5000 },
                  { position: [3, 0], type: 'camera_stream', id: 'camera.front_gate', title: 'Stream', subtitle: 'camera_stream', state: false, objFit: 'contain' },
                  { position: [0, 2], width: 2, height: 2, type: 'device_tracker', id: 'device_tracker.phone', title: 'Phone', subtitle: 'device_tracker', map: 'yandex', states: { home: 'Home', not_home: 'Away', office: 'Office' }, zoomLevels: [13], slidesDelay: 1 },
                  { position: [2, 2], type: 'iframe', id: {}, title: 'Iframe', subtitle: 'iframe', state: false, url: 'https://example.com', refresh: 10000 },
                  { position: [3, 2], type: 'popup_iframe', id: {}, title: 'Popup iframe', subtitle: 'popup_iframe', state: false, customHtml: '<b>Tap to open</b>', url: 'https://example.com' }
               ]
            },
            {
               title: 'Door entry',
               width: 2,
               height: 4,
               items: [
                  { position: [0, 0], width: 2, type: 'door_entry', id: {}, title: 'Door entry', subtitle: 'door_entry', state: false, icon: 'mdi-phone', layout: {
                     camera: { type: 'camera', id: 'camera.front_gate', refresh: 1500, bgSize: 'cover' },
                     tiles: [
                        { position: [0, 0], type: 'switch', id: 'switch.intercom', title: 'Intercom', states: { on: 'Active', off: 'Idle' }, icons: { on: 'mdi-phone-in-talk', off: 'mdi-phone' } },
                        { position: [0, 1], type: 'script', id: 'script.front_gate_open', title: 'Open gate', icon: 'mdi-gate', state: false },
                        { position: [0, 2], type: 'switch', id: 'switch.outdoor_lights', title: 'Lights', states: { on: 'On', off: 'Off' }, icons: { on: 'mdi-lightbulb-on', off: 'mdi-lightbulb' } }
                     ]
                  } }
               ]
            }
         ]
      },
      {
         title: 'Layout torture',
         bg: 'config/images/bg5.jpg',
         icon: 'mdi-numeric-4-box-outline',
         tileSize: 110,
         tileMargin: 4,
         groupMarginCss: 'margin: 24px;',
         groups: [
            {
               title: 'Mixed sizes',
               width: 6,
               height: 3,
               items: [
                  { position: [0, 0], width: 1, height: 2, type: 'sensor', id: 'sensor.outdoor_temperature', title: 'Tall', subtitle: 'sensor' },
                  { position: [1, 0], width: 2, type: 'switch', id: 'switch.kitchen_spotlights', title: 'Wide', subtitle: 'switch' },
                  { position: [3, 0], type: 'sensor', id: 'sensor.living_room_humidity', title: 'Normal', subtitle: 'sensor' },
                  { position: [4, 0], width: 2, type: 'weather', id: 'weather.home', classes: ['-compact'], subtitle: 'weather (-compact)', icon: '&sensor.weather_icon.state', icons: { 'partly-cloudy-day': 'partlycloudy', 'rain': 'rain' }, fields: {
                     summary: '&sensor.weather_summary.state',
                     temperature: '&sensor.weather_temperature.state',
                     temperatureUnit: '&sensor.weather_temperature.attributes.unit_of_measurement'
                  } },
                  { position: [1, 1], type: 'cover_toggle', id: 'cover.living_room_blinds', title: 'Blinds', subtitle: 'cover_toggle' },
                  { position: [2, 1], type: 'input_boolean', id: 'input_boolean.play_radio', title: 'Radio', subtitle: 'input_boolean' },
                  { position: [3, 1], type: 'fan', id: 'fan.living_room_fan', title: 'Fan', subtitle: 'fan' },
                  { position: [4, 1], type: 'input_select', id: 'input_select.house_mode', title: 'Mode', subtitle: 'input_select' },
                  { position: [5, 1], type: 'light', id: 'light.floor_lamp', title: 'Lamp', subtitle: 'light' }
               ]
            },
            {
               title: 'Narrow column',
               width: 1,
               height: 4,
               items: [
                  { position: [0, 0], type: 'slider', id: 'input_number.volume', title: 'Vol', subtitle: 'slider', slider: { min: 0, max: 100, request: { type: 'call_service', domain: 'input_number', service: 'set_value', field: 'value' } } },
                  { position: [0, 1], type: 'sensor', id: 'sensor.battery_level', title: 'Bat', subtitle: 'sensor' },
                  { position: [0, 2], type: 'scene', id: 'scene.movie_time', title: 'Movie', subtitle: 'scene', icon: 'mdi-movie-roll', state: false },
                  { position: [0, 3], type: 'lock', id: 'lock.front_door', title: 'Lock', subtitle: 'lock' }
               ]
            },
            {
               title: 'Sparse group (overflow test)',
               width: 3,
               height: 1,
               items: [
                  { position: [0, 0], type: 'custom', id: {}, title: 'Only one tile', subtitle: 'custom', icon: 'mdi-information-outline', state: false, customHtml: '<i>sparse</i>' }
               ]
            }
         ]
      }
   ]
};