import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateProductDto {
  @IsOptional()
  @IsString()
  company?: string

  @IsOptional()
  @IsString()
  material?: string

  @IsString()
  category!: string

  @IsString()
  name!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  oldPrice?: number

  @IsOptional()
  @IsString()
  badge?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rating?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number

  @IsOptional()
  @IsString()
  image?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]

  @IsOptional()
  @IsString()
  desc?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @ArrayUnique()
  @IsString({ each: true })
  models?: string[]
}
