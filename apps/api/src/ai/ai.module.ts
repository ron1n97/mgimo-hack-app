import { Module } from '@nestjs/common';
import { GradesModule } from '../grades/grades.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsModule } from '../requests/requests.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { TodayModule } from '../today/today.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    TodayModule,
    ScheduleModule,
    GradesModule,
    RequestsModule,
    NotificationsModule,
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
