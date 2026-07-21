import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true })
  password!: string; // 카카오 가입자는 null

  @Column({ default: 'local' })
  provider!: string; // 'local' | 'kakao'

  @Column({ nullable: true })
  providerId!: string; // 카카오 user id

  @Column({ nullable: true })
  nickname!: string;

  @CreateDateColumn()
  createdAt!: Date;
}