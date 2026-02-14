/**
 * Document Processing Activities
 *
 * Unified activities for processing documents across different storage targets:
 * - Knowledge Base
 * - Form Submission
 * - Chat Interface
 */

// Types
export * from "./types";

// Activities
export { extractDocumentText } from "./extract";
export { chunkDocumentText } from "./chunk";
export { generateAndStoreChunks } from "./embed-store";
export { completeDocumentProcessing } from "./complete";
