import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Medication } from '../../medications/entities/medication.entity';

export enum RecordStatus {
  TAKEN = 'taken',
  SKIPPED = 'skipped',
}

@Index(
  'UQ_records_user_client_record',
  ['userId', 'clientRecordId'],
  {
    unique: true,
    where: '"clientRecordId" IS NOT NULL',
  },
)

@Entity('records')
export class Record {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  medicationId!: number;

  @ManyToOne(
    () => Medication,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  
  @JoinColumn({
    name: 'medicationId',
  })
  medication!: Medication;

  @Column({
  type: 'varchar',
  length: 36,
  nullable: true,
  })
  clientRecordId!: string | null;

  @Column({ type: 'date' })
  scheduledDate!: string; // 복용 예정 날짜 (YYYY-MM-DD)

  @Column({
    type: 'enum',
    enum: RecordStatus,
  })
  status!: RecordStatus; // 'taken' | 'skipped'

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  actualTime!: Date | null; // 실제 복용 시각

  @CreateDateColumn()
  recordedAt!: Date; // 실제 기록된 시각
}