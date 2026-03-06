type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "debug";

function formatTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatMessage(level: LogLevel, category: string, message: string, meta?: Record<string, unknown>): string {
  const ts = formatTimestamp();
  const color = LEVEL_COLORS[level];
  const tag = `${color}${level.toUpperCase().padEnd(5)}${RESET}`;
  const cat = category ? `${DIM}[${category}]${RESET} ` : "";
  const metaStr = meta ? ` ${DIM}${JSON.stringify(meta)}${RESET}` : "";
  return `${DIM}${ts}${RESET} ${tag} ${cat}${message}${metaStr}`;
}

function createLogger(category: string) {
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("debug")) console.debug(formatMessage("debug", category, message, meta));
    },
    info(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("info")) console.log(formatMessage("info", category, message, meta));
    },
    warn(message: string, meta?: Record<string, unknown>) {
      if (shouldLog("warn")) console.warn(formatMessage("warn", category, message, meta));
    },
    error(message: string, error?: unknown, meta?: Record<string, unknown>) {
      if (!shouldLog("error")) return;
      const errMeta = { ...meta };
      if (error instanceof Error) {
        errMeta.error = error.message;
        errMeta.stack = error.stack;
      } else if (error !== undefined) {
        errMeta.error = String(error);
      }
      console.error(formatMessage("error", category, message, errMeta));
    },
  };
}

export { createLogger };
export type Logger = ReturnType<typeof createLogger>;
