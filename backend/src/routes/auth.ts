import { Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Model, Op } from 'sequelize';
import { env } from '../config';
import { requireLogin } from '../middleware/requireLogin';
import { RefreshToken } from '../models/refreshToken';
import { User } from '../models/user';

export const authRouter = Router();

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // in milliseconds

// Scrambles a refresh token before we save it (like a password)
function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Makes both tokens for a user:
// - a login token (15 minutes), which we return
// - a refresh token (7 days), which we save in the database and put in a cookie
async function createTokens(res: Response, user: Model) {
  const loginToken = jwt.sign({ userId: user.get('id'), role: user.get('role') }, env.JWT_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = crypto.randomBytes(40).toString('hex');
  await RefreshToken.create({
    userId: user.get('id'),
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + SEVEN_DAYS),
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // JavaScript in the browser cannot read it
    secure: true, // only sent over https (and localhost)
    sameSite: 'strict', // not sent when another website makes the request
    path: '/api/auth', // only sent to our auth routes
    maxAge: SEVEN_DAYS,
  });

  return loginToken;
}

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

  // 3. Make the login token and the refresh token
  const token = await createTokens(res, user);

  // 4. Send back the login token and the user
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

// POST /api/auth/refresh  -> trade the refresh token (cookie) for new tokens
authRouter.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  // 1. Find the saved token. It must exist and not be expired.
  const savedToken = refreshToken
    ? await RefreshToken.findOne({
        where: { tokenHash: hashToken(refreshToken), expiresAt: { [Op.gt]: new Date() } },
      })
    : null;

  if (!savedToken) {
    res.status(401).json({ error: 'Please log in again' });
    return;
  }

  // 2. Delete it, so it can only be used once (this is called "rotation")
  await savedToken.destroy();

  // 3. Give the user a new login token and a new refresh token
  const user = await User.findByPk(savedToken.get('userId') as string);
  if (!user) {
    res.status(401).json({ error: 'Please log in again' });
    return;
  }
  const token = await createTokens(res, user);

  res.json({ token });
});

// GET /api/auth/me  -> who is logged in? (only works with a valid token)
authRouter.get('/me', requireLogin, async (req, res) => {
  const user = await User.findByPk(res.locals.user.userId, {
    attributes: ['id', 'name', 'email', 'role'],
  });
  res.json(user);
});
