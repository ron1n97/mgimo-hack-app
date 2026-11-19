import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudents(q?: string) {
    const query = q?.trim();
    const rows = await this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                {
                  studentProfile: {
                    fullName: { contains: query, mode: 'insensitive' },
                  },
                },
                {
                  studentProfile: {
                    groupLabel: { contains: query, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { email: 'asc' },
      take: 100,
      select: {
        id: true,
        email: true,
        studentProfile: true,
      },
    });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.studentProfile?.fullName ?? '',
      faculty: u.studentProfile?.faculty ?? '',
      program: u.studentProfile?.program ?? '',
      course: u.studentProfile?.course ?? 1,
      groupLabel: u.studentProfile?.groupLabel ?? '',
      groupRuzId: u.studentProfile?.groupRuzId ?? null,
      preferredSubGroupOids: u.studentProfile?.preferredSubGroupOids ?? [],
    }));
  }

  async updateStudent(studentUserId: string, dto: UpdateStudentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      include: { studentProfile: true },
    });
    if (!user || user.role !== Role.STUDENT || !user.studentProfile) {
      throw new NotFoundException('Студент не найден');
    }
    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.faculty !== undefined) data.faculty = dto.faculty.trim();
    if (dto.program !== undefined) data.program = dto.program.trim();
    if (dto.course !== undefined) data.course = dto.course;
    if (dto.groupLabel !== undefined) data.groupLabel = dto.groupLabel.trim();
    if (dto.groupRuzId !== undefined) {
      data.groupRuzId = dto.groupRuzId.trim() || null;
    }
    if (dto.preferredSubGroupOids !== undefined) {
      data.preferredSubGroupOids = dto.preferredSubGroupOids;
    }
    const profile = await this.prisma.studentProfile.update({
      where: { userId: studentUserId },
      data,
    });
    return {
      id: studentUserId,
      email: user.email,
      fullName: profile.fullName,
      faculty: profile.faculty,
      program: profile.program,
      course: profile.course,
      groupLabel: profile.groupLabel,
      groupRuzId: profile.groupRuzId,
      preferredSubGroupOids: profile.preferredSubGroupOids,
    };
  }

  async overview() {
    const [
      students,
      staff,
      admins,
      teachers,
      openTickets,
      debts,
      lessons,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.STAFF } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.user.count({ where: { role: Role.TEACHER } }),
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
        teachers,
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
