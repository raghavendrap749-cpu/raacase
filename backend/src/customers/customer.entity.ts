import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ContactMessage } from '../contact/contact-message.entity'

@Entity({ name: 'customers' })
@Index('uq_customers_email', ['email'], { unique: true })
@Index('uq_customers_phone', ['phone'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 100 })
  name!: string

  @Column({ type: 'varchar', length: 254, nullable: true })
  email!: string | null

  @Column({ name: 'password_hash', type: 'text', nullable: true, select: false })
  passwordHash!: string | null

  @Column({ type: 'varchar', length: 16, nullable: true })
  phone!: string | null

  @Column({ name: 'phone_verified', default: false })
  phoneVerified!: boolean

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  cart!: { productId: number, selectedModel: string, quantity: number }[]

  @OneToMany(() => ContactMessage, (contactMessage) => contactMessage.customer)
  contactMessages!: ContactMessage[]

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
