// Worker Env bindings — extend CloudflareWorker types
export interface Env {
  DB: D1Database;
  AE: AnalyticsEngineDataset;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  JWT_SECRET_KEY: string;
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
