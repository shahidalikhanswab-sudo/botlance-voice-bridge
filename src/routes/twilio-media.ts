import type { FastifyInstance } from "fastify";
import type { BotLanceClient } from "../services/botlance-client.js";
import type { AiRuntimeFactory } from "../ai/types.js";
import type { Logger } from "../lib/logger.js";
import { TwilioMediaSession } from "../telephony/twilio-session.js";

export async function registerTwilioMediaRoute(
  app: FastifyInstance,
  deps: {
    botlance: BotLanceClient;
    aiFactory: AiRuntimeFactory;
    logger: Logger;
  },
) {
  app.get("/v1/media/twilio", { websocket: true }, (socket) => {
    const session = new TwilioMediaSession(
      socket,
      deps.botlance,
      deps.aiFactory,
      deps.logger,
    );

    socket.on("message", (payload) => {
      void session.handleRaw(payload.toString()).catch((error) => {
        const message = error instanceof Error ? error.message : "Bridge session failed.";
        deps.logger.error({ error: message }, "Twilio stream handler failed.");
        void session.close("failed", "stream_handler_failed", message);
      });
    });

    socket.on("close", () => {
      void session.close("ended");
    });

    socket.on("error", (error) => {
      deps.logger.error({ error: error.message }, "Twilio WebSocket error.");
      void session.close("failed", "twilio_websocket_error", error.message);
    });
  });
}
