/**
 * Universal Cloudflare Worker Entry Point
 * Handles authentication, billing, caching, and response formatting for any worker app
 */
//@ts-check
/// <reference lib="esnext" />
/// <reference types="@cloudflare/workers-types" />

import { stripeBalanceMiddleware, DORM } from "stripeflare";

//@ts-ignore
import handler from "../../main";
//@ts-expect-error
import resultHtml from "../../result.html";
//@ts-expect-error
import homepageHtml from "../../homepage.html";

export { DORM };

/**
 * @typedef {Object} Env
 * @property {KVNamespace} PATH_CACHE - The user's name
 * @property {Fetcher} ASSETS - The user's age
 * @property {DurableObjectNamespace} RATE_LIMITER - The user's email address
 * @property {string} STRIPE_PAYMENT_LINK - payment link
 */

/**
 * @typedef {Object} StripeUser
 */

/**
 * @typedef {{timestamp:number}} CacheMetadata
 */

// Default configuration with overrides from main handler

/** @type {{}} */
const typedHandler = handler;

const config = {
  version: 1,
  priceCredit: 1,
  freeRateLimit: 10,
  freeRateLimitResetSeconds: 3600,
  expirationTtl: 0,
  // overwrite defaults if present
  ...typedHandler,
};

// Database migrations for Stripeflare
export const migrations = {
  1: [
    `CREATE TABLE users (
      access_token TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0,
      name TEXT,
      email TEXT,
      verified_email TEXT,
      verified_user_access_token TEXT,
      card_fingerprint TEXT,
      client_reference_id TEXT
    )`,
    `CREATE INDEX idx_users_balance ON users(balance)`,
    `CREATE INDEX idx_users_name ON users(name)`,
    `CREATE INDEX idx_users_email ON users(email)`,
    `CREATE INDEX idx_users_verified_email ON users(verified_email)`,
    `CREATE INDEX idx_users_card_fingerprint ON users(card_fingerprint)`,
    `CREATE INDEX idx_users_client_reference_id ON users(client_reference_id)`,
  ],
};

