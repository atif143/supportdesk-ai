import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireLogin } from '../middleware/requireLogin';
import { RefreshToken } from '../models/refreshToken';
import { User } from '../models/user';
import { hashToken, makeLoginToken, makeRefreshToken } from '../utils/tokens';

export const authRouter = Router();

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
  const user = (await User.create({ name, email, passwordHash })).toJSON();

  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// POST /api/auth/login  -> check email + password, give back tokens
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = (await User.findOne({ where: { email } }))?.toJSON();
  if (!user) {
    res.status(401).json({ error: 'Email or password is wrong' });
    return;
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.passwordHash);
  if (!passwordIsCorrect) {
    res.status(401).json({ error: 'Email or password is wrong' });
    return;
  }

  await makeRefreshToken(res, user.id);

  res.json({
    token: makeLoginToken(user.id, user.role),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
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

  const tokenData = savedToken.toJSON();
  if (tokenData.expiresAt < new Date()) {
    res.status(401).json({ error: 'Please log in again' });
    return;
  }

  // Delete the old refresh token, so it can only be used once
  await savedToken.destroy();

  const user = (await User.findByPk(tokenData.userId))?.toJSON();
  if (!user) {
    res.status(401).json({ error: 'Please log in again' });
    return;
  }

  await makeRefreshToken(res, user.id);

  res.json({ token: makeLoginToken(user.id, user.role) });
});

// POST /api/auth/logout  -> delete the refresh token and the cookie
authRouter.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await RefreshToken.destroy({ where: { tokenHash: hashToken(refreshToken) } });
  }

  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.status(204).send();
});

// GET /api/auth/me  -> who is logged in?
authRouter.get('/me', requireLogin, async (req, res) => {
  const user = await User.findByPk(res.locals.user.userId, {
    attributes: ['id', 'name', 'email', 'role'],
  });
  res.json(user);
});
