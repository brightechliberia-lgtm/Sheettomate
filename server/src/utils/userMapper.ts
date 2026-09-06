import type { Role, StaffRole } from '@prisma/client';
import type { AuthUser, UserRole } from '@sheetomate/shared';

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: Role;
  country: string | null;
  phone: string | null;
  emailVerifiedAt: Date | null;
  avatarUrl?: string | null;
  staffRole?: StaffRole | null;
  suspendedAt?: Date | null;
};

export function toPublicUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    country: user.country,
    phone: user.phone,
    emailVerified: Boolean(user.emailVerifiedAt),
    avatarUrl: user.avatarUrl ?? null,
    staffRole: user.staffRole ?? (user.role === 'ADMIN' ? 'SUPER' : null),
    suspended: Boolean(user.suspendedAt),
  };
}
