import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../types/dispatch.js';
import { sandboxStore } from '../adapters/sandboxStore.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  try {
    const user = await sandboxStore.verifyToken(token);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Session expired or invalid.' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Authentication failed.' });
  }
}

export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7).trim();
  try {
    const user = await sandboxStore.verifyToken(token);
    if (user) {
      req.user = user;
    }
  } catch {
    // If token invalid or expired, continue as guest
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Access requires one of [${allowedRoles.join(', ')}]. Your role is ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}
