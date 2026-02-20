/**
 * Integration Documents Service
 *
 * Provides capability detection and document import from integration providers
 * into knowledge bases.
 */

export { CapabilityDetector, capabilityDetector } from "./CapabilityDetector";
export {
    IntegrationDocumentService,
    integrationDocumentService
} from "./IntegrationDocumentService";
export * from "./types";
export * from "./adapters";
