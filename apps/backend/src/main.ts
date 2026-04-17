import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import { WinstonModule } from 'nest-winston'
import { AppModule } from './app.module'
import { createWinstonConfig } from './config/env.config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(createWinstonConfig()),
  })

  app.use(helmet())

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = process.env.PORT ?? 3001
  await app.listen(port)
}

bootstrap()
