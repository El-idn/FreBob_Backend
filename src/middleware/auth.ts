import type { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../supabase.js';
import { DEMO_BUSINESS_ID, isDemoBusiness, userBelongsToBusiness } from '../repo/index.js';

export type AuthContext = {
  mode: 'demo' | 'jwt';
  authUserId?: string;
  demo: boolean;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function readBusinessId(req: Request): string | undefined {
  const businessIdRaw = req.params.businessId ?? req.body?.businessId;
  return Array.isArray(businessIdRaw)
    ? businessIdRaw[0]
    : (businessIdRaw as string | undefined);
}

/** Require a valid Supabase JWT (no business membership check). */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({
        error: 'Supabase is not configured on the server',
        hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for real auth.',
      });
      return;
    }

    const header = req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization Bearer token' });
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.auth = { mode: 'jwt', authUserId: data.user.id, demo: false };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Explore Demo: `X-Demo-Mode: 1` + demo business id (works with or without Supabase).
 * Real users: Bearer JWT + membership for businessId (body/params).
 * Memory mode (no Supabase): demo header required.
 */
export async function requireBusinessAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const businessId = readBusinessId(req);
    const supabase = getSupabase();
    const demo = req.header('X-Demo-Mode') === '1';

    if (demo) {
      if (businessId && !isDemoBusiness(businessId)) {
        res.status(403).json({
          error: 'Demo mode only allows the demo business',
          demoBusinessId: DEMO_BUSINESS_ID,
        });
        return;
      }
      req.auth = { mode: 'demo', demo: true };
      next();
      return;
    }

    if (!supabase) {
      res.status(401).json({
        error: 'Demo mode required',
        hint: 'Send header X-Demo-Mode: 1 when Supabase is not configured.',
      });
      return;
    }

    const header = req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization Bearer token' });
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    if (businessId) {
      const ok = await userBelongsToBusiness(data.user.id, businessId);
      if (!ok) {
        res.status(403).json({ error: 'Not a member of this business' });
        return;
      }
    }

    req.auth = { mode: 'jwt', authUserId: data.user.id, demo: false };
    next();
  } catch (err) {
    next(err);
  }
}
