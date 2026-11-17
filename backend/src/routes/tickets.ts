import { Router } from 'express';
import { Op } from 'sequelize';
import { requireLogin } from '../middleware/requireLogin';
import { requireRole } from '../middleware/requireRole';
import { Comment } from '../models/comment';
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

const STATUSES = Object.keys(NEXT_STATUSES);
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['billing', 'bug', 'feature_request', 'account', 'other'];
const SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'status'];

// Finds a ticket, but only if this user is allowed to see it.
// Customers can only see their own tickets. Returns null if not found or not allowed.
async function findTicketForUser(ticketId: string, userId: string, role: string) {
  const ticket = await Ticket.findByPk(ticketId);

  if (!ticket) {
    return null;
  }
  if (role === 'customer' && ticket.get('requesterId') !== userId) {
    return null;
  }
  return ticket;
}

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

// GET /api/tickets  -> list tickets, one page at a time
// Customers see only their own tickets. Agents and admins see all tickets.
// Example: /api/tickets?page=2&status=open&priority=high&search=refund&sortBy=priority&sortOrder=asc
ticketsRouter.get('/', requireLogin, async (req, res) => {
  const { userId, role } = res.locals.user;
  const { status, priority, category, assigneeId, search, sortBy, sortOrder } =
    req.query as Record<string, string>;

  // 1. Filters
  const filter: Record<string | symbol, unknown> = {};

  if (role === 'customer') {
    filter.requesterId = userId;
  }
  if (STATUSES.includes(status)) {
    filter.status = status;
  }
  if (PRIORITIES.includes(priority)) {
    filter.priority = priority;
  }
  if (CATEGORIES.includes(category)) {
    filter.category = category;
  }
  if (assigneeId) {
    filter.assigneeId = assigneeId;
  }
  if (search) {
    filter.title = { [Op.iLike]: `%${search}%` }; // title contains the text (any case)
  }

  // 2. Sorting (newest first if nothing is chosen)
  let sortField = 'createdAt';
  if (SORT_FIELDS.includes(sortBy)) {
    sortField = sortBy;
  }
  let sortDirection = 'DESC';
  if (sortOrder === 'asc') {
    sortDirection = 'ASC';
  }

  // 3. Pages: 20 tickets per page (at most 100)
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const { rows, count } = await Ticket.findAndCountAll({
    where: filter,
    order: [[sortField, sortDirection]],
    limit: limit,
    offset: (page - 1) * limit,
  });

  res.json({ tickets: rows, total: count, page, limit });
});

// GET /api/tickets/:id  -> one ticket
ticketsRouter.get('/:id', requireLogin, async (req, res) => {
  const { userId, role } = res.locals.user;
  const ticket = await findTicketForUser(req.params.id as string, userId, role);

  if (!ticket) {
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

  // null means "nobody": remove the assignee
  if (assigneeId === null) {
    ticket.set('assigneeId', null);
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

// GET /api/tickets/:id/comments  -> comments of a ticket, oldest first
// Customers never see internal comments.
ticketsRouter.get('/:id/comments', requireLogin, async (req, res) => {
  const { userId, role } = res.locals.user;
  const ticket = await findTicketForUser(req.params.id as string, userId, role);

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const filter: { ticketId: string; visibility?: string } = { ticketId: ticket.get('id') as string };
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
ticketsRouter.post('/:id/comments', requireLogin, async (req, res) => {
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

  res.status(201).json(comment);
});
