import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { loadConfig } from "./config.js";
import { logger } from "./lib/logger.js";
import { BotLanceClient } from "./services/botlance-client.js";
import { DefaultAiRuntimeFactory } from "./ai/factory.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerTwilioMediaRoute } from "./routes/twilio-media.js";

const config = loadConfig();

const app = Fastify({
  logger: false,
  trustProxy: true,
  bodyLimit: 256 * 1024,
});

await app.register(websocket, {
  options: {
    maxPayload: 1024 * 1024,
    perMessageDeflate: false,
  },
});

const botlance = new BotLanceClient(config);
const aiFactory = new DefaultAiRuntimeFactory();

await registerHealthRoutes(app);
await registerTwilioMediaRoute(app, {
  botlance,
  aiFactory,
  logger,
});

app.setErrorHandler((error, _request, reply) => {
  logger.error({ error: error.message }, "Unhandled HTTP error.");
  reply.status(500).send({ error: "Internal server error." });
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down Voice Bridge.");
  try {
    await app.close();
  } finally {
    process.exit(0);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({
  port: config.PORT,
  host: config.HOST,
});

logger.info(
  { port: config.PORT, host: config.HOST },
  "BotLance Voice Bridge started.",
);
