import { Injectable, Optional, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as nodemailer from 'nodemailer'
import { ContactMessage } from './contact-message.entity'
import { Customer } from '../customers/customer.entity'
import { SendContactMessageDto } from './dto/send-contact-message.dto'

@Injectable()
export class ContactService {
  constructor(
    private readonly configService: ConfigService,
    @Optional() @InjectRepository(ContactMessage)
    private readonly contactMessageRepository?: Repository<ContactMessage>,
    @Optional() @InjectRepository(Customer)
    private readonly customerRepository?: Repository<Customer>,
  ) {}

  async sendMessage(contact: SendContactMessageDto) {
    if (this.contactMessageRepository && this.customerRepository) {
      const email = contact.email.trim().toLowerCase()
      await this.customerRepository.upsert(
        { name: contact.name.trim(), email },
        ['email'],
      )
      const customer = await this.customerRepository.findOneBy({ email })
      if (!customer) {
        throw new ServiceUnavailableException('Could not load the saved customer record.')
      }

      const message = this.contactMessageRepository.create({
        ...contact,
        customer,
      })
      await this.contactMessageRepository.save(message)
    } else if (process.env.USE_IN_MEMORY_DATA !== 'true') {
      throw new ServiceUnavailableException('Contact message storage is not configured.')
    }

    const user = this.configService.get<string>('SMTP_USER')
    const pass = this.configService.get<string>('SMTP_PASS')
    const recipient = this.configService.get<string>('CONTACT_RECIPIENT') || user

    if (!user || !pass || !recipient) {
      throw new ServiceUnavailableException('Email delivery is not configured.')
    }

    await this.sendEmail(contact, user, pass, recipient)
  }

  private async sendEmail(contact: SendContactMessageDto, user: string, pass: string, recipient: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: `Raacase website <${user}>`,
      to: recipient,
      replyTo: contact.email,
      subject: `Raacase contact message from ${contact.name}`,
      text: `Name: ${contact.name}\nEmail: ${contact.email}\n\nMessage:\n${contact.message}`,
    })
  }
}
