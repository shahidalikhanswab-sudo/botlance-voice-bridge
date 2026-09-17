import WebSocket from "ws";
import type { AiRuntime, AiRuntimeCallbacks } from "./types.js";
import type { BridgeBootstrapResponse } from "../types.js";

export class OpenAiRealtimeRuntime implements AiRuntime {
  private ws: WebSocket | null = null;
  private callbacks: AiRuntimeCallbacks | null = null;

  async connect(config: BridgeBootstrapResponse, callbacks: AiRuntimeCallbacks): Promise<void> {
    this.callbacks = callbacks;

    const credential = config.providerCredential;
    if (!credential || credential.type !== "openai_realtime_ephemeral") {
      throw new Error("A short-lived OpenAI Realtime credential was not supplied by BotLance.");
    }
    if (!credential.value) {
      throw new Error("The OpenAI Realtime credential is empty.");
    }
    if (
      typeof credential.expiresAt === "number" &&
      credential.expiresAt <= Math.floor(Date.now() / 1000) + 5
    ) {
      throw new Error("The OpenAI Realtime credential expired before the call could connect.");
    }

    // The bridge never stores a tenant's long-lived OpenAI API key. BotLance
    // decrypts BYOK server-side and mints this per-call short-lived credential.
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(config.model)}`;
    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${credential.value}`,
      },
    });
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("OpenAI realtime connection timed out.")), 10_000);

      ws.once("open", () => {
        clearTimeout(timer);
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            instructions: config.instructions,
            voice: config.voice,
            input_audio_format: "g711_ulaw",
            output_audio_format: "g711_ulaw",
            tools: config.tools,
            tool_choice: "auto"
          }
        }));
        resolve();
      });

      ws.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    ws.on("message", (raw) => {
      let event: any;
      try {
        event = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (event.type === "response.audio.delta" && typeof event.delta === "string") {
        callbacks.onAudio(event.delta);
        return;
      }

      if (event.type === "response.output_item.done") {
        const item = event.item ?? {};
        if (item.type === "function_call" && item.call_id && item.name) {
          callbacks.onToolCall({
            id: String(item.call_id),
            name: String(item.name),
            argumentsJson: String(item.arguments ?? "{}"),
          });
        }
        return;
      }

      if (event.type === "response.function_call_arguments.done" && event.call_id && event.name) {
        callbacks.onToolCall({
          id: String(event.call_id),
          name: String(event.name),
          argumentsJson: String(event.arguments ?? "{}"),
        });
        return;
      }

      if (event.type === "input_audio_buffer.speech_started") {
        this.interrupt();
        return;
      }

      if (event.type === "error") {
        callbacks.onError(new Error(event.error?.message ?? "OpenAI realtime error."));
      }
    });

    ws.on("close", () => callbacks.onClose());
    ws.on("error", (err) => callbacks.onError(err));
  }

  appendTelephonyAudio(base64Mulaw8000: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: "input_audio_buffer.append",
      audio: base64Mulaw8000,
    }));
  }

  sendToolResult(callId: string, _name: string, output: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output),
      },
    }));
    this.ws.send(JSON.stringify({ type: "response.create" }));
  }

  interrupt(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "response.cancel" }));
  }

  close(): void {
    try {
      this.ws?.close();
    } finally {
      this.ws = null;
      this.callbacks = null;
    }
  }
}
