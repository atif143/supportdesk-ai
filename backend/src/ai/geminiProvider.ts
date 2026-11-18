import { env } from '../config';
import { AiProvider } from './provider';

// The real AI: Google Gemini, called with a normal fetch request
export const geminiProvider: AiProvider = {
  async complete(input) {
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
  },
};
