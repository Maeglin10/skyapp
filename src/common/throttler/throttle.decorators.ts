import { Throttle } from '@nestjs/throttler';

/** 5 req / 10s — for sensitive endpoints (agent/run, orchestrate) */
export const SensitiveRateLimit = () => Throttle({ short: { limit: 5, ttl: 10000 } });

/** 30 req / min — standard */
export const StandardRateLimit = () => Throttle({ long: { limit: 30, ttl: 60000 } });

/** 200 req / min — relaxed (health, tools/list) */
export const RelaxedRateLimit = () => Throttle({ long: { limit: 200, ttl: 60000 } });
