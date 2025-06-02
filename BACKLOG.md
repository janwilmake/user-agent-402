# Abstract Away Secret Management for Stripe Integration

The current solution allows you to fully control all secrets and configuration in wrangler and do your own deployment. However, what if stripe was a managed resource that got created and configured? We can even go further and remove the need for `wrangler.toml` altogether if we also provision a queue and schedule based on exported config. This does create some complications though, so is it possible to just manage stripe via a cli (as in-between step)?

Ideally we just want to setup a worker like this:

- `STRIPE_SECRET`: known after stripe oauth
- `STRIPE_PUBLISHABLE_KEY`: known after stripe oauth
- `STRIPE_WEBHOOK_SIGNING_SECRET`: find or create with name `wrangler.name`, stripeflare version, and callback `https://{routes[0].pattern}/stripe-webhook`
- `STRIPE_PAYMENT_LINK`: find or create with name `wrangler.name` and price from `export default` or default

This CLI should create the secrets in Cloudflare or in `.dev.vars` if `--local` is passed.

Maybe I can use Sam Goodwin's Alchemy SDK to easily build on stripe and get this done?

The CLI would need Stripe OAuth + Prompt for a Cloudflare API Key.

This would make making monetized agent-friendly workers super simple!
