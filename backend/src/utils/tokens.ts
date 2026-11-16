import { Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { RefreshToken } from '../models/refreshToken';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // in milliseconds

// Makes a login token that works for 15 minutes
export function makeLoginToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: '15m' });
}

// Scrambles a refresh token, so we never save the real one
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Makes a refresh token that works for 7 days.
// It is saved in the database (scrambled) and sent to the browser in a cookie.
export async function makeRefreshToken(res: Response, userId: string) {
  const refreshToken = crypto.randomBytes(40).toString('hex');

  await RefreshToken.create({
    userId: userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + SEVEN_DAYS),
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: SEVEN_DAYS,
  });
}
