# BotLance Voice Bridge

Standalone Railway-deployable media bridge for real phone calls in BotLance Voice AI.

This service is intentionally **not** another BotLance backend. It owns only the long-lived realtime transport layer:

- Twilio bidirectional Media Streams WebSocket
- Per-call connection state
- Audio relay between telephony and the selected realtime AI provider
- Calling BotLance internal APIs for bootstrap, tool execution, and lifecycle updates
- Health/readiness endpoints and safe operational logs

BotLance remains the control plane for agents, Knowledge Base, AI Actions, trusted context, memory, quotas, sessions, billing/entitlements, and customer configuration.

## V0.1 scope

This first package establishes the production boundary without touching the working BotLance browser Voice AI:

1. Fastify HTTP server
2. `/health` and `/ready`
3. `GET /v1/media/twilio` WebSocket endpoint
4. Twilio Media Streams parser
5. Per-call in-memory session object
6. BotLance service client contract
7. AI runtime interface
8. OpenAI realtime adapter shell
9. Gemini adapter shell
10. graceful cleanup and lifecycle events

The current bridge **does not configure Twilio numbers or modify BotLance**. Those are later integration steps after this service is deployed and verified.

## Required BotLance internal contract

The bridge expects these future BotLance service endpoints:

- `POST /api/internal/voice/bridge/bootstrap`
- `POST /api/internal/voice/bridge/tool`
- `POST /api/internal/voice/bridge/state`

Every request is authenticated with `Authorization: Bearer <BOTLANCE_BRIDGE_SERVICE_SECRET>`.

`bootstrap` should return the canonical server-authored configuration for a single call. The Railway service never constructs system instructions, Knowledge Base assignments, AI Action permissions, or trusted context on its own.

## Twilio transport

The media endpoint is:

`wss://YOUR-RAILWAY-DOMAIN/v1/media/twilio`

Twilio should open it using `<Connect><Stream>`. The short-lived BotLance bridge token must be sent as a `<Parameter>` so it arrives inside Twilio's `start.customParameters`.

Twilio Media Streams uses mono `audio/x-mulaw` at 8000 Hz. The bridge preserves that media format at the telephony boundary.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

## Security boundary

- Do not put customer Twilio credentials in Railway global environment variables.
- Do not expose the BotLance bridge service secret to Twilio or a browser.
- Do not duplicate BotLance Knowledge Base or AI Actions in this service.
- Do not persist raw audio by default.
- Per-call bridge tokens must be short-lived and single-purpose.
