import { env } from '../config';
import { AiLog } from '../models/aiLog';
import { AiInput, callAi } from './providers';

// Use this function for every AI call.
// It calls the AI and saves one row in ai_logs: tokens, time taken, and any error.
export async function askAi(feature: string, input: AiInput, userId: string | null = null) {
  const startTime = Date.now();

  try {
    const result = await callAi(input);

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
