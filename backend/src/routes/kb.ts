import { Response, Router } from 'express';
import { DONT_KNOW, KB_ANSWER_PROMPT, prepareAnswer } from '../ai/answerQuestion';
import { streamAi } from '../ai/askAi';
import { requireLogin } from '../middleware/requireLogin';
import { requireRole } from '../middleware/requireRole';

export const kbRouter = Router();

const MAX_QUESTION_LENGTH = 500;

// Send one event to the browser in the "Server-Sent Events" format:
//   event: <name>
//   data: <JSON>
//   (empty line = end of this event)
function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// POST /api/kb/ask  -> answer a question from the help articles (agents and admins)
// Body: { question: "How do customers change their billing email?" }
//
// The answer is streamed: the browser gets it in small pieces as the AI writes it.
// Events, in order:
//   "text"    -> one piece of the answer (many of these)
//   "sources" -> the help articles used (empty if the AI did not know)
//   "done"    -> the answer is complete
//   "error"   -> something went wrong after the answer had started
kbRouter.post('/ask', requireLogin, requireRole(['agent', 'admin']), async (req, res) => {
  const { question } = req.body;
  const userId = res.locals.user.userId;

  if (typeof question !== 'string' || question.trim() === '') {
    res.status(400).json({ error: 'Question is required' });
    return;
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    res.status(400).json({ error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer` });
    return;
  }

  // 1. Find the help articles first. If this fails, we can still send a normal error.
  let prepared;
  try {
    prepared = await prepareAnswer(question.trim(), userId);
  } catch (error) {
    console.log('Could not search the help articles:', (error as Error).message);
    res.status(502).json({ error: 'The AI could not answer right now. Please try again.' });
    return;
  }

  // 2. From here on we stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // No article is close enough: answer "I don't know" without calling the AI
  if (!prepared) {
    sendEvent(res, 'text', DONT_KNOW);
    sendEvent(res, 'sources', []);
    sendEvent(res, 'done', {});
    res.end();
    return;
  }

  // 3. If the browser goes away (the user pressed Stop or closed the page),
  //    stop the AI too, so we do not pay for words nobody reads.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  // 4. Send each piece as soon as the AI writes it
  let answer = '';
  try {
    for await (const text of streamAi(KB_ANSWER_PROMPT.name, prepared.input, userId, controller.signal)) {
      answer += text;
      sendEvent(res, 'text', text);
    }

    if (controller.signal.aborted) {
      return; // the browser is gone, nothing more to send
    }

    // If the AI did not know, there are no sources to show
    sendEvent(res, 'sources', answer.includes(DONT_KNOW) ? [] : prepared.sources);
    sendEvent(res, 'done', {});
  } catch (error) {
    console.log('Could not stream the answer:', (error as Error).message);
    sendEvent(res, 'error', { error: 'The AI stopped answering. Please try again.' });
  }

  res.end();
});
