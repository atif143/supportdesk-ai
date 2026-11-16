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
