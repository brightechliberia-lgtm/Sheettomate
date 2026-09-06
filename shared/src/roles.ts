export const UserRole = {
  ADMIN: 'ADMIN',
  CREATOR: 'CREATOR',
  USER: 'USER',
  LEARNER: 'LEARNER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const StaffRole = {
  SUPER: 'SUPER',
  CONTENT: 'CONTENT',
  COMMUNITY: 'COMMUNITY',
  FINANCE: 'FINANCE',
} as const;

export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  ADMIN: [
    'platform:manage',
    'users:manage',
    'templates:manage',
    'templates:upload',
    'templates:buy',
    'courses:manage',
    'courses:enroll',
    'ai:request',
    'payments:view',
    'automations:use',
  ],
  LEARNER: ['templates:buy', 'courses:enroll', 'ai:request', 'automations:use'],
  USER: ['templates:buy', 'ai:request', 'automations:use'],
  CREATOR: ['templates:upload', 'templates:manage-own', 'templates:buy', 'ai:request', 'automations:use'],
};

export const STAFF_SCOPES = {
  overview: ['SUPER', 'CONTENT', 'COMMUNITY', 'FINANCE'],
  users: ['SUPER', 'COMMUNITY'],
  templates: ['SUPER', 'CONTENT'],
  courses: ['SUPER', 'CONTENT'],
  payments: ['SUPER', 'FINANCE'],
  cms: ['SUPER', 'CONTENT'],
  moderation: ['SUPER', 'COMMUNITY'],
  analytics: ['SUPER', 'FINANCE', 'CONTENT'],
  ai: ['SUPER', 'CONTENT'],
  settings: ['SUPER'],
  health: ['SUPER'],
  reports: ['SUPER', 'FINANCE'],
} as const;

export type StaffScope = keyof typeof STAFF_SCOPES;

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function staffCan(staffRole: StaffRole | null | undefined, scope: StaffScope): boolean {
  const role = staffRole ?? 'SUPER';
  return (STAFF_SCOPES[scope] as readonly string[]).includes(role);
}
