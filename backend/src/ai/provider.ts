import { env } from '../config';
import { geminiProvider } from './geminiProvider';
import { mockProvider } from './mockProvider';

// What we send to the AI
export type CompletionInput = {
  system: string; // instructions for the AI
  prompt: string; // the text it should work on
};

// What we get back from the AI
export type CompletionResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

// Every AI (real or mock) must have these functions
export type AiProvider = {
  complete: (input: CompletionInput) => Promise<CompletionResult>;
};

// Pick the AI from the .env setting LLM_PROVIDER
export function getAiProvider(): AiProvider {
  if (env.LLM_PROVIDER === 'gemini') {
    return geminiProvider;
  }
  return mockProvider;
}
