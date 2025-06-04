# User Agent 402 - Complete Usage Guide

A minimal framework for creating pay-as-you-go monetized APIs that work seamlessly with AI agents and human users.

## What is User Agent 402?

User Agent 402 is a Cloudflare Worker framework that automatically handles:

- ✅ **Authentication & Billing** via Stripe integration
- ✅ **Rate limiting** for free users
- ✅ **Caching** for optimal performance
- ✅ **CORS** for browser compatibility
- ✅ **Dual format responses** (Markdown for agents, HTML for humans)
- ✅ **Payment flow** with automatic balance management

## Quick Start

### 1. Install the Package

```bash
npm init -y
npm install user-agent-402
```

### 2. Create Required Files

Create these files in your project root:

**`main.js`** - Your API logic:

```javascript
export default {
  // Optional configuration
  version: 1,
  priceCredit: 5, // 5 cents per request
  freeRateLimit: 10, // 10 free requests
  freeRateLimitResetSeconds: 3600, // per hour

  // Your main handler
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/hello") {
      return new Response(
        `# Hello World!\n\nHello ${ctx.user?.name || "Anonymous"}!`,
      );
    }

    if (url.pathname === "/weather") {
      // Example API call
      return new Response(`# Weather Report\n\nToday is sunny! 🌞`);
    }

    return new Response("# 404 Not Found\n\nEndpoint not found.", {
      status: 404,
    });
  },
};
```

**`result.html`** - HTML template for browser users:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>{{pathname}} - My API</title>
    <style>
      body {
        font-family: system-ui;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      code {
        background: #f5f5f5;
        padding: 2px 4px;
        border-radius: 3px;
      }
      pre {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
      }
    </style>
  </head>
  <body>
    {{result}}
    <hr />
    <p><small>Powered by User Agent 402</small></p>
  </body>
</html>
```

**`wrangler.toml`** - Cloudflare Worker configuration:

```toml
name = "my-api"
compatibility_date = "2025-06-01"
main = "node_modules/user-agent-402/index.js"

[dev]
port = 3000

[assets]
directory = "./"
binding = "ASSETS"

[[kv_namespaces]]
binding = "PATH_CACHE"
id = "your-kv-namespace-id"  # Create this in Cloudflare dashboard

[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"

[[durable_objects.bindings]]
name = "DORM_NAMESPACE"
class_name = "DORM"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["RateLimiter", "DORM"]
```

### 3. Set Up Environment Variables

Create `.dev.vars` for local development:

```bash
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your_webhook_secret
STRIPE_SECRET=sk_test_your_stripe_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable
STRIPE_PAYMENT_LINK=https://buy.stripe.com/your_payment_link
DB_SECRET=your_random_db_secret
```

For production, set these as secrets in Cloudflare:

```bash
wrangler secret put STRIPE_SECRET
wrangler secret put STRIPE_WEBHOOK_SIGNING_SECRET
# ... etc for each secret
```

### 4. Deploy

```bash
# Test locally
npm run dev

# Deploy to production
wrangler deploy
```

## Configuration Options

All configuration is optional with sensible defaults:

```javascript
export default {
  version: 1, // Cache version (increment to invalidate)
  priceCredit: 1, // Cost per request in cents ($0.01)
  freeRateLimit: 10, // Free requests per window
  freeRateLimitResetSeconds: 3600, // Rate limit window (1 hour)
  expirationTtl: undefined, // Cache expiration (undefined = no expiration)

  // Your handlers...
};
```

## Advanced Features

### Dynamic Pricing

Return an `X-Price` header to override the default price:

```javascript
async fetch(request, env, ctx) {
  const response = new Response("# Premium Content\n\nThis costs more!");
  response.headers.set("X-Price", "10"); // 10 cents instead of default
  return response;
}
```

### Cache Refresh

Implement `shouldRefresh` to update cache for paying users:

```javascript
export default {
  async shouldRefresh(request, env, ctx) {
    // Check if data is stale
    const hoursSinceCache =
      (Date.now() - ctx.metadata.timestamp) / (1000 * 60 * 60);

    if (hoursSinceCache > 1) {
      return new Response("OK"); // Will refresh in background
    }

    return new Response("Skip", { status: 304 });
  },

  async fetch(request, env, ctx) {
    // Your main handler
  },
};
```

