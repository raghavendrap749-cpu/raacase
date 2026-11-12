import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import express, { type NextFunction, type Request, type Response } from 'express'
import { join } from 'path'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const uploadDirectory = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
  app.use('/api/uploads', (request: Request, _response: Response, next: NextFunction) => {
    const image = /^\/([0-9a-f-]+)\.webp$/i.exec(request.path)
    if (image) {
      const width = Number(request.query.w) > 800 ? 1600 : 800
      request.url = `/${image[1]}-${width}.webp`
    }
    next()
  }, express.static(uploadDirectory, {
    fallthrough: false,
    setHeaders: (response) => response.setHeader('X-Content-Type-Options', 'nosniff'),
  }))
  app.enableCors()
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.setGlobalPrefix('api')
  await app.listen(process.env.PORT || 4000)
}

bootstrap()
