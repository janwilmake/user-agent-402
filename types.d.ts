/**
 * Type definitions for Universal Cloudflare Worker Entry Point
 */

/// <reference types="@cloudflare/workers-types" />

/**
 * Environment bindings for the Cloudflare Worker
 */
export interface Env {
  /** KV namespace for caching responses */
  PATH_CACHE: KVNamespace;
  /** Service binding for static assets */
  ASSETS: Fetcher;
  /** Durable Object namespace for rate limiting */
  RATE_LIMITER: DurableObjectNamespace;
  /** Stripe payment link URL */
  STRIPE_PAYMENT_LINK: string;
}

/**
 * Stripe user object from stripeflare middleware
 */
export interface StripeUser {
  /** User's access token (primary key) */
  access_token: string;
  /** User's current balance in cents */
  balance: number;
  /** User's display name */
  name?: string;
  /** User's email address */
  email?: string;
  /** User's verified email address */
  verified_email?: string;
  /** Verified user access token */
  verified_user_access_token?: string;
  /** Card fingerprint for payment method */
  card_fingerprint?: string;
  /** Client reference ID */
  client_reference_id?: string;
}

/**
 * Cache metadata stored with cached responses
 */
export interface CacheMetadata {
  /** Timestamp when the item was cached */
  timestamp: number;
}

/**
 * Enhanced execution context with user and metadata
 */
export interface EnhancedExecutionContext extends ExecutionContext {
  /** Current authenticated user (null if not authenticated) */
  user: StripeUser | null;
  /** Cache metadata for the current request */
  metadata?: CacheMetadata;
}

/**
 * Rate limit response data
 */
export interface RateLimitData {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Timestamp when the rate limit resets */
  resetTime: number;
}

/**
 * Worker configuration object
 */
export interface WorkerConfig {
  /** Configuration version */
  version: number;
  /** Price per request in cents */
  priceCredit: number;
  /** Free tier rate limit (requests per window) */
  freeRateLimit: number;
  /** Rate limit reset window in seconds */
  freeRateLimitResetSeconds: number;
  /** Cache expiration TTL in seconds (undefined = no expiration) */
  expirationTtl?: number;
}

/**
 * Stripe session with charging capability
 */
export interface StripeSession {
  /** User object */
  user: StripeUser;
  /** Whether this is a user client session */
  userClient: boolean;
  /** Charge the user a specified amount */
  charge: (
    amount: number,
    immediate?: boolean,
  ) => Promise<{ charged: boolean }>;
}

/**
 * Result from stripeflare middleware
 */
export interface StripeResult {
  /** HTTP response if middleware handled the request */
  response?: Response;
  /** Session object if user is authenticated */
  session?: StripeSession;
}

/**
 * Enhanced ExportedHandler that extends Cloudflare's ExportedHandler
 * with additional configuration and optional shouldRefresh method
 */
export interface EnhancedExportedHandler extends ExportedHandler<Env> {
  /** Worker configuration */
  version?: number;
  priceCredit?: number;
  freeRateLimit?: number;
  freeRateLimitResetSeconds?: number;
  expirationTtl?: number;

  /**
   * Optional method to determine if cached content should be refreshed
   * Called when a cached response is found and the user has sufficient balance
   *
   * @param request - The incoming request
   * @param env - Environment bindings
   * @param ctx - Enhanced execution context with user and cache metadata
   * @returns Promise resolving to a Response (ok status indicates should refresh)
   */
  shouldRefresh?: (
    request: Request,
    env: Env,
    ctx: EnhancedExecutionContext,
  ) => Promise<Response>;

  /**
   * Main fetch handler with enhanced context
   */
  fetch: (
    request: Request,
    env: Env,
    ctx: EnhancedExecutionContext,
  ) => Promise<Response>;
}

/**
 * Database migrations for stripeflare
 */
export type Migrations = {
  [version: number]: string[];
};

/**
 * Response format types
 */
export type ResponseFormat = "html" | "md";

/**
 * Charged request configuration
 */
export interface ChargedRequestConfig {
  /** Result from stripe middleware */
  stripeResult: StripeResult;
  /** Price per credit in cents */
  priceCredit: number;
  /** Cache expiration TTL */
  expirationTtl?: number;
}

/**
 * Rate limiter durable object interface
 */
export interface RateLimiterDurableObject {
  /** Handle rate limit check requests */
  fetch: (request: Request) => Promise<Response>;
}

/**
 * Rate limiter constructor
 */
export interface RateLimiterConstructor {
  new (state: DurableObjectState, env: Env): RateLimiterDurableObject;
}

declare global {
  /**
   * Global DORM export from stripeflare
   */
  export const DORM: any;
}

export {};
