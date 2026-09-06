import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cronMatches, evaluateCondition } from './logic';

describe('automation logic', () => {
  it('evaluates IF-THEN numeric conditions', () => {
    assert.equal(evaluateCondition({ sales: 120 }, 'sales', 'gt', '100'), true);
    assert.equal(evaluateCondition({ stock: 4 }, 'stock', 'lt', '10'), true);
    assert.equal(evaluateCondition({ name: 'Cashbook' }, 'name', 'contains', 'cash'), true);
  });

  it('matches simple UTC cron', () => {
    const mondayMorning = new Date(Date.UTC(2026, 7, 3, 8, 0, 0));
    assert.equal(cronMatches('0 8 * * 1', mondayMorning), true);
    assert.equal(cronMatches('0 9 * * 1', mondayMorning), false);
  });
});
