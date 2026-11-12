import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ nullable: true })
  company!: string

  @Column({ nullable: true })
  material!: string

  @Column()
  category!: string

  @Column()
  name!: string

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  oldPrice!: number

  @Column({ nullable: true })
  badge!: string

  @Column('decimal', { precision: 3, scale: 1, default: 4.8 })
  rating!: number

  @Column({ name: 'stock_quantity', type: 'integer', default: 20 })
  stockQuantity!: number

  @Column({ default: '/product-sample.png' })
  image!: string

  @Column('text', { array: true, default: [' /product-sample.png'] })
  images!: string[]

  @Column('text', { array: true, default: [] })
  models!: string[]

  @Column({ nullable: true })
  desc!: string
}
