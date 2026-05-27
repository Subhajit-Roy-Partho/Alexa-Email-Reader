# Graph Report - .  (2026-05-26)

## Corpus Check
- Corpus is ~28,286 words - fits in a single context window. You may not need a graph.

## Summary
- 1033 nodes · 1472 edges · 93 communities (70 shown, 23 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Web App Core|Web App Core]]
- [[_COMMUNITY_Lambda Runtime Secrets|Lambda Runtime Secrets]]
- [[_COMMUNITY_Lambda Auth & Repository|Lambda Auth & Repository]]
- [[_COMMUNITY_Custom Email Connectors|Custom Email Connectors]]
- [[_COMMUNITY_Lambda Email Connectors|Lambda Email Connectors]]
- [[_COMMUNITY_Lambda Core Services|Lambda Core Services]]
- [[_COMMUNITY_Alexa Skill Manifest|Alexa Skill Manifest]]
- [[_COMMUNITY_Web Data Layer|Web Data Layer]]
- [[_COMMUNITY_Custom Runtime Secrets|Custom Runtime Secrets]]
- [[_COMMUNITY_Web Alexa OAuth|Web Alexa OAuth]]
- [[_COMMUNITY_Custom Repository|Custom Repository]]
- [[_COMMUNITY_Web UI & CSRF|Web UI & CSRF]]
- [[_COMMUNITY_Documentation & Overview|Documentation & Overview]]
- [[_COMMUNITY_Custom Package Config|Custom Package Config]]
- [[_COMMUNITY_Lambda Package Config|Lambda Package Config]]
- [[_COMMUNITY_Web Authentication|Web Authentication]]
- [[_COMMUNITY_Provider OAuth Flow|Provider OAuth Flow]]
- [[_COMMUNITY_Custom Account Service|Custom Account Service]]
- [[_COMMUNITY_Lambda Account Service|Lambda Account Service]]
- [[_COMMUNITY_Web Security & Session|Web Security & Session]]
- [[_COMMUNITY_Web Account CRUD|Web Account CRUD]]
- [[_COMMUNITY_Web Package Config|Web Package Config]]
- [[_COMMUNITY_Custom Sync Service|Custom Sync Service]]
- [[_COMMUNITY_Mail & Account Bridge|Mail & Account Bridge]]
- [[_COMMUNITY_Custom Intent Handlers|Custom Intent Handlers]]
- [[_COMMUNITY_Lambda Intent Handlers|Lambda Intent Handlers]]
- [[_COMMUNITY_Web Session Routes|Web Session Routes]]
- [[_COMMUNITY_Custom System Handlers|Custom System Handlers]]
- [[_COMMUNITY_Custom Poller & Notify|Custom Poller & Notify]]
- [[_COMMUNITY_Lambda System Handlers|Lambda System Handlers]]
- [[_COMMUNITY_Semantic Email Connectors|Semantic Email Connectors]]
- [[_COMMUNITY_Mail Service Intents|Mail Service Intents]]
- [[_COMMUNITY_Custom Crypto Service|Custom Crypto Service]]
- [[_COMMUNITY_Custom Turso Client|Custom Turso Client]]
- [[_COMMUNITY_Sync & Intent Bridge|Sync & Intent Bridge]]
- [[_COMMUNITY_Custom OAuth Refresh|Custom OAuth Refresh]]
- [[_COMMUNITY_Security Tests|Security Tests]]
- [[_COMMUNITY_Poller Sync Bridge|Poller Sync Bridge]]
- [[_COMMUNITY_Custom Auth & Hash|Custom Auth & Hash]]
- [[_COMMUNITY_Custom Mail Service|Custom Mail Service]]
- [[_COMMUNITY_Lambda Mail Service|Lambda Mail Service]]
- [[_COMMUNITY_Crypto Account Bridge|Crypto Account Bridge]]
- [[_COMMUNITY_Skill Context Bridge|Skill Context Bridge]]
- [[_COMMUNITY_Custom Skill Builder|Custom Skill Builder]]
- [[_COMMUNITY_Lambda Skill Builder|Lambda Skill Builder]]
- [[_COMMUNITY_Login Service Tests|Login Service Tests]]
- [[_COMMUNITY_Repository Clients|Repository Clients]]
- [[_COMMUNITY_Auth Token Bridge|Auth Token Bridge]]
- [[_COMMUNITY_Poller Handler Pipeline|Poller Handler Pipeline]]
- [[_COMMUNITY_Interaction Model Config|Interaction Model Config]]
- [[_COMMUNITY_Skill Notifications Bridge|Skill Notifications Bridge]]
- [[_COMMUNITY_Account Service Tests|Account Service Tests]]
- [[_COMMUNITY_Connector Dispatcher|Connector Dispatcher]]
- [[_COMMUNITY_Launch Mail Intents|Launch Mail Intents]]
- [[_COMMUNITY_JSConfig Paths|JSConfig Paths]]
- [[_COMMUNITY_User Auth Tests|User Auth Tests]]
- [[_COMMUNITY_OAuth Security Utils|OAuth Security Utils]]
- [[_COMMUNITY_KMS Encryption|KMS Encryption]]
- [[_COMMUNITY_Runtime Secrets Tests|Runtime Secrets Tests]]
- [[_COMMUNITY_Web Middleware|Web Middleware]]
- [[_COMMUNITY_Account List Intents|Account List Intents]]
- [[_COMMUNITY_List Accounts Bridge|List Accounts Bridge]]
- [[_COMMUNITY_Account Help Intent|Account Help Intent]]
- [[_COMMUNITY_OAuth Token Access|OAuth Token Access]]
- [[_COMMUNITY_Polling Intent Bridge|Polling Intent Bridge]]
- [[_COMMUNITY_Switch Account Bridge|Switch Account Bridge]]
- [[_COMMUNITY_Sync State Tests|Sync State Tests]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_Error Handler|Error Handler]]
- [[_COMMUNITY_Runtime Secrets API|Runtime Secrets API]]
- [[_COMMUNITY_POP Snapshot|POP Snapshot]]
- [[_COMMUNITY_Connectors Index|Connectors Index]]
- [[_COMMUNITY_Runtime Secrets|Runtime Secrets]]
- [[_COMMUNITY_Account Limit|Account Limit]]
- [[_COMMUNITY_User Prefs|User Prefs]]
- [[_COMMUNITY_Home Page|Home Page]]
- [[_COMMUNITY_Privacy Page|Privacy Page]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_JSConfig|JSConfig]]
- [[_COMMUNITY_Dependencies|Dependencies]]
- [[_COMMUNITY_Terms Page|Terms Page]]

