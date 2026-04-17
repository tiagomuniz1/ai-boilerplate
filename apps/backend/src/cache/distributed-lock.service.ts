import { ConflictException, Injectable } from '@nestjs/common'
import { CacheService } from './cache.service'

@Injectable()
export class DistributedLockService {
  constructor(private readonly cacheService: CacheService) {}

  async runWithLock<T>(
    key: string,
    ttlInSeconds: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    const lockKey = `lock:${key}`
    const acquired = await this.cacheService.setIfNotExists(lockKey, '1', ttlInSeconds)

    if (!acquired) {
      throw new ConflictException('Resource is temporarily locked. Please try again.')
    }

    try {
      return await operation()
    } finally {
      await this.cacheService.del(lockKey)
    }
  }
}
