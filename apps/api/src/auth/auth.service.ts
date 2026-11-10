import {
  BadRequestException,
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
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, staffProfile: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (dto.phone !== undefined) {
      const raw = dto.phone.trim();
      if (!raw) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { phoneE164: null },
        });
      } else {
        const phone = normalizePhone(raw);
        if (!phone) {
          throw new BadRequestException('Некорректный номер телефона');
        }
        const clash = await this.prisma.user.findFirst({
          where: { phoneE164: phone, NOT: { id: userId } },
        });
        if (clash) {
          throw new ConflictException('Этот номер уже привязан к другому аккаунту');
        }
        await this.prisma.user.update({
          where: { id: userId },
          data: { phoneE164: phone },
        });
      }
    }

    if (user.role === Role.STUDENT && user.studentProfile) {
      await this.prisma.studentProfile.update({
        where: { userId },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.faculty !== undefined ? { faculty: dto.faculty.trim() } : {}),
          ...(dto.program !== undefined ? { program: dto.program.trim() } : {}),
          ...(dto.course !== undefined ? { course: dto.course } : {}),
          ...(dto.groupLabel !== undefined
            ? { groupLabel: dto.groupLabel.trim() }
            : {}),
          ...(dto.groupRuzId !== undefined
            ? { groupRuzId: dto.groupRuzId.trim() || null }
            : {}),
          ...(dto.preferredSubGroupOids !== undefined
            ? {
                preferredSubGroupOids: [
                  ...new Set(
                    dto.preferredSubGroupOids
                      .map((x) => String(x).trim())
                      .filter(Boolean),
                  ),
                ],
              }
            : {}),
        },
      });
    }

    if (
      (user.role === Role.STAFF || user.role === Role.ADMIN) &&
      user.staffProfile
    ) {
      await this.prisma.staffProfile.update({
        where: { userId },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.department !== undefined
            ? { department: dto.department.trim() }
            : {}),
        },
      });
    }

    return this.me(userId);
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
        'Неофициальный кабинет. Расписание — из открытого RUZ МГИМО.',
    };
  }
}
