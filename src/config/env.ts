import dotenv from 'dotenv';
dotenv.config();

export function getEnv() {
  return {
    PORT: Number(process.env.PORT ?? 3000),
    BASE_PATH: String(process.env.BASE_PATH ?? '/api'),
    MONGO_URL: String(process.env.MONGO_URL ?? 'mongodb://localhost:27017'),
    MONGODB_DB: String(process.env.MONGODB_DB ?? 'eventos'),
    MONGO_BOOT: String(process.env.MONGO_BOOT ?? '0'),
    AUTH_ENABLED: String(process.env.AUTH_ENABLED ?? 'false') === 'true',
  };
}
