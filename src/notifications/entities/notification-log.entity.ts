import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ nullable: true })
  medicationId?: number;

  @Column()
  title!: string;

  @Column()
  body!: string;

  @Column()
  status!: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  sentAt!: Date;
}