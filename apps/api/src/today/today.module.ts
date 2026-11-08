import { Module } from '@nestjs/common';
import { GradesModule } from '../grades/grades.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsModule } from '../requests/requests.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { TodayController } from './today.controller';
import { TodayService } from './today.service';

@Module({
  imports: [ScheduleModule, GradesModule, RequestsModule, NotificationsModule],
  controllers: [TodayController],
  providers: [TodayService],
})
export class TodayModule {}
