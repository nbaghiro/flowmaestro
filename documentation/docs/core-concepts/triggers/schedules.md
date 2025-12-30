---
sidebar_position: 3
title: Schedules
---

# Schedules

Run workflows automatically at specified times.

## Preset Frequencies

- Every minute
- Every hour
- Every day at specific time
- Every week on specific days
- Every month on specific date

## Cron Expressions

```bash
# Format: minute hour day month weekday

0 9 * * 1-5     # 9 AM, Monday-Friday
0 0 1 * *       # Midnight, 1st of each month
*/15 * * * *    # Every 15 minutes
0 8,12,18 * * * # 8 AM, 12 PM, 6 PM daily
```

## Schedule Data

```javascript
{
    {
        trigger.scheduledTime;
    }
} // When it was scheduled to run
{
    {
        trigger.executionTime;
    }
} // Actual execution time
{
    {
        trigger.timezone;
    }
} // Configured timezone
```

:::warning
Be mindful of execution limits. Running workflows every minute can quickly consume your quota.
:::

:::tip
Use schedules for daily reports, periodic data syncs, cleanup tasks, and reminder notifications.
:::
