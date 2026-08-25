import { IsInt, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { RecordStatus } from '../entities/record.entity';

export class CreateRecordDto {
  @IsInt()
  medicationId!: number;

  @IsDateString()
  scheduledDate!: string; // 'YYYY-MM-DD' 형식

  @IsEnum(RecordStatus)
  status!: RecordStatus; // 'taken' | 'skipped'

  @IsOptional()
  @IsDateString()
  actualTime?: string;
}