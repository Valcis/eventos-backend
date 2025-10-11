export function buildLoggerOptions() {
  // Fastify pino options; tune levels/serializers later
  return { level: process.env.LOG_LEVEL ?? 'info' };
}
