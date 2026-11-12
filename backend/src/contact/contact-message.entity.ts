import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Customer } from '../customers/customer.entity'

@Entity({ name: 'contact_messages' })
export class ContactMessage {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 100 })
  name!: string

  @Column({ length: 254 })
  email!: string

  @Column('text')
  message!: string

  @ManyToOne(() => Customer, (customer) => customer.contactMessages, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
