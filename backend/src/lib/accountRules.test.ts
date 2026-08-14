import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canBeDefault } from './accountRules.ts';

describe('canBeDefault', () => {
  it('conta comum ativa pode', () => {
    assert.equal(canBeDefault({ isReserved: false, isActive: true }), true);
  });
  it('cofrinho não pode', () => {
    assert.equal(canBeDefault({ isReserved: true, isActive: true }), false);
  });
  it('inativa não pode', () => {
    assert.equal(canBeDefault({ isReserved: false, isActive: false }), false);
  });
});
