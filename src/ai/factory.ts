import type { AiRuntime, AiRuntimeFactory } from "./types.js";
import type { BridgeBootstrapResponse } from "../types.js";
import { OpenAiRealtimeRuntime } from "./openai-realtime.js";
import { GeminiLiveRuntime } from "./gemini-live.js";

export class DefaultAiRuntimeFactory implements AiRuntimeFactory {
  create(provider: BridgeBootstrapResponse["provider"]): AiRuntime {
    switch (provider) {
      case "openai":
        return new OpenAiRealtimeRuntime();
      case "gemini":
        return new GeminiLiveRuntime();
      default: {
        const neverProvider: never = provider;
        throw new Error(`Unsupported AI provider: ${String(neverProvider)}`);
      }
    }
  }
}
