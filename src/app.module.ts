import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MedicationsModule } from './medications/medications.module';
import { RecordsModule } from './records/records.module';
import { FamilyModule } from './family/family.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [AuthModule, UsersModule, MedicationsModule, RecordsModule, FamilyModule, NotificationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
