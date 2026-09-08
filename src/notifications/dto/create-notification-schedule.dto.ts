import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateNotificationScheduleDto {
  @IsNumber()
  userId!: number;

  @IsNumber()
  medicationId!: number;

  @IsString()
  medicationName!: string;

  @IsString()
  scheduledTime!: string;

  @IsOptional()
  @IsString()
  message?: string;
}