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
      },
      update: {
        fullName: opts.fullName,
        faculty: opts.faculty,
        program: opts.program,
        course: opts.course,
        groupLabel: opts.groupLabel,
        groupRuzId: opts.groupRuzId,
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

async function replaceGrades(userId: string, pack: typeof GRADE_PACK) {
  await prisma.grade.deleteMany({ where: { studentUserId: userId } });
  await prisma.grade.createMany({
    data: pack.map((g) => ({ ...g, studentUserId: userId })),
  });
}

async function main() {
  console.log('Seeding extras (admin/staff/roman/grades)…');

  await upsertStaffish({
    email: 'staff@demo.local',
    role: Role.STAFF,
    fullName: 'Елена Деканатская',
    department: 'Учебный отдел',
    phone: '+79003333333',
  });

  await upsertStaffish({
    email: 'admin@demo.local',
    role: Role.ADMIN,
    fullName: 'Админ Платформы',
    department: 'Цифровой деканат',
    phone: '+79004444444',
  });

  await upsertStaffish({
    email: 'teacher@demo.local',
    role: Role.STAFF,
    fullName: 'Иванова Ирина Ивановна',
    department: 'Кафедра международного права',
    phone: '+79006666666',
  });

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
    faculty: 'Международные отношения',
    program: 'Бакалавриат МО',
    course: 3,
    groupLabel: '2МЭО-01',
    groupRuzId: '8033',
  });

  if (anna) await replaceGrades(anna.id, RISK_PACK);
  if (boris) await replaceGrades(boris.id, GRADE_PACK);
  await replaceGrades(romanId, GRADE_PACK);

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

  console.log(
    'OK: staff@demo.local, admin@demo.local, teacher@demo.local, roman.guskov@demo.local / Demo123!',
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
