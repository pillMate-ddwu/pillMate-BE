import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Record } from '../records/entities/record.entity';
import { Medication } from './entities/medication.entity';
import { MedicationController } from './medication.controller';
import { MedicationService } from './medication.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Medication,
      Record,
    ]),
  ],
  controllers: [
    MedicationController,
  ],
  providers: [
    MedicationService,
  ],
  exports: [
    MedicationService,
  ],
})
export class MedicationsModule {}