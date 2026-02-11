# Deployment Guide

## 1. AWS Resources
1. Deploy `/infra/aws-template.yaml` (CloudFormation).
2. Confirm the DynamoDB table exists (default: `EmailReader`).
3. Create/attach Lambda functions:
   - Skill handler entrypoint: `index.handler`
   - Poller handler entrypoint: `src/jobs/poller.handler`
4. Configure EventBridge schedule to invoke poller every 15 minutes.
5. Add runtime secret map item to DynamoDB:
   - `PK=SYSTEM#SECRETS`
   - `SK=RUNTIME#PRIMARY`
   - `secretValues` map with:
     - `TURSO_DATABASE_URL`
     - `TURSO_AUTH_TOKEN`
     - `APP_ENCRYPTION_KEY`
     - `GOOGLE_CLIENT_SECRET`
     - `MICROSOFT_CLIENT_SECRET`

## 2. Lambda Environment Variables
Set on skill and poller Lambdas as needed:
- `EMAIL_READER_TABLE=EmailReader`
- `AWS_REGION=us-east-1`
- `ALEXA_SECRET_TABLE=EmailReader` (optional override)
- `ALEXA_SECRET_PK=SYSTEM#SECRETS` (optional override)
- `ALEXA_SECRET_SK=RUNTIME#PRIMARY` (optional override)
- `ALEXA_SECRET_CACHE_SECONDS=300`
- `ALEXA_OAUTH_CLIENT_ID=email-reader-alexa`
- `ALEXA_OAUTH_CLIENT_SECRET=<secret>`
- `APP_ENCRYPTION_KEY=<32-byte-base64-key>` (if not using KMS)
- `KMS_KEY_ID=<kms-key-arn-or-id>` (optional)
- `GOOGLE_CLIENT_ID=<google-client-id>`
- `GOOGLE_CLIENT_SECRET=<google-client-secret>` (or store only in DynamoDB secret map)
- `MICROSOFT_CLIENT_ID=<microsoft-client-id>`
- `MICROSOFT_CLIENT_SECRET=<microsoft-client-secret>` (or store only in DynamoDB secret map)
- `TURSO_DATABASE_URL=<libsql-url>` (or store only in DynamoDB secret map)
- `TURSO_AUTH_TOKEN=<turso-token>` (or store only in DynamoDB secret map)

## 3. Vercel Web App
Deploy `/web` with these env vars:
- `APP_BASE_URL=https://<your-vercel-domain>`
- `SESSION_SECRET=<strong-random-secret>`
- `CSRF_SECRET=<strong-random-secret>`
- `ALEXA_OAUTH_CLIENT_ID=email-reader-alexa`
- `ALEXA_OAUTH_CLIENT_SECRET=<same-as-lambda>`
- `APP_ENCRYPTION_KEY=<same-as-lambda-if-used>`
- `TURSO_DATABASE_URL=<libsql-url>`
- `TURSO_AUTH_TOKEN=<turso-token>`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`

Do not configure `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in Vercel for this architecture.

## 4. Alexa Skill Package
1. Update `/skill-package/skill.json` URLs/domains for your real Vercel hostname.
2. Ensure account linking client id/secret align with web + Lambda env vars.
3. Deploy skill package with ASK CLI.

## 5. Validation
1. Link account in Alexa app.
2. Use dashboard to connect Gmail/Outlook/manual mailbox.
3. In Alexa:
   - "How many unread emails do I have"
   - "Read my latest emails"
   - "Read email 1 in full"
4. Set polling interval and verify notification attempts through CloudWatch logs.
