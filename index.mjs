import sdk from "stremio-addon-sdk";
import { loadConfig } from "./src/config.js";
import { CircleFtpClient } from "./src/circleftp/client.js";
import { createAddon } from "./src/addon/builder.js";

const config = loadConfig();
const client = new CircleFtpClient({
  baseUrl: config.apiBase,
  timeoutMs: config.timeoutMs
});
const addon = createAddon({ config, client });

sdk.serveHTTP(addon.getInterface(), { port: config.port });
console.log(`${config.addonName} addon listening on port ${config.port}`);
