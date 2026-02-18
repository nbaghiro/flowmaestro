---
sidebar_position: 3
title: Available Integrations
---

# Available Integrations

FlowMaestro connects to **150+ services** across 23 categories. Each integration provides operations for use in workflows and as agent tools.

## Communication (20 providers)

Connect to messaging and communication platforms.

| Integration           | Key Operations                                            | Auth    |
| --------------------- | --------------------------------------------------------- | ------- |
| **Slack**             | send_message, list_channels, create_channel, react        | OAuth   |
| **Discord**           | send_message, create_webhook, manage_roles, list_channels | OAuth   |
| **Microsoft Teams**   | send_message, create_meeting, list_channels, get_user     | OAuth   |
| **Gmail**             | send_email, list_emails, create_draft, get_thread, search | OAuth   |
| **Microsoft Outlook** | send_email, create_event, list_contacts, schedule_meeting | OAuth   |
| **WhatsApp Business** | send_message, send_template, send_media                   | API Key |
| **Telegram**          | send_message, send_photo, create_poll, get_updates        | API Key |
| **Twilio**            | send_sms, make_call, send_whatsapp, lookup_number         | API Key |
| **Zoom**              | create_meeting, list_meetings, get_recording, invite_user | OAuth   |
| **Google Meet**       | create_meeting, list_meetings, get_participants           | OAuth   |
| **Front**             | send_message, list_conversations, tag_conversation        | OAuth   |
| **Postmark**          | send_email, send_batch, get_bounces, list_templates       | API Key |
| **RingCentral**       | send_sms, make_call, voicemail, call_log                  | OAuth   |
| **Aircall**           | create_call, list_calls, get_user, list_contacts          | OAuth   |
| **Dialpad**           | call, send_sms, list_calls, get_recordings                | OAuth   |
| **MessageBird**       | send_sms, send_whatsapp, send_voice, lookup               | API Key |
| **Vonage**            | send_sms, verify_number, make_call                        | API Key |
| **Webex**             | create_meeting, send_message, list_rooms                  | OAuth   |
| **Loom**              | get_video, list_videos, get_transcript                    | OAuth   |
| **Vimeo**             | upload_video, get_video, list_videos                      | OAuth   |

## E-commerce (11 providers)

Manage online stores and order processing.

| Integration               | Key Operations                                                                    | Auth    |
| ------------------------- | --------------------------------------------------------------------------------- | ------- |
| **Shopify**               | get_order, create_product, update_inventory, list_customers, create_fulfillment   | OAuth   |
| **WooCommerce**           | get_order, create_product, list_orders, update_product                            | API Key |
| **Stripe**                | create_charge, create_customer, create_refund, list_payments, create_subscription | API Key |
| **BigCommerce**           | get_order, create_product, list_orders, manage_inventory                          | OAuth   |
| **Etsy**                  | create_listing, get_orders, update_shop, list_listings                            | OAuth   |
| **Square**                | create_payment, list_orders, manage_inventory, create_customer                    | OAuth   |
| **PayPal**                | create_payment, get_transaction, create_refund, list_transactions                 | OAuth   |
| **Amazon Seller Central** | get_orders, update_inventory, list_products, get_reports                          | OAuth   |
| **Magento**               | get_order, create_product, list_customers, update_inventory                       | API Key |
| **Shippo**                | create_shipment, get_rates, track_package, list_carriers                          | API Key |
| **ShipStation**           | create_shipment, get_rates, list_orders, track_shipment                           | API Key |

## CRM & Sales (8 providers)

Manage customer relationships and sales pipelines.

| Integration    | Key Operations                                                         | Auth    |
| -------------- | ---------------------------------------------------------------------- | ------- |
| **HubSpot**    | create_contact, update_deal, create_company, add_note, search_contacts | OAuth   |
| **Salesforce** | create_record, update_record, query_records, search_records            | OAuth   |
| **Pipedrive**  | create_deal, update_person, create_activity, list_deals                | OAuth   |
| **Apollo.io**  | search_people, enrich_contact, create_sequence, list_contacts          | API Key |
| **Zoho CRM**   | create_lead, update_contact, search_records, list_deals                | OAuth   |
| **Close**      | create_lead, update_opportunity, add_note, list_activities             | API Key |
| **Copper**     | create_person, update_opportunity, list_leads                          | OAuth   |
| **Insightly**  | create_contact, update_opportunity, list_organizations                 | API Key |

## Productivity (16 providers)

Connect to workspace and productivity tools.

