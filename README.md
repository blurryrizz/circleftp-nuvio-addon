# CircleFTP Nuvio Addon

An unofficial Node.js addon that exposes supported CircleFTP video entries through the Stremio Addon Protocol, for use with compatible clients such as Nuvio.

This project is designed for a network that can reach CircleFTP over BDIX. The addon server itself must be able to connect to the CircleFTP API.

## Requirements

- Node.js 20+
- A BDIX-connected network that can reach `new.circleftp.net`
- npm

## Run locally

```bash
npm install
npm test
npm start
```

By default the addon listens on port `7000`. Open:

- `http://localhost:7000/manifest.json`

For a device on the same Wi-Fi/LAN, use the computer's LAN IP instead of `localhost`, for example:

- `http://192.168.1.10:7000/manifest.json`

The actual IP depends on your network. Allow the port through Windows Firewall only for your private network.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `7000` | HTTP server port |
| `CIRCLEFTP_API_BASE` | `http://new.circleftp.net:5000` | CircleFTP API origin (without the `/api` suffix) |
| `CIRCLEFTP_TIMEOUT_MS` | `15000` | API request timeout |
| `ADDON_ID` | `community.circleftp.only` | Addon identifier |
| `ADDON_NAME` | `CircleFTP` | Display name |
| `ADDON_VERSION` | `0.1.0` | Addon version |

## Project structure

- `index.mjs` — server entry point
- `src/config.js` — environment configuration
- `src/circleftp/client.js` — CircleFTP API client
- `src/circleftp/normalize.js` — response normalization
- `src/addon/manifest.js` — addon manifest
- `src/addon/builder.js` — catalog, metadata and stream handlers
- `test/` — automated tests

## Network and playback notes

- GitHub stores the source code; it does not run the addon.
- A cloud host outside the BDIX network may be unable to reach CircleFTP. Test API access from the actual host before choosing a deployment provider.
- CircleFTP may return plain HTTP media URLs. Some clients or players may restrict HTTP playback; test on the target Nuvio device.
- The addon only returns provider URLs. It does not download, proxy, or host video files.
- Only supported video and series entries should be exposed. Non-video downloads such as APKs and archives must not be treated as playable media.

## Status

This is an early implementation. Validate the live CircleFTP API response shape and stream URLs on the user's BDIX connection before treating it as production-ready.
