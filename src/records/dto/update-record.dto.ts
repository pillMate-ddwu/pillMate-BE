import { IsEnum } from 'class-validator';
import { RecordStatus } from '../entities/record.entity';

export class UpdateRecordDto {
  @IsEnum(RecordStatus)
  status!: RecordStatus;
}