## God Nodes (most connected - your core abstractions)
1. `getCurrentSession()` - 12 edges
2. `loadSecretsFromDynamo()` - 12 edges
3. `loadSecretsFromDynamo()` - 12 edges
4. `getCurrentSession` - 12 edges
5. `DashboardPage` - 10 edges
6. `authenticateWithPassword()` - 9 edges
7. `createSignedValue()` - 9 edges
8. `verifySignedValue()` - 9 edges
9. `assertCsrf()` - 9 edges
10. `en-US` - 9 edges

## Surprising Connections (you probably didn't know these)
- `INFO.md Internal Engineering Handbook` --references--> `Runtime Secrets`  [EXTRACTED]
  INFO.md → lambda/custom/src/security/runtimeSecrets.js
- `INFO.md Internal Engineering Handbook` --references--> `Crypto Service`  [EXTRACTED]
  INFO.md → lambda/custom/src/security/cryptoService.js
- `INFO.md Internal Engineering Handbook` --references--> `Mail Service`  [EXTRACTED]
  INFO.md → lambda/custom/src/services/mailService.js
- `INFO.md Internal Engineering Handbook` --references--> `Lambda Configuration`  [EXTRACTED]
  INFO.md → lambda/custom/src/config.js
- `README.md Project Overview` --references--> `Poller Job`  [EXTRACTED]
  README.md → lambda/custom/src/jobs/poller.js

