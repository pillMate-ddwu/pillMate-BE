import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  exports: [TypeOrmModule], // 다른 모듈(auth 등)에서도 User 리포지토리 쓸 수 있게
})
export class UsersModule {}