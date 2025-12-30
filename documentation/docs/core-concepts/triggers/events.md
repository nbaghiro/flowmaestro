---
sidebar_position: 4
title: Events
---

# Event Triggers

React to events from integrations and the platform.

## Integration Events

| Integration | Events                                    |
| ----------- | ----------------------------------------- |
| Shopify     | New order, Order updated, Product created |
| Slack       | Message received, Reaction added          |
| HubSpot     | Contact created, Deal updated             |
| WhatsApp    | Message received                          |
| Instagram   | Comment received, DM received             |

## Platform Events

- Workflow completed
- Agent conversation started
- Error occurred

## Event Data

```javascript
// Shopify new order
{
    {
        trigger.event;
    }
} // "shopify.order.created"
{
    {
        trigger.payload.orderId;
    }
} // Order ID
{
    {
        trigger.payload.customer;
    }
} // Customer details

// Slack message
{
    {
        trigger.event;
    }
} // "slack.message.received"
{
    {
        trigger.payload.text;
    }
} // Message content
{
    {
        trigger.payload.channel;
    }
} // Channel ID
```

## Event Filtering

Filter events to only trigger on specific conditions:

```javascript
// Only orders over $100
trigger.payload.total > 100;

// Only messages from specific channel
trigger.payload.channel === "C123456";
```
