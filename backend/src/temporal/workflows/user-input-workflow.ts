import { condition, defineSignal, defineQuery, setHandler } from "@temporalio/workflow";
import { createWorkflowLogger } from "../shared/workflow-logger";

export interface UserInputWorkflowInput {
    executionId: string;
    nodeId: string;
    prompt: string;
    inputType: string;
    validation?: Record<string, unknown>;
    timeoutMs?: number;
}

export interface UserInputWorkflowResult {
    success: boolean;
    userResponse?: string;
    timedOut?: boolean;
    error?: string;
}

// Define signal for receiving user input
export const userInputSignal = defineSignal<[string]>("userInput");

// Define query for checking if input has been received
export const hasReceivedInputQuery = defineQuery<boolean>("hasReceivedInput");

/**
 * User Input Workflow
 *
 * Pauses workflow execution and waits for user input via a signal.
 * Supports timeout to prevent workflows from hanging indefinitely.
 */
export async function userInputWorkflow(
    input: UserInputWorkflowInput
): Promise<UserInputWorkflowResult> {
    const { executionId, nodeId, prompt, timeoutMs = 300000 } = input; // 5 min default timeout
    const wfLogger = createWorkflowLogger({
        executionId,
        workflowName: "UserInput",
        nodeId
    });

    wfLogger.info("Waiting for user input", { prompt, timeoutMs });

    let userResponse: string | undefined;
    let hasReceivedInput = false;

    // Set up signal handler
    setHandler(userInputSignal, (response: string) => {
        wfLogger.info("Received user input");
        userResponse = response;
        hasReceivedInput = true;
    });

    // Set up query handler
    setHandler(hasReceivedInputQuery, () => hasReceivedInput);

    // Wait for signal with timeout
    const timedOut = !(await condition(() => hasReceivedInput, timeoutMs));

    if (timedOut) {
        wfLogger.warn("User input timed out", { timeoutMs });
        return {
            success: false,
            timedOut: true,
            error: `User input timed out after ${timeoutMs}ms`
        };
    }

    return {
        success: true,
        userResponse
    };
}
