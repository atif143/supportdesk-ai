import { Router } from 'express';
import { requireLogin } from '../middleware/requireLogin';
import { Comment } from '../models/comment';
import { TicketSummary } from '../models/ticketSummary';
import { User } from '../models/user';
import { findTicketForUser } from '../utils/findTicketForUser';
import { sendCommentAdded } from '../realtime';

export const commentsRouter = Router();

// GET /api/tickets/:id/comments  -> comments of a ticket, oldest first
// Customers never see internal comments.
commentsRouter.get('/:id/comments', requireLogin, async (req, res) => {
  const { userId, role } = res.locals.user;
  const ticket = await findTicketForUser(req.params.id as string, userId, role);

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const filter: Record<string, unknown> = { ticketId: ticket.get('id') };
  if (role === 'customer') {
    filter.visibility = 'public';
  }

  const comments = await Comment.findAll({
    where: filter,
    order: [['createdAt', 'ASC']],
    include: [{ model: User, as: 'author', attributes: ['name', 'role'] }], // add the author's name
  });

  res.json(comments);
});

// POST /api/tickets/:id/comments  -> add a comment
// Customers can only write public comments. Agents and admins can choose "internal".
commentsRouter.post('/:id/comments', requireLogin, async (req, res) => {
  const { userId, role } = res.locals.user;
  const ticket = await findTicketForUser(req.params.id as string, userId, role);

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const { body, visibility } = req.body;

  if (!body) {
    res.status(400).json({ error: 'Comment text is required' });
    return;
  }

  let finalVisibility = 'public';
  if (role !== 'customer' && visibility === 'internal') {
    finalVisibility = 'internal';
  }

  const comment = await Comment.create({
    ticketId: ticket.get('id'),
    authorId: userId,
    body,
    visibility: finalVisibility,
  });

  // A new public comment makes the saved AI summary old, so delete it.
  // (Internal notes are not sent to the AI, so they do not change the summary.)
  if (finalVisibility === 'public') {
    await TicketSummary.destroy({ where: { ticketId: ticket.get('id') } });
  }

  res.status(201).json(comment);

  // Tell everyone who has this ticket open. Internal notes only go to staff.
  sendCommentAdded(ticket.get('id') as string, finalVisibility);
});
