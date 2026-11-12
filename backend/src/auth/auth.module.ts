import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AdminAuthService } from './admin-auth.service'

@Module({
  controllers: [AuthController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AuthModule {}
