import { z } from 'zod';
import { Role } from '@prisma/client';
import { WEST_AFRICAN_COUNTRIES } from '@sheetomate/shared';
import { stripHtml } from '../utils/sanitize';

const emailField = z.string().trim().toLowerCase().email();
const nameField = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .transform(stripHtml);
const phoneField = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^[+\d][\d\s-]+$/, 'Enter a valid phone number');
const passwordField = z
  .string()
  .min(8)
  .max(72)
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must include a letter and a number');

export const registerSchema = z.object({
  email: emailField,
  name: nameField,
  password: passwordField,
  phone: phoneField,
  role: z.nativeEnum(Role).optional(),
  country: z.enum(WEST_AFRICAN_COUNTRIES).optional(),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: passwordField,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16),
});

export const resendVerificationSchema = z.object({
  email: emailField,
});

export const updateProfileSchema = z.object({
  name: nameField.optional(),
  phone: phoneField.optional(),
  country: z.enum(WEST_AFRICAN_COUNTRIES).optional(),
  bio: z.string().trim().max(800).optional(),
  expertise: z.array(z.string().max(40)).max(12).optional(),
  digestOptIn: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordField,
});

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const adminUpdateUserSchema = z.object({
  name: nameField.optional(),
  email: emailField.optional(),
  phone: z
    .union([phoneField, z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
  country: z.union([z.enum(WEST_AFRICAN_COUNTRIES), z.null()]).optional(),
  role: z.nativeEnum(Role).optional(),
});

export const createTemplateSchema = z.object({
  title: z.string().trim().min(3).max(160).transform(stripHtml),
  description: z.string().trim().min(10).max(5000).transform(stripHtml),
  category: z.string().trim().min(2).max(80).transform(stripHtml),
  price: z.coerce.number().min(0),
  tags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) => {
      if (!value) return [] as string[];
      const list = Array.isArray(value) ? value : value.split(',');
      return list.map((tag) => stripHtml(tag).toLowerCase()).filter(Boolean).slice(0, 12);
    }),
  fileUrl: z.string().min(1).optional(),
  previewUrl: z.string().optional(),
  demoUrl: z
    .union([z.literal(''), z.string().url()])
    .optional()
    .transform((v) => (v ? v : undefined)),
  videoTutorial: z
    .union([z.literal(''), z.string().url()])
    .optional()
    .transform((v) => (v ? v : undefined)),
  rows: z.coerce.number().int().min(1).optional(),
  columns: z.coerce.number().int().min(1).optional(),
  softwareRequired: z.string().max(80).optional(),
  version: z.string().max(20).optional(),
  language: z.string().max(20).optional(),
  isAiGenerated: z.coerce.boolean().optional(),
  createGoogleSheet: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === 'on' || v === '1'),
  published: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === true || v === 'true' || v === 'on' || v === '1';
    }),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const templateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().trim().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['newest', 'popular', 'price_asc', 'price_desc']).default('newest'),
});

export const templateSearchSchema = z.object({
  q: z.string().trim().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const ratingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const questionSchema = z.object({
  body: z.string().trim().min(8).max(2000).transform(stripHtml),
});

export const answerSchema = z.object({
  body: z.string().trim().min(4).max(2000).transform(stripHtml),
});

export const createCourseSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(5000),
  category: z.string().trim().min(2).max(80).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  price: z.coerce.number().min(0),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  objectives: z.array(z.string().max(200)).optional(),
  prerequisites: z.string().max(2000).optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  promoPercent: z.coerce.number().min(0).max(90).optional(),
});

export const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(160),
  moduleTitle: z.string().max(160).optional().nullable(),
  type: z.enum(['VIDEO', 'TEXT', 'QUIZ', 'PRACTICE', 'PROJECT']),
  content: z.string().max(50000).optional(),
  videoUrl: z.string().max(500).optional(),
  durationSec: z.coerce.number().min(0).optional(),
  quiz: z.unknown().optional(),
  practiceTemplateId: z.string().uuid().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  resources: z.array(z.object({ title: z.string(), url: z.string(), kind: z.string().optional() })).optional(),
});

