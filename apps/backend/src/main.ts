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

  // In production the frontend runs on N clinic subdomains (slug.pulso.center) plus
  // backoffice.pulso.center, calling the API on api.pulso.center. Accept any
  // subdomain of pulso.center (any depth, for forward compatibility) and the
  // apex, over https, echoing the exact origin — `*` is forbidden with
  // credentials. Keep localhost working for local dev.
  const productionOriginPattern = /^https:\/\/([a-z0-9-]+\.)*pulso\.center$/
  const localhostOriginPattern = /^http:\/\/localhost(:\d+)?$/
  const devFallbackOrigin = process.env.FRONTEND_URL

  app.enableCors({
    origin: (origin, callback) => {
      // Same-origin / non-browser requests (curl, health checks) send no Origin.
      if (!origin) return callback(null, true)
      if (
        productionOriginPattern.test(origin) ||
        localhostOriginPattern.test(origin) ||
        (devFallbackOrigin && origin === devFallbackOrigin)
      ) {
        return callback(null, true)
      }
      // Deny without throwing: no Access-Control-Allow-Origin header is set, so the
      // browser blocks the response — without emitting a 500 into the error logs.
      return callback(null, false)
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-clinic-slug', 'Idempotency-Key'],
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
