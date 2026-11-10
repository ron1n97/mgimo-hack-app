export type UserRole = "student" | "staff" | "admin";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  groupName?: string;
  groupRuzId?: string;
  preferredSubGroupOids?: string[];
  phone?: string;
  faculty?: string;
  program?: string;
  course?: number;
  department?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type ScheduleItem = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date?: string;
  room?: string;
  teacher?: string;
  kind?: string;
  building?: string;
  subGroup?: string;
  subGroupOid?: string;
  stream?: string;
};

export type GradeItem = {
  id: string;
  subject: string;
  value: string;
  date: string;
  kind?: string;
  isDebt?: boolean;
};

export type RequestStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected";

export type ServiceRequest = {
  id: string;
  type: string;
  subject: string;
  body: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
  studentName?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  kind?: string;
  createdAt: string;
  read: boolean;
};

export type TodayHub = {
  date?: string;
  lessons: ScheduleItem[];
  nextLesson?: ScheduleItem | null;
  openRequests: number;
  unreadNotifications: number;
  importantUnread: NotificationItem[];
  recentGrades: GradeItem[];
};

export type ClubTag = {
  id: string;
  slug: string;
  name: string;
};

export type ClubSource = {
  id: string;
  kind: "TELEGRAM" | "VK" | "WEBSITE" | string;
  url: string;
  title?: string | null;
  enabled: boolean;
};

export type Club = {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "CONFIRMED" | string;
  digestEnabled: boolean;
  websiteUrl?: string | null;
  structureNote?: string | null;
  tags: ClubTag[];
  sources: ClubSource[];
  subscribed?: boolean;
};

export type DigestFeedItem = {
  id: string;
  title: string;
  body?: string | null;
  url?: string | null;
  startsAt?: string | null;
  club?: { id: string; name: string } | null;
};

export type StudentInterests = {
  tags: ClubTag[];
  clubs: Club[];
};
