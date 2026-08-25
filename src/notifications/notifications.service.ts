import { Injectable, InternalServerErrorException, Logger,
  ServiceUnavailableException, } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { FcmToken } from './entities/fcm-token.entity';
import { NotificationSchedule } from './entities/notification-schedule.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { SaveFcmTokenDto } from './dto/save-fcm-token.dto';
import { SendTestNotificationDto } from './dto/send-test-notification.dto';
import { CreateNotificationScheduleDto } from './dto/create-notification-schedule.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(
    NotificationsService.name,
  );

  private firebaseEnabled = false;

  constructor(
    @InjectRepository(FcmToken)
    private readonly fcmTokenRepository: Repository<FcmToken>,

    @InjectRepository(NotificationSchedule)
    private readonly notificationScheduleRepository: Repository<NotificationSchedule>,

    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId =
      process.env.FIREBASE_PROJECT_ID;

    const clientEmail =
      process.env.FIREBASE_CLIENT_EMAIL;

    const privateKey =
      process.env.FIREBASE_PRIVATE_KEY?.replace(
        /\\n/g,
        '\n',
      );

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase 환경변수가 없어 푸시 알림 기능을 비활성화합니다.',
      );

      this.firebaseEnabled = false;
      return;
    }

    try {
      if (!getApps().length) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }

      this.firebaseEnabled = true;

      this.logger.log(
        'Firebase Admin SDK 초기화가 완료되었습니다.',
      );
    } catch (error) {
      this.firebaseEnabled = false;

      this.logger.error(
        'Firebase 초기화에 실패하여 푸시 알림 기능을 비활성화합니다.',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }

  async saveToken(saveFcmTokenDto: SaveFcmTokenDto) {
    const existingToken = await this.fcmTokenRepository.findOneBy({
      token: saveFcmTokenDto.token,
    });

    if (existingToken) {
      existingToken.userId = saveFcmTokenDto.userId;
      existingToken.isActive = true;

      return this.fcmTokenRepository.save(existingToken);
    }

    const fcmToken = this.fcmTokenRepository.create(saveFcmTokenDto);

    return this.fcmTokenRepository.save(fcmToken);
  }

  async sendTestNotification(dto: SendTestNotificationDto) {
      if (!this.firebaseEnabled) {
      throw new ServiceUnavailableException(
        'Firebase 설정이 없어 푸시 알림 기능을 사용할 수 없습니다.',
      );
    }
    try {
      const response = await getMessaging().send({
        token: dto.token,
        notification: {
          title: dto.title,
          body: dto.body,
        },
      });

      return {
        message: '테스트 푸시 알림 전송 성공',
        response,
      };
    } catch (error) {
      this.logger.error(
        '테스트 푸시 알림 전송 실패',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw new InternalServerErrorException(
        '테스트 푸시 알림 전송 실패',
      );
    }
  }

  async createSchedule(dto: CreateNotificationScheduleDto) {
    const schedule = this.notificationScheduleRepository.create({
      ...dto,
      isActive: true,
    });

    return this.notificationScheduleRepository.save(schedule);
  }

  @Cron('* * * * *')
  async sendScheduledNotifications() {
    if (!this.firebaseEnabled) {
      return;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    const schedules = await this.notificationScheduleRepository.findBy({
      scheduledTime: currentTime,
      isActive: true,
    });

    for (const schedule of schedules) {
      const tokens = await this.fcmTokenRepository.findBy({
        userId: schedule.userId,
        isActive: true,
      });

      const title = '복약 알림';
      const body = schedule.message ?? `${schedule.medicationName} 복용 시간입니다.`;

      for (const token of tokens) {
        try {
          await getMessaging().send({
            token: token.token,
            notification: {
              title,
              body,
            },
          });

          await this.notificationLogRepository.save({
            userId: schedule.userId,
            medicationId: schedule.medicationId,
            title,
            body,
            status: 'SUCCESS',
          });
        } catch (error) {
          await this.notificationLogRepository.save({
            userId: schedule.userId,
            medicationId: schedule.medicationId,
            title,
            body,
            status: 'FAILED',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }
}