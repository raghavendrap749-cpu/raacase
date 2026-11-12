import 'dotenv/config'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Product } from './product.entity'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { AuthModule } from '../auth/auth.module'
import { InMemoryProductService } from './in-memory-product.service'
import { AdminImageUploadGuard } from './admin-image-upload.guard'

const useInMemoryData = process.env.USE_IN_MEMORY_DATA === 'true'

@Module({
  imports: [...(useInMemoryData ? [] : [TypeOrmModule.forFeature([Product])]), AuthModule],
  controllers: [ProductController],
  providers: useInMemoryData
    ? [{ provide: ProductService, useClass: InMemoryProductService }, AdminImageUploadGuard]
    : [ProductService, AdminImageUploadGuard],
})
export class ProductModule {}
