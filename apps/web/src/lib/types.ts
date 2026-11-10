export type UserRole = "student" | "staff" | "admin" | "teacher";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  groupName?: string;
  groupRuzId?: string;
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
  createdAt: string;
  read: boolean;
};

export type TodayHub = {
  date?: string;
  lessons: ScheduleItem[];
  nextLesson?: ScheduleItem | null;
  openRequests: number;
  unreadNotifications: number;
  recentGrades: GradeItem[];
};
