This abstracted entry point:

1. **Imports configuration** from `./main` with sensible defaults
2. **Handles CORS** for all responses automatically
3. **Determines format** (html/md) from Accept header or file extension
4. **Caches responses** in both formats using versioned keys
5. **Applies rate limiting** and billing using configurable values
6. **Converts markdown to HTML** using the imported template
7. **Handles root path** serving README.md or index.html
8. **Delegates to main handler** for actual business logic

See: https://lmpify.com/consider-the-example-gtsehr0

How to use:

1. `npm i user-agent-402`
2. ensure you have `result.html`, `index.html`, and `README.md` and `main.js|ts` in your repo
3. inherit this toml

```toml
name = "your-repo"
compatibility_date = "2025-06-01"
main = "node_modules/user-agent-402/index.js"
dev.port = 3000

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

In your `main.js|ts`,
