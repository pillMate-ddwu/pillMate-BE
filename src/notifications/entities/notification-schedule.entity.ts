import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_schedules')
export class NotificationSchedule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  medicationId!: number;

  @Column()
  medicationName!: string;

  @Column()
  scheduledTime!: string;

  @Column({ default: 'Asia/Seoul' })
  timezone!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  message?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}