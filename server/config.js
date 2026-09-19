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

const requestedAiProvider = String(process.env.AI_PROVIDER || "groq").trim().toLowerCase();
const aiProvider = requestedAiProvider === "ollama" ? "ollama" : "groq";
const groqApiKey = String(process.env.GROQ_API_KEY || "").trim();
const groqModel = String(process.env.GROQ_MODEL || "openai/gpt-oss-20b").trim();
const ollamaBaseUrl = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").trim().replace(/\/$/, "");
const ollamaModel = String(process.env.OLLAMA_MODEL || "llama3.1:8b").trim();

export const config = {
  port: Number.parseInt(process.env.PORT || "3001", 10),
  appPassword: String(process.env.APP_PASSWORD || "").trim(),
  aiProvider,
  aiEnabled: aiProvider === "ollama" || Boolean(groqApiKey),
  aiModel: aiProvider === "ollama" ? ollamaModel : groqModel,
  groqApiKey,
  groqModel,
  ollamaBaseUrl,
  ollamaModel,
  ollamaApiKey: String(process.env.OLLAMA_API_KEY || "").trim(),
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
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:4174",
  "http://127.0.0.1:4174",
];

export function validateProductionConfig() {
  if (config.appPassword && config.appPassword.length < 16) {
    throw new Error("APP_PASSWORD must be at least 16 characters when enabled");
  }
}
