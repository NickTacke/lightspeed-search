import pino, { type Logger } from "pino";
import type { Env } from "../env.ts";

export function createLogger(env: Env): Logger {
  const isDev = env.NODE_ENV === "development";

  return pino({
    level: env.LOG_LEVEL,
    base: {
      service: "aidey-api",
      env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...(isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss.l" },
          },
        }
      : {}),
  });
}

export type AppLogger = Logger;
