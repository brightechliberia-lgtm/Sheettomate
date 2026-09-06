import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { convert } from './http';
import { createCircuitBreaker, CircuitOpenError } from './circuitBreaker';
import { sandboxCharge, sandboxMark, sandboxStatus } from './sandbox';
import { verifyWebhookSignature } from './webhook';

describe('currency', () => {
  it('converts USD to LRD using the configured rate', () => {
    const money = convert(10, 'LRD');
    assert.equal(money.currency, 'LRD');
    assert.equal(money.chargeAmount, money.amountLrd);
    assert.ok(money.amountLrd > money.amountUsd);
  });
});

describe('circuit breaker', () => {
  it('opens after repeated failures', async () => {
    const breaker = createCircuitBreaker('test', 2, 60_000);
    await assert.rejects(() => breaker.exec(async () => { throw new Error('fail'); }));
    await assert.rejects(() => breaker.exec(async () => { throw new Error('fail'); }));
    await assert.rejects(() => breaker.exec(async () => 'ok'), CircuitOpenError);
  });
});

describe('sandbox gateway', () => {
  it('returns USSD for Orange Money and tracks status', () => {
    const charge = sandboxCharge({
      reference: 'ref-1',
      amount: 5,
      currency: 'USD',
      method: 'ORANGE_MONEY',
      description: 'test',
      customer: { email: 'a@b.c', name: 'A' },
      returnUrl: 'http://x',
      webhookUrl: 'http://y',
    });
    assert.equal(charge.provider, 'SANDBOX');
    assert.ok(charge.ussdCode);
    sandboxMark('ref-1', 'COMPLETED');
    assert.equal(sandboxStatus('ref-1').status, 'COMPLETED');
  });
});

describe('webhook signatures', () => {
  it('accepts a valid HMAC', () => {
    const body = '{"reference":"abc","status":"SUCCESS"}';
    process.env.BANFFPAY_WEBHOOK_SECRET = 'dev-banffpay-webhook-secret';
    const sig = createHmac('sha256', 'dev-banffpay-webhook-secret').update(body).digest('hex');
    verifyWebhookSignature(body, sig);
  });
});
