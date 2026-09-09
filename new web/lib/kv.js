/**
 * Data layer. This is the ONE file to swap if you move off Redis.
 *
 * Everything above it only ever calls `get(key)` / `set(key, value)` with
 * JSON-serialisable values, so replacing the driver below with Postgres,
 * Supabase, Mongo — whatever — is a rewrite of this file and nothing else.
 *
 * Driver selection:
 *   - Upstash Redis when KV_REST_API_URL + KV_REST_API_TOKEN are present
 *     (provisioned automatically by the Vercel Marketplace integration).
 *   - Otherwise a local JSON file at .data/store.json, so `vercel dev` works
 *     before the integration is provisioned. The file store is NOT durable on
 *     Vercel — serverless filesystems are ephemeral and per-instance.
 *
 * Note: `@vercel/kv` was the original plan, but Vercel KV has been retired as a
 * first-party product. `@upstash/redis` is its direct successor and the API is
 * the same shape.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const URL_ENV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_ENV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const usingRedis = Boolean(URL_ENV && TOKEN_ENV);

/* ---------------------------------------------------------------- Redis --- */

let redisClient = null;

async function redis() {
  if (!redisClient) {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({ url: URL_ENV, token: TOKEN_ENV });
  }
  return redisClient;
}

/* ----------------------------------------------------------- File store --- */

const FILE = path.join(process.cwd(), '.data', 'store.json');

async function readFileStore() {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeFileStore(store) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), 'utf8');
}

/* ------------------------------------------------------------ Public API --- */

/** Read a key. Returns `null` when the key has never been written. */
export async function get(key) {
  if (usingRedis) {
    const raw = await (await redis()).get(key);
    if (raw == null) return null;
    // Upstash auto-parses JSON it recognises; strings come back as strings.
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  const store = await readFileStore();
  return key in store ? store[key] : null;
}

/** Write a key. Value must be JSON-serialisable. Returns the value written. */
export async function set(key, value) {
  if (usingRedis) {
    await (await redis()).set(key, JSON.stringify(value));
    return value;
  }
  const store = await readFileStore();
  store[key] = value;
  await writeFileStore(store);
  return value;
}

/** Read a key, falling back to `fallback` (and NOT writing it) when unset. */
export async function getOr(key, fallback) {
  const value = await get(key);
  return value == null ? fallback : value;
}

/** Read a collection, always returning an array. */
export async function getList(key) {
  const value = await get(key);
  return Array.isArray(value) ? value : [];
}