## Hyperedges (group relationships)
- **Alexa Custom Intent Handlers** — get_unread_count_intent, read_latest_emails_intent, read_email_body_intent, list_linked_accounts_intent, switch_account_intent, set_polling_interval_intent [EXTRACTED 1.00]
- **Email Provider Connectors** — gmail_connector, outlook_connector, imap_connector, pop_connector [EXTRACTED 1.00]
- **Poller New Mail Notification Pipeline** — poller_handler_func, sync_list_due_users, sync_sync_user, notification_send_new_mail, sync_mark_next_due [EXTRACTED 1.00]
- **Email Provider Connector Implementations** — gmailConnector, outlookConnector, imapConnector, popConnector, connectors_index_getConnector [INFERRED 0.85]
- **Dual Storage Abstraction Layer** — repository, dynamoClient, tursoClient, keyBuilder [INFERRED 0.90]
- **Alexa Skill Handler Registry** — skill, skill_RuntimeContextInterceptor, systemHandlers, customIntentHandlers [EXTRACTED 1.00]
- **Mailbox State Read/Write Flow** — syncService_syncAccount, syncService_syncIfStale, repository_getMailboxState, repository_upsertMailboxState, mailService_getEmailByIndex [INFERRED 0.80]
- **Credentials Blob Encryption/Decryption Flow** — oauthRefreshService_refreshToken, cryptoService_encryptJson, accountService_hydrateAccount, cryptoService_decryptJson, repository_upsertAccount [INFERRED 0.80]
- **New Mail Notification Pipeline** — syncService_syncAccount, syncService_syncUser, notificationService_sendNewMailNotification [INFERRED 0.75]
- **Account Management API Routes** — default_route_POST, delete_route_POST, manual_route_POST, polling_route_POST [INFERRED 0.85]
- **Provider OAuth Linking Flow** — google_connect_route_GET, google_callback_route_GET, microsoft_connect_route_GET, microsoft_callback_route_GET [INFERRED 0.90]
- **Alexa OAuth Server Endpoints** — authorize_route_GET, token_route_POST, revoke_route_POST [INFERRED 0.90]
- **Alexa OAuth token lifecycle** — tokenStore_createAuthorizationCode, tokenStore_consumeAuthorizationCode, tokenStore_issueAccessAndRefreshTokens, tokenStore_refreshAccessToken, tokenStore_revokeToken [EXTRACTED 1.00]
- **Web signed token security** — session_createSessionToken, csrf_issueCsrfToken, oauthState_createProviderState, security_createSignedValue, security_verifySignedValue [INFERRED 0.80]
- **Account management CRUD** — accounts_addManualAccount, accounts_addOAuthAccount, accounts_setDefaultAccount, accounts_setPollingInterval, accounts_deleteAccount [EXTRACTED 1.00]

## Communities (93 total, 23 thin omitted)

### Community 0 - "Web App Core"
Cohesion: 0.05
Nodes (76): addManualAccount, addOAuthAccount, deleteAccount, setDefaultAccount, setPollingInterval, Alexa OAuth Authorize Route, Config Module, assertCsrf (+68 more)

### Community 1 - "Lambda Runtime Secrets"
Cohesion: 0.06
Nodes (47): AWS, collectCandidates(), config, createDocumentClient(), discoverTableNames(), { documentClient }, fs, getCachedFileSecretMap() (+39 more)

### Community 2 - "Lambda Auth & Repository"
Cohesion: 0.06
Nodes (40): { hashToken }, isExpired(), repository, resolveUserIdFromAccessToken(), config, { documentClient }, getAccount(), getDynamoItem() (+32 more)

### Community 3 - "Custom Email Connectors"
Cohesion: 0.06
Nodes (39): { clip }, decodeBase64Url(), fetchJson(), findPlainText(), getAccessToken(), getRecentMessages(), getUnreadCount(), readHeader() (+31 more)

### Community 4 - "Lambda Email Connectors"
Cohesion: 0.06
Nodes (39): { clip }, decodeBase64Url(), fetchJson(), findPlainText(), getAccessToken(), getRecentMessages(), getUnreadCount(), readHeader() (+31 more)

### Community 5 - "Lambda Core Services"
Cohesion: 0.05
Nodes (36): accountService, notificationService, summary, syncService, AWS, config, crypto, decryptJson() (+28 more)

### Community 6 - "Alexa Skill Manifest"
Cohesion: 0.06
Nodes (38): custom, locales, endpoint, interfaces, locales, regions, description, examplePhrases (+30 more)

