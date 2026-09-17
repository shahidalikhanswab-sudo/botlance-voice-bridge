import type { WebSocket } from "ws";
import type { BotLanceClient } from "../services/botlance-client.js";
import type { AiRuntimeFactory, AiRuntime } from "../ai/types.js";
import type { BridgeBootstrapResponse } from "../types.js";
import type { Logger } from "../lib/logger.js";
import type { TwilioIncomingMessage, TwilioStartMessage } from "./twilio-types.js";

export class TwilioMediaSession {
  private startedAt = Date.now();
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private bootstrap: BridgeBootstrapResponse | null = null;
  private ai: AiRuntime | null = null;
  private closed = false;
  private maxDurationTimer: NodeJS.Timeout | null = null;
  private processedToolCalls = new Set<string>();

  constructor(
    private readonly socket: WebSocket,
    private readonly botlance: BotLanceClient,
    private readonly aiFactory: AiRuntimeFactory,
    private readonly logger: Logger,
  ) {}

  async handleRaw(raw: string): Promise<void> {
    let message: TwilioIncomingMessage;
    try {
      message = JSON.parse(raw) as TwilioIncomingMessage;
    } catch {
      this.logger.warn({}, "Ignoring malformed Twilio websocket payload.");
      return;
    }

    switch (message.event) {
      case "connected":
        return;
      case "start":
        await this.onStart(message);
        return;
      case "media":
        if (typeof message.media?.payload === "string") {
          this.ai?.appendTelephonyAudio(message.media.payload);
        }
        return;
      case "dtmf":
        this.logger.info(
          { callSid: this.callSid, digit: message.dtmf?.digit },
          "Received caller DTMF.",
        );
        return;
      case "mark":
        return;
      case "stop":
        await this.close("ended");
        return;
    }
  }

  private async onStart(message: TwilioStartMessage): Promise<void> {
    if (this.bootstrap) return;

    const start = message.start;
    this.streamSid = start.streamSid;
    this.callSid = start.callSid;

    if (
      start.mediaFormat?.encoding !== "audio/x-mulaw" ||
      start.mediaFormat?.sampleRate !== 8000 ||
      start.mediaFormat?.channels !== 1
    ) {
      throw new Error("Unsupported Twilio media format.");
    }

    const bridgeToken =
      start.customParameters?.bridgeToken ??
      start.customParameters?.bridge_token ??
      "";

    if (!bridgeToken) {
      throw new Error("Missing BotLance bridge token.");
    }

    this.logger.info(
      { callSid: this.callSid, streamSid: this.streamSid },
      "Twilio media stream started.",
    );

    const bootstrap = await this.botlance.bootstrap(bridgeToken, {
      provider: "twilio",
      callSid: start.callSid,
      streamSid: start.streamSid,
      accountSid: start.accountSid,
      from: start.customParameters?.from,
      to: start.customParameters?.to,
    });
    this.bootstrap = bootstrap;

    const ai = this.aiFactory.create(bootstrap.provider);
    this.ai = ai;

    await ai.connect(bootstrap, {
      onAudio: (payload) => this.sendAudio(payload),
      onToolCall: (call) => void this.handleTool(call.id, call.name, call.argumentsJson),
      onError: (error) => {
        this.logger.error(
          { callSid: this.callSid, error: error.message },
          "AI realtime transport error.",
        );
        void this.close("failed", "ai_provider_error", error.message);
      },
      onClose: () => {
        if (!this.closed) {
          void this.close("failed", "ai_provider_closed", "AI realtime connection closed.");
        }
      },
    });

    await this.botlance.reportState({
      callId: bootstrap.callId,
      voiceSessionId: bootstrap.voiceSessionId,
      state: "active",
      streamSid: this.streamSid ?? undefined,
      provider: bootstrap.provider,
    });

    if (bootstrap.maxDurationSeconds > 0) {
      this.maxDurationTimer = setTimeout(() => {
        void this.close("ended", "max_duration", "Maximum call duration reached.");
      }, bootstrap.maxDurationSeconds * 1000);
    }
  }

  private async handleTool(callId: string, name: string, argumentsJson: string): Promise<void> {
    const bootstrap = this.bootstrap;
    if (!bootstrap || this.processedToolCalls.has(callId)) return;
    this.processedToolCalls.add(callId);

    try {
      const result = await this.botlance.executeTool({
        callId: bootstrap.callId,
        voiceSessionId: bootstrap.voiceSessionId,
        toolCallId: callId,
        toolName: name,
        argumentsJson,
      });
      this.ai?.sendToolResult(callId, name, result.output);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool execution failed.";
      this.ai?.sendToolResult(callId, name, {
        ok: false,
        error: "The requested action is temporarily unavailable.",
      });
      this.logger.error(
        { callSid: this.callSid, toolName: name, error: message },
        "BotLance tool execution failed.",
      );
    }
  }

  private sendAudio(base64Mulaw8000: string): void {
    if (!this.streamSid || this.socket.readyState !== this.socket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        event: "media",
        streamSid: this.streamSid,
        media: { payload: base64Mulaw8000 },
      }),
    );
  }

  async close(
    state: "ended" | "failed" = "ended",
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    try {
      this.ai?.close();
    } catch {
      // best-effort
    }

    const bootstrap = this.bootstrap;
    if (bootstrap) {
      await this.botlance
        .reportState({
          callId: bootstrap.callId,
          voiceSessionId: bootstrap.voiceSessionId,
          state,
          streamSid: this.streamSid ?? undefined,
          provider: bootstrap.provider,
          errorCode,
          errorMessage,
          durationSeconds: Math.max(0, Math.round((Date.now() - this.startedAt) / 1000)),
        })
        .catch(() => undefined);
    }

    this.logger.info(
      { callSid: this.callSid, streamSid: this.streamSid, state },
      "Twilio media session closed.",
    );

    try {
      if (this.socket.readyState === this.socket.OPEN) {
        this.socket.close();
      }
    } catch {
      // best-effort
    }
  }
}
