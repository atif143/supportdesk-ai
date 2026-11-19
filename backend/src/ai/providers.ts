import { env } from '../config';

// What we send to the AI
export type AiInput = {
  system: string; // instructions for the AI
  prompt: string; // the text it should work on
};

// What we get back from the AI
export type AiResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

// 1. The fake AI. No internet, no key, always the same answer for the same input.
async function mockAi(feature: string, input: AiInput): Promise<AiResult> {
  let text = `Mock answer for: ${input.prompt.slice(0, 50)}`;

  // Ticket sorting needs a JSON answer
  if (feature === 'classify') {
    text = '{"category": "other", "priority": "medium", "reason": "Mock suggestion."}';
  }

  return {
    text,
    model: 'mock',
    inputTokens: 0,
    outputTokens: 0,
  };
}

// 2. The real AI: Google Gemini
async function geminiAi(input: AiInput): Promise<AiResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
    }),
    signal: AbortSignal.timeout(30000), // give up after 30 seconds
  });

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();

  return {
    text: data.candidates[0].content.parts[0].text,
    model: env.GEMINI_MODEL,
    inputTokens: data.usageMetadata.promptTokenCount,
    outputTokens: data.usageMetadata.candidatesTokenCount,
  };
}

// Send the input to the AI chosen in .env (LLM_PROVIDER = "gemini" or "mock")
export function callAi(feature: string, input: AiInput) {
  if (env.LLM_PROVIDER === 'gemini') {
    return geminiAi(input);
  }
  return mockAi(feature, input);
}
