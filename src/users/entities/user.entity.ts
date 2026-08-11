import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true })
  password!: string;

  @Column({ default: 'local' })
  provider!: string; // local | kakao | apple

  @Column({ nullable: true })
  providerId!: string;

  @Column({ nullable: true })
  nickname!: string;

  @Column({ nullable: true })
  refreshToken!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column('varchar', {
    length: 64,
    nullable: true,
  })
  emailVerificationTokenHash!: string | null;

  @Column('timestamptz', {
    nullable: true,
  })
  emailVerificationExpiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}