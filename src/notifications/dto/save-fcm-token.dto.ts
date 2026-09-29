import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class SaveFcmTokenDto {
  @IsNumber()
  userId!: number;

  @IsOptional()
  @IsString()
  token?: string;

  @IsBoolean()
  notificationEnabled!: boolean;
}