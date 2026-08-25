import {
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { RecordStatus } from '../entities/record.entity';

export class UpdateRecordDto {
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @IsOptional()
  @IsDateString()
  actualTime?: string;
}