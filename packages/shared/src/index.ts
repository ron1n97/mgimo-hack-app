import { z } from 'zod';

export const RoleSchema = z.enum(['STUDENT', 'STAFF', 'ADMIN']);
export type Role = z.infer<typeof RoleSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof LoginSchema>;
/** @deprecated alias — use LoginSchema */
export const LoginDto = LoginSchema;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: RoleSchema.default('STUDENT'),
  fullName: z.string().min(2),
  faculty: z.string().optional(),
  program: z.string().optional(),
  course: z.number().int().min(1).max(6).optional(),
  groupLabel: z.string().optional(),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;
/** @deprecated alias — use RegisterSchema */
export const RegisterDto = RegisterSchema;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.string().optional(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const UserPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  fullName: z.string().optional(),
  groupLabel: z.string().optional(),
  faculty: z.string().optional(),
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

export const AuthResponseSchema = z.object({
  user: UserPublicSchema.passthrough(),
  accessToken: z.string(),
  /** @deprecated nest returns flat accessToken; kept for older clients */
  tokens: AuthTokensSchema.optional(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const TicketStatusSchema = z.enum([
  'SUBMITTED',
  'IN_PROGRESS',
  'DONE',
  'REJECTED',
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const CreateRequestSchema = z.object({
  type: z.string().min(2),
  title: z.string().min(2),
  body: z.string().min(2),
  useAiDraft: z.boolean().optional(),
});
export type CreateRequestDto = z.infer<typeof CreateRequestSchema>;

export const ScheduleLessonSchema = z.object({
  id: z.string(),
  date: z.string(),
  begin: z.string(),
  end: z.string(),
  discipline: z.string(),
  lecturer: z.string().nullable().optional(),
  auditorium: z.string().nullable().optional(),
  building: z.string().nullable().optional(),
  kindOfWork: z.string().nullable().optional(),
  groupLabel: z.string().optional(),
  isCancelled: z.boolean().optional(),
  isMoved: z.boolean().optional(),
});
export type ScheduleLessonDto = z.infer<typeof ScheduleLessonSchema>;

export const RequestTicketSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  status: TicketStatusSchema,
  aiDraft: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type RequestTicketDto = z.infer<typeof RequestTicketSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  kind: z.string(),
  readAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof NotificationSchema>;

export const GradeSchema = z.object({
  id: z.string(),
  discipline: z.string(),
  grade: z.string(),
  gradeType: z.string(),
  semester: z.string(),
  isDebt: z.boolean(),
});
export type GradeDto = z.infer<typeof GradeSchema>;

export const TodayResponseSchema = z.object({
  date: z.string(),
  lessons: z.array(ScheduleLessonSchema),
  openRequests: z.array(RequestTicketSchema).optional(),
  unreadNotifications: z.array(NotificationSchema).optional(),
  debts: z.array(GradeSchema).optional(),
  summary: z.string().optional(),
});
export type TodayResponse = z.infer<typeof TodayResponseSchema>;

export const ScheduleRangeResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  lessons: z.array(ScheduleLessonSchema),
});
export type ScheduleRangeResponse = z.infer<typeof ScheduleRangeResponseSchema>;

export const RequestsListResponseSchema = z.object({
  items: z.array(RequestTicketSchema),
});
export type RequestsListResponse = z.infer<typeof RequestsListResponseSchema>;

export const DEMO_ACCOUNTS = [
  {
    email: 'anna.risk@demo.local',
    password: 'Demo123!',
    note: 'Студент A — academic risk',
  },
  {
    email: 'boris.ok@demo.local',
    password: 'Demo123!',
    note: 'Студент B — спокойный',
  },
  {
    email: 'staff@demo.local',
    password: 'Demo123!',
    note: 'Сотрудник деканата',
  },
] as const;

/** Shared visual tokens (web + mobile) */
export const BRAND_COLORS = {
  ink: '#0B1C2C',
  cream: '#F3EADC',
  copper: '#C45C26',
  copperDark: '#9A4519',
  inkMuted: '#3A4F63',
  creamDeep: '#E8D9C4',
} as const;
