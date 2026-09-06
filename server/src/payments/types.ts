export type ChargeMethod = 'ORANGE_MONEY' | 'MOBILE_MONEY' | 'MTN_MOMO' | 'BANFFPAY_VISA' | 'WALLET';

export interface ChargeRequest {
  reference: string;
  amount: number;
  currency: 'USD' | 'LRD';
  method: ChargeMethod;
  description: string;
  customer: { email: string; name: string; phone?: string | null };
  returnUrl: string;
  webhookUrl: string;
}

export interface ChargeResult {
  provider: 'BANFFPAY' | 'ORANGE' | 'WALLET' | 'SANDBOX';
  providerRef: string;
  checkoutUrl?: string;
  ussdCode?: string;
  qrPayload?: string;
  instructions: string;
  raw: unknown;
}

export interface ProviderStatus {
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  providerRef?: string;
  raw: unknown;
}
