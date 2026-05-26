# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Alexa skill + Next.js web companion for reading email by voice. Users link accounts and manage mailboxes via the web app; Alexa handles voice commands and new-mail notifications.

## Commands

### Lambda (skill backend)

```bash
cd lambda
npm install
npm test        # node --test — runs lambda/tests/
npm run build   # alias for npm test
```

`npm test` uses Node's built-in test runner. Lambda handler: `index.handler`. Poller handler: `src/jobs/poller.handler`.

### Web (Next.js)

```bash
cd web
npm install
npm test        # node --test — runs web/tests/
npm run dev     # starts on http://localhost:3000
npm run build
```

### Infrastructure

```bash
aws cloudformation deploy \
  --template-file infra/aws-template.yaml \
  --stack-name email-reader \
  --capabilities CAPABILITY_NAMED_IAM
```

## Architecture

### Lambda (`lambda/`)

The `lambda/src/` tree is the deployed skill code. `lambda/custom/src/` is an identical copy used for Alexa-hosted skill deployment — keep them in sync when editing.

```
lambda/src/
  skill.js               # Alexa SDK builder, registers all handlers
  handlers/
    customIntentHandlers.js  # GetUnreadCount, ReadLatest, ReadBody, ListAccounts, SwitchAccount, SetPollingInterval
    systemHandlers.js        # Launch, Help, Cancel, Fallback, ErrorHandler
  services/
    authService.js           # resolves userId from Alexa access token via hashed token lookup in Turso
    accountService.js        # linked mailbox CRUD, runtime user context capture
    mailService.js           # dispatches to connectors, writes cache to DynamoDB
    syncService.js           # incremental sync + cache refresh logic
    oauthRefreshService.js   # refreshes Gmail/Outlook tokens before use
    notificationService.js   # sends Alexa Notifications API requests
  connectors/
    gmailConnector.js        # Gmail API via OAuth2
    outlookConnector.js      # Microsoft Graph API
    imapConnector.js         # imapflow-based IMAP
    popConnector.js          # POP3 (unread count is approximate via UID history)
  store/
    repository.js            # all DynamoDB + Turso reads/writes go through here
    dynamoClient.js          # AWS DocumentClient wrapper
    tursoClient.js           # @libsql/hrana-client wrapper with schema bootstrap
    keyBuilder.js            # generates PK/SK strings for both stores
  security/
    cryptoService.js         # KMS envelope (preferred) → AES-GCM → base64 fallback
    runtimeSecrets.js        # loads secrets from DynamoDB item or runtime-secrets.txt file, cached 5 min
  jobs/
    poller.js                # EventBridge-triggered Lambda; scans due users, detects new mail, sends notifications
```

**Interceptor flow**: Every Alexa request runs `RuntimeContextInterceptor` (in `skill.js`) which resolves the access token to a userId via Turso and captures runtime context (API endpoint token, notification permission) into DynamoDB.

### Web (`web/`)

Next.js 14 App Router. All pages are server components; no client-side framework state.

```
web/app/
  api/
    alexa/oauth/
      authorize/   # Alexa account-linking entry — issues AUTH_CODE, redirects back with code+state
      token/       # exchanges AUTH_CODE → ACCESS+REFRESH; handles refresh_token grant too
      revoke/      # token revocation
    providers/
      google/      # Gmail OAuth connect + callback
      microsoft/   # Outlook OAuth connect + callback
    accounts/
      default/     # set default mailbox
      delete/      # soft-delete (sets status=DISCONNECTED)
      manual/      # add IMAP/POP/SMTP account
      polling/     # update polling interval (15/30/60 min)
    session/
      login/       # email+password sign-in, issues session cookie
      logout/
  signin/          # sign-in page
  dashboard/       # account management UI
  privacy/ terms/
web/lib/
  turso.js         # @libsql/client wrapper with schema auto-bootstrap
  store.js         # Turso-based entity CRUD (mirrors lambda/src/store/repository.js for web)
  tokenStore.js    # AUTH_CODE/ACCESS/REFRESH token lifecycle
  userAuth.js      # password hashing + user lookup
  loginService.js  # session creation after credential check
  session.js       # HMAC-signed session cookie (SESSION_SECRET)
  csrf.js          # CSRF cookie validation (CSRF_SECRET)
  security.js      # AES-GCM encryption for credential blobs (APP_ENCRYPTION_KEY)
  accounts.js      # mailbox account operations
  providerOAuth.js # shared OAuth redirect + callback helpers
  oauthState.js    # opaque state param generation + validation
  config.js        # all env var defaults
  keys.js          # PK/SK builders for Turso entities table
```

### Storage split

| Store | Used by | Contains |
|---|---|---|
| DynamoDB (`EMAIL_READER_TABLE`) | Lambda only | Alexa profile/runtime context, mailbox message cache (up to 10/account), runtime secret item |
| Turso (`entities` table) | Lambda + Web | Linked accounts, OAuth tokens (hashed), polling prefs, user records |

### Secrets loading (Lambda)

`runtimeSecrets.js` loads secrets with this priority: env vars → `runtime-secrets.txt` (local dev) → DynamoDB item (`PK=SYSTEM#SECRETS, SK=RUNTIME#PRIMARY`, attribute `secretValues`). Results are in-memory cached for 5 minutes.

### Encryption tiers (Lambda + Web)

1. KMS envelope encryption — when `KMS_KEY_ID` is set (Lambda only)
2. AES-GCM — when `APP_ENCRYPTION_KEY` is set
3. Base64 plaintext fallback — production should never reach this tier

## Key env vars

Lambda: `EMAIL_READER_TABLE`, `ALEXA_OAUTH_CLIENT_ID`, `ALEXA_OAUTH_CLIENT_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID` (secrets like `GOOGLE_CLIENT_SECRET` can live in the DynamoDB secret map instead).

Web: `APP_BASE_URL`, `SESSION_SECRET`, `CSRF_SECRET`, `ALEXA_OAUTH_CLIENT_ID`, `ALEXA_OAUTH_CLIENT_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `APP_ENCRYPTION_KEY`.

Web runs on Vercel with no AWS SDK dependency — no `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` needed there.
