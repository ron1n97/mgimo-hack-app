/**
 * Contest demo seed — fictional PII only.
 * Disclaimer: не официальный сервис МГИМО.
 */
import { PrismaClient, Role, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo123!';

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

async function main() {
  console.log('Seeding Деканат+ demo data (contest / fictional)…');

  // Idempotent wipe — keep ScheduleLesson so RUZ worker data survives reseeds
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "RequestEvent",
      "RequestTicket",
      "Notification",
      "Grade",
      "StudentProfile",
      "StaffProfile",
      "User"
    RESTART IDENTITY CASCADE;
  `);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const anna = await prisma.user.create({
    data: {
      email: 'anna.risk@demo.local',
      passwordHash,
      role: Role.STUDENT,
      phoneE164: '+79001111111',
      studentProfile: {
        create: {
          fullName: 'Анна Рискова',
          faculty: 'Международные отношения',
          program: 'Бакалавриат МО',
          course: 3,
          groupLabel: '2МЭО-01',
          groupRuzId: '8033',
        },
      },
    },
  });

  const boris = await prisma.user.create({
    data: {
      email: 'boris.ok@demo.local',
      passwordHash,
      role: Role.STUDENT,
      phoneE164: '+79002222222',
      studentProfile: {
        create: {
          fullName: 'Борис Спокойный',
          faculty: 'Международные отношения',
          program: 'Бакалавриат МО',
          course: 3,
          groupLabel: '2МЭО-02',
          groupRuzId: '8035',
        },
      },
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@demo.local',
      passwordHash,
      role: Role.STAFF,
      phoneE164: '+79003333333',
      staffProfile: {
        create: {
          fullName: 'Елена Деканатская',
          department: 'Учебный отдел',
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@demo.local',
      passwordHash,
      role: Role.ADMIN,
      phoneE164: '+79004444444',
      staffProfile: {
        create: {
          fullName: 'Админ Платформы',
          department: 'Цифровой деканат',
        },
      },
    },
  });

  const roman = await prisma.user.create({
    data: {
      email: 'roman.guskov@demo.local',
      passwordHash,
      role: Role.STUDENT,
      phoneE164: '+79005555555',
      studentProfile: {
        create: {
          fullName: 'Гуськов Роман Дмитриевич',
          faculty: 'Международные отношения',
          program: 'Бакалавриат МО',
          course: 3,
          groupLabel: '2МЭО-01',
          groupRuzId: '8033',
        },
      },
    },
  });

  const today = new Date();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  const d = today.getUTCDate();

  await prisma.scheduleLesson.createMany({
    skipDuplicates: true,
    data: [
      {
        ruzExternalId: 'demo-l1',
        groupRuzId: '8033',
        groupLabel: '2МЭО-01',
        date: utcDate(y, m, d),
        begin: '09:00',
        end: '10:30',
        discipline: 'Международное право',
        lecturer: 'Иванова И.И.',
        auditorium: '312',
        building: 'Главный корпус',
        kindOfWork: 'Лекция',
        isCancelled: false,
        isMoved: false,
        rawJson: { source: 'seed', disclaimer: 'contest' },
      },
      {
        ruzExternalId: 'demo-l2',
        groupRuzId: '8033',
        groupLabel: '2МЭО-01',
        date: utcDate(y, m, d),
        begin: '11:00',
        end: '12:30',
        discipline: 'История дипломатии',
        lecturer: 'Петров П.П.',
        auditorium: '205',
        building: 'Главный корпус',
        kindOfWork: 'Семинар',
        isCancelled: false,
        isMoved: true,
        rawJson: { source: 'seed', movedFrom: '10:00' },
      },
      {
        ruzExternalId: 'demo-l3',
        groupRuzId: '8033',
        groupLabel: '2МЭО-01',
        date: utcDate(y, m, d + 1 > 28 ? d : d + 1),
        begin: '09:00',
        end: '10:30',
        discipline: 'Экономика',
        lecturer: 'Сидорова С.С.',
        auditorium: '401',
        building: 'Корпус Б',
        kindOfWork: 'Лекция',
        isCancelled: false,
        isMoved: false,
        rawJson: { source: 'seed' },
      },
    ],
  });

  // Anna — academic risk (debts)
  await prisma.grade.createMany({
    data: [
      {
        studentUserId: anna.id,
        discipline: 'Международное право',
        grade: 'неявка',
        gradeType: 'exam',
        semester: '2025-осень',
        isDebt: true,
      },
      {
        studentUserId: anna.id,
        discipline: 'История дипломатии',
        grade: '2',
        gradeType: 'exam',
        semester: '2025-осень',
        isDebt: true,
      },
      {
        studentUserId: anna.id,
        discipline: 'Иностранный язык',
        grade: '4',
        gradeType: 'pass',
        semester: '2025-осень',
        isDebt: false,
      },
      {
        studentUserId: boris.id,
        discipline: 'Международное право',
        grade: '5',
        gradeType: 'exam',
        semester: '2025-осень',
        isDebt: false,
      },
      {
        studentUserId: boris.id,
        discipline: 'История дипломатии',
        grade: '4',
        gradeType: 'exam',
        semester: '2025-осень',
        isDebt: false,
      },
      {
        studentUserId: boris.id,
        discipline: 'Иностранный язык',
        grade: '5',
        gradeType: 'pass',
        semester: '2025-осень',
        isDebt: false,
      },
      {
        studentUserId: roman.id,
        discipline: 'Международное право',
        grade: '4',
        gradeType: 'exam',
        semester: '2025-осень',
        isDebt: false,
      },
      {
        studentUserId: roman.id,
        discipline: 'История дипломатии',
        grade: '5',
        gradeType: 'exam',
        semester: '2025-осень',
        isDebt: false,
      },
      {
        studentUserId: roman.id,
        discipline: 'Иностранный язык (английский)',
        grade: '5',
        gradeType: 'pass',
        semester: '2025-осень',
        isDebt: false,
      },
      {
        studentUserId: roman.id,
        discipline: 'Мировая экономика',
        grade: '3',
        gradeType: 'exam',
        semester: '2025-осень',
        isDebt: false,
      },
      {
        studentUserId: roman.id,
        discipline: 'Политология',
        grade: '4',
        gradeType: 'pass',
        semester: '2024-весна',
        isDebt: false,
      },
    ],
  });

  const annaTicket = await prisma.requestTicket.create({
    data: {
      studentUserId: anna.id,
      type: 'academic_leave_consult',
      title: 'Консультация по академическим долгам',
      body: 'Прошу подсказать порядок пересдачи по международному праву и истории дипломатии.',
      status: TicketStatus.IN_PROGRESS,
      aiDraft:
        'Прошу рассмотреть возможность консультации по закрытию академических задолженностей…',
      events: {
        create: [
          {
            fromStatus: null,
            toStatus: TicketStatus.SUBMITTED,
            note: 'Создана студентом (seed)',
            actorUserId: anna.id,
          },
          {
            fromStatus: TicketStatus.SUBMITTED,
            toStatus: TicketStatus.IN_PROGRESS,
            note: 'Принято в работу',
            actorUserId: staff.id,
          },
        ],
      },
    },
  });

  await prisma.requestTicket.create({
    data: {
      studentUserId: boris.id,
      type: 'certificate',
      title: 'Справка об обучении',
      body: 'Нужна справка об обучении для банка.',
      status: TicketStatus.DONE,
      events: {
        create: [
          {
            fromStatus: null,
            toStatus: TicketStatus.SUBMITTED,
            note: 'Создана студентом (seed)',
            actorUserId: boris.id,
          },
          {
            fromStatus: TicketStatus.SUBMITTED,
            toStatus: TicketStatus.DONE,
            note: 'Готово к выдаче',
            actorUserId: staff.id,
          },
        ],
      },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: anna.id,
        title: 'Перенос занятия',
        body: 'Семинар «История дипломатии» перенесён на 11:00. Аудитория 205.',
        kind: 'schedule_moved',
      },
      {
        userId: anna.id,
        title: 'Напоминание о долге',
        body: 'По предмету «Международное право» зафиксирована неявка. Уточните сроки пересдачи.',
        kind: 'academic_debt',
      },
      {
        userId: anna.id,
        title: 'Заявка в работе',
        body: `Ваша заявка «${annaTicket.title}» переведена в статус IN_PROGRESS.`,
        kind: 'request_status',
      },
      {
        userId: boris.id,
        title: 'Справка готова',
        body: 'Справка об обучении готова к выдаче (демо-статус).',
        kind: 'request_status',
        readAt: new Date(),
      },
      {
        userId: staff.id,
        title: 'Новая заявка',
        body: 'Поступила заявка от Анны Рисковой.',
        kind: 'staff_inbox',
      },
    ],
  });

  console.log('Seed OK.');
  console.log('Accounts (password Demo123!):');
  console.log('  anna.risk@demo.local  — student, academic risk — phone +79001111111');
  console.log('  boris.ok@demo.local   — student, calm — phone +79002222222');
  console.log('  staff@demo.local      — staff — phone +79003333333');
  console.log('Telegram bot: share contact with matching demo phone to auth.');
  console.log('DISCLAIMER: contest fictional data, not official MGIMO.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