// Durable Object for rate limiting
export class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");

    if (!clientId) {
      return new Response("Missing clientId", { status: 400 });
    }

    const now = Date.now();
    const resetWindow = config.freeRateLimitResetSeconds * 1000;
    const windowStart = now - resetWindow;

    // Get current requests for this window
    const requests =
      (await this.state.storage.get(`requests:${clientId}`)) || [];

    // Filter out requests older than the reset window
    const recentRequests = requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    // Check if under rate limit
    if (recentRequests.length >= config.freeRateLimit) {
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          resetTime: Math.min(...recentRequests) + resetWindow,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Add current request
    recentRequests.push(now);
    await this.state.storage.put(`requests:${clientId}`, recentRequests);

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: config.freeRateLimit - recentRequests.length,
        resetTime: now + resetWindow,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Add CORS headers to any response
 */
function addCorsHeaders(response) {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  newResponse.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return newResponse;
}

/**
 * Determine response format from request
 */
function getResponseFormat(request, pathname) {
  // Check if pathname has explicit extension
  if (pathname.endsWith(".html")) return "html";
  if (pathname.endsWith(".md")) return "md";

  // Check Accept header
  const accept = request.headers.get("Accept") || "";
  if (accept.includes("text/html")) return "html";

  // Default to markdown
  return "md";
}

/**
 * Create cache key from pathname and sorted query params
 */
function createCacheKey(pathname, searchParams, ext) {
  const sortedParams = new URLSearchParams();
  const params = Array.from(searchParams.entries()).sort();
  params.forEach(([key, value]) => sortedParams.append(key, value));
  const query = sortedParams.toString();
  const path = query ? `${pathname}?${query}` : pathname;
  return `${config.version}:${ext}:${path}`;
}

/**
 * Convert markdown to HTML using template
 */
function markdownToHtml(markdown) {
  return resultHtml.replace("{{result}}", markdown);
}

/**
 * Create payment required response
 */
function createPaymentRequiredResponse(
  message,
  paymentLink,
  clientId,
  rateLimitData = null,
  ext = "md",
) {
  let content = "";

  if (ext === "html") {
    content = `<h1>💳 Payment Required</h1>
<p>${message}</p>`;

    if (rateLimitData) {
      const resetTime = new Date(rateLimitData.resetTime).toLocaleString();
      content += `<h2>Rate Limit Info</h2>
<ul>
<li>Requests remaining: ${rateLimitData.remaining}/${config.freeRateLimit}</li>
<li>Rate limit resets: ${resetTime}</li>
</ul>`;
    }

    content += `<h2>🔗 Get Unlimited Access</h2>
<a href="${paymentLink}?client_reference_id=${encodeURIComponent(
      clientId,
    )}">Purchase Credits</a>
<p><strong>Pricing:</strong> $${(config.priceCredit / 100).toFixed(
      3,
    )} per request</p>
<p><em>Your client ID: ${clientId}</em></p>`;

    content = markdownToHtml(content);
  } else {
    content = `# 💳 Payment Required\n\n${message}\n\n`;

    if (rateLimitData) {
      const resetTime = new Date(rateLimitData.resetTime).toLocaleString();
      content += `**Rate Limit Info:**\n- Requests remaining: ${rateLimitData.remaining}/${config.freeRateLimit}\n- Rate limit resets: ${resetTime}\n\n`;
    }

    content += `## 🔗 Get Unlimited Access\n\n[Purchase Credits](${paymentLink}?client_reference_id=${encodeURIComponent(
      clientId,
    )})\n\n**Pricing:** $${(config.priceCredit / 100).toFixed(
      3,
    )} per request\n\n*Your client ID: ${clientId}*`;
  }

  return new Response(content, {
    status: 402,
    headers: {
      "Content-Type":
        ext === "html"
          ? "text/html; charset=utf-8"
          : "text/markdown; charset=utf-8",
    },
  });
}

export default {
  ...handler,
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext&{user:StripeUser|null, metadata:CacheMetadata}} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return addCorsHeaders(new Response(null, { status: 204 }));
    }

    try {
      // Handle Stripeflare middleware
      const stripeResult = await stripeBalanceMiddleware(
        request,
        //@ts-ignore
        env,
        ctx,
        migrations,
        "1.0.0",
      );

      if (stripeResult.response) {
        return addCorsHeaders(stripeResult.response);
      }

      // Determine response format
      const ext = getResponseFormat(request, pathname);

      // Remove extension from pathname if present
      if (pathname.endsWith(".html") || pathname.endsWith(".md")) {
        pathname = pathname.replace(/\.(html|md)$/, "");
      }

      // Handle GET requests
      if (request.method === "GET") {
        // Check cache first
        const cacheKey = createCacheKey(pathname, url.searchParams, ext);
        const cached = await env.PATH_CACHE.getWithMetadata(cacheKey);
        if (cached.value) {
          if (
            stripeResult.session?.userClient &&
            stripeResult.session.user?.balance &&
            stripeResult.session.user.balance > 0
          ) {
            // Allow refreshing cache in `waitUntil` if cache was hit, using `refresh` handler.
            // However, be sure that this only happens if a user can be charged.
            if (
              handler.shouldRefresh &&
              typeof handler.shouldRefresh === "function"
            ) {
              //@ts-ignore
              ctx.metadata = cached.metadata;
              const shouldRefreshResponse = await handler.shouldRefresh(
                request,
                env,
                ctx,
              );
              if (shouldRefreshResponse.ok) {
                // Should refresh in waitUntil, charging the user that requested this item.
                ctx.waitUntil(
                  chargedRequest(request, env, ctx, {
                    stripeResult,
                    priceCredit: config.priceCredit,
                    expirationTtl: config.expirationTtl,
                  }),
                );
              }
            }
          }

          return addCorsHeaders(
            new Response(cached.value, {
              headers: {
                "Content-Type":
                  ext === "html"
                    ? "text/html; charset=utf-8"
                    : "text/markdown; charset=utf-8",
                "X-Cache": "HIT",
              },
            }),
          );
        }

        // Handle root path
        if (pathname === "/") {
          const content =
            ext === "html"
              ? homepageHtml
              : await env.ASSETS.fetch(url.origin + "/README.md").then((res) =>
                  res.text(),
                );
          return addCorsHeaders(
            new Response(content, {
              headers: {
                "Content-Type":
                  ext === "html"
                    ? "text/html; charset=utf-8"
                    : "text/markdown; charset=utf-8",
              },
            }),
          );
        }
      }

      // Authentication and billing logic
      let user = null;
      let clientId = null;

      if (stripeResult.session?.userClient) {
        user = stripeResult.session.user;
        clientId = user.client_reference_id || user.access_token;
      } else {
        clientId = request.headers.get("CF-Connecting-IP") || "anonymous";
      }

      // Check rate limiting for users without balance
      if (!user || user.balance <= 0) {
        const rateLimiterId = env.RATE_LIMITER.idFromName(clientId);
        const rateLimiter = env.RATE_LIMITER.get(rateLimiterId);

        const rateLimitResponse = await rateLimiter.fetch(
          new Request(
            `https://rate-limiter/check?clientId=${encodeURIComponent(
              clientId,
            )}`,
          ),
        );

        const rateLimitData = await rateLimitResponse.json();

        if (!rateLimitData.allowed) {
          return addCorsHeaders(
            createPaymentRequiredResponse(
              `Rate limit exceeded (${config.freeRateLimit} requests per ${
                config.freeRateLimitResetSeconds / 3600
              } hour${
                config.freeRateLimitResetSeconds === 3600 ? "" : "s"
              }). Please purchase credits to continue.`,
              env.STRIPE_PAYMENT_LINK,
              clientId,
              rateLimitData,
              ext,
            ),
          );
        }
      }

      // Check user balance
      if (user && user.balance < config.priceCredit) {
        return addCorsHeaders(
          createPaymentRequiredResponse(
            `Insufficient balance. Each request costs $${(
              config.priceCredit / 100
            ).toFixed(3)}. Please add funds to continue.`,
            env.STRIPE_PAYMENT_LINK,
            clientId,
            null,
            ext,
          ),
        );
      }

      return chargedRequest(request, env, ctx, {
        stripeResult,
        priceCredit: config.priceCredit,
        expirationTtl: config.expirationTtl,
      });
    } catch (error) {
      console.error("Worker error:", error);
      const errorResponse = new Response(`Error: ${error.message}`, {
        status: 500,
      });
      return addCorsHeaders(errorResponse);
    }
  },
};

