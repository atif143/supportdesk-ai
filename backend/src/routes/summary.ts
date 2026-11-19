import { Router } from 'express';
import { summarizeTicket } from '../ai/summarizeTicket';
import { requireLogin } from '../middleware/requireLogin';
import { requireRole } from '../middleware/requireRole';
import { Ticket } from '../models/ticket';

export const summaryRouter = Router();

// POST /api/tickets/:id/summary  -> AI summary, problem, mood and a draft reply (agents and admins)
// The AI never posts the reply. The agent edits it and sends it as a normal comment.
summaryRouter.post('/:id/summary', requireLogin, requireRole(['agent', 'admin']), async (req, res) => {
  const ticket = await Ticket.findByPk(req.params.id as string);

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  try {
    const summary = await summarizeTicket(ticket.toJSON(), res.locals.user.userId);
    res.json(summary);
  } catch (error) {
    console.log('Could not summarize ticket:', (error as Error).message);
    res.status(502).json({ error: 'The AI could not make a summary. Please try again.' });
  }
});
