/**
 * Google Compute Engine Operations
 */

export { listInstancesOperation, listInstancesSchema, executeListInstances } from "./listInstances";
export type { ListInstancesParams } from "./listInstances";

export { getInstanceOperation, getInstanceSchema, executeGetInstance } from "./getInstance";
export type { GetInstanceParams } from "./getInstance";

export {
    createInstanceOperation,
    createInstanceSchema,
    executeCreateInstance
} from "./createInstance";
export type { CreateInstanceParams } from "./createInstance";

export { startInstanceOperation, startInstanceSchema, executeStartInstance } from "./startInstance";
export type { StartInstanceParams } from "./startInstance";

export { stopInstanceOperation, stopInstanceSchema, executeStopInstance } from "./stopInstance";
export type { StopInstanceParams } from "./stopInstance";

export {
    deleteInstanceOperation,
    deleteInstanceSchema,
    executeDeleteInstance
} from "./deleteInstance";
export type { DeleteInstanceParams } from "./deleteInstance";

export { resetInstanceOperation, resetInstanceSchema, executeResetInstance } from "./resetInstance";
export type { ResetInstanceParams } from "./resetInstance";

export {
    setInstanceMetadataOperation,
    setInstanceMetadataSchema,
    executeSetInstanceMetadata
} from "./setInstanceMetadata";
export type { SetInstanceMetadataParams } from "./setInstanceMetadata";

export {
    addInstanceTagsOperation,
    addInstanceTagsSchema,
    executeAddInstanceTags
} from "./addInstanceTags";
export type { AddInstanceTagsParams } from "./addInstanceTags";

export { attachDiskOperation, attachDiskSchema, executeAttachDisk } from "./attachDisk";
export type { AttachDiskParams } from "./attachDisk";
