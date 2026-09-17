import type { AppConfig } from "../config.js";
import type {
  BridgeBootstrapResponse,
  BridgeStateRequest,
  BridgeToolRequest,
  BridgeToolResponse,
} from "../types.js";

export class BotLanceClient {
  constructor(private readonly config: AppConfig) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(new URL(path, this.config.BOTLANCE_BASE_URL), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.BOTLANCE_BRIDGE_SERVICE_SECRET}`,
          "user-agent": "botlance-voice-bridge/0.1",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: "error",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          json && typeof json === "object" && "error" in json
            ? String((json as { error?: unknown }).error ?? "BotLance request failed")
            : "BotLance request failed";
        throw new Error(`${response.status}: ${message}`);
      }
      return json as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  bootstrap(bridgeToken: string, telephony: {
    provider: "twilio";
    callSid: string;
    streamSid: string;
    accountSid: string;
    from?: string;
    to?: string;
  }): Promise<BridgeBootstrapResponse> {
    return this.post("/api/internal/voice/bridge/bootstrap", {
      bridgeToken,
      telephony,
    });
  }

  executeTool(input: BridgeToolRequest): Promise<BridgeToolResponse> {
    return this.post("/api/internal/voice/bridge/tool", input);
  }

  reportState(input: BridgeStateRequest): Promise<{ ok: true }> {
    return this.post("/api/internal/voice/bridge/state", input);
  }
}
