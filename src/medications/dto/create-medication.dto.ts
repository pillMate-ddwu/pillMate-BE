import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateMedicationDto {
  @IsString()
  name!: string;

  @IsString()
  dosage!: string;

  @IsString()
  time!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  mealTiming?: string;

  @IsOptional()
  @IsString()
  cycle?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}