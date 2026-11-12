import { Body, Controller, Get, Headers, Post, Put } from '@nestjs/common'
import { CustomerAuthService } from './customer-auth.service'
import { CustomerPasswordLoginDto, CustomerPasswordRegisterDto } from './dto/customer-password.dto'
import { RequestCustomerCodeDto } from './dto/request-customer-code.dto'
import { VerifyCustomerCodeDto } from './dto/verify-customer-code.dto'
import { UpdateCustomerCartDto } from './dto/update-customer-cart.dto'

@Controller('auth/customer')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('request-code')
  requestCode(@Body() request: RequestCustomerCodeDto) {
    return this.customerAuthService.requestCode(request.email)
  }

  @Post('verify-code')
  verifyCode(@Body() request: VerifyCustomerCodeDto) {
    return this.customerAuthService.verifyCode(request.email, request.code, request.name)
  }

  @Post('register')
  register(@Body() request: CustomerPasswordRegisterDto) {
    return this.customerAuthService.registerWithPassword(request.email, request.password, request.name, request.phone, request.code)
  }

  @Post('login')
  login(@Body() request: CustomerPasswordLoginDto) {
    return this.customerAuthService.loginWithPassword(request.identifier, request.password)
  }

  @Get('me')
  getCustomer(@Headers('authorization') authorization?: string) {
    return this.customerAuthService.getCustomer(authorization)
  }

  @Get('cart')
  getCart(@Headers('authorization') authorization?: string) {
    return this.customerAuthService.getCart(authorization)
  }

  @Put('cart')
  updateCart(@Headers('authorization') authorization: string | undefined, @Body() request: UpdateCustomerCartDto) {
    return this.customerAuthService.updateCart(authorization, request.items)
  }

  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    return this.customerAuthService.logout(authorization)
  }
}
