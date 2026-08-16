/*
 This is an example configuration file.

 COPY OR RENAME THIS FILE TO config.js in the public directory.

 It is loaded at runtime by the browser (window.CONFIG) — no build step needed.
 Make sure you use real IDs from your HA entities.
*/

var CONFIG = {
   customTheme: null, // 'transparent', 'material', 'mobile', 'compact', 'homekit', 'winphone', 'win95'
   transition: 'animated_gpu', // 'animated' or 'simple' (better performance)
   entitySize: 'normal', // 'small', 'big' are available
   tileSize: 150,
   tileMargin: 6,
   serverUrl: 'http://' + location.hostname + ':8123',
   wsUrl: 'ws://' + location.hostname + ':8123/api/websocket',
   authToken: null, // optional long-lived token (CAUTION: only if TileBoard is not exposed to the internet)
   //googleApiKey: "XXXXXXXXXX", // Required if you are using Google Maps for device tracker
   //mapboxToken: "XXXXXXXXXX", // Required if you are using Mapbox for device tracker
   debug: false, // Prints entities and state change info to the console.
   pingConnection: true, // ping connection to prevent silent disconnections

   // next fields are optional
   events: [],
   timeFormat: 24,
   /* autoReloadInterval: seconds between full page reloads (optional) */
   //autoReloadInterval: 3600,
   /* scripts: extra scripts to load before the app renders (optional) */
   //scripts: ['https://cdn.jsdelivr.net/npm/exif-js'],
   /* locale: date-fns locale name, e.g. 'sv-se' (optional) */
   //locale: 'sv-se',
   menuPosition: 'left', // or 'bottom'
   hideScrollbar: false, // horizontal scrollbar
   groupsAlign: 'horizontally', // or 'vertically'
   onReady: function () {},

   header: {
      styles: {
         padding: '30px 130px 0',
         fontSize: '28px'
      },
      right: [],
      left: [
         {
            type: 'datetime',
            dateFormat: 'EEEE, LLLL dd',
         }
      ]
   },

   /*screensaver: {// optional
      timeout: 300, // after 5 mins of inactive
      slidesTimeout: 10, // 10s for one slide
      slideCacheBust: 300, // append a rolling cache-bust query to slide bgs (optional)
      styles: { fontSize: '40px' },
      ambient_backdrop: true, // show slide contained, with a blurred grayscale version behind it
      leftBottom: [{ type: 'datetime' }], // put datetime to the left-bottom of screensaver
      rightBottom: [{ type: 'photo_date' }], // show the EXIF date of the current slide
      slides: [
         { bg: 'config/images/bg1.jpeg' },
         {
            bg: 'config/images/bg2.png',
            rightTop: [ // put text to the 2nd slide
               {
                  type: 'custom_html',
                  html: 'Welcome to the <b>TileBoard</b>',
                  styles: { fontSize: '40px' }
               }
            ]
         },
         { bg: 'config/images/bg3.jpg' }
      ]
   },*/

   pages: [
      {
         title: 'Main page',
         bg: 'config/images/bg1.jpeg',
         icon: 'mdi-home-outline', // home icon
         groups: [
            {
               title: 'First group',
               width: 2,
               height: 3,
               items: [
                  {
                     position: [0, 0],
                     width: 2,
                     type: 'text_list',
                     id: {}, // using empty object for an unknown id
                     state: false, // disable state element
                     list: [
                        {
                           title: 'Sun.sun state',
                           icon: 'mdi-weather-sunny',
                           value: '&sun.sun.state'
                        },
                        {
                           title: 'Custom',
                           icon: 'mdi-clock-outline',
                           value: 'value'
                        }
                     ]
                  },
                  {
                     position: [0, 1], // [x, y]
                     width: 1,
                     type: 'sensor',
                     id: 'updater.updater',
                     state: '@attributes.release_notes'
                  }
               ]
            },

            {
               title: 'Second group',
               width: 2,
               height: 3,
               items: [
                  {
                     position: [0, 0],
                     width: 1,
                     type: 'slider',
                     //id: "input_number.volume",
                     id: {state: 50}, // replace it with real string id
                     state: false,
                     title: 'Custom slider',
                     subtitle: 'Example of subtitle',
                     slider: {
                        min: 0,
                        max: 100,
                        step: 2,
                        request: {
                           type: "call_service",
                           domain: "input_number",
                           service: "set_value",
                           field: "value"
                        }
                     }
                  },
                  {
                     position: [1, 0],
                     width: 1,
                     type: 'switch',
                     //id: "switch.lights",
                     id: {state: 'off'}, // replace it with real string id (e.g. "switch.lights")
                     state: false,
                     title: 'Custom switch',
                     icons: {'off': 'mdi-volume-off', 'on': 'mdi-volume-high'}
                  },
                  {
                     position: [0, 1],
                     type: 'alarm',
                     //id: "alarm_control_panel.home_alarm",
                     id: { state: 'disarmed' }, // replace it with real string id
                     title: 'Home Alarm',
                     icons: {
                        disarmed: 'mdi-bell-off',
                        pending: 'mdi-bell',
                        armed_home: 'mdi-bell-plus',
                        armed_away: 'mdi-bell',
                        triggered: 'mdi-bell-ring'
                     },
                     states: {
                        disarmed: 'Disarmed',
                        pending: 'Pending',
                        armed_home: 'Armed home',
                        armed_away: 'Armed away',
                        triggered: 'Triggered'
                     }
                  }

               ]
            },

            {
               title: '',
               width: 1,
               height: 3,
               items: [
                  {
                     // please read README.md for more information
                     // this is just an example
                     position: [0, 0],
                     height: 2, // 1 for compact
                     //classes: ['-compact'],
                     type: 'weather',
                     id: {},
                     state: function () {return 'Sunny'},
                     icon: 'clear-day',
                     icons: { 'clear-day': 'clear'},
                     fields: {
                        summary: 'Sunny',
                        temperature: '18',
                        temperatureUnit: 'C',
                        windSpeed: '5',
                        windSpeedUnit: 'kmh',
                        humidity: '50',
                        humidityUnit: '%',
                        list: [
                           'Feels like 16 C'
                           /*
                           'Feels like '
                              + '&sensor.dark_sky_apparent_temperature.state'
                              + '&sensor.dark_sky_apparent_temperature.attributes.unit_of_measurement',

                           'Pressure '
                              + '&sensor.dark_sky_pressure.state'
                              + '&sensor.dark_sky_pressure.attributes.unit_of_measurement',

                           '&sensor.dark_sky_precip_probability.state'
                              + '&sensor.dark_sky_precip_probability.attributes.unit_of_measurement'
                              + ' chance of rain'
                           */
                        ]
                     }
                  }

               ]
            }
         ]
      },
      {
         title: 'Second page',
         bg: 'config/images/bg2.png',
         icon: 'mdi-numeric-2-box-outline',
         groups: [
            {
               title: '',
               width: 2,
               height: 3,
               items: [
                  {
                     position: [0, 0],
                     width: 2,
                     title: 'Short instruction',
                     type: 'text_list',
                     id: {}, // using empty object for an unknown id
                     state: false, // disable state element
                     list: [
                        {
                           title: 'Read',
                           icon: 'mdi-numeric-1-box-outline',
                           value: 'README.md'
                        },
                        {
                           title: 'Ask on forum',
                           icon: 'mdi-numeric-2-box-outline',
                           value: 'home-assistant.io'
                        },
                        {
                           title: 'Open an issue',
                           icon: 'mdi-numeric-3-box-outline',
                           value: 'github.com'
                        }
                     ]
                  },
                  {
                     position: [0, 1.5],
                     width: 1.5,
                     height: 1,
                     title: 'My Gauge Title',
                     subtitle: '',
                     type: 'gauge',
                     id: 'sensor.my_sample_sensor', // Assign the sensor you want to display on the gauge
                     value: function(item, entity) {
                        return entity.state;
                     },
                     settings: {
                        size: 200, // Defaults to 50% of either height or width, whichever is smaller
                        type: 'full', // Options are: 'full', 'semi', and 'arch'. Defaults to 'full'
                        min: 0, // Defaults to 0
                        max: 25000, // Defaults to 100
                        cap: 'round', // Options are: 'round', 'butt'. Defaults to 'butt'
                        thick: 8, // Defaults to 6
                        label: 'My Gauge', // Defaults to undefined
                        append: '@attributes.unit_of_measurement', // Defaults to undefined
                        prepend: '$', // Defaults to undefined
                        duration: 1500, // Defaults to 1500ms
                        thresholds: { 0: { color: 'green'}, 80: { color: 'red' } }, // Defaults to undefined
                        labelOnly: false, // Defaults to false
                        foregroundColor: 'rgba(0, 150, 136, 1)', // Defaults to rgba(0, 150, 136, 1)
                        backgroundColor: 'rgba(0, 0, 0, 0.1)', // Defaults to rgba(0, 0, 0, 0.1)
                        fractionSize: 0, // Number of decimal places to round the number to. Defaults to current locale formatting
                     },
                  },
               ]
            },
         ]
      }
   ],
}