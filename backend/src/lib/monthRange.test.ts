import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { monthRange } from './monthRange.ts';

describe('monthRange', () => {
  it('usa o primeiro dia do mês seguinte como limite exclusivo', () => {
    const { start, end } = monthRange(2026, 8);

    assert.deepEqual(start, new Date(2026, 7, 1));
    assert.deepEqual(end, new Date(2026, 8, 1));
    assert.ok(new Date(2026, 7, 31, 23, 59, 59, 999) < end);
  });
});
