import { Link } from 'react-router-dom';
import { staffCan } from '@sheetomate/shared';
import { useAuth } from '../context/AuthContext';

export default function QuickActions() {
  const { user } = useAuth();
  const staff = user?.staffRole ?? 'SUPER';
  return (
    <div className="flex flex-wrap gap-2">
      {staffCan(staff, 'users') && (
        <Link to="/admin/users" className="rounded-lg border bg-white px-3 py-1.5 text-sm font-semibold">
          Manage users
        </Link>
      )}
      {staffCan(staff, 'payments') && (
        <Link to="/admin/payments" className="rounded-lg border bg-white px-3 py-1.5 text-sm font-semibold">
          Review payments
        </Link>
      )}
      {staffCan(staff, 'moderation') && (
        <Link to="/admin/moderation" className="rounded-lg border bg-white px-3 py-1.5 text-sm font-semibold">
          Open flags
        </Link>
      )}
      {staffCan(staff, 'reports') && (
        <Link to="/admin/reports" className="rounded-lg border bg-white px-3 py-1.5 text-sm font-semibold">
          Export reports
        </Link>
      )}
    </div>
  );
}
