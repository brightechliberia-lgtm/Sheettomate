import { useSearchParams } from 'react-router-dom';

export default function SandboxCardPage() {
  const [params] = useSearchParams();
  const reference = params.get('reference');
  return (
    <div className="max-w-md mx-auto rounded-2xl border bg-white p-8">
      <h1 className="text-2xl font-bold">BanffPay sandbox</h1>
      <p className="mt-2 text-sm text-stone-600">
        This page stands in for the hosted card form. Sheettomate never sees card numbers. Reference {reference}.
      </p>
      <p className="mt-4 text-sm">Return to the payment status screen and tap “Sandbox: mark paid”.</p>
    </div>
  );
}
