import { BadRequestException, HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes, randomInt, timingSafeEqual } from 'crypto'
import * as nodemailer from 'nodemailer'

type AdminSession = { expiresAt: number }
type PasswordChangeCode = { code: string, expiresAt: number }
type AdminLoginChallenge = { username: string, code: string, expiresAt: number, attempts: number }

const adminLoginCodeLifetimeMs = 5 * 60 * 1000
const adminLoginCodeResendDelayMs = 60 * 1000
const maxAdminLoginCodeAttempts = 5

@Injectable()
export class AdminAuthService {
  private readonly sessions = new Map<string, AdminSession>()
  private readonly loginChallenges = new Map<string, AdminLoginChallenge>()
  private readonly loginCodeRequests = new Map<string, number>()
  private passwordChangeCode: PasswordChangeCode | null = null
  private activePassword: string | null = null

  constructor(private readonly config: ConfigService) {}

  async login(username: string, password: string) {
    const adminUsername = this.config.get<string>('ADMIN_USERNAME')
    const adminPassword = this.activePassword || this.config.get<string>('ADMIN_PASSWORD')

    if (!adminUsername || !adminPassword || !this.matches(username, adminUsername) || !this.matches(password, adminPassword)) {
      throw new UnauthorizedException('Invalid admin credentials')
    }

    const now = Date.now()
    const lastCodeRequest = this.loginCodeRequests.get(adminUsername)
    if (lastCodeRequest && now - lastCodeRequest < adminLoginCodeResendDelayMs) {
      throw new HttpException('Please wait before requesting another sign-in code.', HttpStatus.TOO_MANY_REQUESTS)
    }

    const isProduction = this.config.get<string>('NODE_ENV') === 'production'
    let code: string
    let mode: 'email' | 'dummy'
    if (isProduction) {
      const user = this.config.get<string>('SMTP_USER')
      const pass = this.config.get<string>('SMTP_PASS')
      const recipient = this.config.get<string>('ADMIN_EMAIL')
      if (!user || !pass || !recipient) {
        throw new ServiceUnavailableException('Admin email delivery is not configured.')
      }

      code = randomInt(100000, 1000000).toString()
      mode = 'email'
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
      await transporter.sendMail({
        from: `Raacase admin <${user}>`,
        to: recipient,
        subject: 'Your Raacase admin sign-in code',
        text: `Your Raacase admin sign-in code is ${code}. It expires in 5 minutes. If you did not request this, ignore this email.`,
      })
    } else {
      code = this.config.get<string>('ADMIN_LOGIN_DUMMY_OTP', '123456')
      if (!/^\d{6}$/.test(code)) {
        throw new ServiceUnavailableException('ADMIN_LOGIN_DUMMY_OTP must be a six-digit code.')
      }
      mode = 'dummy'
    }

    const challengeId = randomBytes(32).toString('hex')
    this.loginChallenges.set(challengeId, {
      username: adminUsername,
      code,
      expiresAt: now + adminLoginCodeLifetimeMs,
      attempts: 0,
    })
    this.loginCodeRequests.set(adminUsername, now)
    return { challengeId, expiresIn: adminLoginCodeLifetimeMs / 1000, mode }
  }

  verifyLoginCode(challengeId: string, code: string) {
    const challenge = this.loginChallenges.get(challengeId)
    if (!challenge || challenge.expiresAt <= Date.now()) {
      this.loginChallenges.delete(challengeId)
      throw new UnauthorizedException('The sign-in code is invalid or has expired.')
    }

    if (!this.matches(code, challenge.code)) {
      challenge.attempts += 1
      if (challenge.attempts >= maxAdminLoginCodeAttempts) {
        this.loginChallenges.delete(challengeId)
      }
      throw new UnauthorizedException('The sign-in code is invalid or has expired.')
    }

    this.loginChallenges.delete(challengeId)
    const token = randomBytes(32).toString('hex')
    this.sessions.set(token, { expiresAt: Date.now() + 1000 * 60 * 60 * 12 })
    return { token, expiresIn: 60 * 60 * 12 }
  }

  validateAuthorizationHeader(authorization?: string) {
    const token = this.getToken(authorization)
    const session = this.sessions.get(token)

    if (!session || session.expiresAt <= Date.now()) {
      if (token) this.sessions.delete(token)
      throw new UnauthorizedException('Admin access required')
    }
  }

  logout(authorization?: string) {
    const token = this.getToken(authorization)
    this.validateAuthorizationHeader(authorization)
    this.sessions.delete(token)
  }

  async requestPasswordChange(authorization?: string) {
    this.validateAuthorizationHeader(authorization)
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')
    const recipient = this.config.get<string>('ADMIN_EMAIL')

    if (!user || !pass || !recipient) {
      throw new ServiceUnavailableException('Admin email delivery is not configured.')
    }

    const code = randomInt(100000, 1000000).toString()
    this.passwordChangeCode = { code, expiresAt: Date.now() + 1000 * 60 * 15 }
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await transporter.sendMail({
      from: `Raacase admin <${user}>`,
      to: recipient,
      subject: 'Raacase admin password-change code',
      text: `Your Raacase admin password-change code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`,
    })
  }

  confirmPasswordChange(authorization: string | undefined, code: string, newPassword: string) {
    this.validateAuthorizationHeader(authorization)
    if (!this.passwordChangeCode || this.passwordChangeCode.expiresAt <= Date.now() || !this.matches(code, this.passwordChangeCode.code)) {
      this.passwordChangeCode = null
      throw new BadRequestException('The verification code is invalid or has expired.')
    }

    this.activePassword = newPassword
    this.passwordChangeCode = null
    this.sessions.clear()
  }

  private getToken(authorization?: string) {
    return authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  }

  private matches(value: string, expected: string) {
    const valueBuffer = Buffer.from(value)
    const expectedBuffer = Buffer.from(expected)
    return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer)
  }
}
