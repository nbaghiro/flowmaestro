/**
 * System Workflow Definitions
 *
 * Central export for all system workflow definitions.
 */

import { blogGenerationWorkflow } from "./blog-generation";
import { socialLinkedInPostingWorkflow } from "./social-linkedin-posting";
import { socialXPostingWorkflow } from "./social-x-posting";
import type { SystemWorkflowDefinition } from "../types";

export const allSystemWorkflows: SystemWorkflowDefinition[] = [
    blogGenerationWorkflow,
    socialXPostingWorkflow,
    socialLinkedInPostingWorkflow
];

export { blogGenerationWorkflow } from "./blog-generation";
export { socialXPostingWorkflow } from "./social-x-posting";
export { socialLinkedInPostingWorkflow } from "./social-linkedin-posting";
