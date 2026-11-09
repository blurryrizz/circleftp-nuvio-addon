const DEFAULT_API_BASE = "http://new.circleftp.net:5000";

function normalizeBaseUrl(value, fallback) {
  const candidate = value || fallback;
  const url = new URL(candidate);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS API URLs are supported");
  }
  return url.toString().replace(/\/$/, "");
}

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 7000);
  const timeoutMs = Number(env.CIRCLEFTP_TIMEOUT_MS || 15000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    throw new Error("CIRCLEFTP_TIMEOUT_MS must be between 1000 and 120000");
  }

  return Object.freeze({
    port,
    timeoutMs,
    apiBase: normalizeBaseUrl(env.CIRCLEFTP_API_BASE, DEFAULT_API_BASE),
    addonId: env.ADDON_ID || "community.circleftp.only",
    addonName: env.ADDON_NAME || "CircleFTP",
    addonVersion: env.ADDON_VERSION || "0.1.0"
  });
}
