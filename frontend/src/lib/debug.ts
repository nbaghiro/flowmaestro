/**
 * Debug namespace for easy access to app state in development.
 *
 * Access in browser console via `window.debug` or just `debug`.
 *
 * Examples:
 *   debug.userId        - Get current user ID
 *   debug.workspaceId   - Get current workspace ID
 *   debug.user          - Get full user object
 *   debug.workspace     - Get full workspace object
 *   debug.workflow      - Get workflow nodes and edges
 *   debug.printWorkflow() - Pretty print workflow JSON
 *   debug.agent         - Get current agent
 *   debug.thread        - Get current thread
 */

/* eslint-disable no-console */

import { useAgentStore } from "../stores/agentStore";
import { useAuthStore } from "../stores/authStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

export interface DebugNamespace {
    // Quick accessors for common IDs
    readonly userId: string | null;
    readonly workspaceId: string | null;
    readonly workflowId: string | null;
    readonly agentId: string | null;
    readonly threadId: string | null;
    readonly executionId: string | null;

    // Full objects
    readonly user: ReturnType<typeof useAuthStore.getState>["user"];
    readonly workspace: ReturnType<typeof useWorkspaceStore.getState>["currentWorkspace"];
    readonly workflow: {
        nodes: ReturnType<typeof useWorkflowStore.getState>["nodes"];
        edges: ReturnType<typeof useWorkflowStore.getState>["edges"];
        validation: ReturnType<typeof useWorkflowStore.getState>["workflowValidation"];
    };
    readonly agent: ReturnType<typeof useAgentStore.getState>["currentAgent"];
    readonly thread: ReturnType<typeof useAgentStore.getState>["currentThread"];
    readonly execution: ReturnType<typeof useWorkflowStore.getState>["currentExecution"];

    // Store accessors for full state
    readonly stores: {
        auth: ReturnType<typeof useAuthStore.getState>;
        workspace: ReturnType<typeof useWorkspaceStore.getState>;
        workflow: ReturnType<typeof useWorkflowStore.getState>;
        agent: ReturnType<typeof useAgentStore.getState>;
    };

    // Helper methods
    readonly help: void;
    printWorkflow: () => void;
    printUser: () => void;
    printWorkspace: () => void;
    printAgent: () => void;
    printExecution: () => void;
    printAll: () => void;
    copyWorkflow: () => void;
    copyIds: () => void;
}