### Private Responses

Prevent caching with Cache-Control header:

```javascript
async fetch(request, env, ctx) {
  const response = new Response(`# Private Data\n\nUser: ${ctx.user.email}`);
  response.headers.set("Cache-Control", "private");
  return response;
}
```

## Built-in Endpoints

User Agent 402 automatically provides:

- `GET /stripe-webhook` - Handles Stripe webhooks
- `GET /stripe-oauth` - OAuth flow for user authentication
- Payment flow via Stripe payment links

## Response Formats

The framework automatically serves dual formats:

**For AI Agents** (default):

```bash
curl https://your-api.com/weather
# Returns: # Weather Report\n\nToday is sunny! 🌞
```

**For Browsers**:

```bash
curl -H "Accept: text/html" https://your-api.com/weather
# or visit https://your-api.com/weather.html
# Returns: Styled HTML page with the markdown content
```

## User Context

Access user information in your handlers:

```javascript
async fetch(request, env, ctx) {
  console.log(ctx.user); // null if not authenticated

  if (ctx.user) {
    console.log(ctx.user.email);
    console.log(ctx.user.balance); // in cents
    console.log(ctx.user.name);
  }

  return new Response(`# Hello ${ctx.user?.name || 'Anonymous'}!`);
}
```

## Stripe Setup

1. Create a Stripe account and get your API keys
2. Create a payment link in Stripe dashboard
3. Set up a webhook endpoint pointing to `https://your-worker.com/stripe-webhook`
4. Add the webhook signing secret to your environment variables

## KV Namespace Setup

1. Go to Cloudflare Dashboard → Workers & Pages → KV
2. Create a new namespace (e.g., "my-api-cache")
3. Copy the namespace ID to your `wrangler.toml`

## Example Use Cases

### 1. AI-Powered Content Generator

```javascript
async fetch(request, env, ctx) {
  const url = new URL(request.url);
  const prompt = url.searchParams.get('prompt');

  if (!prompt) {
    return new Response('# Error\n\nMissing prompt parameter', { status: 400 });
  }

  // Call OpenAI API (or other AI service)
  const aiResponse = await generateContent(prompt);

  return new Response(`# Generated Content\n\n${aiResponse}`);
}
```

### 2. API Proxy with Billing

```javascript
async fetch(request, env, ctx) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    // Proxy to external API
    const externalResponse = await fetch(`https://api.example.com${url.pathname}`);
    const data = await externalResponse.text();

    return new Response(`# API Response\n\n\`\`\`json\n${data}\n\`\`\``);
  }
}
```

### 3. Data Processing Service

```javascript
async fetch(request, env, ctx) {
  if (request.method === 'POST' && url.pathname === '/process') {
    const data = await request.json();

    // Process the data
    const result = await processData(data);

    // Dynamic pricing based on data size
    const price = Math.max(1, Math.ceil(JSON.stringify(data).length / 1000));
    const response = new Response(`# Processing Complete\n\nResult: ${result}`);
    response.headers.set("X-Price", price.toString());

    return response;
  }
}
```

## Best Practices

1. **Always return Markdown** - The framework converts to HTML automatically
2. **Use semantic HTTP status codes** - 402 for payment required, 429 for rate limits
3. **Cache expensive operations** - Cache is automatic for 200 responses
4. **Validate input** - Always validate query parameters and request bodies
5. **Handle errors gracefully** - Return user-friendly error messages in Markdown

## Troubleshooting

### Common Issues

**"No session could be established"**

- Check your Stripe credentials
- Ensure webhook is properly configured

**Rate limiting not working**

- Verify Durable Objects are properly configured in `wrangler.toml`

**Cache not working**

- Check KV namespace configuration
- Ensure you're not returning private responses

**Stripe webhooks failing**

- Verify webhook signing secret
- Check webhook URL configuration in Stripe dashboard

That's it! You now have a fully functional pay-as-you-go API that works great with both AI agents and human users. 🚀

[![](https://b.lmpify.com)](https://lmpify.com/httpsuithubcomj-hcw1yn0)
