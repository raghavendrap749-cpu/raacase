import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Request } from 'express'
import { AdminAuthService } from '../auth/admin-auth.service'

@Injectable()
export class AdminImageUploadGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    this.adminAuthService.validateAuthorizationHeader(request.headers.authorization)
    return true
  }
}