function createDebugNamespace(): DebugNamespace {
    return {
        // Quick ID accessors
        get userId() {
            return useAuthStore.getState().user?.id ?? null;
        },
        get workspaceId() {
            return useWorkspaceStore.getState().currentWorkspace?.id ?? null;
        },
        get workflowId() {
            return useWorkflowStore.getState().currentWorkflowId;
        },
        get agentId() {
            return useAgentStore.getState().currentAgent?.id ?? null;
        },
        get threadId() {
            return useAgentStore.getState().currentThread?.id ?? null;
        },
        get executionId() {
            return useWorkflowStore.getState().currentExecution?.id ?? null;
        },

        // Full objects
        get user() {
            return useAuthStore.getState().user;
        },
        get workspace() {
            return useWorkspaceStore.getState().currentWorkspace;
        },
        get workflow() {
            const state = useWorkflowStore.getState();
            return {
                nodes: state.nodes,
                edges: state.edges,
                validation: state.workflowValidation
            };
        },
        get agent() {
            return useAgentStore.getState().currentAgent;
        },
        get thread() {
            return useAgentStore.getState().currentThread;
        },
        get execution() {
            return useWorkflowStore.getState().currentExecution;
        },

        // Full store access
        get stores() {
            return {
                auth: useAuthStore.getState(),
                workspace: useWorkspaceStore.getState(),
                workflow: useWorkflowStore.getState(),
                agent: useAgentStore.getState()
            };
        },

        // Helper methods
        get help() {
            console.log(
                "%c  ___ _                              _            \n" +
                    " | __| |_____ __ ___ __  __ _ ___ __| |_ _ _ ___  \n" +
                    " | _|| / _ \\ V  V / '  \\/ _` / -_|_-<  _| '_/ _ \\ \n" +
                    " |_| |_\\___/\\_/\\_/|_|_|_\\__,_\\___/__/\\__|_| \\___/ %cDEBUG v1.0\n",
                "color: #8b5cf6; font-family: monospace; font-size: 11px",
                "color: #6366f1; font-family: monospace; font-size: 11px"
            );
            console.log(
                "%c--- Quick Access ---------------------------------------------------%c\n" +
                    "  debug.userId        %c-> current user ID\n" +
                    "  %cdebug.workspaceId   %c-> current workspace ID\n" +
                    "  %cdebug.workflowId    %c-> current workflow ID (in flow builder)\n" +
                    "  %cdebug.agentId       %c-> current agent ID\n" +
                    "  %cdebug.threadId      %c-> current thread ID\n" +
                    "  %cdebug.executionId   %c-> current execution ID\n",
                "color: #3b82f6; font-weight: bold",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280"
            );
            console.log(
                "%c--- Objects --------------------------------------------------------%c\n" +
                    "  debug.user          %c-> full user object\n" +
                    "  %cdebug.workspace     %c-> full workspace object\n" +
                    "  %cdebug.workflow      %c-> { nodes, edges, validation }\n" +
                    "  %cdebug.agent         %c-> current agent object\n" +
                    "  %cdebug.thread        %c-> current thread object\n" +
                    "  %cdebug.execution     %c-> current execution state\n" +
                    "  %cdebug.stores        %c-> all Zustand stores (auth, workspace, workflow, agent)\n",
                "color: #10b981; font-weight: bold",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280"
            );
            console.log(
                "%c--- Methods --------------------------------------------------------%c\n" +
                    "  debug.help             %c-> show this help menu\n" +
                    "  %cdebug.printAll()       %c-> print all state to console\n" +
                    "  %cdebug.printWorkflow()  %c-> print workflow nodes/edges as JSON\n" +
                    "  %cdebug.printUser()      %c-> print user data\n" +
                    "  %cdebug.printWorkspace() %c-> print workspace data\n" +
                    "  %cdebug.printAgent()     %c-> print agent & thread data\n" +
                    "  %cdebug.printExecution() %c-> print current execution state\n" +
                    "  %cdebug.copyWorkflow()   %c-> copy workflow JSON to clipboard\n" +
                    "  %cdebug.copyIds()        %c-> copy all IDs to clipboard\n",
                "color: #ec4899; font-weight: bold",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280",
                "color: #9ca3af",
                "color: #6b7280"
            );
            return undefined as void;
        },

        printWorkflow() {
            const state = useWorkflowStore.getState();
            const workflowData = {
                workflowId: state.currentWorkflowId,
                nodes: state.nodes.map((node) => ({
                    id: node.id,
                    type: node.type,
                    position: node.position,
                    data: node.data
                })),
                edges: state.edges.map((edge) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    sourceHandle: edge.sourceHandle,
                    targetHandle: edge.targetHandle
                })),
                validation: state.workflowValidation
                    ? {
                          isValid: state.workflowValidation.isValid,
                          summary: state.workflowValidation.summary
                      }
                    : null
            };
            console.log("%c[Workflow Data]", "color: #8b5cf6; font-weight: bold");
            console.log(JSON.stringify(workflowData, null, 2));
            return workflowData;
        },

        printUser() {
            const user = useAuthStore.getState().user;
            console.log("%c[User Data]", "color: #3b82f6; font-weight: bold");
            console.log(JSON.stringify(user, null, 2));
            return user;
        },

        printWorkspace() {
            const workspace = useWorkspaceStore.getState().currentWorkspace;
            const role = useWorkspaceStore.getState().currentRole;
            console.log("%c[Workspace Data]", "color: #10b981; font-weight: bold");
            console.log(JSON.stringify({ workspace, role }, null, 2));
            return { workspace, role };
        },

        printAgent() {
            const state = useAgentStore.getState();
            const agentData = {
                agent: state.currentAgent,
                thread: state.currentThread,
                executionId: state.currentExecutionId,
                executionStatus: state.currentExecutionStatus
            };
            console.log("%c[Agent Data]", "color: #f59e0b; font-weight: bold");
            console.log(JSON.stringify(agentData, null, 2));
            return agentData;
        },

        printExecution() {
            const execution = useWorkflowStore.getState().currentExecution;
            if (!execution) {
                console.log(
                    "%c[Execution]",
                    "color: #ef4444; font-weight: bold",
                    "No active execution"
                );
                return null;
            }
            // Convert Maps to objects for JSON serialization
            const executionData = {
                id: execution.id,
                status: execution.status,
                startedAt: execution.startedAt,
                completedAt: execution.completedAt,
                duration: execution.duration,
                triggerId: execution.triggerId,
                nodeStates: Object.fromEntries(execution.nodeStates),
                variables: Object.fromEntries(execution.variables),
                logs: execution.logs,
                pauseContext: execution.pauseContext
            };
            console.log("%c[Execution Data]", "color: #ef4444; font-weight: bold");
            console.log(JSON.stringify(executionData, null, 2));
            return executionData;
        },

        printAll() {
            console.log(
                "%c=== FlowMaestro Debug ===",
                "color: #ec4899; font-weight: bold; font-size: 14px"
            );
            console.log("");
            console.log("%c[IDs]", "color: #6366f1; font-weight: bold");
            console.table({
                userId: this.userId,
                workspaceId: this.workspaceId,
                workflowId: this.workflowId,
                agentId: this.agentId,
                threadId: this.threadId,
                executionId: this.executionId
            });
            console.log("");
            this.printUser();
            console.log("");
            this.printWorkspace();
            console.log("");
            this.printWorkflow();
            console.log("");
            this.printAgent();
            console.log("");
            this.printExecution();
        },

        copyWorkflow() {
            const state = useWorkflowStore.getState();
            const workflowData = {
                nodes: state.nodes,
                edges: state.edges
            };
            const json = JSON.stringify(workflowData, null, 2);
            navigator.clipboard.writeText(json).then(
                () =>
                    console.log(
                        "%cWorkflow JSON copied to clipboard!",
                        "color: #10b981; font-weight: bold"
                    ),
                (err) => console.error("Failed to copy:", err)
            );
        },

        copyIds() {
            const ids = {
                userId: this.userId,
                workspaceId: this.workspaceId,
                workflowId: this.workflowId,
                agentId: this.agentId,
                threadId: this.threadId,
                executionId: this.executionId
            };
            const json = JSON.stringify(ids, null, 2);
            navigator.clipboard.writeText(json).then(
                () =>
                    console.log("%cIDs copied to clipboard!", "color: #10b981; font-weight: bold"),
                (err) => console.error("Failed to copy:", err)
            );
        }
    };
}

// Extend the Window interface
declare global {
    interface Window {
        debug: DebugNamespace;
    }
}

/**
 * Initialize the debug namespace on the window object.
 * Only initializes in development mode.
 */
export function initDebug(): void {
    if (import.meta.env.DEV) {
        window.debug = createDebugNamespace();
        console.log(
            "%c[Debug] FlowMaestro debug namespace initialized. Type %cdebug.help%c for commands.",
            "color: #8b5cf6; font-style: italic",
            "color: #ec4899; font-weight: bold",
            "color: #8b5cf6; font-style: italic"
        );
    }
}
