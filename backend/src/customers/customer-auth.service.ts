import { randomBytes, randomInt, createHash, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { BadRequestException, HttpException, HttpStatus, Injectable, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as nodemailer from 'nodemailer'
import { Customer } from './customer.entity'
import { Product } from '../products/product.entity'

const scryptAsync = promisify(scrypt)
const codeLifetimeMs = 10 * 60 * 1000
const codeResendDelayMs = 60 * 1000
const maxCodeAttempts = 5
const passwordLockoutMs = 15 * 60 * 1000
const sessionLifetimeSeconds = 60 * 60 * 24

type CustomerCode = {
  hash: Buffer
  expiresAt: number
  lastSentAt: number
  attempts: number
}

type CustomerSession = {
  customerId: number
  expiresAt: number
}

type PasswordLoginAttempts = {
  attempts: number
  lockedUntil: number
}

@Injectable()
export class CustomerAuthService {
  private readonly codes = new Map<string, CustomerCode>()
  private readonly sessions = new Map<string, CustomerSession>()
  private readonly passwordLoginAttempts = new Map<string, PasswordLoginAttempts>()

  constructor(
    private readonly configService: ConfigService,
    @Optional() @InjectRepository(Customer)
    private readonly customerRepository?: Repository<Customer>,
    @Optional() @InjectRepository(Product)
    private readonly productRepository?: Repository<Product>,
  ) {}

  async requestCode(emailAddress: string) {
    this.getCustomerRepository()
    const email = this.normalizeEmail(emailAddress)
    const now = Date.now()
    const previousCode = this.codes.get(email)
    if (previousCode && now - previousCode.lastSentAt < codeResendDelayMs) {
      throw new HttpException('Please wait before requesting another code.', HttpStatus.TOO_MANY_REQUESTS)
    }

    const user = this.configService.get<string>('SMTP_USER')
    const pass = this.configService.get<string>('SMTP_PASS')
    if (!user || !pass) {
      throw new ServiceUnavailableException('Email delivery is not configured.')
    }

    const code = randomInt(100000, 1000000).toString()
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await transporter.sendMail({
      from: `Raacase <${user}>`,
      to: email,
      subject: 'Your Raacase sign-in code',
      text: `Your Raacase sign-in code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    })

    this.codes.set(email, {
      hash: this.hashCode(code),
      expiresAt: now + codeLifetimeMs,
      lastSentAt: now,
      attempts: 0,
    })
    return { sent: true }
  }

  async verifyCode(emailAddress: string, code: string, name?: string) {
    const repository = this.getCustomerRepository()
    const email = this.normalizeEmail(emailAddress)
    this.verifyPendingCode(email, code)

    let customer = await repository.findOneBy({ email })
    if (!customer) {
      const customerName = name?.trim()
      if (!customerName) {
        throw new BadRequestException('Name is required to create a customer account.')
      }
      customer = await repository.save(repository.create({ email, name: customerName }))
    }

    this.codes.delete(email)
    return this.createSession(customer)
  }

  async registerWithPassword(emailAddress: string, password: string, name: string | undefined, phone: string | undefined, code: string) {
    const repository = this.getCustomerRepository()
    const email = this.normalizeEmail(emailAddress)
    this.verifyPendingCode(email, code)
    const existingCustomer = await repository.createQueryBuilder('customer')
      .addSelect('customer.passwordHash')
      .where('customer.email = :email', { email })
      .getOne()
    if (existingCustomer?.passwordHash) {
      throw new HttpException('An account already exists for this email.', HttpStatus.CONFLICT)
    }

    const customerName = name?.trim() || existingCustomer?.name.trim()
    if (!customerName) {
      throw new BadRequestException('Name is required to create a customer account.')
    }

    const phoneNumber = phone?.trim() || null
    if (phoneNumber) {
      const existingPhone = await repository.findOneBy({ phone: phoneNumber })
      if (existingPhone && existingPhone.id !== existingCustomer?.id) {
        throw new HttpException('An account already exists for this phone number.', HttpStatus.CONFLICT)
      }
    }

    const customer = await repository.save(repository.create({
      ...existingCustomer,
      email,
      name: customerName,
      passwordHash: await this.hashPassword(password),
      phone: phoneNumber || existingCustomer?.phone || null,
    }))
    this.codes.delete(email)
    return this.createSession(customer)
  }

  async loginWithPassword(identifier: string, password: string) {
    const repository = this.getCustomerRepository()
    const normalizedIdentifier = identifier.trim().toLowerCase()
    const loginAttempt = this.passwordLoginAttempts.get(normalizedIdentifier)
    if (loginAttempt?.lockedUntil && loginAttempt.lockedUntil > Date.now()) {
      throw new HttpException('Too many failed sign-in attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS)
    }

    const isEmail = normalizedIdentifier.includes('@')
    const customer = await repository.createQueryBuilder('customer')
      .addSelect('customer.passwordHash')
      .where(isEmail ? 'LOWER(customer.email) = :identifier' : 'customer.phone = :identifier', {
        identifier: isEmail ? normalizedIdentifier : identifier.trim(),
      })
      .getOne()

    if (!customer?.passwordHash || (!isEmail && !customer.phoneVerified)) {
      this.recordPasswordLoginFailure(normalizedIdentifier)
      throw new UnauthorizedException('Invalid email/phone or password. Phone sign-in requires verified SMS setup.')
    }

    const [algorithm, salt, storedHash] = customer.passwordHash.split('$')
    if (algorithm !== 'scrypt' || !salt || !storedHash) {
      this.recordPasswordLoginFailure(normalizedIdentifier)
      throw new UnauthorizedException('Invalid email/phone or password.')
    }

    const submittedHash = await scryptAsync(password, salt, 64) as Buffer
    const expectedHash = Buffer.from(storedHash, 'hex')
    if (submittedHash.length !== expectedHash.length || !timingSafeEqual(submittedHash, expectedHash)) {
      this.recordPasswordLoginFailure(normalizedIdentifier)
      throw new UnauthorizedException('Invalid email/phone or password.')
    }

    this.passwordLoginAttempts.delete(normalizedIdentifier)
    return this.createSession(customer)
  }

  async getCustomer(authorization?: string) {
    const customerId = this.getCustomerId(authorization)
    const repository = this.getCustomerRepository()
    const customer = await repository.findOneBy({ id: customerId })
    if (!customer) {
      throw new UnauthorizedException('Customer account no longer exists.')
    }
    return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
  }

  async getCart(authorization?: string) {
    const customerId = this.getCustomerId(authorization)
    const customerRepository = this.getCustomerRepository()
    const productRepository = this.getProductRepository()
    const customer = await customerRepository.findOneBy({ id: customerId })
    if (!customer) throw new UnauthorizedException('Customer account no longer exists.')

    const cart = customer.cart || []
    const products = cart.length
      ? await productRepository.findBy(cart.map((item) => item.productId).filter((id, index, ids) => ids.indexOf(id) === index).map((id) => ({ id })))
      : []
    const productsById = new Map(products.map((product) => [product.id, product]))
    return cart.flatMap((item) => {
      const product = productsById.get(item.productId)
      if (!product) return []
      return [{ product: item.selectedModel ? { ...product, selectedModel: item.selectedModel } : product, quantity: item.quantity }]
    })
  }

  async updateCart(authorization: string | undefined, items: { productId: number, selectedModel?: string, quantity: number }[]) {
    const customerId = this.getCustomerId(authorization)
    const customerRepository = this.getCustomerRepository()
    const productRepository = this.getProductRepository()
    const customer = await customerRepository.findOneBy({ id: customerId })
    if (!customer) throw new UnauthorizedException('Customer account no longer exists.')

    const productIds = [...new Set(items.map((item) => item.productId))]
    const products = productIds.length
      ? await productRepository.findBy(productIds.map((id) => ({ id })))
      : []
    const productsById = new Map(products.map((product) => [product.id, product]))
    const normalizedItems = new Map<string, { productId: number, selectedModel: string, quantity: number }>()

    for (const item of items) {
      const product = productsById.get(item.productId)
      if (!product) throw new BadRequestException(`Product ${item.productId} is no longer available.`)
      let selectedModel = item.selectedModel?.trim() || ''
      if (!selectedModel && product.models.length === 1) {
        selectedModel = product.models[0]
      }
      if (!selectedModel && product.models.length > 1) {
        throw new BadRequestException(`Select a compatible phone model for ${product.name}.`)
      }
      if (selectedModel && !product.models.includes(selectedModel)) {
        throw new BadRequestException(`${selectedModel} is not a compatible model for ${product.name}.`)
      }

      const key = `${item.productId}:${selectedModel.toLowerCase()}`
      const existing = normalizedItems.get(key)
      const quantity = (existing?.quantity || 0) + item.quantity
      if (quantity > 99) throw new BadRequestException('A cart item cannot exceed 99 units.')
      normalizedItems.set(key, { productId: item.productId, selectedModel, quantity })
    }

    customer.cart = [...normalizedItems.values()]
    await customerRepository.save(customer)
    return this.getCart(authorization)
  }

  logout(authorization?: string) {
    const token = this.getToken(authorization)
    if (!this.sessions.delete(token)) {
      throw new UnauthorizedException('Customer sign-in required.')
    }
    return { loggedOut: true }
  }

  private getCustomerRepository() {
    if (!this.customerRepository) {
      throw new ServiceUnavailableException('Customer database is not configured.')
    }
    return this.customerRepository
  }

  private getProductRepository() {
    if (!this.productRepository) {
      throw new ServiceUnavailableException('Product database is not configured.')
    }
    return this.productRepository
  }

  private getCustomerId(authorization?: string) {
    const token = this.getToken(authorization)
    const session = this.sessions.get(token)
    if (!session || session.expiresAt <= Date.now()) {
      this.sessions.delete(token)
      throw new UnauthorizedException('Customer sign-in required.')
    }
    return session.customerId
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase()
  }

  private hashCode(code: string) {
    return createHash('sha256').update(code).digest()
  }

  private verifyPendingCode(email: string, code: string) {
    const pendingCode = this.codes.get(email)
    if (!pendingCode || pendingCode.expiresAt <= Date.now() || pendingCode.attempts >= maxCodeAttempts) {
      this.codes.delete(email)
      throw new UnauthorizedException('The code is invalid or has expired.')
    }

    pendingCode.attempts += 1
    const submittedHash = this.hashCode(code)
    if (!timingSafeEqual(pendingCode.hash, submittedHash)) {
      throw new UnauthorizedException('The code is invalid or has expired.')
    }
  }

  private recordPasswordLoginFailure(identifier: string) {
    const previous = this.passwordLoginAttempts.get(identifier)
    const attempts = previous?.lockedUntil ? 1 : (previous?.attempts || 0) + 1
    this.passwordLoginAttempts.set(identifier, {
      attempts,
      lockedUntil: attempts >= 5 ? Date.now() + passwordLockoutMs : 0,
    })
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer
    return `scrypt$${salt}$${derivedKey.toString('hex')}`
  }

  private createSession(customer: Customer) {
    const token = randomBytes(32).toString('hex')
    this.sessions.set(token, {
      customerId: customer.id,
      expiresAt: Date.now() + sessionLifetimeSeconds * 1000,
    })
    return {
      token,
      expiresIn: sessionLifetimeSeconds,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
    }
  }

  private getToken(authorization?: string) {
    return authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  }
}