| Integration              | Key Operations                                                   | Auth    |
| ------------------------ | ---------------------------------------------------------------- | ------- |
| **Google Sheets**        | read_rows, append_row, update_cell, create_sheet, clear_range    | OAuth   |
| **Google Docs**          | create_document, insert_text, get_document, replace_text         | OAuth   |
| **Google Calendar**      | create_event, list_events, update_event, delete_event            | OAuth   |
| **Google Slides**        | create_presentation, add_slide, update_slide                     | OAuth   |
| **Notion**               | create_page, update_database, query_database, append_block       | OAuth   |
| **Airtable**             | create_record, update_record, list_records, search, batch_create | API Key |
| **Coda**                 | create_row, update_row, list_rows, list_docs                     | API Key |
| **Miro**                 | create_sticky, create_board, add_shape, list_boards              | OAuth   |
| **Figma**                | get_file, list_projects, get_comments, export_image              | OAuth   |
| **SharePoint**           | upload_file, list_files, create_folder, search                   | OAuth   |
| **Microsoft Excel**      | read_worksheet, update_cells, create_worksheet                   | OAuth   |
| **Microsoft Word**       | create_document, update_document, convert_to_pdf                 | OAuth   |
| **Microsoft PowerPoint** | create_presentation, add_slide                                   | OAuth   |
| **Canva**                | create_design, list_designs, export_design                       | OAuth   |
| **GitBook**              | create_page, update_page, list_spaces                            | OAuth   |
| **Evernote**             | create_note, search_notes, list_notebooks                        | OAuth   |

## Social Media (11 providers)

Post and manage social media content.

| Integration       | Key Operations                                            | Auth  |
| ----------------- | --------------------------------------------------------- | ----- |
| **Instagram**     | create_post, get_insights, reply_to_comment, list_media   | OAuth |
| **Facebook**      | create_post, list_pages, get_page_insights, send_message  | OAuth |
| **LinkedIn**      | create_post, get_profile, share_article, list_connections | OAuth |
| **X (Twitter)**   | create_tweet, search_tweets, get_user, list_timeline      | OAuth |
| **YouTube**       | upload_video, list_videos, get_analytics, add_to_playlist | OAuth |
| **TikTok**        | get_videos, get_analytics, create_post                    | OAuth |
| **Pinterest**     | create_pin, list_boards, get_analytics                    | OAuth |
| **Reddit**        | create_post, list_posts, get_comments, search             | OAuth |
| **Buffer**        | create_post, schedule_post, list_profiles, get_analytics  | OAuth |
| **Hootsuite**     | schedule_post, list_messages, get_analytics               | OAuth |
| **Sprout Social** | publish, list_messages, get_reports                       | OAuth |

## Development (27 providers)

Integrate with development and DevOps tools.

| Integration      | Key Operations                                                  | Auth    |
| ---------------- | --------------------------------------------------------------- | ------- |
| **GitHub**       | create_issue, create_pr, list_repos, get_file, trigger_workflow | OAuth   |
| **GitLab**       | create_issue, create_mr, trigger_pipeline, list_projects        | OAuth   |
| **Bitbucket**    | create_pr, list_repos, get_file                                 | OAuth   |
| **Jira**         | create_issue, update_issue, add_comment, search_issues          | OAuth   |
| **Linear**       | create_issue, update_issue, list_projects, add_comment          | OAuth   |
| **PagerDuty**    | create_incident, acknowledge, resolve, list_incidents           | OAuth   |
| **Sentry**       | list_issues, resolve_issue, get_event                           | API Key |
| **Datadog**      | create_event, query_metrics, list_monitors                      | API Key |
| **New Relic**    | query, list_alerts, get_application                             | API Key |
| **Vercel**       | create_deployment, list_deployments, get_logs, list_domains     | OAuth   |
| **Netlify**      | trigger_build, list_deploys, get_site                           | OAuth   |
| **CircleCI**     | trigger_pipeline, get_workflow, list_jobs                       | API Key |
| **Azure DevOps** | create_work_item, list_builds, trigger_pipeline                 | OAuth   |
| **Heroku**       | create_app, scale_dynos, get_logs                               | OAuth   |
| **DigitalOcean** | create_droplet, list_droplets, create_snapshot                  | OAuth   |
| **AWS**          | Various services (S3, Lambda, EC2, etc.)                        | API Key |
| **Google Cloud** | Various services (GCS, Cloud Functions, etc.)                   | OAuth   |
| **Cloudflare**   | create_dns, list_zones, purge_cache                             | API Key |
| **Auth0**        | create_user, update_user, list_users                            | API Key |
| **Okta**         | create_user, assign_group, list_users                           | API Key |
| **Postman**      | run_collection, list_workspaces                                 | API Key |
| **LaunchDarkly** | toggle_flag, list_flags, create_flag                            | API Key |
| **Optimizely**   | create_experiment, get_results                                  | API Key |
| **Pusher**       | trigger_event, list_channels                                    | API Key |
| **OneSignal**    | send_notification, list_users                                   | API Key |
| **Sendbird**     | send_message, list_channels                                     | API Key |
| **Splunk**       | search, create_alert, list_indexes                              | API Key |

