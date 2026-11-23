import { Router } from 'express';
import { answerQuestion } from '../ai/answerQuestion';
import { requireLogin } from '../middleware/requireLogin';
import { requireRole } from '../middleware/requireRole';

export const kbRouter = Router();

const MAX_QUESTION_LENGTH = 500;

// POST /api/kb/ask  -> answer a question from the help articles (agents and admins)
// Body: { question: "How do customers change their billing email?" }
kbRouter.post('/ask', requireLogin, requireRole(['agent', 'admin']), async (req, res) => {
  const { question } = req.body;

  if (typeof question !== 'string' || question.trim() === '') {
    res.status(400).json({ error: 'Question is required' });
    return;
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    res.status(400).json({ error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer` });
    return;
  }

  try {
    const result = await answerQuestion(question.trim(), res.locals.user.userId);
    res.json(result);
  } catch (error) {
    console.log('Could not answer question:', (error as Error).message);
    res.status(502).json({ error: 'The AI could not answer right now. Please try again.' });
  }
});
