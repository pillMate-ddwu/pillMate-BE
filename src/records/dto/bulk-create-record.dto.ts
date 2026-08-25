import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

import { RecordStatus } from '../entities/record.entity';

export class BulkRecordItemDto {
  @IsUUID()
  clientRecordId!: string;

  @IsInt()
  medicationId!: number;

  @IsDateString()
  scheduledDate!: string;

  @IsEnum(RecordStatus)
  status!: RecordStatus;

  @Transform(({ value }) => {
    if (
      value === '' ||
      value === null ||
      value === undefined
    ) {
      return undefined;
    }

    return value;
  })
  @IsOptional()
  @IsDateString()
  actualTime?: string;
}

export class BulkCreateRecordDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkRecordItemDto)
  records!: BulkRecordItemDto[];
}