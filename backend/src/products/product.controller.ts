import { randomUUID } from 'crypto'
import { mkdirSync, renameSync, unlinkSync } from 'fs'
import { join } from 'path'
import { BadRequestException, Body, Controller, Delete, Get, Headers, NotFoundException, Param, ParseIntPipe, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { ProductService } from './product.service'
import { Product } from './product.entity'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateStockDto } from './dto/update-stock.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { AdminAuthService } from '../auth/admin-auth.service'
import { AdminImageUploadGuard } from './admin-image-upload.guard'

const uploadDirectory = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
const allowedImageTypes = new Set(['image/webp'])

const productImageUpload = FileFieldsInterceptor([
  { name: 'smallImages', maxCount: 8 },
  { name: 'largeImages', maxCount: 8 },
], {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      try {
        mkdirSync(uploadDirectory, { recursive: true })
        callback(null, uploadDirectory)
      } catch (error) {
        callback(error instanceof Error ? error : new Error('Could not create image storage.'), uploadDirectory)
      }
    },
    filename: (_request, _file, callback) => callback(null, `${randomUUID()}.upload`),
  }),
  limits: { files: 16, fileSize: 12 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new BadRequestException('Upload supported image files.'), false)
      return
    }
    callback(null, true)
  },
})

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  @Get()
  getAll(): Promise<Product[]> {
    return this.productService.findAll()
  }

  @UseGuards(AdminImageUploadGuard)
  @UseInterceptors(productImageUpload)
  @Post('upload')
  uploadImages(@UploadedFiles() files: { smallImages?: Express.Multer.File[], largeImages?: Express.Multer.File[] } | undefined) {
    const smallImages = files?.smallImages || []
    const largeImages = files?.largeImages || []
    if (!smallImages.length || smallImages.length !== largeImages.length) {
      for (const file of [...smallImages, ...largeImages]) {
        try {
          unlinkSync(file.path)
        } catch {
          // Ignore temporary files that Multer has already removed.
        }
      }
      throw new BadRequestException('Select valid product images.')
    }

    const movedFiles: string[] = []
    const uploadedImages: string[] = []
    try {
      for (const [index, smallImage] of smallImages.entries()) {
        const largeImage = largeImages[index]
        const imageId = randomUUID()
        const smallPath = join(uploadDirectory, `${imageId}-800.webp`)
        const largePath = join(uploadDirectory, `${imageId}-1600.webp`)
        renameSync(smallImage.path, smallPath)
        movedFiles.push(smallPath)
        renameSync(largeImage.path, largePath)
        movedFiles.push(largePath)
        uploadedImages.push(`/api/uploads/${imageId}.webp`)
      }
    } catch {
      for (const filePath of [...movedFiles, ...smallImages.map((file) => file.path), ...largeImages.map((file) => file.path)]) {
        try {
          unlinkSync(filePath)
        } catch {
          // Ignore files already removed during cleanup.
        }
      }
      throw new BadRequestException('Could not store the uploaded images.')
    }

    return { images: uploadedImages }
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    const product = await this.productService.findOne(id)
    if (!product) {
      throw new NotFoundException('Product not found')
    }
    return product
  }

  @Post()
  create(@Headers('authorization') authorization: string | undefined, @Body() product: CreateProductDto): Promise<Product> {
    this.adminAuthService.validateAuthorizationHeader(authorization)
    return this.productService.create(product)
  }

  @Patch(':id')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() update: UpdateProductDto,
  ): Promise<Product> {
    this.adminAuthService.validateAuthorizationHeader(authorization)
    const product = await this.productService.update(id, update)
    if (!product) throw new NotFoundException('Product not found')
    return product
  }

  @Patch(':id/stock')
  async updateStock(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() update: UpdateStockDto,
  ): Promise<Product> {
    this.adminAuthService.validateAuthorizationHeader(authorization)
    const product = await this.productService.updateStock(id, update.stockQuantity)
    if (!product) throw new NotFoundException('Product not found')
    return product
  }

  @Delete(':id')
  async remove(@Headers('authorization') authorization: string | undefined, @Param('id', ParseIntPipe) id: number) {
    this.adminAuthService.validateAuthorizationHeader(authorization)
    const removed = await this.productService.remove(id)
    if (!removed) throw new NotFoundException('Product not found')
    return { removed: true }
  }
}