## Customer Support (9 providers)

Manage support tickets and customer interactions.

| Integration    | Key Operations                                            | Auth    |
| -------------- | --------------------------------------------------------- | ------- |
| **Zendesk**    | create_ticket, update_ticket, add_comment, search_tickets | OAuth   |
| **Intercom**   | create_conversation, send_message, list_users, tag_user   | OAuth   |
| **Freshdesk**  | create_ticket, update_ticket, list_agents, add_note       | API Key |
| **Help Scout** | create_conversation, send_reply, list_customers, add_note | OAuth   |
| **LiveChat**   | send_message, get_chat, list_agents, transfer_chat        | OAuth   |
| **Drift**      | create_conversation, send_message, list_contacts          | OAuth   |
| **Crisp**      | send_message, list_conversations, update_user             | API Key |
| **Kustomer**   | create_conversation, update_customer, add_note            | OAuth   |
| **Gorgias**    | create_ticket, reply, list_tickets                        | OAuth   |

## Marketing (13 providers)

Email marketing and automation platforms.

| Integration            | Key Operations                                                     | Auth    |
| ---------------------- | ------------------------------------------------------------------ | ------- |
| **Mailchimp**          | add_member, send_campaign, create_campaign, list_members, add_tags | OAuth   |
| **SendGrid**           | send_email, create_template, list_contacts, add_to_list            | API Key |
| **Klaviyo**            | track_event, add_to_list, send_campaign, get_profile               | API Key |
| **Marketo**            | create_lead, add_to_campaign, send_email, list_leads               | OAuth   |
| **HubSpot Marketing**  | create_email, list_campaigns, get_analytics, add_to_list           | OAuth   |
| **Mailgun**            | send_email, list_domains, get_stats                                | API Key |
| **ActiveCampaign**     | create_contact, add_to_list, trigger_automation                    | API Key |
| **ConvertKit**         | add_subscriber, tag_subscriber, send_broadcast                     | API Key |
| **Drip**               | create_subscriber, tag, trigger_workflow                           | API Key |
| **GetResponse**        | add_contact, send_newsletter, create_campaign                      | API Key |
| **Constant Contact**   | add_contact, send_email, list_campaigns                            | OAuth   |
| **Brevo (Sendinblue)** | send_email, add_contact, send_sms                                  | API Key |
| **Pardot**             | create_prospect, add_to_list, send_email                           | OAuth   |

## Analytics (10 providers)

Access analytics and business intelligence data.

| Integration          | Key Operations                                     | Auth    |
| -------------------- | -------------------------------------------------- | ------- |
| **Google Analytics** | get_report, list_properties, get_realtime_data     | OAuth   |
| **Mixpanel**         | track_event, get_report, list_users, create_cohort | API Key |
| **Amplitude**        | track_event, get_user, list_events, get_retention  | API Key |
| **Segment**          | track, identify, group, alias                      | API Key |
| **Heap**             | track_event, get_user, list_events                 | API Key |
| **PostHog**          | capture, get_person, list_events, feature_flags    | API Key |
| **Hotjar**           | get_recordings, list_surveys, get_feedback         | API Key |
| **Tableau**          | get_view, list_workbooks, refresh_extract          | OAuth   |
| **Power BI**         | refresh_dataset, get_report, list_dashboards       | OAuth   |
| **Looker**           | run_query, list_dashboards, get_look               | OAuth   |

## Storage (7 providers)

File storage and management.

