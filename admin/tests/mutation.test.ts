import { describe, expect, it } from 'vitest';
import { createMutationExecutor } from '../src/mutation';
describe('administrative submission', () => {
  it('sends one operation when two clicks overlap', async () => {
    let finish!: (v: unknown) => void;
    let calls = 0;
    const execute = createMutationExecutor(async () => {
      calls++;
      return new Promise(resolve => {
        finish = resolve;
      });
    });
    const a = execute({ resource: 'tickets', payload: { operation: 'reply', content: 'Bonjour' } });
    const b = execute({ resource: 'tickets', payload: { operation: 'reply', content: 'Bonjour' } });
    finish({ ok: true });
    await Promise.all([a, b]);
    expect(calls).toBe(1);
  });
  it('reuses the operation ID after a lost response but changes it for a new payload', async () => {
    const ids: unknown[] = [];
    let fail = true;
    const execute = createMutationExecutor(async request => {
      ids.push(request.requestId);
      if (fail) {
        fail = false;
        throw new Error('timeout');
      }
      return { ok: true };
    });
    await expect(execute({ payload: { content: 'Première réponse' } })).rejects.toThrow();
    await execute({ payload: { content: 'Première réponse' } });
    await execute({ payload: { content: 'Autre réponse' } });
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[1]);
  });
});
