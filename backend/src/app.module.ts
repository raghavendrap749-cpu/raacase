import { Controller, Get, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Product } from './products/product.entity'
import { ContactMessage } from './contact/contact-message.entity'
import { Customer } from './customers/customer.entity'
import { ProductModule } from './products/product.module'
import { ContactModule } from './contact/contact.module'
import { CustomerModule } from './customers/customer.module'
import { AuthModule } from './auth/auth.module'

const useInMemoryData = process.env.USE_IN_MEMORY_DATA === 'true'

@Controller('health')
class HealthController {
  @Get()
  getHealth() {
    return { ok: true, service: 'project-raa-api' }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(useInMemoryData ? [] : [TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'project_raa_migrator'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME', 'project_raa'),
        entities: [Product, ContactMessage, Customer],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: false,
      }),
    })]),
    ProductModule,
    ContactModule,
    CustomerModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
