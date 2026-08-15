import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appNowParts, parseAppDateTime } from './appTime.ts';

describe('parseAppDateTime', () => {
  it('interpreta horário sem fuso como GMT-3', () => {
    assert.equal(parseAppDateTime('2026-08-14T19:00').toISOString(), '2026-08-14T22:00:00.000Z');
    assert.equal(parseAppDateTime('2026-08-14T19:00:00').toISOString(), '2026-08-14T22:00:00.000Z');
  });

  it('interpreta data sem hora como meia-noite em GMT-3', () => {
    assert.equal(parseAppDateTime('2026-08-14').toISOString(), '2026-08-14T03:00:00.000Z');
  });

  it('preserva instante quando o fuso já vem no valor', () => {
    assert.equal(
      parseAppDateTime('2026-08-14T19:00:00-03:00').toISOString(),
      '2026-08-14T22:00:00.000Z',
    );
  });
});

describe('appNowParts', () => {
  it('devolve ano, mês e dia no fuso de Brasília', () => {
    const parts = appNowParts(new Date('2026-09-01T01:30:00.000Z'));
    assert.deepEqual(parts, { year: 2026, month: 8, day: 31, hour: 22, minute: 30 });
  });
});
