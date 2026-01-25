/**
 * Datadog Operation Types
 *
 * Type definitions used across Datadog operations
 */

export interface DatadogMetricSeriesOutput {
    metric: string;
    displayName: string;
    points: Array<{ timestamp: number; value: number }>;
    unit?: string;
    scope: string;
    expression: string;
}

export interface DatadogMonitorOutput {
    id: number;
    name: string;
    type: string;
    query: string;
    message: string;
    tags: string[];
    priority?: number;
    overallState?: string;
    createdAt?: string;
    modifiedAt?: string;
}

export interface DatadogEventOutput {
    id: number;
    title: string;
    text: string;
    dateHappened?: number;
    priority: string;
    host?: string;
    tags: string[];
    alertType: string;
}

export interface DatadogIncidentOutput {
    id: string;
    title: string;
    customerImpactScope?: string;
    customerImpacted?: boolean;
    severity?: string;
    state?: string;
    detected?: string;
    created?: string;
    modified?: string;
    resolved?: string;
}
