export type VoiceProviderId = "openai" | "gemini";

export interface BridgeBootstrapResponse {
  callId: string;
  voiceSessionId: string;
  provider: VoiceProviderId;
  model: string;
  voice: string;
  language: string;
  instructions: string;
  maxDurationSeconds: number;
  tools: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

export interface BridgeToolRequest {
  callId: string;
  voiceSessionId: string;
  toolCallId: string;
  toolName: string;
  argumentsJson: string;
}

export interface BridgeToolResponse {
  ok: boolean;
  status: "completed" | "failed" | "rejected" | "duplicate";
  output: Record<string, unknown>;
}

export type BridgeState =
  | "connecting"
  | "active"
  | "ended"
  | "failed";

export interface BridgeStateRequest {
  callId: string;
  voiceSessionId?: string;
  state: BridgeState;
  streamSid?: string;
  provider?: VoiceProviderId;
  errorCode?: string;
  errorMessage?: string;
  durationSeconds?: number;
  usage?: Record<string, unknown>;
}
