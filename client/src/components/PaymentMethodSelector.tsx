import type { PaymentGateway } from '@sheetomate/shared';

const METHODS: { id: PaymentGateway; label: string; hint: string }[] = [
  { id: 'ORANGE_MONEY', label: 'Orange Money', hint: 'USSD / push to your Orange line' },
  { id: 'MTN_MOMO', label: 'MTN Mobile Money', hint: 'Approve the MTN MoMo request' },
  { id: 'BANFFPAY_VISA', label: 'Visa / Mastercard', hint: 'Hosted BanffPay page — we never store cards' },
  { id: 'WALLET', label: 'Sheettomate wallet', hint: 'Pay from your USD/LRD balance' },
];

export default function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: PaymentGateway;
  onChange: (value: PaymentGateway) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">Pay with</legend>
      {METHODS.map((method) => (
        <label key={method.id} className="flex gap-3 rounded-xl border p-3 cursor-pointer has-[:checked]:border-brand-600">
          <input type="radio" name="gateway" checked={value === method.id} onChange={() => onChange(method.id)} />
          <span>
            <span className="font-medium block">{method.label}</span>
            <span className="text-xs text-stone-500">{method.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
