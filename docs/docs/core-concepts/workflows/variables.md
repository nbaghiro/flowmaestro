---
sidebar_position: 5
title: Variables
---

# Variables

Variables are how data flows through your workflows.

## How Variables Work

Each node in a workflow can:

- **Read** variables from previous nodes
- **Write** new variables for subsequent nodes

## Referencing Variables

Use double curly braces to reference variables:

```
{{trigger.body.message}}
{{node_1.output.result}}
{{env.API_KEY}}
```

## Variable Types

### Trigger Variables

Data from the trigger that started the workflow:

```javascript
{
    {
        trigger.body;
    }
} // Request body (webhooks)
{
    {
        trigger.headers;
    }
} // Request headers
{
    {
        trigger.params;
    }
} // URL parameters
```

### Node Output Variables

Output from previous nodes:

```javascript
{
    {
        node_name.output;
    }
} // Full output
{
    {
        node_name.output.field;
    }
} // Specific field
{
    {
        node_name.output[0];
    }
} // Array index
```

### Environment Variables

Secure variables set at the workflow level:

```javascript
{
    {
        env.API_KEY;
    }
}
{
    {
        env.DATABASE_URL;
    }
}
```

## JavaScript Expressions

Use JavaScript for complex transformations:

```javascript
{
    {
        trigger.body.items.map((item) => item.name).join(", ");
    }
}
{
    {
        new Date().toISOString();
    }
}
{
    {
        Math.round(node_1.output.price * 1.1);
    }
}
```

:::tip
Press **Cmd/Ctrl + Space** in any variable field to see available variables.
:::
