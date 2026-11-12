import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class SendContactMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @IsEmail()
  @MaxLength(254)
  email!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string
}