/**
 *
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext&{user:StripeUser|null}} ctx
 * @param {{stripeResult:any,priceCredit:number,expirationTtl:number|undefined}} config
 * @returns
 */
const chargedRequest = async (request, env, ctx, config) => {
  const { stripeResult } = config;
  const url = new URL(request.url);
  let pathname = url.pathname;
  const ext = getResponseFormat(request, pathname);

  // Add user to ctx
  ctx.user = stripeResult.session.user;

  const response = await handler.fetch(request, env, ctx);
  const priceCreditHeader = response.headers.get("X-Price");
  const priceCredit =
    priceCreditHeader && !isNaN(Number(priceCreditHeader))
      ? Number(priceCreditHeader)
      : config.priceCredit;
  const resultText = await response.text();

  // Charge user if they have balance
  if (ctx.user && stripeResult.session && response.status === 200) {
    const { charged } = await stripeResult.session.charge(priceCredit, true);
    console.log(
      `Charged (${String(charged)}) user ${ctx.user.access_token}: $${
        config.priceCredit / 100
      }`,
    );
  }

  // Cache results if successful
  if (response.status === 200 && env.PATH_CACHE) {
    const cacheKeyMd = createCacheKey(pathname, url.searchParams, "md");
    const cacheKeyHtml = createCacheKey(pathname, url.searchParams, "html");
    const htmlContent = markdownToHtml(resultText);

    ctx.waitUntil(
      Promise.all([
        env.PATH_CACHE.put(cacheKeyMd, resultText, {
          expirationTtl: config.expirationTtl,
          metadata: { timestamp: Date.now() },
        }),
        env.PATH_CACHE.put(cacheKeyHtml, htmlContent, {
          expirationTtl: config.expirationTtl,
          metadata: { timestamp: Date.now() },
        }),
      ]),
    );
  }

  // Return appropriate format
  const finalContent = ext === "html" ? markdownToHtml(resultText) : resultText;
  const finalResponse = new Response(finalContent, {
    status: response.status,
    headers: {
      "Content-Type":
        ext === "html"
          ? "text/html; charset=utf-8"
          : "text/markdown; charset=utf-8",
      "X-Cache": "MISS",
    },
  });

  return addCorsHeaders(finalResponse);
};
