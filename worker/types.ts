export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

// Worker Env bindings — extend CloudflareWorker types
export interface Env {
  DB: D1Database;
  AE: AnalyticsEngineDataset;
  EVENTS_LIMITER: RateLimit;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  JWT_SECRET_KEY: string;
  GDRIVE_SA_CLIENT_EMAIL: string;
  GDRIVE_SA_PRIVATE_KEY: string;
  MEDIA_SIGNING_KEY: string;
  APP_ORIGIN?: string;
}

// AnalyticsEngineDataset is declared in @cloudflare/workers-types but add here for clarity
declare global {
  interface AnalyticsEngineDataset {
    writeDataPoint(event: {
      blobs?: string[];
      doubles?: number[];
      indexes?: string[];
    }): void;
  }
}

