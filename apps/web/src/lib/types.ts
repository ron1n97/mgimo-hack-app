export type UserRole = "student" | "staff" | "admin" | "teacher";

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

export type TeacherSlot = {
  assignmentId: string;
  lesson: {
    id: string;
    date: string;
    begin: string;
    end: string;
    discipline: string;
    groupRuzId: string;
    groupLabel: string;
    lecturer?: string | null;
    auditorium?: string | null;
    building?: string | null;
    kindOfWork?: string | null;
  };
  taskCount: number;
};

export type LessonTaskItem = {
  id: string;
  title: string;
  body: string;
  dueAt?: string | null;
  groupRuzId: string;
  scheduleLessonId?: string | null;
  createdAt: string;
  assignment?: {
    discipline?: string | null;
    groupLabel?: string | null;
    scheduleLesson?: {
      date?: string;
      begin?: string;
      end?: string;
      discipline?: string;
    } | null;
  };
  createdBy?: {
    id: string;
    teacherProfile?: { fullName?: string } | null;
  };
};

export type TeacherAssignmentRow = {
  id: string;
  teacherUserId: string;
  scheduleLessonId?: string | null;
  groupRuzId?: string | null;
  groupLabel?: string | null;
  discipline?: string | null;
  teacher?: { fullName: string };
  scheduleLesson?: {
    id: string;
    date: string;
    begin: string;
    end: string;
    discipline: string;
    groupLabel: string;
  } | null;
  _count?: { tasks: number };
};

export type TeacherListItem = {
  id: string;
  email: string;
  teacherProfile?: { fullName: string; department?: string | null } | null;
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
  isMoved?: boolean;
  isCancelled?: boolean;
};

export type GradeItem = {
  id: string;
  subject: string;
  value: string;
  date: string;
  kind?: string;
  isDebt?: boolean;
  /** e.g. «пара 12.11 09:00» when bound to ScheduleLesson */
  lessonHint?: string;
  scheduleLessonId?: string;
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
  studentUserId?: string;
  studentGroupLabel?: string;
  studentFaculty?: string;
  studentProgram?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  kind?: string;
  createdAt: string;
  read: boolean;
};

export type TodayClubEvent = {
  id: string;
  title: string;
  body?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  startsAt?: string | null;
  publishedAt?: string | null;
  club?: { id: string; name: string } | null;
};

export type TodayHub = {
  date?: string;
  lessons: ScheduleItem[];
  nextLesson?: ScheduleItem | null;
  openRequests: number;
  unreadNotifications: number;
  importantUnread: NotificationItem[];
  recentGrades: GradeItem[];
  clubEventsToday: TodayClubEvent[];
  clubDigestWeek: {
    from: string;
    to: string;
    todayCount: number;
    items: TodayClubEvent[];
  };
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
  imageUrl?: string | null;
  startsAt?: string | null;
  publishedAt?: string | null;
  club?: { id: string; name: string } | null;
};

export type StudentInterests = {
  tags: ClubTag[];
  clubs: Club[];
};
