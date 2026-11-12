import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Customer } from './customer.entity'
import { Product } from '../products/product.entity'
import { CustomerAuthController } from './customer-auth.controller'
import { CustomerAuthService } from './customer-auth.service'

const useInMemoryData = process.env.USE_IN_MEMORY_DATA === 'true'

@Module({
  imports: useInMemoryData ? [] : [TypeOrmModule.forFeature([Customer, Product])],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService],
})
export class CustomerModule {}
