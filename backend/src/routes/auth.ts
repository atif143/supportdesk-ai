import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/user';

export const authRouter = Router();

// The rules for the register form
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Email is not valid'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// POST /api/auth/register  -> create a new customer account
authRouter.post('/register', async (req, res) => {
  // 1. Check the data the user sent
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { name, email, password } = result.data;

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
