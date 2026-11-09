import { Injectable } from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [
      students,
      staff,
      admins,
      openTickets,
      debts,
      lessons,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.STAFF } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.requestTicket.count({
        where: {
          status: { in: [TicketStatus.SUBMITTED, TicketStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.grade.count({ where: { isDebt: true } }),
      this.prisma.scheduleLesson.count(),
      this.prisma.user.findMany({
        take: 12,
        orderBy: { email: 'asc' },
        select: {
          id: true,
          email: true,
          role: true,
          phoneE164: true,
          studentProfile: { select: { fullName: true, groupLabel: true } },
          staffProfile: { select: { fullName: true, department: true } },
        },
      }),
    ]);

    return {
      counts: {
        students,
        staff,
        admins,
        openTickets,
        debts,
        lessons,
      },
      users: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        phone: u.phoneE164,
        name:
          u.studentProfile?.fullName ??
          u.staffProfile?.fullName ??
          u.email,
        meta:
          u.studentProfile?.groupLabel ??
          u.staffProfile?.department ??
          null,
      })),
    };
  }
}
