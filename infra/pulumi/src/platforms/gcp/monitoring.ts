import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig, resourceName } from "../../utils/config";

// Create notification channel for alerts (email)
export const emailNotificationChannel = new gcp.monitoring.NotificationChannel(
    resourceName("email-alerts"),
    {
        displayName: `${infrastructureConfig.appName} Email Alerts`,
        type: "email",
        labels: {
            email_address: `ops@${infrastructureConfig.domain}`
        },
        enabled: true
    }
);

// Alert policy: API server error rate
export const apiErrorRateAlert = new gcp.monitoring.AlertPolicy(resourceName("api-error-rate"), {
    displayName: "API Server Error Rate High",
    combiner: "OR",
    conditions: [
        {
            displayName: "Error rate > 5%",
            conditionThreshold: {
                filter: pulumi.interpolate`resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND resource.labels.container_name="api" AND metric.type="kubernetes.io/container/restart_count"`,
                aggregations: [
                    {
                        alignmentPeriod: "300s",
                        perSeriesAligner: "ALIGN_DELTA",
                        crossSeriesReducer: "REDUCE_SUM",
                        groupByFields: ["resource.namespace_name"]
                    }
                ],
                comparison: "COMPARISON_GT",
                thresholdValue: 3,
                duration: "300s"
            }
        }
    ],
    notificationChannels: [emailNotificationChannel.id],
    alertStrategy: {
        autoClose: "604800s" // 7 days
    },
    enabled: true
});

// Alert policy: Database CPU utilization
export const dbCpuAlert = new gcp.monitoring.AlertPolicy(resourceName("db-cpu"), {
    displayName: "Database CPU Utilization High",
    combiner: "OR",
    conditions: [
        {
            displayName: "CPU utilization > 80%",
            conditionThreshold: {
                filter: pulumi.interpolate`resource.type="cloudsql_database" AND resource.labels.database_id="${infrastructureConfig.project}:${resourceName("db")}" AND metric.type="cloudsql.googleapis.com/database/cpu/utilization"`,
                aggregations: [
                    {
                        alignmentPeriod: "300s",
                        perSeriesAligner: "ALIGN_MEAN"
                    }
                ],
                comparison: "COMPARISON_GT",
                thresholdValue: 0.8,
                duration: "300s"
            }
        }
    ],
    notificationChannels: [emailNotificationChannel.id],
    enabled: true
});

// Uptime check: API health endpoint
export const apiUptimeCheck = new gcp.monitoring.UptimeCheckConfig(resourceName("api-uptime"), {
    displayName: "API Server Health Check",
    timeout: "10s",
    period: "60s",
    httpCheck: {
        path: "/health",
        port: 443,
        useSsl: true,
        validateSsl: true
    },
    monitoredResource: {
        type: "uptime_url",
        labels: {
            project_id: infrastructureConfig.project,
            host: `api.${infrastructureConfig.domain}`
        }
    }
});

// Uptime check: Frontend
export const frontendUptimeCheck = new gcp.monitoring.UptimeCheckConfig(
    resourceName("frontend-uptime"),
    {
        displayName: "Frontend Health Check",
        timeout: "10s",
        period: "60s",
        httpCheck: {
            path: "/",
            port: 443,
            useSsl: true,
            validateSsl: true
        },
        monitoredResource: {
            type: "uptime_url",
            labels: {
                project_id: infrastructureConfig.project,
                host: `app.${infrastructureConfig.domain}`
            }
        }
    }
);

// Dashboard for application monitoring
export const dashboard = new gcp.monitoring.Dashboard(resourceName("dashboard"), {
    dashboardJson: JSON.stringify({
        displayName: `FlowMaestro ${infrastructureConfig.environment}`,
        mosaicLayout: {
            columns: 12,
            tiles: [
                {
                    width: 6,
                    height: 4,
                    widget: {
                        title: "API Server CPU Usage",
                        xyChart: {
                            dataSets: [
                                {
                                    timeSeriesQuery: {
                                        timeSeriesFilter: {
                                            filter: 'resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND resource.labels.container_name="api" AND metric.type="kubernetes.io/container/cpu/core_usage_time"',
                                            aggregation: {
                                                alignmentPeriod: "60s",
                                                perSeriesAligner: "ALIGN_RATE",
                                                crossSeriesReducer: "REDUCE_SUM"
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    width: 6,
                    height: 4,
                    xPos: 6,
                    widget: {
                        title: "Database Connections",
                        xyChart: {
                            dataSets: [
                                {
                                    timeSeriesQuery: {
                                        timeSeriesFilter: {
                                            filter: 'resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/postgresql/num_backends"',
                                            aggregation: {
                                                alignmentPeriod: "60s",
                                                perSeriesAligner: "ALIGN_MEAN"
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    width: 6,
                    height: 4,
                    xPos: 6,
                    yPos: 4,
                    widget: {
                        title: "GKE Memory Utilization",
                        xyChart: {
                            dataSets: [
                                {
                                    timeSeriesQuery: {
                                        timeSeriesFilter: {
                                            filter: 'resource.type="k8s_container" AND resource.labels.namespace_name="flowmaestro" AND metric.type="kubernetes.io/container/memory/used_bytes"',
                                            aggregation: {
                                                alignmentPeriod: "60s",
                                                perSeriesAligner: "ALIGN_MEAN",
                                                crossSeriesReducer: "REDUCE_MEAN",
                                                groupByFields: ["resource.container_name"]
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        }
    })
});

// Export monitoring outputs
export const monitoringOutputs = {
    emailNotificationChannelId: emailNotificationChannel.id,
    apiErrorRateAlertId: apiErrorRateAlert.id,
    dbCpuAlertId: dbCpuAlert.id,
    apiUptimeCheckId: apiUptimeCheck.id,
    frontendUptimeCheckId: frontendUptimeCheck.id,
    dashboardId: dashboard.id
};