| Integration              | Key Operations                                                                | Auth    |
| ------------------------ | ----------------------------------------------------------------------------- | ------- |
| **AWS S3**               | upload_file, download_file, list_objects, delete_object, create_presigned_url | API Key |
| **Google Cloud Storage** | upload_file, download_file, list_files, delete_file                           | OAuth   |
| **Google Drive**         | upload_file, list_files, share_file, create_folder, move_file                 | OAuth   |
| **Dropbox**              | upload_file, download_file, list_files, share_file                            | OAuth   |
| **Microsoft OneDrive**   | upload_file, download_file, list_files, share_file                            | OAuth   |
| **Box**                  | upload_file, list_files, create_folder, share_file                            | OAuth   |
| **Azure Blob Storage**   | upload_blob, download_blob, list_blobs, delete_blob                           | API Key |

## Databases (11 providers)

Database connections and data warehouses.

| Integration         | Key Operations                              | Auth       |
| ------------------- | ------------------------------------------- | ---------- |
| **PostgreSQL**      | query, insert, update, delete, list_tables  | Connection |
| **MySQL**           | query, insert, update, delete, list_tables  | Connection |
| **MongoDB**         | find, insert, update, delete, aggregate     | Connection |
| **Redis**           | get, set, delete, list_keys, expire         | Connection |
| **Elasticsearch**   | search, index, update, delete, create_index | API Key    |
| **BigQuery**        | query, insert, list_datasets, create_table  | OAuth      |
| **Snowflake**       | query, insert, list_tables, create_table    | Connection |
| **Amazon Redshift** | query, insert, list_tables                  | Connection |
| **Supabase**        | select, insert, update, delete, rpc         | API Key    |
| **Pinecone**        | upsert, query, delete, list_indexes         | API Key    |
| **Databricks**      | query, submit_job, list_jobs                | OAuth      |

## AI & ML (12 providers)

External AI/ML service integrations.

| Integration      | Key Operations                              | Auth    |
| ---------------- | ------------------------------------------- | ------- |
| **OpenAI**       | chat, complete, embed, moderate, transcribe | API Key |
| **Anthropic**    | message, complete                           | API Key |
| **Google AI**    | generate, embed, vision                     | API Key |
| **Cohere**       | generate, embed, classify, rerank           | API Key |
| **ElevenLabs**   | synthesize, clone_voice, list_voices        | API Key |
| **Replicate**    | run_model, list_models, get_prediction      | API Key |
| **Stability AI** | generate_image, upscale, inpaint            | API Key |
| **Hugging Face** | inference, list_models                      | API Key |
| **Runway**       | generate_video, list_models                 | API Key |
| **Luma**         | generate_3d, list_assets                    | API Key |
| **FAL.ai**       | run_model, list_models                      | API Key |
| **x.ai**         | chat, complete                              | API Key |

## Additional Categories

### Payment Processing (6)

Adyen, Klarna, PayPal, Razorpay, Square, Stripe

### HR (10)

ADP, BambooHR, Deel, Gusto, HiBob, Lattice, Personio, Rippling, SAP SuccessFactors, Workday

### ERP (5)

Microsoft Dynamics 365, NetSuite, Odoo, Oracle ERP Cloud, SAP

### Legal & Contracts (3)

DocuSign, HelloSign, PandaDoc

### Forms & Surveys (4)

Google Forms, Jotform, SurveyMonkey, Typeform

### Project Management (9)

Asana, Basecamp, ClickUp, Jira, Monday.com, Smartsheet, Todoist, Trello, Wrike

### Scheduling (4)

Acuity Scheduling, Cal.com, Calendly, Microsoft Bookings

### Accounting (10)

Bill.com, Chargebee, Expensify, FreshBooks, Plaid, QuickBooks, Ramp, Sage, Wise, Xero

## Using Integrations

### Connect a Service

1. Go to **Settings** > **Connections**
2. Click **Add Connection**
3. Select the provider
4. Complete OAuth flow or enter API key
5. Name your connection

### Use in Workflows

Add an integration node:

```typescript
{
  provider: "slack",
  operation: "send_message",
  connectionId: "conn_abc123",
  parameters: {
    channel: "#alerts",
    message: "Hello from FlowMaestro!"
  }
}
```

### Use with Agents

Add as an MCP tool:

```typescript
{
  type: "mcp",
  provider: "hubspot",
  connectionId: "conn_hubspot",
  operations: ["search_contacts", "create_contact"]
}
```

## Custom Integrations

Need an integration not listed? Use the **HTTP node** to connect to any REST API:

```typescript
{
  method: "POST",
  url: "https://api.custom-service.com/endpoint",
  headers: {
    "Authorization": "Bearer {{env.CUSTOM_API_KEY}}"
  },
  body: {
    "data": "{{input.data}}"
  }
}
```
