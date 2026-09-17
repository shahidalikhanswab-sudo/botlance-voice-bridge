export type VoiceProviderId = "openai" | "gemini";

export interface BridgeProviderCredential {
  type: "openai_realtime_ephemeral";
  value: string;
  expiresAt: number | null;
}

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
  /**
   * Short-lived provider credential minted by the BotLance control plane from
   * the tenant's existing BYOK configuration. The bridge must never persist or
   * log this value.
   */
  providerCredential?: BridgeProviderCredential;
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
