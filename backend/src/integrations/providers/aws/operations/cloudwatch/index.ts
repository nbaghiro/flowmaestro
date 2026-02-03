/**
 * AWS CloudWatch Operations
 */

export { queryMetricsOperation, queryMetricsSchema, executeQueryMetrics } from "./queryMetrics";
export type { QueryMetricsParams } from "./queryMetrics";

export { putMetricDataOperation, putMetricDataSchema, executePutMetricData } from "./putMetricData";
export type { PutMetricDataParams } from "./putMetricData";

export { listAlarmsOperation, listAlarmsSchema, executeListAlarms } from "./listAlarms";
export type { ListAlarmsParams } from "./listAlarms";

export { queryLogsOperation, queryLogsSchema, executeQueryLogs } from "./queryLogs";
export type { QueryLogsParams } from "./queryLogs";

export { getLogEventsOperation, getLogEventsSchema, executeGetLogEvents } from "./getLogEvents";
export type { GetLogEventsParams } from "./getLogEvents";

export {
    getAlarmHistoryOperation,
    getAlarmHistorySchema,
    executeGetAlarmHistory
} from "./getAlarmHistory";
export type { GetAlarmHistoryParams } from "./getAlarmHistory";

export { setAlarmStateOperation, setAlarmStateSchema, executeSetAlarmState } from "./setAlarmState";
export type { SetAlarmStateParams } from "./setAlarmState";

export {
    createLogGroupOperation,
    createLogGroupSchema,
    executeCreateLogGroup
} from "./createLogGroup";
export type { CreateLogGroupParams } from "./createLogGroup";

export { putLogEventsOperation, putLogEventsSchema, executePutLogEvents } from "./putLogEvents";
export type { PutLogEventsParams } from "./putLogEvents";

export {
    describeLogStreamsOperation,
    describeLogStreamsSchema,
    executeDescribeLogStreams
} from "./describeLogStreams";
export type { DescribeLogStreamsParams } from "./describeLogStreams";
