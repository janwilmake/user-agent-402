# General improvements

- ✅ We want to be able to retrieve additional configuration for paying users and put that into any desired storage, easily. Ensure to pass `ctx.session`
- ✅ Allow `X-Price` header response for dynamic pricing overwrite.
- ✅ Allow refreshing cache in `waitUntil` if cache was hit, using `shouldRefresh` handler. however, be sure that this only happens if a user can be charged.
- ✅ Work on easy type-safety.
- ✅ Remove homepage logic for now. its not a good pattern as it results in slower website.
- ✅ Use newest stripeflare

# Improve docs

- Make it clearer how to use user-agent-402, which endpoints you have access to, typings, etc.
- Serve that as lmpify to quickly make an app with this from a template
- launch: user-agent-402 (new name?)
