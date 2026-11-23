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

// Embeddings: each text becomes a list of 768 numbers that stands for its meaning.
// Texts with a similar meaning get similar numbers.
export const EMBEDDING_SIZE = 768;

export type EmbedResult = {
  vectors: number[][];
  model: string;
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

// The fake embedding. Each word is turned into a number between 0 and 767 ("hashed"),
// and we count how often each number appears. So the same text always gives the same
// vector, and texts that share words get similar vectors. Search still works without internet.
function mockEmbedOne(text: string) {
  const vector: number[] = new Array(EMBEDDING_SIZE).fill(0);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];

  for (const word of words) {
    let hash = 0;
    for (const letter of word) {
      hash = (hash * 31 + letter.charCodeAt(0)) % EMBEDDING_SIZE;
    }
    vector[hash] += 1;
  }

  // Make the vector length 1, so long and short texts can be compared fairly
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / length);
}

async function mockEmbed(texts: string[]): Promise<EmbedResult> {
  return { vectors: texts.map(mockEmbedOne), model: 'mock' };
}

// 2. The real AI: Google Gemini

// Send one request to Gemini. "action" is for example "gemini-3.5-flash-lite:generateContent".
function sendToGemini(action: string, body: object) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${action}`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000), // give up after 30 seconds
  });
}

// How long to wait before each new try, in milliseconds
const WAIT_TIMES = [1000, 2000];

// Send to Gemini and return the JSON answer.
// 429 = too many requests, 503 = Google is busy.
// Both are usually gone a moment later, so wait and try again (at most 2 more times).
async function askGemini(action: string, body: object) {
  let response = await sendToGemini(action, body);

  for (const waitTime of WAIT_TIMES) {
    if (response.status !== 429 && response.status !== 503) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    response = await sendToGemini(action, body);
  }

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  return response.json();
}

async function geminiAi(input: AiInput): Promise<AiResult> {
  const data = await askGemini(`${env.GEMINI_MODEL}:generateContent`, {
    systemInstruction: { parts: [{ text: input.system }] },
    contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
  });

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

// Turn many texts into vectors with one request
async function geminiEmbed(texts: string[]): Promise<EmbedResult> {
  const data = await askGemini(`${env.GEMINI_EMBED_MODEL}:batchEmbedContents`, {
    requests: texts.map((text) => ({
      model: `models/${env.GEMINI_EMBED_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_SIZE,
    })),
  });

  const embeddings: { values: number[] }[] = data.embeddings;
  return { vectors: embeddings.map((embedding) => embedding.values), model: env.GEMINI_EMBED_MODEL };
}

// Send the input to the AI chosen in .env (LLM_PROVIDER = "gemini" or "mock")
export function callAi(feature: string, input: AiInput) {
  if (env.LLM_PROVIDER === 'gemini') {
    return geminiAi(input);
  }
  return mockAi(feature, input);
}

// Turn texts into vectors with the AI chosen in .env
export function callEmbed(texts: string[]) {
  if (env.LLM_PROVIDER === 'gemini') {
    return geminiEmbed(texts);
  }
  return mockEmbed(texts);
}
