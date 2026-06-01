/**
 * Rate limit persistente via Upstash Redis.
 * Substitui o Map in-memory que era ineficaz em multi-instância serverless.
 *
 * Env vars aceitas (ordem de prioridade):
 *   UPSTASH_REDIS_REST_URL    + UPSTASH_REDIS_REST_TOKEN     (manual)
 *   KV_REST_API_URL           + KV_REST_API_TOKEN            (Vercel Marketplace)
 *
 * Sem nenhuma das duplas, cai num fallback in-memory (dev mode / single instance).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let upstashClient: Redis | null = null;
function getRedis(): Redis | null {
  if (upstashClient) return upstashClient;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  upstashClient = new Redis({ url, token });
  return upstashClient;
}

// Cache de Ratelimit instances por config (evita criar a cada request)
const limiters = new Map<string, Ratelimit>();

/**
 * Cria/cache um rate limiter Upstash. Identificado por key (chave de namespace).
 *
 * @param key  identificador único do limiter (ex: "cadastro_public", "invite_pre_auth")
 * @param max  número máximo de requests
 * @param windowSec  janela em segundos (ex: 60 = 1 minuto)
 */
function getLimiter(key: string, max: number, windowSec: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${key}:${max}:${windowSec}`;
  let lim = limiters.get(cacheKey);
  if (!lim) {
    lim = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      analytics: false,
      prefix: `rl:${key}`,
    });
    limiters.set(cacheKey, lim);
  }
  return lim;
}

// Fallback in-memory para dev / Upstash não configurado
const memoryStore = new Map<string, { count: number; resetAt: number }>();
function memoryRateLimit(key: string, identifier: string, max: number, windowSec: number): boolean {
  const k = `${key}::${identifier}`;
  const now = Date.now();
  const entry = memoryStore.get(k);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(k, { count: 1, resetAt: now + windowSec * 1000 });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count++;
  return false;
}

/**
 * Verifica se o identifier (IP/email/etc) está rate-limited para a key.
 * Retorna true se DEVE BLOQUEAR.
 */
export async function isRateLimited(
  key: string,
  identifier: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const limiter = getLimiter(key, max, windowSec);
  if (!limiter) {
    return memoryRateLimit(key, identifier, max, windowSec);
  }
  try {
    const { success } = await limiter.limit(identifier);
    return !success;
  } catch (err) {
    console.warn("[rate-limit] Upstash error, falling back to memory:", err);
    return memoryRateLimit(key, identifier, max, windowSec);
  }
}
