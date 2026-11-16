import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { requireLogin } from '../middleware/requireLogin';
import { User } from '../models/user';

export const authRouter = Router();

// POST /api/auth/register  -> create a new customer account
authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // 1. Check the data the user sent
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email and password are required' });
    return;
  }
  if (!email.includes('@')) {
    res.status(400).json({ error: 'Email is not valid' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  // 2. Stop if the email is already used
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    res.status(409).json({ error: 'Email is already registered' });
    return;
  }

  // 3. Scramble the password, then save the user
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  // 4. Send back the new user (without the password hash)
  res.status(201).json({
    id: user.get('id'),
    name: user.get('name'),
    email: user.get('email'),
    role: user.get('role'),
  });
});

// POST /api/auth/login  -> check email + password, give back a login token
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Check the data the user sent
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  // 2. Find the user and compare the password with the saved hash
  const user = await User.findOne({ where: { email } });
  const passwordIsCorrect = user && (await bcrypt.compare(password, user.get('passwordHash') as string));

  if (!user || !passwordIsCorrect) {
    res.status(401).json({ error: 'Email or password is wrong' });
    return;
  }

  // 3. Make a login token that is valid for 15 minutes
  const token = jwt.sign({ userId: user.get('id'), role: user.get('role') }, env.JWT_SECRET, {
    expiresIn: '15m',
  });

  // 4. Send back the token and the user
  res.json({
    token,
    user: {
      id: user.get('id'),
      name: user.get('name'),
      email: user.get('email'),
      role: user.get('role'),
    },
  });
});

// GET /api/auth/me  -> who is logged in? (only works with a valid token)
authRouter.get('/me', requireLogin, async (req, res) => {
  const user = await User.findByPk(res.locals.user.userId, {
    attributes: ['id', 'name', 'email', 'role'],
  });
  res.json(user);
});
