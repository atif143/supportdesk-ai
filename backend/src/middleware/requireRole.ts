import { NextFunction, Request, Response } from 'express';

// Lets the request continue only if the user has one of the allowed roles.
// Use it after requireLogin, for example:  requireRole(['admin'])
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(res.locals.user.role)) {
      res.status(403).json({ error: 'You are not allowed to do this' });
      return;
    }
    next();
  };
}
