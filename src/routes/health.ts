import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    service: "botlance-voice-bridge",
    version: "0.1.0",
  }));

  app.get("/ready", async () => ({
    ok: true,
    service: "botlance-voice-bridge",
  }));
}