### Community 7 - "Web Data Layer"
Cohesion: 0.08
Nodes (27): getDbClient(), getItem(), getPrefs(), getTokenRecord(), getUserProfile(), keys, listAccounts(), nowIso() (+19 more)

### Community 8 - "Custom Runtime Secrets"
Cohesion: 0.11
Nodes (30): AWS, collectCandidates(), config, createDocumentClient(), discoverTableNames(), { documentClient }, fs, getCachedFileSecretMap() (+22 more)

### Community 9 - "Web Alexa OAuth"
Cohesion: 0.10
Nodes (23): GET(), isAllowedRedirectUri(), hashToken(), randomToken(), config, consumeAuthorizationCode(), createAuthorizationCode(), expiresIn() (+15 more)

### Community 10 - "Custom Repository"
Cohesion: 0.16
Nodes (24): config, { documentClient }, getAccount(), getDynamoItem(), getMailboxState(), getTokenRecordByHash(), getTursoClient(), getTursoItem() (+16 more)

### Community 11 - "Web UI & CSRF"
Cohesion: 0.11
Nodes (17): metadata, RootLayout(), buildNotice(), DashboardPage(), POST(), POST(), deleteAccount(), setDefaultAccount() (+9 more)

### Community 12 - "Documentation & Overview"
Cohesion: 0.12
Nodes (21): Architecture Notes, Deployment Guide, INFO.md Internal Engineering Handbook, README.md Project Overview, accountService.captureRuntimeUserContext, authService.resolveUserIdFromAccessToken, AWS CloudFormation Template, Crypto Service (+13 more)

### Community 13 - "Custom Package Config"
Cohesion: 0.11
Nodes (17): author, dependencies, ask-sdk-core, ask-sdk-model, aws-sdk, imapflow, @libsql/hrana-client, uuid (+9 more)

### Community 14 - "Lambda Package Config"
Cohesion: 0.11
Nodes (17): author, dependencies, ask-sdk-core, ask-sdk-model, aws-sdk, imapflow, @libsql/hrana-client, uuid (+9 more)

### Community 15 - "Web Authentication"
Cohesion: 0.24
Nodes (15): authenticateWithPassword(), createPasswordProfile(), hasPasswordProfile(), { normalizeEmail, userIdFromEmail }, {
  normalizePassword,
  validatePassword,
  hashPassword,
  verifyPassword
}, nowIso(), store, crypto (+7 more)

### Community 16 - "Provider OAuth Flow"
Cohesion: 0.13
Nodes (11): createProviderState(), parseProviderState(), config, exchangeGoogleCode(), exchangeMicrosoftCode(), getGoogleAuthorizeUrl(), getMicrosoftAuthorizeUrl(), GET() (+3 more)

### Community 17 - "Custom Account Service"
Cohesion: 0.20
Nodes (14): config, { decryptJson }, ensureAccountLimit(), getActiveAccountId(), hydrateAccount(), listAccounts(), listAccountSummaries(), nextDueIso() (+6 more)

### Community 18 - "Lambda Account Service"
Cohesion: 0.20
Nodes (14): config, { decryptJson }, ensureAccountLimit(), getActiveAccountId(), hydrateAccount(), listAccounts(), listAccountSummaries(), nextDueIso() (+6 more)

### Community 19 - "Web Security & Session"
Cohesion: 0.19
Nodes (14): config, { createSignedValue, verifySignedValue }, base64url(), config, createSignedValue(), crypto, encryptJson(), getFallbackKey() (+6 more)

### Community 20 - "Web Account CRUD"
Cohesion: 0.19
Nodes (12): addManualAccount(), addOAuthAccount(), assertAccountCapacity(), config, { encryptJson }, normalizeLabel(), normalizeProvider(), store (+4 more)

### Community 21 - "Web Package Config"
Cohesion: 0.13
Nodes (14): dependencies, @libsql/client, next, react, react-dom, uuid, name, private (+6 more)

### Community 22 - "Custom Sync Service"
Cohesion: 0.19
Nodes (9): getConnector, config, { getConnector }, isStateStale(), oauthRefreshService, repository, syncAccount(), syncIfStale() (+1 more)

