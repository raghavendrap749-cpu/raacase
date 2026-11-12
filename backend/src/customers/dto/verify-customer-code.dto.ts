import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator'

export class VerifyCustomerCodeDto {
  @IsEmail()
  @MaxLength(254)
  email!: string

  @IsString()
  @Length(6, 6)
  code!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string
}
