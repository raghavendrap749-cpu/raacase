import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContactMessage } from './contact-message.entity'
import { Customer } from '../customers/customer.entity'
import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'

const useInMemoryData = process.env.USE_IN_MEMORY_DATA === 'true'

@Module({
  imports: useInMemoryData ? [] : [TypeOrmModule.forFeature([ContactMessage, Customer])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
