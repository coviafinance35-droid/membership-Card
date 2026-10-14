import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL_3 ?? process.env.REDIS_URL;

if (!redisUrl) throw new Error("REDIS_URL_3 is required for background jobs.");

const globalForQueue = globalThis as unknown as { redis?: IORedis; fulfillmentQueue?: Queue; fulfillmentEvents?: QueueEvents };
export const redis = globalForQueue.redis ?? new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
export const fulfillmentQueue = globalForQueue.fulfillmentQueue ?? new Queue("fulfillment", { connection: redis, defaultJobOptions: { attempts: 5, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 } });
export const fulfillmentEvents = globalForQueue.fulfillmentEvents ?? new QueueEvents("fulfillment", { connection: redis });
if (process.env.NODE_ENV !== "production") {
  globalForQueue.redis = redis;
  globalForQueue.fulfillmentQueue = fulfillmentQueue;
  globalForQueue.fulfillmentEvents = fulfillmentEvents;
}

export async function enqueueFulfillment(orderId: string) {
  return fulfillmentQueue.add("create-fulfillment-order", { orderId }, { jobId: `fulfillment:${orderId}` });
}
