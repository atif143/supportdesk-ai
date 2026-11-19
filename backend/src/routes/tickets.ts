import { Router } from 'express';
import { Op } from 'sequelize';
import { requireLogin } from '../middleware/requireLogin';
import { requireRole } from '../middleware/requireRole';
import { Ticket } from '../models/ticket';
import { User } from '../models/user';
import { findTicketForUser } from '../utils/findTicketForUser';
import { CATEGORIES, PRIORITIES } from '../utils/ticketOptions';
import { classifyTicket } from '../ai/classifyTicket';

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
const SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'status'];
const TICKETS_PER_PAGE = 20;

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

  // Ask the AI for a category and priority in the background.
  // No "await": the user gets the answer above right away, even if the AI is slow or down.
  classifyTicket(ticket.get('id') as string).catch((error) => {
    console.log('Could not classify ticket:', error.message);
  });
});

// GET /api/tickets  -> list tickets, 20 per page
// Customers see only their own tickets. Agents and admins see all tickets.
// Example: /api/tickets?page=2&status=open&search=refund&sortBy=priority&sortOrder=asc
ticketsRouter.get('/', requireLogin, async (req, res) => {
  const { userId, role } = res.locals.user;
  const { status, priority, category, assigneeId, search, sortBy, sortOrder } =
    req.query as Record<string, string>;

  // 1. Filters
  const filter: Record<string, unknown> = {};

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

  // 3. Which page
  const page = Number(req.query.page) || 1;

  const { rows, count } = await Ticket.findAndCountAll({
    where: filter,
    order: [[sortField, sortDirection]],
    limit: TICKETS_PER_PAGE,
    offset: (page - 1) * TICKETS_PER_PAGE,
  });

  res.json({ tickets: rows, total: count, page, limit: TICKETS_PER_PAGE });
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
