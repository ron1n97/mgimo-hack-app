import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { assertResourceOwner } from '../common/ownership';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOwn(studentUserId: string) {
    return this.prisma.requestTicket.findMany({
      where: { studentUserId },
      orderBy: { createdAt: 'desc' },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async create(studentUserId: string, dto: CreateRequestDto) {
    return this.prisma.requestTicket.create({
      data: {
        studentUserId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        aiDraft: dto.aiDraft,
        status: TicketStatus.SUBMITTED,
        events: {
          create: {
            fromStatus: null,
            toStatus: TicketStatus.SUBMITTED,
            note: 'Создана студентом',
            actorUserId: studentUserId,
          },
        },
      },
      include: { events: true },
    });
  }

  async getById(id: string, actorUserId: string, actorRole: string) {
    const ticket = await this.prisma.requestTicket.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) {
      throw new NotFoundException('Request not found');
    }
    assertResourceOwner({
      resourceOwnerId: ticket.studentUserId,
      actorUserId,
      actorRole,
      notFoundMessage: 'Request not found',
    });
    return ticket;
  }

  async listStaff() {
    return this.prisma.requestTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        student: {
          select: {
            id: true,
            email: true,
            studentProfile: true,
          },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    actorUserId: string,
    dto: UpdateStatusDto,
  ) {
    const ticket = await this.prisma.requestTicket.findUnique({
      where: { id },
    });
    if (!ticket) {
      throw new NotFoundException('Request not found');
    }

    return this.prisma.requestTicket.update({
      where: { id },
      data: {
        status: dto.status,
        events: {
          create: {
            fromStatus: ticket.status,
            toStatus: dto.status,
            note: dto.note,
            actorUserId,
          },
        },
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
  }
}
