import { IsInt, IsDateString, IsEnum } from 'class-validator';
import { RecordStatus } from '../entities/record.entity';

export class CreateRecordDto {
  @IsInt()
  medicationId!: number;

  @IsDateString()
  scheduledDate!: string; // 'YYYY-MM-DD' 형식

  @IsEnum(RecordStatus)
  status!: RecordStatus; // 'taken' | 'skipped'
}