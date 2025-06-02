# General improvements

- ✅ We want to be able to retrieve additional configuration for paying users and put that into any desired storage, easily. Ensure to pass `ctx.session`
- ✅ Allow `X-Price` header response for dynamic pricing overwrite.
- ✅ Allow refreshing cache in `waitUntil` if cache was hit, using `shouldRefresh` handler. however, be sure that this only happens if a user can be charged.
- ✅ Work on easy type-safety.
- ✅ Remove homepage logic for now. its not a good pattern as it results in slower website.
- We want to be able to charge any user by ID in non-fetch-requests as well e.g. for queued jobs and cron jobs. Ensure we overwrite all handlers to pass an additional function `ctx.charge(userId,amountCents,allowNegativeBalance)`

LETS DO THIS TODAY and generate a rewrite of `googllm` with this one as middleware. Should be much simpler now! Then, after it supports html as well, make a thread on it; **Key differentiator: Google without ads and tracking**

Separate post: **Agent-Friendly Google**

Separate post: **Tech Behind GoogLLM and flaredream: User Agent 402**
