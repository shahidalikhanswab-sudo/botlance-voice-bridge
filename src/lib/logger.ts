export interface Logger {
  info(meta: Record<string, unknown>, message: string): void;
  warn(meta: Record<string, unknown>, message: string): void;
  error(meta: Record<string, unknown>, message: string): void;
}

function sanitize(meta: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...meta };
  for (const key of Object.keys(copy)) {
    if (/token|secret|authorization|api[_-]?key/i.test(key)) {
      copy[key] = "[redacted]";
    }
  }
  return copy;
}

function write(level: string, meta: Record<string, unknown>, message: string) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...sanitize(meta),
  };
  console.log(JSON.stringify(payload));
}

export const logger: Logger = {
  info: (meta, message) => write("info", meta, message),
  warn: (meta, message) => write("warn", meta, message),
  error: (meta, message) => write("error", meta, message),
};
