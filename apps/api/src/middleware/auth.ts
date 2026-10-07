import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Plan, Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    plan: Plan;
    role: Role;
    // Set when an admin is using "Login as user" (admin user id).
    impersonatedBy?: string;
  };
}

interface JwtPayload {
  id: string;
  email: string;
  plan: Plan;
  role: Role;
  impersonatedBy?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: payload.id,
      email: payload.email,
      plan: payload.plan,
      role: payload.role ?? Role.USER,
      ...(payload.impersonatedBy ? { impersonatedBy: payload.impersonatedBy } : {}),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
