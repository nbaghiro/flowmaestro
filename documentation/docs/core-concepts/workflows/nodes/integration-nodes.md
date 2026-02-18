---
sidebar_position: 4
title: Integration Nodes
---

# Integration Nodes

Integration nodes connect your workflows to external services. FlowMaestro supports 150+ integrations across communication, e-commerce, CRM, productivity, and more.

## How Integrations Work

1. **Connect** — Authenticate with the service (OAuth or API key)
2. **Select** — Choose the provider and operation
3. **Configure** — Set operation parameters
4. **Execute** — Run the operation in your workflow

## Integration Node

The generic integration node works with any connected service.

<!-- Screenshot: Integration node configuration -->

### Configuration

```typescript
{
  provider: "slack",
  operation: "send_message",
  connectionId: "conn_abc123",
  parameters: {
    channel: "#general",
    message: "Hello from FlowMaestro!"
  },
  outputVariable: "integration_result"
}
```

## Provider Categories

### Communication (20 providers)

Connect to messaging and communication platforms.

| Provider | Key Operations |
|----------|----------------|
| **Slack** | send_message, list_channels, create_channel |
| **Discord** | send_message, create_webhook, manage_roles |
| **Microsoft Teams** | send_message, create_meeting, list_channels |
| **Gmail** | send_email, list_emails, create_draft, get_thread |
| **Outlook** | send_email, create_event, list_contacts |
| **WhatsApp Business** | send_message, send_template, send_media |
| **Telegram** | send_message, send_photo, create_poll |
| **Twilio** | send_sms, make_call, send_whatsapp |
| **Zoom** | create_meeting, list_meetings, get_recording |

**Slack Example:**

```typescript
{
  provider: "slack",
  operation: "send_message",
  parameters: {
    channel: "#alerts",
    message: "New order received!",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Order #{{order.id}}*\nTotal: ${{order.total}}"
        }
      }
    ]
  }
}
```

---

### E-commerce (11 providers)

Manage online stores and order processing.

| Provider | Key Operations |
|----------|----------------|
| **Shopify** | create_product, get_order, update_inventory, list_customers |
| **WooCommerce** | create_order, update_product, list_orders |
| **Stripe** | create_charge, create_customer, create_refund |
| **BigCommerce** | create_product, update_order, manage_inventory |
| **Etsy** | create_listing, get_orders, update_shop |
| **Square** | create_payment, list_orders, manage_inventory |
| **PayPal** | create_payment, get_transaction, create_refund |
| **Shippo** | create_shipment, get_rates, track_package |

**Shopify Example:**

```typescript
{
  provider: "shopify",
  operation: "update_inventory",
  parameters: {
    inventory_item_id: "{{product.inventory_id}}",
    location_id: "{{warehouse.id}}",
    available: "{{new_quantity}}"
  }
}
```

---

### CRM & Sales (8 providers)

Manage customer relationships and sales pipelines.

| Provider | Key Operations |
|----------|----------------|
| **HubSpot** | create_contact, update_deal, create_company, add_note |
| **Salesforce** | create_record, update_record, query_records |
| **Pipedrive** | create_deal, update_person, create_activity |
| **Apollo.io** | search_people, enrich_contact, create_sequence |
| **Zoho CRM** | create_lead, update_contact, search_records |

**HubSpot Example:**

```typescript
{
  provider: "hubspot",
  operation: "create_contact",
  parameters: {
    email: "{{lead.email}}",
    firstname: "{{lead.firstName}}",
    lastname: "{{lead.lastName}}",
    company: "{{lead.company}}",
    lifecycle_stage: "lead"
  }
}
```

---

### Productivity (16 providers)

Connect to workspace and productivity tools.

| Provider | Key Operations |
|----------|----------------|
| **Google Sheets** | read_rows, append_row, update_cell, create_sheet |
| **Google Docs** | create_document, insert_text, get_document |
| **Google Calendar** | create_event, list_events, update_event |
| **Notion** | create_page, update_database, query_database |
| **Airtable** | create_record, update_record, list_records, search |
| **Coda** | create_row, update_row, list_rows |
| **Miro** | create_sticky, create_board, add_shape |
| **Figma** | get_file, list_projects, get_comments |

**Google Sheets Example:**

```typescript
{
  provider: "google_sheets",
  operation: "append_row",
  parameters: {
    spreadsheet_id: "{{config.sheet_id}}",
    sheet_name: "Orders",
    values: [
      "{{order.id}}",
      "{{order.customer}}",
      "{{order.total}}",
      "{{order.date}}"
    ]
  }
}
```

**Notion Example:**

```typescript
{
  provider: "notion",
  operation: "create_page",
  parameters: {
    database_id: "{{config.database_id}}",
    properties: {
      "Name": { "title": [{ "text": { "content": "{{task.name}}" }}] },
      "Status": { "select": { "name": "In Progress" }},
      "Due Date": { "date": { "start": "{{task.due_date}}" }}
    }
  }
}
```

---

### Social Media (11 providers)

Post and manage social media content.

| Provider | Key Operations |
|----------|----------------|
| **Instagram** | create_post, get_insights, reply_to_comment |
| **Facebook** | create_post, list_pages, get_page_insights |
| **LinkedIn** | create_post, get_profile, share_article |
| **X (Twitter)** | create_tweet, search_tweets, get_user |
| **YouTube** | upload_video, list_videos, get_analytics |
| **TikTok** | get_videos, get_analytics |
| **Buffer** | create_post, schedule_post, list_profiles |

**LinkedIn Example:**

```typescript
{
  provider: "linkedin",
  operation: "create_post",
  parameters: {
    text: "{{content.post_text}}",
    visibility: "PUBLIC",
    media_url: "{{content.image_url}}"
  }
}
```

