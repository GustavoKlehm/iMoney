import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { monthRange } from './monthRange.ts';

describe('monthRange', () => {
  it('usa o primeiro dia do mês seguinte em GMT-3 como limite exclusivo', () => {
    const { start, end } = monthRange(2026, 8);

    assert.equal(start.toISOString(), '2026-08-01T03:00:00.000Z');
    assert.equal(end.toISOString(), '2026-09-01T03:00:00.000Z');
    assert.ok(new Date('2026-08-31T23:59:59-03:00') < end);
  });
});
