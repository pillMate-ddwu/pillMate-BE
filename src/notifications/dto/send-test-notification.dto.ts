import { IsString } from 'class-validator';

export class SendTestNotificationDto {
  @IsString()
  token!: string;

  @IsString()
  title!: string;

  @IsString()
  body!: string;
}