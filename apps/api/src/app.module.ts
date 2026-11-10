import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { GradesModule } from './grades/grades.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestsModule } from './requests/requests.module';
import { ScheduleModule } from './schedule/schedule.module';
import { TeacherAssignmentsModule } from './teacher-assignments/teacher-assignments.module';
import { TodayModule } from './today/today.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ScheduleModule,
    GradesModule,
    RequestsModule,
    NotificationsModule,
    TodayModule,
    AiModule,
    AdminModule,
    ClubsModule,
    TeacherAssignmentsModule,
  ],
})
export class AppModule {}

