import type { UserRole, StaffRole } from './roles';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentGateway = 'ORANGE_MONEY' | 'MOBILE_MONEY' | 'BANFFPAY_VISA' | 'MTN_MOMO' | 'WALLET';
export type AIRequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  country: string | null;
  phone: string | null;
  emailVerified: boolean;
  avatarUrl?: string | null;
  staffRole?: StaffRole | null;
  suspended?: boolean;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T> = ApiSuccessBody<T> | ApiErrorBody;

export const WEST_AFRICAN_COUNTRIES = [
  'LR',
  'GH',
  'NG',
  'SL',
  'CI',
  'SN',
  'GN',
  'GM',
  'ML',
  'BF',
  'BJ',
  'TG',
  'GW',
  'NE',
  'CV',
] as const;

export type WestAfricanCountry = (typeof WEST_AFRICAN_COUNTRIES)[number];

export const TEMPLATE_CATEGORIES = [
  'Finance',
  'FMCG',
  'Inventory',
  'HR',
  'NGO',
  'Education',
  'Real Estate',
  'Agriculture',
  'Health',
  'E-commerce',
] as const;

export const TEMPLATE_TAGS = [
  'budget',
  'tracking',
  'dashboard',
  'invoicing',
  'payroll',
  'inventory',
  'reporting',
  'forecasting',
  'grants',
  'sales',
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface MarketplaceTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: string | number;
  currency: string;
  previewUrl: string | null;
  demoUrl: string | null;
  videoTutorial: string | null;
  rows: number | null;
  columns: number | null;
  softwareRequired: string;
  version: string;
  language: string;
  downloadCount: number;
  averageRating: number;
  ratingCount: number;
  isAiGenerated: boolean;
  createdBy?: { id: string; name: string };
}
