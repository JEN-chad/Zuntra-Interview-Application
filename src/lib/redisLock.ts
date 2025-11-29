// lib/redisLock.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

export async function acquireLock(key: string, ttlSeconds = 30) {
  const value = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ok = await redis.set(key, value, "NX", "EX", ttlSeconds);
  if (!ok) return null;
  return value;
}

export async function releaseLock(key: string, value: string | null) {
  if (!value) return;
  // safe release: check value then del (simple Lua would be better)
  const cur = await redis.get(key);
  if (cur === value) {
    await redis.del(key);
  }
}