export const importLessonsSchema = z.object({
  lessons: z.array(lessonSchema.omit({ id: true })).min(1).max(80),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const quizSubmitSchema = z.object({
  answers: z.record(z.union([z.string(), z.boolean()])),
});

export const progressSchema = z.object({
  completed: z.boolean().optional(),
  positionSec: z.coerce.number().int().min(0).optional(),
});

export const noteSchema = z.object({
  body: z.string().max(8000),
});

export const projectSchema = z.object({
  notes: z.string().min(4).max(4000),
  fileUrl: z.string().max(500).optional(),
});

export const courseRatingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const reviewCourseSchema = z.object({
  status: z.enum(['PUBLISHED', 'REJECTED']),
  reason: z.string().max(500).optional(),
});

export const promoSchema = z.object({
  code: z.string().min(3).max(20),
  percentOff: z.coerce.number().int().min(1).max(90),
  startsAt: z.string(),
  endsAt: z.string().optional(),
});

export const enrollSchema = z.object({
  courseId: z.string().uuid(),
});

export const initiatePaymentSchema = z.object({
  gateway: z.enum(['ORANGE_MONEY', 'MOBILE_MONEY', 'BANFFPAY_VISA', 'MTN_MOMO', 'WALLET']),
  currency: z.enum(['USD', 'LRD']).default('USD'),
  phone: z.string().min(8).max(20).optional(),
  templateIds: z.array(z.string().uuid()).optional(),
  templateId: z.string().uuid().optional(),
  courseIds: z.array(z.string().uuid()).optional(),
  courseId: z.string().uuid().optional(),
  purpose: z.enum(['TEMPLATE', 'WALLET_TOPUP', 'COURSE']).optional(),
  amountUsd: z.coerce.number().positive().optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().max(200).optional(),
  idempotencyKey: z.string().max(80).optional(),
}).transform((value) => ({
  ...value,
  templateIds: value.templateIds?.length ? value.templateIds : value.templateId ? [value.templateId] : [],
  courseIds: value.courseIds?.length ? value.courseIds : value.courseId ? [value.courseId] : [],
  amountUsd: value.amountUsd ?? value.amount,
}));

export const checkoutSchema = initiatePaymentSchema;

export const walletTopupSchema = z.object({
  gateway: z.enum(['ORANGE_MONEY', 'MOBILE_MONEY', 'BANFFPAY_VISA', 'MTN_MOMO']),
  currency: z.enum(['USD', 'LRD']).default('USD'),
  amountUsd: z.coerce.number().positive(),
  phone: z.string().min(8).max(20).optional(),
});

export const aiRequestSchema = z.object({
  prompt: z.string().trim().min(10).max(4000),
  category: z.string().optional(),
  industry: z.string().optional(),
});

export const aiGenerateSchema = aiRequestSchema;

export const aiRefineSchema = z.object({
  requestId: z.string().uuid(),
  prompt: z.string().trim().min(8).max(4000),
});

export const aiFeedbackSchema = z.object({
  requestId: z.string().uuid(),
  rating: z.enum(['UP', 'DOWN']),
});

export const aiPublishSchema = z.object({
  requestId: z.string().uuid(),
  title: z.string().min(3).max(160).optional(),
  price: z.coerce.number().min(0).optional(),
});

export const aiPromptTemplateSchema = z.object({
  slug: z.string().min(2).max(80).optional(),
  title: z.string().min(2).max(160),
  category: z.string().min(2).max(80),
  industry: z.string().min(2).max(80),
  examplePrompt: z.string().min(10),
  systemPrompt: z.string().min(10),
  enabled: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const aiSettingsSchema = z.object({
  dailyLimitUser: z.coerce.number().int().min(0).max(1000).optional(),
  dailyLimitCreator: z.coerce.number().int().min(0).max(1000).optional(),
  dailyLimitAdmin: z.coerce.number().int().min(0).max(5000).optional(),
});

export const paginationSchema = templateListQuerySchema;
