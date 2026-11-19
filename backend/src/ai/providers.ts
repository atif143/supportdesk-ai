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

  // The ticket summary needs a JSON answer too
  if (feature === 'summary') {
    text =
      '{"summary": "Mock summary.", "problem": "Mock problem.", "sentiment": "neutral", "draftReply": "Hello, thank you for your message. We are looking into it."}';
  }

  return {
    text,
    model: 'mock',
    inputTokens: 0,
    outputTokens: 0,
  };
}

// 2. The real AI: Google Gemini

// Send one request to Gemini
function sendToGemini(input: AiInput) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;

  return fetch(url, {
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
}

// How long to wait before each new try, in milliseconds
const WAIT_TIMES = [1000, 2000];

async function geminiAi(input: AiInput): Promise<AiResult> {
  let response = await sendToGemini(input);

  // 429 = too many requests, 503 = Google is busy.
  // Both are usually gone a moment later, so wait and try again (at most 2 more times).
  for (const waitTime of WAIT_TIMES) {
    if (response.status !== 429 && response.status !== 503) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    response = await sendToGemini(input);
  }

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();

  // Gemini can send the answer in several pieces ("parts"), so join them all
  const parts: { text: string }[] = data.candidates[0].content.parts;
  const text = parts.map((part) => part.text).join('');

  return {
    text,
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
