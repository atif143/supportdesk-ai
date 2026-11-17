import { Router } from 'express';
import { requireLogin } from '../middleware/requireLogin';
import { Ticket } from '../models/ticket';

export const ticketsRouter = Router();

// POST /api/tickets  -> create a new ticket (any logged-in user)
ticketsRouter.post('/', requireLogin, async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    res.status(400).json({ error: 'Title and description are required' });
    return;
  }

  const ticket = await Ticket.create({
    title,
    description,
    requesterId: res.locals.user.userId, // the logged-in user created it
  });

  res.status(201).json(ticket);
});

// GET /api/tickets  -> list tickets, newest first
// Customers see only their own tickets. Agents and admins see all tickets.
ticketsRouter.get('/', requireLogin, async (req, res) => {
  const { userId, role } = res.locals.user;

  const filter: { requesterId?: string } = {};
  if (role === 'customer') {
    filter.requesterId = userId;
  }

  const tickets = await Ticket.findAll({
    where: filter,
    order: [['createdAt', 'DESC']],
  });

  res.json(tickets);
});

// GET /api/tickets/:id  -> one ticket
ticketsRouter.get('/:id', requireLogin, async (req, res) => {
  const { userId, role } = res.locals.user;
  const ticket = await Ticket.findByPk(req.params.id as string);

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  // A customer may only open their own tickets
  if (role === 'customer' && ticket.get('requesterId') !== userId) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  res.json(ticket);
});
