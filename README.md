# SteelSeries Sonar Controls for Stream Deck

A Stream Deck plugin for controlling [SteelSeries Sonar](https://steelseries.com/gg/sonar) from your keys and dials. You can change channel volumes, mute channels, switch input and output devices, and load a full audio setup with one press. It works in both of Sonar's modes, Classic and Streamer.

## Requirements

- Windows 10 or later
- Stream Deck 7.1 or later
- SteelSeries GG with Sonar enabled and running

The plugin finds Sonar automatically through SteelSeries GG, so there's nothing to set up. If Sonar isn't running, or is in the wrong mode for an action, the key shows an alert triangle.

## Actions

### Classic mode

| Action | Controller | What it does |
| --- | --- | --- |
| Volume dial | Dial | Turn to change a channel's volume, press to mute it, and tap the touch strip to move to the next channel. |
| Set sonar volume | Key | Raises or lowers a channel's volume by a set step (5% by default). Can show the new volume as the key title. |
| Mute sonar channel | Key | Mutes or unmutes a channel. The key shows the current mute state. |
| Switch sound output of sonar channel | Key | Sends a channel to a different playback device. |
| Switch sound input of sonar channel | Key | Changes the microphone device. Also works in Streamer mode. |
| Load a preset sonar configuration | Key | Applies a saved setup in one press: devices and volumes for the Game, Chat, Media, Aux and Mic channels. Empty fields are left as they are. |
| Switch sound output of sonar channel legacy | Key | The original switch-output action, kept so keys set up with older versions keep working. Use the newer action for new keys. |

Channels: Master, Game, Chat, Media, Aux and Mic.

### Streamer mode

In Streamer mode, Sonar has two mixes: **Streaming** (what your audience hears) and **Monitoring** (what you hear).

| Action | Controller | What it does |
| --- | --- | --- |
| Streamer: Volume dial | Dial | Turn to change a channel's volume in either mix, press to mute it, and tap the touch strip to move to the next channel. |
| Streamer: Mix toggle dial | Dial | Like the volume dial, but tapping the touch strip switches between the Streaming and Monitoring mix. |
| Streamer: Set volume | Key | Raises or lowers a channel's volume in either mix by a set step. |
| Streamer: Mute channel | Key | Mutes or unmutes a channel in either mix. |
| Streamer: Switch stream output | Key | Changes which device a mix plays on. |
| Streamer: Listen to stream mix | Key | Switches your headset between your personal mix and the Streaming mix, so you can hear what your audience hears. It also updates when you change this in the Sonar app. |

## Development

You need Node.js 20 or later and the [Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/intro), which is installed with the other dev dependencies.

```sh
npm install
npm run build   # bundle src/ into the .sdPlugin/bin folder
npm run watch   # rebuild and restart the plugin in Stream Deck on every change
npm run pack    # create a .streamDeckPlugin file for installing or sharing
npm test        # run the tests
```

To load your local build in Stream Deck, link the plugin folder once:

```sh
npx streamdeck link com.stellar.steelseries-sonar-controls.sdPlugin
```

Most tests are integration tests that talk to the Sonar running on your PC, so they change your real audio settings. The Streamer tests only pass when Sonar is in Streamer mode.

### Project layout

```
src/
  plugin.ts          registers the actions and connects to Stream Deck
  actions/classic/   Classic mode actions
  actions/streamer/  Streamer mode actions
  actions/legacy/    the legacy switch-output action
  managers/          Sonar discovery and API clients for each mode
  types/             channels, devices and Sonar API shapes
com.stellar.steelseries-sonar-controls.sdPlugin/
  manifest.json      plugin and action definitions
  ui/                property inspector pages
  imgs/              icons
sonar-swagger.json   reference for Sonar's local API
```

This plugin isn't affiliated with or endorsed by SteelSeries or Elgato.
