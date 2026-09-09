import { env } from '../config/env';

export type PublicPaymentMethod = 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANFFPAY_VISA' | 'WALLET';

export function isPaymentsSandbox(): boolean {
  return env.paymentsMode === 'sandbox';
}

export function banffpayLive(): boolean {
  return env.paymentsMode === 'live' && Boolean(env.banffpayApiKey);
}

export function orangeLive(): boolean {
  return env.paymentsMode === 'live' && Boolean(env.orangeMoneyApiKey);
}

/** Public checkout config — no secrets. */
export function getPaymentsPublicConfig() {
  const sandbox = isPaymentsSandbox();
  const banff = banffpayLive();
  const orange = orangeLive();

  const methods: Record<PublicPaymentMethod, boolean> = {
    ORANGE_MONEY: sandbox || orange || banff,
    MTN_MOMO: sandbox || banff,
    BANFFPAY_VISA: sandbox || banff,
    WALLET: true,
  };

  return {
    mode: env.paymentsMode,
    sandbox,
    fxUsdLrd: env.fxUsdLrd,
    methods,
    providers: {
      banffpay: banff,
      orange,
    },
    currencies: ['USD', 'LRD'] as const,
    note: sandbox
      ? 'Sandbox mode: charges are simulated. Set PAYMENTS_MODE=live and provider API keys for real money.'
      : 'Live mode: Orange Money, MTN MoMo, and cards settle through configured providers.',
  };
}
