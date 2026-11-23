import { env } from '../config';
import { AiLog } from '../models/aiLog';
import { AiInput, callAi, callEmbed, callStream } from './providers';

// Use this function for every AI call.
// It calls the AI and saves one row in ai_logs: tokens, time taken, and any error.
export async function askAi(feature: string, input: AiInput, userId: string | null = null) {
  const startTime = Date.now();

  try {
    const result = await callAi(feature, input);

    await AiLog.create({
      userId,
      feature,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: Date.now() - startTime,
      status: 'success',
    });

    return result;
  } catch (error) {
    await AiLog.create({
      userId,
      feature,
      model: env.LLM_PROVIDER,
      latencyMs: Date.now() - startTime,
      status: 'error',
      errorMessage: (error as Error).message,
    });

    throw error; // let the caller decide what to do
  }
}

// Use this function to turn texts into vectors (embeddings). It is logged like askAi.
export async function embedTexts(texts: string[], userId: string | null = null) {
  const startTime = Date.now();

  try {
    const result = await callEmbed(texts);

    // Gemini does not say how many tokens an embedding used,
    // so we guess: about 4 characters are 1 token.
    const characters = texts.reduce((sum, text) => sum + text.length, 0);

    await AiLog.create({
      userId,
      feature: 'embed',
      model: result.model,
      inputTokens: Math.ceil(characters / 4),
      latencyMs: Date.now() - startTime,
      status: 'success',
    });

    return result.vectors;
  } catch (error) {
    await AiLog.create({
      userId,
      feature: 'embed',
      model: env.LLM_PROVIDER,
      latencyMs: Date.now() - startTime,
      status: 'error',
      errorMessage: (error as Error).message,
    });

    throw error;
  }
}

// Use this function to stream an answer piece by piece. It is logged like askAi.
// "signal" stops the AI early (when the user presses Stop). Then the log says "cancelled".
export async function* streamAi(feature: string, input: AiInput, userId: string, signal: AbortSignal) {
  const startTime = Date.now();
  const model = env.LLM_PROVIDER === 'gemini' ? env.GEMINI_MODEL : 'mock';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for await (const piece of callStream(feature, input, signal)) {
      // Gemini sends the token totals so far, so we keep the latest ones
      inputTokens = piece.inputTokens || inputTokens;
      outputTokens = piece.outputTokens || outputTokens;

      if (piece.text) {
        yield piece.text;
      }
    }

    await AiLog.create({
      userId,
      feature,
      model,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startTime,
      status: signal.aborted ? 'cancelled' : 'success',
    });
  } catch (error) {
    // When the user stops, the request is aborted and throws. That is not a real error.
    await AiLog.create({
      userId,
      feature,
      model,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startTime,
      status: signal.aborted ? 'cancelled' : 'error',
      errorMessage: signal.aborted ? null : (error as Error).message,
    });

    if (!signal.aborted) {
      throw error;
    }
  }
}
