import express from 'express';
import { SEVERITIES, type HealthResponse } from '@alerts/shared';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', severities: SEVERITIES };
    res.json(body);
  });

  return app;
}
