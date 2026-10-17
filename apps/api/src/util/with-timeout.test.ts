import { describe, expect, it } from 'vitest';
import { withTimeout } from './with-timeout.ts';

// testing.md S1-11
describe('withTimeout', () => {
  it('resolves with the task result when it finishes in time', async () => {
    await expect(withTimeout(async () => 'done', 50)).resolves.toBe('done');
  });

  it('rejects and aborts the signal when the task never settles', async () => {
    let seen: AbortSignal | undefined;
    const never = (signal: AbortSignal) => {
      seen = signal;
      return new Promise<never>(() => undefined);
    };

    await expect(withTimeout(never, 20)).rejects.toThrow('Timed out');
    expect(seen?.aborted).toBe(true);
  });

  it('passes through the task error', async () => {
    await expect(
      withTimeout(async () => {
        throw new Error('boom');
      }, 50),
    ).rejects.toThrow('boom');
  });
});
