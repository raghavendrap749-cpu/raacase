import { IsEmail, MaxLength } from 'class-validator'

export class RequestCustomerCodeDto {
  @IsEmail()
  @MaxLength(254)
  email!: string
}
