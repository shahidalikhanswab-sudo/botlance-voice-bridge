import type { BridgeBootstrapResponse } from "../types.js";

export interface AiToolCall {
  id: string;
  name: string;
  argumentsJson: string;
}

export interface AiRuntimeCallbacks {
  onAudio: (base64Mulaw8000: string) => void;
  onToolCall: (call: AiToolCall) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export interface AiRuntime {
  connect(config: BridgeBootstrapResponse, callbacks: AiRuntimeCallbacks): Promise<void>;
  appendTelephonyAudio(base64Mulaw8000: string): void;
  sendToolResult(callId: string, name: string, output: unknown): void;
  interrupt(): void;
  close(): void;
}

export interface AiRuntimeFactory {
  create(provider: BridgeBootstrapResponse["provider"]): AiRuntime;
}
