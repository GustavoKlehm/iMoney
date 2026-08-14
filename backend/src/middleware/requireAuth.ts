import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const isHealthRoute =
    req.path === '/health' ||
    req.originalUrl === '/api/health' ||
    req.originalUrl.startsWith('/api/health?');

  if (
    req.method === 'GET' &&
    isHealthRoute
  ) {
    next();
    return;
  }

  const authorization = req.header('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    next(new AppError(401, 'Não autenticado'));
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    next(new AppError(401, 'Não autenticado'));
    return;
  }

  try {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;

    if (!url || !anon) {
      throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios');
    }

    const supabase = createClient(url, anon);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      next(new AppError(401, 'Não autenticado'));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
