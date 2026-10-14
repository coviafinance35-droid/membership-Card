import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const configuredRedisUrl = process.env.REDIS_URL_3 ?? process.env.REDIS_URL;
const redisUrl = configuredRedisUrl && !configuredRedisUrl.startsWith("process.env.") ? configuredRedisUrl : undefined;

const globalForQueue = globalThis as unknown as { redis?: IORedis; fulfillmentQueue?: Queue; fulfillmentEvents?: QueueEvents };
export const redis = redisUrl
  ? globalForQueue.redis ?? new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false })
  : null;
export const fulfillmentQueue = redis
  ? globalForQueue.fulfillmentQueue ?? new Queue("fulfillment", { connection: redis, defaultJobOptions: { attempts: 5, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 } })
  : null;
export const fulfillmentEvents = redis
  ? globalForQueue.fulfillmentEvents ?? new QueueEvents("fulfillment", { connection: redis })
  : null;
if (redis && process.env.NODE_ENV !== "production") {
  globalForQueue.redis = redis;
  globalForQueue.fulfillmentQueue = fulfillmentQueue ?? undefined;
  globalForQueue.fulfillmentEvents = fulfillmentEvents ?? undefined;
}

export async function enqueueFulfillment(orderId: string) {
  if (!fulfillmentQueue) throw new Error("REDIS_URL_3 is required for background jobs.");
  return fulfillmentQueue.add("create-fulfillment-order", { orderId }, { jobId: `fulfillment:${orderId}` });
}
