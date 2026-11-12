import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator'

class CustomerCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number

  @IsOptional()
  @IsString()
  selectedModel?: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number
}

export class UpdateCustomerCartDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CustomerCartItemDto)
  items!: CustomerCartItemDto[]
}
