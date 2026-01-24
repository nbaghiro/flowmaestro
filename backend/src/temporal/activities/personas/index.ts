/**
 * Persona Activities Index
 * All persona-related Temporal activities for background execution
 */

export {
    // Config
    getPersonaConfig,
    type GetPersonaConfigInput,
    // Progress tracking
    updatePersonaInstanceProgress,
    type UpdatePersonaInstanceProgressInput,
    // Status updates
    updatePersonaInstanceStatus,
    type UpdatePersonaInstanceStatusInput,
    // Clarification phase
    getPersonaClarificationState,
    type GetPersonaClarificationStateInput,
    type PersonaClarificationState,
    updatePersonaClarificationState,
    type UpdatePersonaClarificationStateInput,
    // Messages
    addPersonaMessage,
    type AddPersonaMessageInput
} from "./persona";
