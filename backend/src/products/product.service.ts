import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from './product.entity'

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.productRepository.find()
  }

  findOne(id: number): Promise<Product | null> {
    return this.productRepository.findOneBy({ id })
  }

  async create(product: Partial<Product>): Promise<Product> {
    const item = this.productRepository.create(product)
    return this.productRepository.save(item)
  }

  async update(id: number, update: Partial<Product>): Promise<Product | null> {
    const product = await this.findOne(id)
    if (!product) return null
    Object.assign(product, update)
    return this.productRepository.save(product)
  }

  async updateStock(id: number, stockQuantity: number): Promise<Product | null> {
    const product = await this.findOne(id)
    if (!product) return null
    product.stockQuantity = stockQuantity
    return this.productRepository.save(product)
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.productRepository.delete(id)
    return result.affected === 1
  }
}
