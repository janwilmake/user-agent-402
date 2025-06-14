# User Agent 402 - Minimal Framework for Pay-as-you-Go Monetised Agent-First APIs

This abstracted entry point:

1. **Imports configuration** from `./main` with sensible defaults
2. **Handles CORS** for all responses automatically
3. **Determines format** (html/md) from Accept header or file extension
4. **Caches responses** in both formats using versioned keys
5. **Applies rate limiting** and billing using configurable values
6. **Converts markdown to HTML** using the imported template
7. **Handles root path** serving README.md or index.html
8. **Delegates to main handler** for actual business logic

It has strong and powerful opinions built-in:

- assume the stored KV is a value for the path+query+ext+version
- **KV-first**: if kv is present, always use it. If not, the handler is hit. KV should contain the final HTML and final Markdown rather than structured data. This ensures results are always extremely fast by design.

One learning that can be taken from this package is the 'package-as-entrypoint' pattern; the package becomes the entrypoint while using files from the worker itself, and this works fine!

[![](https://b.lmpify.com/Original_Spec)](https://lmpify.com/consider-the-example-gtsehr0)

How to use:

1. `npm i user-agent-402`
2. Ensure you have `result.html`, `main.js|ts` in your repo
3. inherit this toml

```toml
name = "your-repo"
compatibility_date = "2025-06-01"
main = "node_modules/user-agent-402/index.js"
dev.port = 3000
assets.directory = "./"
assets.binding = "ASSETS"

[[kv_namespaces]]
binding = "PATH_CACHE"
id = "your-path_cache-id"

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

Ensure to have these secrets set:

```
STRIPE_WEBHOOK_SIGNING_SECRET=
STRIPE_SECRET=
STRIPE_PUBLISHABLE_KEY=
STRIPE_PAYMENT_LINK=
DB_SECRET=
```

In your `main.js|ts` ensure your default export has the following variables set (if you don't want them to be defaulted):

```ts
// all values are optional!
export default {
  // version for resolving values from kv
  version: 1,
  // cents to charge per 200 response for users that have paid
  priceCredit: 1,
  // requests per period until ratelimit is hit, per IP
  freeRatelimit: 10,
  // period in seconds after which ratelimit is reset
  freeRateLimitResetSeconds: 3600,

  // Your handler(s)
  fetch: (request) => {
    return new Response("Hello, world!");
  },
};
```

# Update june 9, 2025

After trying this for GoogLLM and especially after someone else tried it, I found this is actually a very nice thing and, although it's a nice thing to strive for, it can't always be done like this. This is therefore abandoned
