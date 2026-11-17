import { Router } from 'express';
import { requireLogin } from '../middleware/requireLogin';
import { requireRole } from '../middleware/requireRole';
import { User } from '../models/user';

export const usersRouter = Router();

// GET /api/users  -> list all users (admins only)
usersRouter.get('/', requireLogin, requireRole(['admin']), async (req, res) => {
  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'role'],
  });
  res.json(users);
});

// GET /api/users/staff  -> list agents and admins, to choose who a ticket is assigned to
usersRouter.get('/staff', requireLogin, requireRole(['agent', 'admin']), async (req, res) => {
  const staff = await User.findAll({
    where: { role: ['agent', 'admin'] },
    attributes: ['id', 'name', 'role'],
    order: [['name', 'ASC']],
  });
  res.json(staff);
});
