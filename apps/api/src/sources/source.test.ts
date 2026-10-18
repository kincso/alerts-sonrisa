import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fetchText } from './source.ts';

// testing.md S2-14 (S2 review m4): the only code that turns a non-2xx into an error.
describe('fetchText', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = createServer((req, res) => {
      res.statusCode = req.url === '/ok' ? 200 : 404;
      res.end(req.url === '/ok' ? 'feed body' : '<html>Not found</html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns the body for a 2xx response', async () => {
    await expect(fetchText(`${baseUrl}/ok`, new AbortController().signal)).resolves.toBe(
      'feed body',
    );
  });

  it('rejects a 404 instead of handing the HTML to normalise', async () => {
    await expect(fetchText(`${baseUrl}/missing`, new AbortController().signal)).rejects.toThrow(
      `HTTP 404 from ${baseUrl}/missing`,
    );
  });
});
