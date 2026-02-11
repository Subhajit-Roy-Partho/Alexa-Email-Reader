# Architecture Notes

## Components
- Alexa Lambda skill (`/lambda/index.js`): voice intents and readout.
- Poller Lambda (`/lambda/src/jobs/poller.js`): checks due users and detects new messages.
- Turso (`entities` table): linked accounts, polling prefs, OAuth tokens.
- DynamoDB table: Alexa-internal profile state, mailbox cache, runtime secret map.
- Next.js web app (`/web`): account linking, OAuth, manual mailbox setup, polling preferences.

## Data Retention
- Cached message bodies: up to 10 recent emails per linked account.
- Message metadata and sync state retained for incremental comparisons.
- Tokens and credentials are stored encrypted (KMS envelope on Lambda when configured; AES-GCM fallback otherwise).

## Cost Constraints
- EventBridge runs every 15 minutes minimum.
- Polling intervals constrained to 15/30/60 minutes.
- Table uses on-demand billing mode to stay free-tier-friendly for low traffic.
