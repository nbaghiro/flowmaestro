---
sidebar_position: 4
title: Workflow Execution
---

# Workflow Execution

Learn how FlowMaestro executes your workflows and how to monitor them.

## Execution Flow

1. **Trigger fires** — An event starts the workflow
2. **Nodes execute** — Each node runs in order
3. **Data flows** — Output from one node becomes input for the next
4. **Completion** — The workflow finishes or returns output

## Execution Modes

### Manual Execution

Run workflows on-demand from the canvas or API.

### Triggered Execution

Workflows run automatically when their trigger fires.

### Scheduled Execution

Set up cron-based schedules to run workflows periodically.

## Monitoring Executions

### Run Log

View all workflow executions with:

- Start time and duration
- Status (success, failed, running)
- Input and output data
- Error details if failed

### Real-time View

Watch workflows execute step-by-step on the canvas with live data inspection.

## Error Handling

:::warning
Workflows will stop at the first error unless you add error handling.
:::

Handle errors by:

- Adding **Error Handler** nodes
- Configuring **retry policies** on individual nodes
- Setting up **alerts** for failed executions

## Execution Limits

| Resource                  | Limit         |
| ------------------------- | ------------- |
| Max execution time        | 30 minutes    |
| Max nodes per workflow    | 500           |
| Max concurrent executions | Based on plan |
