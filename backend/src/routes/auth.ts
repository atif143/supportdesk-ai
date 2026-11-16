import { Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { requireLogin } from '../middleware/requireLogin';
import { RefreshToken } from '../models/refreshToken';
import { User } from '../models/user';

export const authRouter = Router();

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // in milliseconds

// ---------- Helper functions ----------

// Login token: valid for 15 minutes
function makeLoginToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: '15m' });
}

// Turns a refresh token into a hash, so we never save the real token
function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Refresh token: valid for 7 days. Saved in the database (as a hash) and in a cookie.
async function makeRefreshToken(res: Response, userId: string) {
  const refreshToken = crypto.randomBytes(40).toString('hex');

  await RefreshToken.create({
    userId: userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + SEVEN_DAYS),
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // browser JavaScript cannot read it
    secure: true, // only sent over https (and localhost)
    sameSite: 'strict', // not sent from other websites
    path: '/api/auth', // only sent to /api/auth routes
    maxAge: SEVEN_DAYS,
  });
}

// ---------- Routes ----------

// POST /api/auth/register  -> create a new customer account
authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

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

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    res.status(409).json({ error: 'Email is already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({
    id: user.get('id'),
    name: user.get('name'),
    email: user.get('email'),
    role: user.get('role'),
  });
});

// POST /api/auth/login  -> check email + password, give back tokens
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Email or password is wrong' });
    return;
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.get('passwordHash') as string);
  if (!passwordIsCorrect) {
    res.status(401).json({ error: 'Email or password is wrong' });
    return;
  }

  const userId = user.get('id') as string;
  const role = user.get('role') as string;

  await makeRefreshToken(res, userId);

  res.json({
    token: makeLoginToken(userId, role),
    user: {
      id: userId,
      name: user.get('name'),
      email: user.get('email'),
      role: role,
    },
  });
});

// POST /api/auth/refresh  -> use the refresh token (cookie) to get new tokens
authRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ error: 'Please log in again' });
    return;
  }

  const savedToken = await RefreshToken.findOne({ where: { tokenHash: hashToken(refreshToken) } });
  if (!savedToken) {
    res.status(401).json({ error: 'Please log in again' });
    return;
  }

  const isExpired = (savedToken.get('expiresAt') as Date) < new Date();
  if (isExpired) {
    res.status(401).json({ error: 'Please log in again' });
    return;
  }

  // Delete the old refresh token, so it can only be used once
  await savedToken.destroy();

  const user = await User.findByPk(savedToken.get('userId') as string);
  if (!user) {
    res.status(401).json({ error: 'Please log in again' });
    return;
  }

  const userId = user.get('id') as string;
  const role = user.get('role') as string;

  await makeRefreshToken(res, userId);

  res.json({ token: makeLoginToken(userId, role) });
});

// GET /api/auth/me  -> who is logged in? (only works with a valid login token)
authRouter.get('/me', requireLogin, async (req, res) => {
  const user = await User.findByPk(res.locals.user.userId, {
    attributes: ['id', 'name', 'email', 'role'],
  });
  res.json(user);
});
