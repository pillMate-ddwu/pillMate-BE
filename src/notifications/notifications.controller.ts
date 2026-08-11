import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';
import { CreateNotificationScheduleDto } from './dto/create-notification-schedule.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  saveToken(@Body() saveFcmTokenDto: SaveFcmTokenDto) {
    return this.notificationsService.saveToken(saveFcmTokenDto);
  }

  @Post('test')
  sendTestNotification(@Body() dto: SendTestNotificationDto) {
    return this.notificationsService.sendTestNotification(dto);
  }

  @Post('schedules')
createSchedule(@Body() dto: CreateNotificationScheduleDto) {
  return this.notificationsService.createSchedule(dto);
}
}