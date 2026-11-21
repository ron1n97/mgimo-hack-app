/**
 * Non-destructive extras for live/demo DB:
 * - admin + staff accounts
 * - roman student
 * - grades for demo students (and any «Гуськов» already registered)
 *
 * Does NOT wipe users or RUZ lessons.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedDemoClubEvents, seedDigestNewsFeed } from './seed-clubs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo123!';

async function upsertStaffish(opts: {
  email: string;
  role: Role;
  fullName: string;
  department: string;
  phone: string;
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: opts.role,
        passwordHash,
        phoneE164: opts.phone,
      },
    });
    await prisma.staffProfile.upsert({
      where: { userId: existing.id },
      create: {
        userId: existing.id,
        fullName: opts.fullName,
        department: opts.department,
      },
      update: {
        fullName: opts.fullName,
        department: opts.department,
      },
    });
    return existing.id;
  }
  const user = await prisma.user.create({
    data: {
      email: opts.email,
      passwordHash,
      role: opts.role,
      phoneE164: opts.phone,
      staffProfile: {
        create: {
          fullName: opts.fullName,
          department: opts.department,
        },
      },
    },
  });
  return user.id;
}

async function upsertStudent(opts: {
  email: string;
  fullName: string;
  phone: string;
  faculty: string;
  program: string;
  course: number;
  groupLabel: string;
  groupRuzId: string;
  preferredSubGroupOids?: string[];
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, phoneE164: opts.phone, role: Role.STUDENT },
    });
    await prisma.studentProfile.upsert({
      where: { userId: existing.id },
      create: {
        userId: existing.id,
        fullName: opts.fullName,
        faculty: opts.faculty,
        program: opts.program,
        course: opts.course,
        groupLabel: opts.groupLabel,
        groupRuzId: opts.groupRuzId,
        preferredSubGroupOids: opts.preferredSubGroupOids ?? [],
      },
      update: {
        fullName: opts.fullName,
        faculty: opts.faculty,
        program: opts.program,
        course: opts.course,
        groupLabel: opts.groupLabel,
        groupRuzId: opts.groupRuzId,
        ...(opts.preferredSubGroupOids !== undefined
          ? { preferredSubGroupOids: opts.preferredSubGroupOids }
          : {}),
      },
    });
    return existing.id;
  }
  const user = await prisma.user.create({
    data: {
      email: opts.email,
      passwordHash,
      role: Role.STUDENT,
      phoneE164: opts.phone,
      studentProfile: {
        create: {
          fullName: opts.fullName,
          faculty: opts.faculty,
          program: opts.program,
          course: opts.course,
          groupLabel: opts.groupLabel,
          groupRuzId: opts.groupRuzId,
          preferredSubGroupOids: opts.preferredSubGroupOids ?? [],
        },
      },
    },
  });
  return user.id;
}

const GRADE_PACK: Array<{
  discipline: string;
  grade: string;
  gradeType: string;
  semester: string;
  isDebt: boolean;
}> = [
  {
    discipline: 'Международное право',
    grade: '4',
    gradeType: 'exam',
    semester: '2025-осень',
    isDebt: false,
  },
  {
    discipline: 'История дипломатии',
    grade: '5',
    gradeType: 'exam',
    semester: '2025-осень',
    isDebt: false,
  },
  {
    discipline: 'Иностранный язык (английский)',
    grade: '5',
    gradeType: 'pass',
    semester: '2025-осень',
    isDebt: false,
  },
  {
    discipline: 'Мировая экономика',
    grade: '3',
    gradeType: 'exam',
    semester: '2025-осень',
    isDebt: false,
  },
  {
    discipline: 'Политология',
    grade: '4',
    gradeType: 'pass',
    semester: '2024-весна',
    isDebt: false,
  },
];

const RISK_PACK: typeof GRADE_PACK = [
  {
    discipline: 'Международное право',
    grade: 'неявка',
    gradeType: 'exam',
    semester: '2025-осень',
    isDebt: true,
  },
  {
    discipline: 'История дипломатии',
    grade: '2',
    gradeType: 'exam',
    semester: '2025-осень',
    isDebt: true,
  },
  {
    discipline: 'Иностранный язык (английский)',
    grade: '4',
    gradeType: 'pass',
    semester: '2025-осень',
    isDebt: false,
  },
  {
    discipline: 'Мировая экономика',
    grade: '3',
    gradeType: 'exam',
    semester: '2025-осень',
    isDebt: false,
  },
];

async function ensureLessonForGrade(
  userId: string,
  discipline: string,
): Promise<string | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!profile?.groupRuzId) return null;
  const needle = discipline.split('(')[0].trim();
  const existing = await prisma.scheduleLesson.findFirst({
    where: {
      groupRuzId: profile.groupRuzId,
      discipline: { contains: needle, mode: 'insensitive' },
    },
    orderBy: { date: 'desc' },
  });
  if (existing) return existing.id;

  const created = await prisma.scheduleLesson.create({
    data: {
      ruzExternalId: `seed-grade-${profile.groupRuzId}-${needle}`.slice(0, 64),
      groupRuzId: profile.groupRuzId,
      groupLabel: profile.groupLabel,
      date: new Date(),
      begin: '09:00',
      end: '10:30',
      discipline: needle,
      lecturer: 'Преподаватель (seed)',
      source: 'LOCAL',
    },
  });
  return created.id;
}

async function replaceGrades(userId: string, pack: typeof GRADE_PACK) {
  await prisma.grade.deleteMany({ where: { studentUserId: userId } });
  for (const g of pack) {
    const scheduleLessonId = await ensureLessonForGrade(userId, g.discipline);
    await prisma.grade.create({
      data: {
        ...g,
        studentUserId: userId,
        scheduleLessonId,
      },
    });
  }
}

async function main() {
  console.log('Seeding extras (admin/staff/roman/grades)…');

  await upsertStaffish({
    email: 'staff@demo.local',
    role: Role.STAFF,
    fullName: 'Елена Соколова',
    department: 'Деканат МЭО',
    phone: '+79003333333',
  });

  await upsertStaffish({
    email: 'admin@demo.local',
    role: Role.ADMIN,
    fullName: 'Админ Платформы',
    department: 'Цифровой деканат',
    phone: '+79004444444',
  });

  // Убираем прежние не-МЭО / teacher demo-аккаунты и их заявки
  for (const email of ['teacher@demo.local', 'daria.mp@demo.local']) {
    const gone = await prisma.user.findUnique({ where: { email } });
    if (!gone) continue;
    await prisma.requestEvent.deleteMany({
      where: {
        OR: [{ actorUserId: gone.id }, { ticket: { studentUserId: gone.id } }],
      },
    });
    await prisma.requestTicket.deleteMany({ where: { studentUserId: gone.id } });
    await prisma.notification.deleteMany({ where: { userId: gone.id } });
    await prisma.grade.deleteMany({ where: { studentUserId: gone.id } });
    await prisma.lessonTask.deleteMany({ where: { createdByUserId: gone.id } });
    await prisma.lessonTeacherAssignment.deleteMany({
      where: {
        OR: [{ teacherUserId: gone.id }, { assignedByUserId: gone.id }],
      },
    });
    await prisma.studentProfile.deleteMany({ where: { userId: gone.id } });
    await prisma.teacherProfile.deleteMany({ where: { userId: gone.id } });
    await prisma.staffProfile.deleteMany({ where: { userId: gone.id } });
    await prisma.user.delete({ where: { id: gone.id } });
  }

  // Align demo МЭО profiles (faculty/program)
  for (const row of [
    {
      email: 'anna.risk@demo.local',
      fullName: 'Анна Рискова',
      phone: '+79001111111',
      course: 3,
      groupLabel: '2МЭО-01',
      groupRuzId: '8033',
      preferredSubGroupOids: ['501'],
    },
    {
      email: 'boris.ok@demo.local',
      fullName: 'Борис Спокойный',
      phone: '+79002222222',
      course: 3,
      groupLabel: '2МЭО-02',
      groupRuzId: '8035',
      preferredSubGroupOids: ['602'],
    },
  ] as const) {
    await upsertStudent({
      ...row,
      faculty: 'Международные экономические отношения',
      program: 'Бакалавриат МЭО',
    });
  }

  const anna = await prisma.user.findUnique({
    where: { email: 'anna.risk@demo.local' },
  });
  const boris = await prisma.user.findUnique({
    where: { email: 'boris.ok@demo.local' },
  });

  const romanId = await upsertStudent({
    email: 'roman.guskov@demo.local',
    fullName: 'Гуськов Роман Дмитриевич',
    phone: '+79005555555',
    faculty: 'Международные экономические отношения',
    program: 'Бакалавриат МЭО',
    course: 3,
    groupLabel: '2МЭО-01',
    groupRuzId: '8033',
    preferredSubGroupOids: ['501'],
  });

  const kirillId = await upsertStudent({
    email: 'kirill.meo@demo.local',
    fullName: 'Кирилл Орлов',
    phone: '+79008888888',
    faculty: 'Международные экономические отношения',
    program: 'Бакалавриат МЭО',
    course: 4,
    groupLabel: '4МЭО-01',
    groupRuzId: '8015',
    preferredSubGroupOids: ['804'],
  });

  if (anna) await replaceGrades(anna.id, RISK_PACK);
  if (boris) await replaceGrades(boris.id, GRADE_PACK);
  await replaceGrades(romanId, GRADE_PACK);
  await replaceGrades(kirillId, GRADE_PACK);

  // Any already-registered Гуськов* gets the same pack
  const named = await prisma.studentProfile.findMany({
    where: { fullName: { contains: 'Гуськов' } },
    select: { userId: true, fullName: true },
  });
  for (const row of named) {
    if (row.userId === romanId) continue;
    await replaceGrades(row.userId, GRADE_PACK);
    console.log('grades →', row.fullName);
  }

  const staffUser =
    (await prisma.user.findUnique({ where: { email: 'staff@demo.local' } })) ??
    (await prisma.user.findFirst({ where: { role: Role.STAFF } }));
  const annaUser = await prisma.user.findUnique({
    where: { email: 'anna.risk@demo.local' },
  });
  if (staffUser && annaUser) {
    await seedDemoClubEvents(prisma, {
      studentUserId: annaUser.id,
      staffUserId: staffUser.id,
    });
    for (const uid of [romanId, kirillId]) {
      await seedDemoClubEvents(prisma, {
        studentUserId: uid,
        staffUserId: staffUser.id,
      });
    }
  } else if (staffUser) {
    const news = await seedDigestNewsFeed(prisma, {
      staffUserId: staffUser.id,
    });
    console.log('digest news feed upserted:', news.upserted);
  }

  console.log(
    'OK: staff/admin + МЭО students (anna/boris/roman/kirill) / Demo123!',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
