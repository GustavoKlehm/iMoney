import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { expectedToDate, paceStatus, projectedMonth } from './pace.ts';

describe('expectedToDate', () => {
  it('dia 10 de 30 dias, limite 900 → 300', () => {
    assert.equal(expectedToDate(900, 10, 30), 300);
  });
});

describe('projectedMonth', () => {
  it('500 no dia 10 de 30 → 1500', () => {
    assert.equal(projectedMonth(500, 10, 30), 1500);
  });
});

describe('paceStatus mês corrente', () => {
  const base = { limit: 900, day: 10, daysInMonth: 30, isCurrentMonth: true };

  it('240 → on_track (80% do proporcional)', () => {
    assert.equal(paceStatus({ ...base, spent: 240 }), 'on_track');
  });
  it('270 → warning', () => {
    assert.equal(paceStatus({ ...base, spent: 270 }), 'warning');
  });
  it('301 → over_pace', () => {
    assert.equal(paceStatus({ ...base, spent: 301 }), 'over_pace');
  });
  it('900 → over_limit', () => {
    assert.equal(paceStatus({ ...base, spent: 900 }), 'over_limit');
  });
});

describe('paceStatus outro mês', () => {
  it('só over_limit ou null', () => {
    assert.equal(
      paceStatus({ spent: 100, limit: 900, day: 10, daysInMonth: 30, isCurrentMonth: false }),
      null,
    );
    assert.equal(
      paceStatus({ spent: 900, limit: 900, day: 10, daysInMonth: 30, isCurrentMonth: false }),
      'over_limit',
    );
  });
});
