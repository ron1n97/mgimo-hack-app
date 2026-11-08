import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginPhoneDto } from './dto/login-phone.dto';
import { RegisterDto } from './dto/register.dto';
import { hashPassword, verifyPassword } from './password';
import { normalizePhone } from './phone';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const role = dto.role ?? Role.STUDENT;
    // Contest demo: do not allow open ADMIN registration
    const safeRole = role === Role.ADMIN ? Role.STAFF : role;
    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: safeRole,
        ...(safeRole === Role.STUDENT
          ? {
              studentProfile: {
                create: {
                  fullName: dto.fullName,
                  faculty: dto.faculty ?? 'Не указан',
                  program: dto.program ?? 'Не указана',
                  course: dto.course ?? 1,
                  groupLabel: dto.groupLabel ?? 'Без группы',
                  groupRuzId: dto.groupRuzId,
                },
              },
            }
          : {
              staffProfile: {
                create: {
                  fullName: dto.fullName,
                  department: dto.department ?? 'Деканат',
                },
              },
            }),
      },
      include: {
        studentProfile: true,
        staffProfile: true,
      },
    });

    return this.tokenResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { studentProfile: true, staffProfile: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.tokenResponse(user);
  }

  /** Telegram / bot: match account by linked phone, optionally bind telegramId. */
  async loginByPhone(dto: LoginPhoneDto) {
    const phone = normalizePhone(dto.phone);
    if (!phone) {
      throw new UnauthorizedException('Invalid phone');
    }
    const user = await this.prisma.user.findUnique({
      where: { phoneE164: phone },
      include: { studentProfile: true, staffProfile: true },
    });
    if (!user) {
      throw new UnauthorizedException('Phone not linked to any account');
    }
    if (dto.telegramId) {
      const tid = String(dto.telegramId);
      const clash = await this.prisma.user.findFirst({
        where: { telegramId: tid, NOT: { id: user.id } },
      });
      if (clash) {
        throw new ConflictException('Telegram already linked to another account');
      }
      if (user.telegramId !== tid) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { telegramId: tid },
        });
        user.telegramId = tid;
      }
    }
    return this.tokenResponse(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, staffProfile: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.publicUser(user);
  }

  private tokenResponse(user: {
    id: string;
    email: string;
    role: Role;
    phoneE164?: string | null;
    telegramId?: string | null;
    studentProfile?: unknown;
    staffProfile?: unknown;
  }) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      user: this.publicUser(user),
    };
  }

  private publicUser(user: {
    id: string;
    email: string;
    role: Role;
    phoneE164?: string | null;
    telegramId?: string | null;
    studentProfile?: unknown;
    staffProfile?: unknown;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      phoneE164: user.phoneE164 ?? null,
      telegramId: user.telegramId ?? null,
      studentProfile: user.studentProfile ?? null,
      staffProfile: user.staffProfile ?? null,
      disclaimer:
        'Конкурсные демо-данные. Не официальный сервис МГИМО. ПДн вымышленные.',
    };
  }
}
