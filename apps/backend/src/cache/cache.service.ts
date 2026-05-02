import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name)
  private readonly client: Redis

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      lazyConnect: true,
    })

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', { error: err.message })
    })
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key)
    if (!value) return null
    return JSON.parse(value) as T
  }

  async set<T>(key: string, value: T, ttlInSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlInSeconds)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async setIfNotExists(key: string, value: string, ttlInSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlInSeconds, 'NX')
    return result === 'OK'
  }

  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern)
    if (keys.length > 0) {
      await this.client.del(...keys)
    }
  }

  onModuleDestroy() {
    this.client.disconnect()
  }
}
