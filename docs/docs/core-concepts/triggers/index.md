---
sidebar_position: 1
title: Triggers Overview
---

# Triggers

Triggers define when and how your workflows execute.

## Trigger Types

| Type          | Description                                   |
| ------------- | --------------------------------------------- |
| **Webhooks**  | HTTP endpoints that receive external requests |
| **Schedules** | Time-based execution with cron expressions    |
| **Events**    | React to platform and integration events      |

## Choosing a Trigger Type

| Trigger  | Best For                      | Example                               |
| -------- | ----------------------------- | ------------------------------------- |
| Webhook  | External systems pushing data | Form submission, payment notification |
| Schedule | Recurring tasks               | Daily reports, hourly syncs           |
| Event    | Real-time reactions           | New order, message received           |

## Trigger Data

All triggers provide data to your workflow:

```javascript
// Webhook trigger
{
    {
        trigger.body;
    }
} // Request body
{
    {
        trigger.headers;
    }
} // HTTP headers
{
    {
        trigger.method;
    }
} // GET, POST, etc.

// Schedule trigger
{
    {
        trigger.scheduledTime;
    }
} // When it was scheduled
{
    {
        trigger.executionTime;
    }
} // When it actually ran

// Event trigger
{
    {
        trigger.event;
    }
} // Event type
{
    {
        trigger.payload;
    }
} // Event data
```
