import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class CustomerPasswordRegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must use international format, for example +15551234567.' })
  phone?: string
}

export class CustomerPasswordLoginDto {
  @IsString()
  @Matches(/^(?:[^\s@]+@[^\s@]+\.[^\s@]+|\+[1-9]\d{7,14})$/, {
    message: 'Enter an email address or an international phone number.',
  })
  identifier!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string
}
