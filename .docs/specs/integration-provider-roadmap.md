# Integration Provider Roadmap

This document outlines the prioritized implementation roadmap for integration providers, including workflow examples each unlocks and recommendations for providers to remove.

---

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Tier 1 - Critical](#tier-1---critical)
4. [Tier 2 - High Value](#tier-2---high-value)
5. [Tier 3 - Medium Value](#tier-3---medium-value)
6. [Tier 4 - Niche/Enterprise](#tier-4---nicheenterprise)
7. [Quick Wins](#quick-wins)
8. [Recommended Implementation Phases](#recommended-implementation-phases)
9. [Providers Removed](#providers-removed)
10. [Categories Consolidated](#categories-consolidated)

---

## Overview

FlowMaestro's integration system supports 79 fully implemented providers with 108 marked as "coming soon" (after removing 26 niche providers). Categories have been consolidated from 32 to 22. This roadmap prioritizes which providers to implement next based on:

- **Market Demand**: How frequently users request this integration
- **Workflow Value**: What automation use cases it unlocks
- **Implementation Complexity**: OAuth2 vs API Key, API quality
- **Competitive Positioning**: What competitors offer

---

## Current State

### Implemented Providers (79)

| Category           | Count | Providers                                                                                                                                                |
| ------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI & ML            | 6     | openai, anthropic, google, huggingface, fal, xai                                                                                                         |
| Communication      | 9     | slack, discord, telegram, microsoft-teams, microsoft-outlook, gmail, whatsapp, facebook, linkedin                                                        |
| Productivity       | 11    | notion, airtable, coda, google-drive, google-sheets, google-docs, google-forms, google-calendar, google-slides, microsoft-excel, microsoft-word          |
| Developer Tools    | 18    | github, gitlab, bitbucket, linear, vercel, circleci, datadog, sentry, pagerduty, microsoft-powerpoint, microsoft-onedrive, dropbox, box, figma, evernote |
| Project Management | 7     | asana, jira, trello, monday, clickup, close, hubspot                                                                                                     |
| CRM & Sales        | 4     | salesforce, hubspot, apollo, pipedrive                                                                                                                   |
| E-commerce         | 1     | shopify                                                                                                                                                  |
| Marketing          | 8     | mailchimp, sendgrid, klaviyo, typeform, surveymonkey, buffer, hootsuite, intercom                                                                        |
| Scheduling         | 2     | calendly, cal-com                                                                                                                                        |
| Analytics          | 8     | mixpanel, amplitude, segment, posthog, tableau, looker, heap, freshbooks                                                                                 |
| Social Media       | 7     | twitter, youtube, instagram, tiktok, pinterest, reddit, medium                                                                                           |
| Database           | 2     | mongodb, postgresql                                                                                                                                      |
| Legal              | 2     | docusign, hellosign                                                                                                                                      |
| HR                 | 2     | workday, rippling                                                                                                                                        |
| Customer Support   | 2     | freshdesk, intercom                                                                                                                                      |
| Accounting         | 2     | quickbooks, freshbooks                                                                                                                                   |

### Coming Soon Providers (134)

Detailed prioritization below.

---

## Tier 1 - Critical

**Implementation Priority: Immediate**

These unlock the highest-value workflow categories with broad market demand.

### 1. Stripe

| Attribute       | Value                                  |
| --------------- | -------------------------------------- |
| Category        | Payment Processing                     |
| Auth Method     | API Key                                |
| Complexity      | Medium                                 |
| Market Position | #1 payment processor for SaaS/startups |

**Workflows Unlocked:**

- Payment failure recovery: Stripe webhook → Slack alert + recovery email
- Subscription lifecycle: New subscription → CRM update + welcome sequence
- Revenue reporting: Daily/weekly revenue summaries to Slack
- Invoice automation: Generate and send invoices on workflow triggers
- Dunning management: Failed payment → escalating reminder sequence

**Key Operations:**

- `createPaymentIntent`, `createSubscription`, `cancelSubscription`
- `createInvoice`, `sendInvoice`, `listCharges`
- `createCustomer`, `updateCustomer`, `listSubscriptions`
- Webhook triggers: `payment_intent.succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`

---

### 2. Twilio

| Attribute       | Value                              |
| --------------- | ---------------------------------- |
| Category        | SMS & Voice                        |
| Auth Method     | API Key (Account SID + Auth Token) |
| Complexity      | Low                                |
| Market Position | #1 communication API platform      |

**Workflows Unlocked:**

- Appointment reminders: Calendly booking → SMS reminder 1hr before
- Alert escalation: PagerDuty incident → SMS to on-call if unacknowledged
- 2FA/verification: User action → send verification code
- Order notifications: Shopify order → SMS shipping updates
- Emergency broadcasts: Critical event → SMS to team

**Key Operations:**

- `sendSMS`, `sendMMS`, `makeCall`
- `createVerification`, `checkVerification`
- `listMessages`, `getMessage`
- Webhook triggers: `message.received`, `call.completed`

---

### 3. Zoom

| Attribute       | Value                          |
| --------------- | ------------------------------ |
| Category        | Video Conferencing             |
| Auth Method     | OAuth2                         |
| Complexity      | Medium                         |
| Market Position | #1 video conferencing platform |

**Workflows Unlocked:**

- Meeting automation: CRM deal stage → schedule Zoom meeting
- Webinar registration: Form submission → add to webinar + send calendar invite
- Recording management: Meeting ends → upload to Google Drive + notify team
- Attendance tracking: Webinar ends → add attendees to Airtable + email sequence
- Calendar sync: Google Calendar event → create Zoom link automatically

**Key Operations:**

- `createMeeting`, `updateMeeting`, `deleteMeeting`
- `listMeetings`, `getMeetingRecordings`
- `addWebinarRegistrant`, `listWebinarRegistrants`
- `listUsers`, `getUserSettings`
- Webhook triggers: `meeting.ended`, `recording.completed`, `webinar.registration_created`

---

### 4. Google Analytics

| Attribute       | Value                     |
| --------------- | ------------------------- |
| Category        | Analytics                 |
| Auth Method     | OAuth2                    |
| Complexity      | Medium (GA4 API)          |
| Market Position | #1 web analytics platform |

**Workflows Unlocked:**

- Automated reporting: Weekly traffic summary → Slack + Google Sheets
- Conversion alerts: Goal completion spike → Slack notification
- Traffic anomaly detection: Significant traffic change → alert team
- Marketing dashboards: Pull metrics → populate Notion/Airtable dashboard
- Attribution reporting: Campaign performance → executive summary email

**Key Operations:**

- `runReport`, `runRealtimeReport`
- `listAccounts`, `listProperties`
- `getMetadata` (available dimensions/metrics)
- `batchRunReports`

---

### 5. AWS S3

| Attribute       | Value                         |
| --------------- | ----------------------------- |
| Category        | Cloud Storage                 |
| Auth Method     | API Key (Access Key + Secret) |
| Complexity      | Low                           |
| Market Position | #1 cloud object storage       |

**Workflows Unlocked:**

- File backup automation: Google Drive changes → sync to S3
- Asset management: New file uploaded → process with AI → store result
- Data lake pipelines: Database export → S3 → trigger analytics workflow
- Cross-cloud sync: Dropbox → S3 → Azure Storage
- Static site deployment: Content update → upload to S3 → invalidate CloudFront

**Key Operations:**

- `uploadFile`, `downloadFile`, `deleteFile`
- `listObjects`, `getObjectMetadata`
- `createBucket`, `setBucketPolicy`
- `generatePresignedUrl`
- Webhook triggers (via S3 Events): `s3:ObjectCreated:*`, `s3:ObjectRemoved:*`

---

### 6. Snowflake

| Attribute       | Value                   |
| --------------- | ----------------------- |
| Category        | Data Warehouse          |
| Auth Method     | API Key (Key Pair)      |
| Complexity      | Medium                  |
| Market Position | #1 cloud data warehouse |

**Workflows Unlocked:**

- BI dashboards: Run query → populate Google Sheets → Slack summary
- Automated reporting: Daily/weekly reports from warehouse data
- Data quality alerts: Query for anomalies → alert if thresholds exceeded
- Cross-system analytics: Join data from multiple sources → executive dashboard
- ML pipeline data: Export training data → trigger model retraining

**Key Operations:**

- `executeQuery`, `getQueryResults`
- `listDatabases`, `listSchemas`, `listTables`
- `createTable`, `insertRows`
- `getQueryHistory`

---

## Tier 2 - High Value

**Implementation Priority: Next Quarter**

### 7. Xero

| Attribute       | Value                                          |
| --------------- | ---------------------------------------------- |
| Category        | Accounting                                     |
| Auth Method     | OAuth2                                         |
| Complexity      | Medium                                         |
| Market Position | #1 accounting software outside US (UK, AU, NZ) |

**Workflows Unlocked:**

- Invoice automation: Time tracking → generate invoice → send to client
- Expense reporting: Receipt upload → OCR → create expense in Xero
- Payment reconciliation: Stripe payment → match with Xero invoice
- Financial reporting: Monthly close → generate reports → email to stakeholders

---

### 8. WooCommerce

| Attribute       | Value                                             |
| --------------- | ------------------------------------------------- |
| Category        | E-commerce                                        |
| Auth Method     | API Key                                           |
| Complexity      | Low                                               |
| Market Position | 35% of all e-commerce sites (WordPress ecosystem) |

**Workflows Unlocked:**

- Order fulfillment: New order → create shipping label → notify customer
- Inventory alerts: Stock below threshold → reorder notification
- Customer engagement: Purchase → add to email sequence → review request
- Multi-channel sync: WooCommerce order → update inventory in Shopify

---

### 9. ActiveCampaign

| Attribute       | Value                          |
| --------------- | ------------------------------ |
| Category        | Marketing Automation           |
| Auth Method     | API Key                        |
| Complexity      | Low                            |
| Market Position | Top 5 email marketing for SMBs |

**Workflows Unlocked:**

- Lead nurturing: Form submission → tag contact → start automation
- Sales handoff: Lead score threshold → notify sales + create CRM deal
- Event-driven email: Purchase/signup → trigger specific email sequence
- Segmentation: Update contact tags based on behavior across systems

---

### 10. Zoho CRM

| Attribute       | Value                                   |
| --------------- | --------------------------------------- |
| Category        | CRM                                     |
| Auth Method     | OAuth2                                  |
| Complexity      | Medium                                  |
| Market Position | #3 CRM, popular in SMB/emerging markets |

**Workflows Unlocked:**

- Lead management: Website form → create Zoho lead → assign to rep
- Deal tracking: Stage change → Slack notification → update forecast sheet
- Contact sync: Sync contacts between Zoho and other systems
- Activity logging: Meeting/call → log in Zoho → update deal stage

---

### 11. BigQuery

| Attribute       | Value                                           |
| --------------- | ----------------------------------------------- |
| Category        | Data Warehouse                                  |
| Auth Method     | OAuth2 (Google Cloud)                           |
| Complexity      | Medium                                          |
| Market Position | #2 cloud data warehouse, tight Google ecosystem |

**Workflows Unlocked:**

- Same as Snowflake, but for Google Cloud shops
- ML integration: Export to BigQuery ML → train model → serve predictions
- Looker Studio dashboards: Automated data refresh → dashboard updates

---

### 12. Confluence

| Attribute       | Value                               |
| --------------- | ----------------------------------- |
| Category        | Knowledge Management                |
| Auth Method     | OAuth2 (Atlassian)                  |
| Complexity      | Medium                              |
| Market Position | #1 enterprise wiki, pairs with Jira |

**Workflows Unlocked:**

- Documentation automation: Code merge → update Confluence docs
- Meeting notes: Zoom meeting ends → create Confluence page with summary
- Knowledge base sync: Notion page update → sync to Confluence
- Onboarding: New hire → generate personalized onboarding page

---

### 13. MySQL

| Attribute       | Value                              |
| --------------- | ---------------------------------- |
| Category        | Database                           |
| Auth Method     | Connection String                  |
| Complexity      | Low                                |
| Market Position | #1 open source relational database |

**Workflows Unlocked:**

- Direct database operations: Query/insert/update without custom code
- Data sync: MySQL → Google Sheets for reporting
- Backup automation: Scheduled exports → S3/Google Drive
- Alert queries: Monitor for specific conditions → alert on match

---

### 14. Square

| Attribute       | Value                            |
| --------------- | -------------------------------- |
| Category        | Payment/POS                      |
| Auth Method     | OAuth2                           |
| Complexity      | Medium                           |
| Market Position | #1 for retail/in-person payments |

**Workflows Unlocked:**

- POS integration: In-store sale → update inventory → CRM
- Payment tracking: Square payment → accounting system sync
- Customer loyalty: Purchase history → segment for marketing

---

## Tier 3 - Medium Value

**Implementation Priority: Following Quarter**

| Priority | Provider      | Category      | Auth    | Key Use Case                    |
| -------- | ------------- | ------------- | ------- | ------------------------------- |
| 15       | Miro          | Collaboration | OAuth2  | Design workshop automation      |
| 16       | Canva         | Design        | OAuth2  | Automated graphic generation    |
| 17       | NetSuite      | ERP           | OAuth2  | Enterprise resource automation  |
| 18       | Gusto         | HR            | OAuth2  | Payroll and onboarding          |
| 19       | Pinecone      | Vector DB     | API Key | RAG pipelines, semantic search  |
| 20       | Elasticsearch | Search        | API Key | Log analysis, search automation |
| 21       | Mailgun       | Email         | API Key | Developer transactional email   |
| 22       | Basecamp      | PM            | OAuth2  | Alternative to Asana/Monday     |
| 23       | SharePoint    | Productivity  | OAuth2  | Microsoft doc management        |
| 24       | Contentful    | CMS           | OAuth2  | Headless CMS automation         |
| 25       | WordPress     | CMS           | OAuth2  | Blog/content automation         |

---

## Tier 4 - Niche/Enterprise

**Implementation Priority: As Requested**

| Provider           | Category   | Target Audience               |
| ------------------ | ---------- | ----------------------------- |
| SAP                | ERP        | Enterprise manufacturing      |
| ADP                | HR         | Enterprise payroll            |
| Oracle ERP         | ERP        | Large enterprise              |
| Microsoft Dynamics | ERP        | Microsoft enterprise shops    |
| Gorgias            | Support    | E-commerce support            |
| Power BI           | BI         | Microsoft analytics           |
| Auth0              | Identity   | Developer identity management |
| Okta               | Identity   | Enterprise SSO                |
| LaunchDarkly       | DevOps     | Feature flag management       |
| Splunk             | Monitoring | Enterprise log analysis       |
| Chargebee          | Billing    | SaaS subscription management  |

---

## Quick Wins

Low-complexity implementations with high value (API Key auth, well-documented APIs):

| Provider | Complexity | Why Easy                         | Value                      |
| -------- | ---------- | -------------------------------- | -------------------------- |
| Twilio   | Low        | Simple REST, excellent docs      | SMS universally needed     |
| Stripe   | Low-Medium | Excellent API, webhook support   | Payment workflows critical |
| Mailgun  | Low        | Simple REST, similar to SendGrid | Developer audience         |
| AWS S3   | Low        | Standard S3 SDK                  | Storage workflows          |
| Netlify  | Low        | Similar to Vercel (done)         | Deploy automation          |
| Postmark | Low        | Simple transactional email API   | Reliable delivery          |

---

## Recommended Implementation Phases

### Phase 1: Core Business Operations (Immediate)

1. **Stripe** - Payment workflows
2. **Twilio** - SMS/Voice notifications
3. **Zoom** - Meeting automation

**Rationale**: These three unlock 80%+ of business automation needs around payments, communications, and meetings.

### Phase 2: Analytics & Storage (Next)

4. **Google Analytics** - Marketing analytics
5. **AWS S3** - Cloud storage
6. **Snowflake** - Data warehouse
7. **Xero** - International accounting

**Rationale**: Complete the data and analytics stack, add international accounting coverage.

### Phase 3: E-commerce & CRM (Following)

8. **WooCommerce** - WordPress e-commerce
9. **ActiveCampaign** - Marketing automation
10. **Zoho CRM** - CRM coverage
11. **BigQuery** - Google data warehouse
12. **Confluence** - Knowledge management
13. **MySQL** - Direct database access
14. **Square** - POS/retail payments

**Rationale**: Expand e-commerce coverage and complete CRM/marketing suite.

---

## Providers Removed

The following 26 providers were removed from `shared/src/providers.ts` as too niche, redundant, or with uncertain futures:

### Redundant with Existing Providers (7)

| Provider  | Reason                    | Alternative       |
| --------- | ------------------------- | ----------------- |
| Bugsnag   | Error monitoring covered  | Sentry            |
| Rollbar   | Error monitoring covered  | Sentry            |
| Braintree | PayPal-owned, redundant   | PayPal, Stripe    |
| Later     | Social scheduling covered | Buffer, Hootsuite |
| OneLogin  | SSO covered               | Auth0, Okta       |
| ClickSend | SMS covered               | Twilio            |
| Plivo     | SMS covered               | Twilio            |

### Too Niche / Limited Market (14)

| Provider     | Reason                                |
| ------------ | ------------------------------------- |
| Wufoo        | Legacy form builder, <1% market share |
| Capsule CRM  | Tiny CRM                              |
| Nutshell     | Extremely niche CRM                   |
| Re:amaze     | Very small support tool               |
| Tidio        | Small chat widget                     |
| Wave         | Limited API functionality             |
| Backblaze B2 | Niche S3 alternative                  |
| Wasabi       | Niche S3 alternative                  |
| StreamYard   | Niche streaming tool                  |
| Demio        | Small webinar platform                |
| Wistia       | Niche video hosting                   |
| Chatbase     | Small AI chatbot platform             |
| Chili Piper  | Enterprise-only scheduling            |
| Riverside.fm | Niche podcast recording               |

### Uncertain Future / No API (2)

| Provider | Reason                             |
| -------- | ---------------------------------- |
| Kustomer | Acquired by Meta, uncertain future |
| iCloud   | Apple has no public API            |

### Redundant Analytics (3)

| Provider   | Reason                           |
| ---------- | -------------------------------- |
| Fathom     | PostHog covers privacy analytics |
| Plausible  | PostHog covers privacy analytics |
| ChartMogul | Stripe provides similar data     |

---

## Categories Consolidated

Reduced from 32 to 22 categories by merging small/redundant categories:

| Removed Category          | Providers                   | Merged Into     |
| ------------------------- | --------------------------- | --------------- |
| Monitoring & Logging      | Splunk                      | Developer Tools |
| Knowledge Base            | GitBook                     | Productivity    |
| Invoicing & Billing       | Chargebee                   | Accounting      |
| Video & Webinar           | GoToWebinar, Vimeo          | Communication   |
| Security & Authentication | Auth0, Okta                 | Developer Tools |
| Design                    | Figma, Canva                | Productivity    |
| Call Center               | Aircall, Dialpad            | Communication   |
| AB Testing & Optimization | Optimizely, LaunchDarkly    | Developer Tools |
| Business Intelligence     | Looker, Tableau, Power BI   | Analytics       |
| Notifications             | OneSignal, Pusher, Sendbird | Developer Tools |

### Final Category Distribution (22 categories)

| Category           | Count |
| ------------------ | ----- |
| Developer Tools    | 26    |
| Communication      | 20    |
| Productivity       | 17    |
| Marketing          | 14    |
| AI & ML            | 12    |
| Social Media       | 11    |
| Databases          | 10    |
| Analytics          | 10    |
| Accounting         | 10    |
| Project Management | 9     |
| E-commerce         | 8     |
| Customer Support   | 8     |
| CRM & Sales        | 8     |
| File Storage       | 7     |
| Payment Processing | 6     |
| ERP                | 5     |
| Scheduling         | 4     |
| HR                 | 4     |
| Forms & Surveys    | 4     |
| Content Management | 4     |
| Legal & Contracts  | 3     |
| Cryptocurrency     | 1     |

---

## Appendix: Workflow Example Templates

### Payment Recovery Workflow

```
Trigger: Stripe webhook (invoice.payment_failed)
    ↓
Action: Slack - Post to #billing-alerts
    ↓
Condition: Retry count < 3?
    ↓ Yes
Action: Gmail - Send "Update Payment Method" email
    ↓
Delay: Wait 3 days
    ↓
Action: Twilio - Send SMS reminder
```

### Webinar Follow-up Workflow

```
Trigger: Zoom webhook (webinar.ended)
    ↓
Action: Zoom - Get attendee list
    ↓
Loop: For each attendee
    ↓
Action: Airtable - Create/update contact record
    ↓
Action: Mailchimp - Add to "Webinar Attendees" segment
    ↓
Action: Gmail - Send personalized follow-up
```

### Daily Analytics Report

```
Trigger: Schedule (9am daily)
    ↓
Action: Google Analytics - Run report (last 24h)
    ↓
Action: OpenAI - Generate summary with insights
    ↓
Action: Google Sheets - Append to tracking sheet
    ↓
Action: Slack - Post to #marketing with summary
```

---

## References

- Provider definitions: `shared/src/providers.ts`
- Provider implementation guide: `.docs/prompts/add-new-integration.md`
- Integration system docs: `.docs/integrations-system.md`
