import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('medications')
export class Medication {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  userId!: number | null;

  @Column()
  name!: string;

  @Column()
  dosage!: string;

  @Column()
  time!: string;

  @Column({ default: 'Asia/Seoul' })
  timezone!: string;

  @Column({ nullable: true })
  memo?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}