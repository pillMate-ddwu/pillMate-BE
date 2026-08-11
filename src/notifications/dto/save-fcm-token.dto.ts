import { IsNumber, IsString } from 'class-validator';

export class SaveFcmTokenDto {
  @IsNumber()
  userId!: number;

  @IsString()
  token!: string;
}