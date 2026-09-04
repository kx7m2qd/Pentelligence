const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBoolean(value) {
  if (!value) return false;
  return TRUE_VALUES.has(String(value).trim().toLowerCase());
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

export const config = {
  port: Number.parseInt(process.env.PORT || "3001", 10),
  appPassword: String(process.env.APP_PASSWORD || "").trim(),
  groqApiKey: String(process.env.GROQ_API_KEY || "").trim(),
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  allowPrivateTargets: parseBoolean(process.env.ALLOW_PRIVATE_TARGETS),
  enableActiveExploitation: parseBoolean(process.env.ENABLE_ACTIVE_EXPLOITATION),
  maxConcurrentScans: Math.max(1, Number.parseInt(process.env.MAX_CONCURRENT_SCANS || "2", 10) || 2),
  sessionTtlHours: Math.min(720, Math.max(1, Number.parseInt(process.env.SESSION_TTL_HOURS || "24", 10) || 24)),
  discordWebhookUrl: String(process.env.DISCORD_WEBHOOK_URL || "").trim(),
};

export const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

export function validateProductionConfig() {
  if (config.appPassword && config.appPassword.length < 16) {
    throw new Error("APP_PASSWORD must be at least 16 characters when enabled");
  }
}
