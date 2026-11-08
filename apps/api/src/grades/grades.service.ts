import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string) {
    return this.prisma.grade.findMany({
      where: { studentUserId: userId },
      orderBy: [{ semester: 'desc' }, { discipline: 'asc' }],
    });
  }
}
