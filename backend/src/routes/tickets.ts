import { Router } from 'express';
import { requireLogin } from '../middleware/requireLogin';
import { requireRole } from '../middleware/requireRole';
import { Ticket } from '../models/ticket';
import { User } from '../models/user';

export const ticketsRouter = Router();

// Which status a ticket can move to from its current status
const NEXT_STATUSES: Record<string, string[]> = {
  open: ['in_progress'],
  in_progress: ['waiting_on_customer', 'resolved'],
  waiting_on_customer: ['in_progress', 'resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['billing', 'bug', 'feature_request', 'account', 'other'];

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

// PATCH /api/tickets/:id  -> change status, priority, category or assignee (agents and admins)
ticketsRouter.patch('/:id', requireLogin, requireRole(['agent', 'admin']), async (req, res) => {
  const ticket = await Ticket.findByPk(req.params.id as string);

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const { status, priority, category, assigneeId } = req.body;

  if (status) {
    const currentStatus = ticket.get('status') as string;
    if (!NEXT_STATUSES[currentStatus].includes(status)) {
      res.status(400).json({ error: `Cannot move a ticket from ${currentStatus} to ${status}` });
      return;
    }
    ticket.set('status', status);
  }

  if (priority) {
    if (!PRIORITIES.includes(priority)) {
      res.status(400).json({ error: 'Priority is not valid' });
      return;
    }
    ticket.set('priority', priority);
  }

  if (category) {
    if (!CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Category is not valid' });
      return;
    }
    ticket.set('category', category);
  }

  if (assigneeId) {
    const assignee = await User.findByPk(assigneeId);
    if (!assignee || assignee.get('role') === 'customer') {
      res.status(400).json({ error: 'A ticket can only be assigned to an agent or admin' });
      return;
    }
    ticket.set('assigneeId', assigneeId);
  }

  await ticket.save();
  res.json(ticket);
});
