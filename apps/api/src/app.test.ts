import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { HealthResponse } from '@alerts/shared';
import { createApp } from './app.ts';

describe('GET /api/health', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {
    server = createApp().listen(0);
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => {
    server.close();
  });

  it('returns ok and the shared severity order', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = (await res.json()) as HealthResponse;

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'ok', severities: ['low', 'medium', 'high'] });
  });
});
