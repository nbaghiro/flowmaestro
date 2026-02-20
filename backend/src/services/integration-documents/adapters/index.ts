/**
 * Document Adapters
 *
 * Adapters that normalize provider-specific document operations
 */

export type { DocumentAdapter } from "./DocumentAdapter";
export { BaseDocumentAdapter } from "./DocumentAdapter";
export { BinaryFileAdapter, createBinaryFileAdapter } from "./BinaryFileAdapter";
export {
    StructuredContentAdapter,
    createStructuredContentAdapter
} from "./StructuredContentAdapter";
export { AdapterFactory } from "./AdapterFactory";
