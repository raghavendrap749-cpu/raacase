import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { ContactService } from './contact.service'
import { SendContactMessageDto } from './dto/send-contact-message.dto'

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(204)
  async sendMessage(@Body() contact: SendContactMessageDto) {
    await this.contactService.sendMessage(contact)
  }
}
