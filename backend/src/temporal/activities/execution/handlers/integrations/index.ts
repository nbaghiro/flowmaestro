/**
 * Integrations Execution Module
 *
 * Barrel exports for all integration node executors and handlers.
 */

// HTTP
export {
    executeHTTPNode,
    HTTPNodeHandler,
    createHTTPNodeHandler,
    type HTTPNodeConfig,
    type HTTPNodeResult
} from "./http";

// Code
export {
    executeCodeNode,
    CodeNodeHandler,
    createCodeNodeHandler,
    type CodeNodeConfig,
    type CodeNodeResult
} from "./code";

// Database
export {
    executeDatabaseNode,
    closeDatabaseConnections,
    DatabaseNodeHandler,
    createDatabaseNodeHandler,
    type DatabaseNodeConfig,
    type DatabaseNodeResult
} from "./database";

// File Operations
export {
    executeFileOperationsNode,
    FileOperationsNodeHandler,
    createFileOperationsNodeHandler,
    type FileOperationsNodeConfig,
    type FileOperationsNodeResult
} from "./file";

// Integration
export {
    executeIntegrationNode,
    IntegrationNodeHandler,
    createIntegrationNodeHandler,
    type IntegrationNodeConfig,
    type IntegrationNodeResult
} from "./integration";

// Knowledge Base Query
export {
    executeKnowledgeBaseQueryNode,
    KnowledgeBaseQueryNodeHandler,
    createKnowledgeBaseQueryNodeHandler,
    type KnowledgeBaseQueryNodeConfig,
    type KnowledgeBaseQueryNodeResult
} from "./kb-query";
