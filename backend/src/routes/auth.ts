import { Router } from 'express';
import bcrypt from 'bcryptjs';
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
