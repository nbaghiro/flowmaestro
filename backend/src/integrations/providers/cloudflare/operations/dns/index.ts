/**
 * DNS operations
 */

export { listDnsRecordsOperation, executeListDnsRecords } from "./listDnsRecords";
export type { ListDnsRecordsParams } from "./listDnsRecords";

export { getDnsRecordOperation, executeGetDnsRecord } from "./getDnsRecord";
export type { GetDnsRecordParams } from "./getDnsRecord";

export { createDnsRecordOperation, executeCreateDnsRecord } from "./createDnsRecord";
export type { CreateDnsRecordParams } from "./createDnsRecord";

export { updateDnsRecordOperation, executeUpdateDnsRecord } from "./updateDnsRecord";
export type { UpdateDnsRecordParams } from "./updateDnsRecord";

export { deleteDnsRecordOperation, executeDeleteDnsRecord } from "./deleteDnsRecord";
export type { DeleteDnsRecordParams } from "./deleteDnsRecord";
