/**
 * One-shot: link a phone to roman.guskov@demo.local (and print holders).
 * Usage: PHONE=+79179540119 pnpm exec tsx prisma/link-phone.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const phoneRaw = process.env.PHONE ?? '+79179540119';
const digits = phoneRaw.replace(/\D/g, '');
const phone =
  digits.length === 11 && digits.startsWith('8')
    ? `+7${digits.slice(1)}`
    : digits.startsWith('7')
      ? `+${digits}`
      : phoneRaw.startsWith('+')
        ? phoneRaw
        : `+${digits}`;

async function main() {
  console.log('linking', phone);
  await prisma.user.updateMany({
    where: { phoneE164: phone },
    data: { phoneE164: null },
  });

  const roman = await prisma.user.findUnique({
    where: { email: 'roman.guskov@demo.local' },
  });
  if (!roman) throw new Error('roman.guskov@demo.local not found — run seed:extras');

  await prisma.user.update({
    where: { id: roman.id },
    data: { phoneE164: phone },
  });

  // Prefer personal Гуськов account if registered (overwrites demo roman phone onto personal)
  const personal = await prisma.studentProfile.findFirst({
    where: {
      fullName: { contains: 'Гуськов' },
      user: { email: { not: 'roman.guskov@demo.local' } },
    },
    include: { user: true },
  });
  if (personal) {
    await prisma.user.update({
      where: { id: roman.id },
      data: { phoneE164: null },
    });
    await prisma.user.update({
      where: { id: personal.userId },
      data: { phoneE164: phone },
    });
    console.log('linked personal', personal.user.email, personal.fullName);
  } else {
    console.log('linked demo roman.guskov@demo.local');
  }

  const holders = await prisma.user.findMany({
    where: { phoneE164: phone },
    select: { email: true, role: true },
  });
  console.log('holders', holders);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
