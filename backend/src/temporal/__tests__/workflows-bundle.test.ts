/**
 * The worker loads workflows from workflows.bundle.ts only. A workflow that is defined
 * but not exported from there can be started by the api yet never executes (every
 * workflow task fails with an unknown workflow type), which is how the persona
 * workflow was silently dead. This pins the set of exported workflow functions.
 */
import * as bundle from "../workflows.bundle";

describe("workflows.bundle", () => {
    it.each([
        "orchestratorWorkflow",
        "agentOrchestratorWorkflow",
        "triggeredWorkflow",
        "processDocumentWorkflow",
        "personaOrchestratorWorkflow"
    ])("exports %s", (name) => {
        expect(typeof (bundle as Record<string, unknown>)[name]).toBe("function");
    });
});
