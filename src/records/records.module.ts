import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Medication } from '../medications/entities/medication.entity';
import { Record } from './entities/record.entity';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Record,
      Medication,
    ]),
  ],
  controllers: [
    RecordsController,
  ],
  providers: [
    RecordsService,
  ],
  exports: [
    RecordsService,
  ],
})
export class RecordsModule {}