### Community 23 - "Mail & Account Bridge"
Cohesion: 0.20
Nodes (12): resolveAccount, setActiveAccount, setPollingInterval, SetPollingIntervalIntentHandler, SwitchAccountIntentHandler, ReadLatestEmailsIntent, SetPollingIntervalIntent, SwitchAccountIntent (+4 more)

### Community 24 - "Custom Intent Handlers"
Cohesion: 0.17
Nodes (9): accountService, Alexa, GetUnreadCountIntentHandler, ListLinkedAccountsIntentHandler, mailService, ReadEmailBodyIntentHandler, ReadLatestEmailsIntentHandler, SetPollingIntervalIntentHandler (+1 more)

### Community 25 - "Lambda Intent Handlers"
Cohesion: 0.17
Nodes (9): accountService, Alexa, GetUnreadCountIntentHandler, ListLinkedAccountsIntentHandler, mailService, ReadEmailBodyIntentHandler, ReadLatestEmailsIntentHandler, SetPollingIntervalIntentHandler (+1 more)

### Community 26 - "Web Session Routes"
Cohesion: 0.20
Nodes (9): clearSessionCookie(), config, { cookies }, createSessionToken(), { createSignedValue, verifySignedValue }, setSessionCookie(), POST(), resolveTarget() (+1 more)

### Community 27 - "Custom System Handlers"
Cohesion: 0.18
Nodes (10): AccountLinkingHelpIntentHandler, Alexa, CancelAndStopIntentHandler, ErrorHandler, FallbackIntentHandler, HelpIntentHandler, IntentReflectorHandler, LaunchRequestHandler (+2 more)

### Community 28 - "Custom Poller & Notify"
Cohesion: 0.18
Nodes (6): accountService, notificationService, summary, syncService, config, repository

### Community 29 - "Lambda System Handlers"
Cohesion: 0.18
Nodes (10): AccountLinkingHelpIntentHandler, Alexa, CancelAndStopIntentHandler, ErrorHandler, FallbackIntentHandler, HelpIntentHandler, IntentReflectorHandler, LaunchRequestHandler (+2 more)

### Community 30 - "Semantic Email Connectors"
Cohesion: 0.38
Nodes (4): parseRawMessage, fetchSnapshot, clip, stripHtml

### Community 31 - "Mail Service Intents"
Cohesion: 0.22
Nodes (10): accountService.resolveAccount, GetUnreadCountIntentHandler, LaunchRequestHandler, mailService.getEmailByIndex, mailService.getLatestEmails, mailService.getUnreadCount, ReadEmailBodyIntentHandler, ReadLatestEmailsIntentHandler (+2 more)

### Community 32 - "Custom Crypto Service"
Cohesion: 0.27
Nodes (9): AWS, config, crypto, decryptJson(), encryptJson(), getFallbackKey(), { getSecretValue }, kms (+1 more)

### Community 33 - "Custom Turso Client"
Cohesion: 0.27
Nodes (6): createExecuteAdapter(), createTursoClient(), getClient(), { getSecretValue }, hrana, normalizeTursoUrl()

### Community 34 - "Sync & Intent Bridge"
Cohesion: 0.33
Nodes (9): GetUnreadCountIntent, ReadEmailBodyIntent, getEmailByIndex, getUnreadCount, resolveAccessToken, getMailboxState, upsertMailboxState, syncAccount (+1 more)

### Community 35 - "Custom OAuth Refresh"
Cohesion: 0.31
Nodes (8): config, { encryptJson }, getRefreshConfig(), { getSecretValue }, isExpiringSoon(), refreshToken(), repository, resolveAccessToken()

### Community 36 - "Security Tests"
Cohesion: 0.22
Nodes (8): a, assert, b, bad, parsed, security, signed, test

### Community 37 - "Poller Sync Bridge"
Cohesion: 0.25
Nodes (8): listAccounts, ListLinkedAccountsIntentHandler, pollerHandler, listAccounts, queryUserFromTurso, listDueUsers, markUserNextDue, syncUser

### Community 38 - "Custom Auth & Hash"
Cohesion: 0.29
Nodes (5): { hashToken }, isExpired(), repository, resolveUserIdFromAccessToken(), crypto

### Community 39 - "Custom Mail Service"
Cohesion: 0.29
Nodes (5): accountService, getLatestEmails(), parseLimit(), repository, syncService

