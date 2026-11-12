import { Injectable } from '@nestjs/common'
import { Product } from './product.entity'

@Injectable()
export class InMemoryProductService {
  private nextId = 1
  private readonly products: Product[] = []

  findAll(): Promise<Product[]> {
    return Promise.resolve(this.products)
  }

  findOne(id: number): Promise<Product | null> {
    return Promise.resolve(this.products.find((product) => product.id === id) || null)
  }

  create(product: Partial<Product>): Promise<Product> {
    const created = {
      id: this.nextId++, company: '', material: '', oldPrice: null, badge: '', rating: 4.8,
      stockQuantity: 20, image: '/product-sample.png', images: ['/product-sample.png'], models: [], desc: '', ...product,
    } as Product
    this.products.push(created)
    return Promise.resolve(created)
  }

  async update(id: number, update: Partial<Product>): Promise<Product | null> {
    const product = await this.findOne(id)
    if (product) Object.assign(product, update)
    return product
  }

  async updateStock(id: number, stockQuantity: number): Promise<Product | null> {
    const product = await this.findOne(id)
    if (product) product.stockQuantity = stockQuantity
    return product
  }

  remove(id: number): Promise<boolean> {
    const index = this.products.findIndex((product) => product.id === id)
    if (index === -1) return Promise.resolve(false)
    this.products.splice(index, 1)
    return Promise.resolve(true)
  }
}
