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

  @Column({
    type: 'text',
    nullable: true,
  })
  refreshToken!: string | null;

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

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  passwordResetCodeHash!: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetCodeExpiresAt!: Date | null;

  @Column({
    type: 'integer',
    default: 0,
  })
  passwordResetCodeAttempts!: number;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  passwordResetTokenHash!: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetTokenExpiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}