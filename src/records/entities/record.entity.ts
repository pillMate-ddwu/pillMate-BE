import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum RecordStatus {
  TAKEN = 'taken',
  SKIPPED = 'skipped',
}

@Entity('records')
export class Record {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  medicationId!: number;

  @Column({ type: 'date' })
  scheduledDate!: string; // 복용 예정 날짜 (YYYY-MM-DD)

  @Column({
    type: 'enum',
    enum: RecordStatus,
  })
  status!: RecordStatus; // 'taken' | 'skipped'

  @CreateDateColumn()
  recordedAt!: Date; // 실제 기록된 시각
}