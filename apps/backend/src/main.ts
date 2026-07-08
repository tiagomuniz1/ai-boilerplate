import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import * as cookieParser from 'cookie-parser'
import { WinstonModule } from 'nest-winston'
import { AppModule } from './app.module'
import { createWinstonConfig } from './config/env.config'
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor'
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(createWinstonConfig()),
  })

  app.use(helmet())
  app.use(cookieParser())

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

  app.useGlobalInterceptors(new RequestIdInterceptor(), new HttpLoggingInterceptor())

  app.enableShutdownHooks()

  const port = process.env.PORT ?? 3001
  await app.listen(port)
}

bootstrap()
