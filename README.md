# Email Reader Alexa Skill

This repository contains:
- `lambda/`: Alexa skill runtime, email connectors, and polling job.
- `skill-package/`: Alexa interaction model and skill manifest.
- `web/`: Next.js app for account linking and mailbox management.
- `infra/`: AWS infrastructure template.
- `docs/`: deployment and architecture notes.

## Quick start

### Lambda
```bash
cd lambda
npm install
npm test
```

### Web
```bash
cd web
npm install
npm test
npm run build
```

### Skill package
Use ASK CLI to deploy the updated interaction model and manifest.

## Supported provider modes
- Gmail OAuth (read-only)
- Outlook OAuth (read-only)
- Manual IMAP
- Manual POP (unread approximation)
- SMTP settings storage for future send features