---

### Development (27 providers)

Integrate with development and DevOps tools.

| Provider | Key Operations |
|----------|----------------|
| **GitHub** | create_issue, create_pr, list_repos, get_file |
| **GitLab** | create_issue, create_mr, trigger_pipeline |
| **Jira** | create_issue, update_issue, add_comment |
| **Linear** | create_issue, update_issue, list_projects |
| **PagerDuty** | create_incident, acknowledge, resolve |
| **Sentry** | list_issues, resolve_issue, get_event |
| **Vercel** | create_deployment, list_deployments, get_logs |
| **CircleCI** | trigger_pipeline, get_workflow, list_jobs |

**GitHub Example:**

```typescript
{
  provider: "github",
  operation: "create_issue",
  parameters: {
    owner: "{{repo.owner}}",
    repo: "{{repo.name}}",
    title: "Bug: {{bug.title}}",
    body: "## Description\n{{bug.description}}\n\n## Steps to Reproduce\n{{bug.steps}}",
    labels: ["bug", "priority-high"]
  }
}
```

---

### Customer Support (9 providers)

Manage support tickets and customer interactions.

| Provider | Key Operations |
|----------|----------------|
| **Zendesk** | create_ticket, update_ticket, add_comment |
| **Intercom** | create_conversation, send_message, list_users |
| **Freshdesk** | create_ticket, update_ticket, list_agents |
| **Help Scout** | create_conversation, send_reply, list_customers |
| **LiveChat** | send_message, get_chat, list_agents |

**Zendesk Example:**

```typescript
{
  provider: "zendesk",
  operation: "create_ticket",
  parameters: {
    subject: "{{ticket.subject}}",
    description: "{{ticket.description}}",
    priority: "high",
    requester_email: "{{customer.email}}",
    tags: ["escalated", "vip"]
  }
}
```

---

### Marketing (13 providers)

Email marketing and automation platforms.

| Provider | Key Operations |
|----------|----------------|
| **Mailchimp** | add_member, send_campaign, create_campaign |
| **SendGrid** | send_email, create_template, list_contacts |
| **Klaviyo** | track_event, add_to_list, send_campaign |
| **Marketo** | create_lead, add_to_campaign, send_email |
| **HubSpot Marketing** | create_email, list_campaigns, get_analytics |

**Mailchimp Example:**

```typescript
{
  provider: "mailchimp",
  operation: "add_member",
  parameters: {
    list_id: "{{config.list_id}}",
    email_address: "{{subscriber.email}}",
    status: "subscribed",
    merge_fields: {
      FNAME: "{{subscriber.firstName}}",
      LNAME: "{{subscriber.lastName}}"
    },
    tags: ["new-signup", "{{subscriber.source}}"]
  }
}
```

---

### Analytics (10 providers)

Access analytics and business intelligence data.

| Provider | Key Operations |
|----------|----------------|
| **Google Analytics** | get_report, list_properties, get_realtime |
| **Mixpanel** | track_event, get_report, list_users |
| **Amplitude** | track_event, get_user, list_events |
| **Segment** | track, identify, group |
| **Tableau** | get_view, list_workbooks, refresh_extract |
| **Power BI** | refresh_dataset, get_report, list_dashboards |

---

### Storage (7 providers)

File storage and management.

| Provider | Key Operations |
|----------|----------------|
| **AWS S3** | upload_file, download_file, list_objects, delete_object |
| **Google Cloud Storage** | upload_file, download_file, list_files |
| **Dropbox** | upload_file, download_file, create_folder |
| **Google Drive** | upload_file, list_files, share_file |
| **Box** | upload_file, list_files, create_folder |

**AWS S3 Example:**

```typescript
{
  provider: "aws_s3",
  operation: "upload_file",
  parameters: {
    bucket: "{{config.bucket}}",
    key: "exports/{{filename}}.pdf",
    body: "{{pdf_content}}",
    content_type: "application/pdf",
    acl: "private"
  }
}
```

---

### AI & ML (12 providers)

External AI/ML service integrations.

| Provider | Use Case |
|----------|----------|
| **OpenAI** | GPT models, DALL-E, Whisper |
| **Anthropic** | Claude models |
| **Google** | Gemini, Vertex AI |
| **ElevenLabs** | Voice synthesis |
| **Replicate** | Various ML models |
| **Stability AI** | Stable Diffusion |

---

## Trigger Node

Start workflows from external events.

```typescript
{
  providerId: "shopify",
  eventId: "order_created",
  connectionId: "conn_shopify"
}
```

### Event Examples

| Provider | Events |
|----------|--------|
| Shopify | order_created, product_updated, inventory_changed |
| Stripe | payment_succeeded, subscription_created, refund_created |
| GitHub | push, pull_request, issue_created |
| Slack | message_received, reaction_added, channel_created |

---

## File Operations Node

Manage files in connected storage.

### Operations

| Operation | Description |
|-----------|-------------|
| `read` | Read file contents |
| `write` | Write content to file |
| `delete` | Delete a file |
| `list` | List files in directory |
| `exists` | Check if file exists |

```typescript
{
  operation: "write",
  path: "exports/{{report.id}}.json",
  content: "{{report_data}}",
  encoding: "utf-8"
}
```

---

## Best Practices

### Connection Management

- Use separate connections for different environments (dev/prod)
- Rotate credentials regularly
- Use least-privilege permissions
- Monitor connection health

### Error Handling

- Check for rate limiting
- Implement retries for transient errors
- Log failures for debugging
- Have fallback paths

### Performance

- Batch operations when possible
- Cache frequently used data
- Use webhooks instead of polling
- Respect rate limits

### Security

- Store credentials securely
- Use OAuth when available
- Audit integration access
- Remove unused connections
