import { staffCan, type StaffScope } from '@sheetomate/shared';
import { useAuth } from '../context/AuthContext';

export default function StaffGate({ scope, children }: { scope: StaffScope; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!staffCan(user?.staffRole ?? 'SUPER', scope)) {
    return <p className="text-stone-600">Your admin role cannot open this section.</p>;
  }
  return <>{children}</>;
}
