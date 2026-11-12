import { Body, Controller, Headers, Post } from '@nestjs/common'
import { IsString, Matches, MinLength } from 'class-validator'
import { AdminAuthService } from './admin-auth.service'

class AdminLoginDto {
  @IsString()
  username!: string

  @IsString()
  @MinLength(1)
  password!: string
}

class VerifyPasswordChangeDto {
  @IsString()
  code!: string

  @IsString()
  @MinLength(8)
  newPassword!: string
}

class VerifyAdminLoginDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  challengeId!: string

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('admin/login')
  login(@Body() credentials: AdminLoginDto) {
    return this.adminAuthService.login(credentials.username, credentials.password)
  }

  @Post('admin/login/verify')
  verifyLogin(@Body() data: VerifyAdminLoginDto) {
    return this.adminAuthService.verifyLoginCode(data.challengeId, data.code)
  }

  @Post('admin/logout')
  logout(@Headers('authorization') authorization: string | undefined) {
    this.adminAuthService.logout(authorization)
    return { loggedOut: true }
  }

  @Post('admin/password-change/request')
  async requestPasswordChange(@Headers('authorization') authorization: string | undefined) {
    await this.adminAuthService.requestPasswordChange(authorization)
    return { sent: true }
  }

  @Post('admin/password-change/verify')
  verifyPasswordChange(@Headers('authorization') authorization: string | undefined, @Body() data: VerifyPasswordChangeDto) {
    this.adminAuthService.confirmPasswordChange(authorization, data.code, data.newPassword)
    return { changed: true }
  }
}
