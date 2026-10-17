import express, { type NextFunction, type Request, type Response } from 'express';
import { SEVERITIES, type ApiError, type HealthResponse } from '@alerts/shared';
import { authenticate } from './auth/auth.middleware.ts';
import type { ChannelRegistry } from './channels/registry.ts';
import type { Db } from './db/database.ts';
import type { Dispatcher } from './dispatcher/dispatcher.ts';
import type { Poller } from './poller/poller.ts';
import { adminRoutes } from './routes/admin.routes.ts';
import { alertRoutes } from './routes/alerts.routes.ts';
import { connectionRoutes } from './routes/connections.routes.ts';
import { meRoutes } from './routes/me.routes.ts';
import { publicRoutes } from './routes/public.routes.ts';
import type { SourceRegistry } from './sources/registry.ts';

export interface AppDeps {
  db: Db;
  channels: ChannelRegistry;
  sources: SourceRegistry;
  poller: Poller;
  dispatcher: Dispatcher;
}

function isBadJson(err: unknown): boolean {
  return err instanceof SyntaxError && 'status' in err && err.status === 400;
}

// Express only treats a 4-parameter function as an error handler, so `_next` must stay.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleError(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (isBadJson(err)) {
    const body: ApiError = { message: 'The request body is not valid JSON.' };
    res.status(400).json(body);
    return;
  }
  console.error(err);
  const body: ApiError = { message: 'Something went wrong on the server.' };
  res.status(500).json(body);
}

export function createApp({ db, channels, sources, poller, dispatcher }: AppDeps): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', severities: SEVERITIES };
    res.json(body);
  });
  app.use('/api', publicRoutes(db));

  app.use('/api', authenticate(db));
  app.use('/api', meRoutes(db));
  app.use('/api', connectionRoutes(db, channels));
  app.use('/api', alertRoutes(db, sources));
  app.use('/api', adminRoutes({ db, sources, poller, dispatcher }));

  app.use(handleError);
  return app;
}
