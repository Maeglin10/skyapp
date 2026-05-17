import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private readonly defaultTtlSeconds = 3600; // 1 hour

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
        this.client.on('error', (err: Error) => this.logger.warn(`Redis error: ${err.message}`));
        this.logger.log('Redis cache initialized');
      } catch {
        this.logger.warn('Redis unavailable, cache disabled');
        this.client = null;
      }
    } else {
      this.logger.debug('REDIS_URL not set, cache disabled');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = this.defaultTtlSeconds): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // cache failures are non-fatal
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try { await this.client.del(key); } catch { /* non-fatal */ }
  }

  buildKey(...parts: unknown[]): string {
    const hash = createHash('sha256')
      .update(JSON.stringify(parts))
      .digest('hex')
      .slice(0, 16);
    return `skyapp:llm:${hash}`;
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
