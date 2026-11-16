import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';

// Lets the request continue only if it has a valid login token.
// The token is sent in a header like this:  Authorization: Bearer <token>
export function requireLogin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  try {
    // Check the token and save what is inside it (userId and role) for the next step
    res.locals.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Your login is not valid or has expired' });
  }
}
