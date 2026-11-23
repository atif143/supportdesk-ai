import { env } from '../config';
import { AiLog } from '../models/aiLog';
import { AiInput, callAi, callEmbed, callStream } from './providers';

// One row for the ai_logs table
type LogRow = {
  userId: string | null;
  feature: string;
  model: string;
  startTime: number; // Date.now() when the call started
  status: 'success' | 'error' | 'cancelled';
  inputTokens?: number;
  outputTokens?: number;
  errorMessage?: string;
};

// Save one AI call in ai_logs: tokens, time taken, and any error
function saveLog(row: LogRow) {
  return AiLog.create({
    userId: row.userId,
    feature: row.feature,
    model: row.model,
    inputTokens: row.inputTokens || 0,
    outputTokens: row.outputTokens || 0,
    latencyMs: Date.now() - row.startTime,
    status: row.status,
    errorMessage: row.errorMessage || null,
  });
}

// Use this function for every AI call. It calls the AI and logs the call.
export async function askAi(feature: string, input: AiInput, userId: string | null = null) {
  const startTime = Date.now();

  try {
    const result = await callAi(feature, input);
    await saveLog({
      userId,
      feature,
      model: result.model,
      startTime,
      status: 'success',
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
    return result;
  } catch (error) {
    const errorMessage = (error as Error).message;
    await saveLog({ userId, feature, model: env.LLM_PROVIDER, startTime, status: 'error', errorMessage });
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

    await saveLog({
      userId,
      feature: 'embed',
      model: result.model,
      startTime,
      status: 'success',
      inputTokens: Math.ceil(characters / 4),
    });
    return result.vectors;
  } catch (error) {
    const errorMessage = (error as Error).message;
    await saveLog({ userId, feature: 'embed', model: env.LLM_PROVIDER, startTime, status: 'error', errorMessage });
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

    const status = signal.aborted ? 'cancelled' : 'success';
    await saveLog({ userId, feature, model, startTime, status, inputTokens, outputTokens });
  } catch (error) {
    // When the user stops, the request is aborted and throws. That is not a real error.
    if (signal.aborted) {
      await saveLog({ userId, feature, model, startTime, status: 'cancelled', inputTokens, outputTokens });
      return;
    }

    const errorMessage = (error as Error).message;
    await saveLog({ userId, feature, model, startTime, status: 'error', inputTokens, outputTokens, errorMessage });
    throw error;
  }
}
