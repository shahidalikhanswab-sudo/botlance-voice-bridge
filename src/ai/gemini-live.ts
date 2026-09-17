import type { AiRuntime, AiRuntimeCallbacks } from "./types.js";
import type { BridgeBootstrapResponse } from "../types.js";

export class GeminiLiveRuntime implements AiRuntime {
  async connect(_config: BridgeBootstrapResponse, _callbacks: AiRuntimeCallbacks): Promise<void> {
    throw new Error("Gemini phone transport is not enabled in Voice Bridge v0.1.");
  }
  appendTelephonyAudio(_base64Mulaw8000: string): void {}
  sendToolResult(_callId: string, _name: string, _output: unknown): void {}
  interrupt(): void {}
  close(): void {}
}
