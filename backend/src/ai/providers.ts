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

// One piece of a streamed answer. The token counts are the totals so far.
export type StreamPiece = {
  text: string;
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

  // The help article answer
  if (feature === 'kb-answer') {
    text = 'Mock answer from the help articles.';
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

// The fake stream: sends the mock answer one word at a time, with a short wait,
// so the Stop button can be tested without internet.
async function* mockStream(feature: string, input: AiInput, signal: AbortSignal) {
  const { text } = await mockAi(feature, input);
  const words = (text + ' This answer arrives word by word.').split(' ');

  for (const word of words) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (signal.aborted) {
      return; // the user pressed Stop, so we stop too
    }
    const piece: StreamPiece = { text: word + ' ', inputTokens: 0, outputTokens: 0 };
    yield piece;
  }
}

// 2. The real AI: Google Gemini

// Send one request to Gemini. "action" is for example "gemini-3.5-flash-lite:generateContent".
// "stopSignal" (optional) lets the caller cancel the request, for example when the user presses Stop.
function sendToGemini(action: string, body: object, stopSignal?: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${action}`;

  // Give up after 30 seconds, or earlier if the caller stops it
  const timeout = AbortSignal.timeout(30000);
  const signal = stopSignal ? AbortSignal.any([stopSignal, timeout]) : timeout;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });
}

// How long to wait before each new try, in milliseconds
const WAIT_TIMES = [1000, 2000];

// Send to Gemini and return the response.
// 429 = too many requests, 503 = Google is busy.
// Both are usually gone a moment later, so wait and try again (at most 2 more times).
async function sendWithRetry(action: string, body: object, stopSignal?: AbortSignal) {
  let response = await sendToGemini(action, body, stopSignal);

  for (const waitTime of WAIT_TIMES) {
    if (response.status !== 429 && response.status !== 503) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    response = await sendToGemini(action, body, stopSignal);
  }

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  return response;
}

// Send to Gemini and return the JSON answer
async function askGemini(action: string, body: object) {
  const response = await sendWithRetry(action, body);
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

// Get the answer from Gemini in small pieces, as it is written.
// Gemini sends "Server-Sent Events": lines that start with "data: " and hold JSON.
async function* geminiStream(input: AiInput, signal: AbortSignal) {
  const response = await sendWithRetry(
    `${env.GEMINI_MODEL}:streamGenerateContent?alt=sse`,
    {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
    },
    signal,
  );

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // A complete answer ends with a "finishReason". Sometimes Gemini closes the stream
  // without one, in the middle of the answer. We must not show that as a full answer.
  let finished = false;

  // Read the answer bit by bit. If the user presses Stop, read() throws and we stop.
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // the last line may not be complete yet

    for (const line of lines) {
      if (!line.startsWith('data:')) {
        continue;
      }
      const data = JSON.parse(line.slice(5));
      const parts: { text?: string }[] = data.candidates?.[0]?.content?.parts || [];
      if (data.candidates?.[0]?.finishReason) {
        finished = true;
      }

      const piece: StreamPiece = {
        text: parts.map((part) => part.text || '').join(''),
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      };
      yield piece;
    }
  }

  if (!finished) {
    throw new Error('Gemini stream ended before the answer was complete');
  }
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

// Stream an answer from the AI chosen in .env. "signal" stops it early.
export function callStream(feature: string, input: AiInput, signal: AbortSignal) {
  if (env.LLM_PROVIDER === 'gemini') {
    return geminiStream(input, signal);
  }
  return mockStream(feature, input, signal);
}