### Community 40 - "Lambda Mail Service"
Cohesion: 0.29
Nodes (5): accountService, getLatestEmails(), parseLimit(), repository, syncService

### Community 41 - "Crypto Account Bridge"
Cohesion: 0.33
Nodes (7): hydrateAccount, cryptoService, decryptJson, encryptJson, refreshToken, getAccount, upsertAccount

### Community 42 - "Skill Context Bridge"
Cohesion: 0.33
Nodes (4): captureRuntimeUserContext, putDynamoItem, upsertUserProfile, RuntimeContextInterceptor

### Community 43 - "Custom Skill Builder"
Cohesion: 0.29
Nodes (6): accountService, Alexa, authService, customHandlers, RuntimeContextInterceptor, systemHandlers

### Community 45 - "Lambda Skill Builder"
Cohesion: 0.29
Nodes (6): accountService, Alexa, authService, customHandlers, RuntimeContextInterceptor, systemHandlers

### Community 46 - "Login Service Tests"
Cohesion: 0.29
Nodes (6): assert, loginService, security, store, test, userAuth

### Community 48 - "Auth Token Bridge"
Cohesion: 0.40
Nodes (6): resolveUserIdFromAccessToken, getTokenRecordByHash, getTursoItem, authService tests, tokenHash tests, hashToken

### Community 49 - "Poller Handler Pipeline"
Cohesion: 0.33
Nodes (6): accountService.listAccounts, notificationService.sendNewMailNotification, pollerHandler, syncService.listDueUsers, syncService.markUserNextDue, syncService.syncUser

### Community 50 - "Interaction Model Config"
Cohesion: 0.33
Nodes (5): interactionModel, languageModel, intents, invocationName, types

### Community 51 - "Skill Notifications Bridge"
Cohesion: 0.40
Nodes (5): Interaction Model (en-US), sendNewMailNotification, getDynamoItem, getUserProfile, Skill Manifest

### Community 52 - "Account Service Tests"
Cohesion: 0.40
Nodes (4): accountService, assert, repository, test

### Community 53 - "Connector Dispatcher"
Cohesion: 0.60
Nodes (5): Connector Dispatcher, Gmail Connector, IMAP Connector, Outlook Connector, POP Connector

### Community 54 - "Launch Mail Intents"
Cohesion: 0.50
Nodes (5): GetUnreadCountIntentHandler, ReadEmailBodyIntentHandler, ReadLatestEmailsIntentHandler, mailService, LaunchRequestHandler

### Community 55 - "JSConfig Paths"
Cohesion: 0.40
Nodes (4): compilerOptions, baseUrl, paths, @/*

### Community 56 - "User Auth Tests"
Cohesion: 0.50
Nodes (3): assert, test, userAuth

### Community 57 - "OAuth Security Utils"
Cohesion: 0.67
Nodes (3): isAllowedRedirectUri, resolveTarget, parseBasicAuth

### Community 58 - "KMS Encryption"
Cohesion: 0.67
Nodes (3): AWS KMS, cryptoService.decryptJson, cryptoService.encryptJson

### Community 59 - "Runtime Secrets Tests"
Cohesion: 0.67
Nodes (3): clearSecretCache, getSecretValue, runtimeSecrets tests

## Knowledge Gaps
- **393 isolated node(s):** `baseUrl`, `@/*`, `nextConfig`, `name`, `version` (+388 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getConnector` connect `Custom Sync Service` to `Sync & Intent Bridge`, `Lambda Core Services`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Why does `syncAccount` connect `Sync & Intent Bridge` to `Crypto Account Bridge`, `Poller Sync Bridge`, `Custom Sync Service`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `GET()` connect `Web Alexa OAuth` to `Web UI & CSRF`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `getCurrentSession()` (e.g. with `RootLayout()` and `DashboardPage()`) actually correct?**
  _`getCurrentSession()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `DashboardPage` (e.g. with `RootLayout` and `Default Account Route`) actually correct?**
  _`DashboardPage` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `baseUrl`, `@/*`, `nextConfig` to the rest of the system?**
  _393 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web App Core` be split into smaller, more focused modules?**
  _Cohesion score 0.05160628844839371 - nodes in this community are weakly interconnected._