/**
 * Integrations Execution Module
 *
 * Barrel exports for integration node handlers.
 * Includes third-party service integrations and file storage.
 */

// File Operations (GCS, S3, etc.)
export {
    executeFileOperationsNode,
    FileOperationsNodeHandler,
    createFileOperationsNodeHandler,
    type FileOperationsNodeConfig,
    type FileOperationsNodeResult
} from "./file";

// Integration (third-party provider nodes)
export {
    executeIntegrationNode,
    IntegrationNodeHandler,
    createIntegrationNodeHandler,
    type IntegrationNodeConfig,
    type IntegrationNodeResult
} from "./integration";
