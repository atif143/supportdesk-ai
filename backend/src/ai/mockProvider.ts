import { AiProvider } from './provider';

// A fake AI for tests and for working without an API key.
// It never uses the internet and always gives the same answer for the same input.
export const mockProvider: AiProvider = {
  async complete(input) {
    return {
      text: `Mock answer for: ${input.prompt.slice(0, 50)}`,
      model: 'mock',
      inputTokens: 0,
      outputTokens: 0,
    };
  },
};
