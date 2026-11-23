import { env } from '../config';
import { AiLog } from '../models/aiLog';
import { AiInput, callAi, callEmbed } from './providers';

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
