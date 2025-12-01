import { EventEmitter as NodeEventEmitter } from "events";
import type {
    WebSocketEvent,
    WebSocketEventType,
    JsonObject,
    JsonValue
} from "@flowmaestro/shared";

type EventHandler = (event: WebSocketEvent) => void;

export class WorkflowEventEmitter {
    private emitter: NodeEventEmitter;

    constructor() {
        this.emitter = new NodeEventEmitter();
        this.emitter.setMaxListeners(100); // Support many concurrent executions
    }

    emit(type: WebSocketEventType, data: JsonObject): void {
        const event = {
            type,
            timestamp: Date.now(),
            ...data
        } as WebSocketEvent;

        // Emit to specific execution listeners
        if (data.executionId) {
            this.emitter.emit(`execution:${data.executionId}`, event);
        }

        // Emit to general listeners
        this.emitter.emit(type, event);
    }

    on(event: WebSocketEventType | string, handler: EventHandler): void {
        this.emitter.on(event, handler);
    }

    once(event: WebSocketEventType | string, handler: EventHandler): void {
        this.emitter.once(event, handler);
    }

    off(event: WebSocketEventType | string, handler: EventHandler): void {
        this.emitter.off(event, handler);
    }

    removeAllListeners(event?: WebSocketEventType | string): void {
        if (event) {
            this.emitter.removeAllListeners(event);
        } else {
            this.emitter.removeAllListeners();
        }
    }

    // Convenience methods for common events
    emitExecutionStarted(executionId: string, workflowName: string, totalNodes: number): void {
        this.emit("execution:started", {
            executionId,
            workflowName,
            totalNodes
        });
    }

    emitExecutionProgress(
        executionId: string,
        completed: number,
        total: number,
        percentage: number
    ): void {
        this.emit("execution:progress", {
            executionId,
            completed,
            total,
            percentage
        });
    }

    emitExecutionCompleted(executionId: string, outputs: JsonObject, duration: number): void {
        this.emit("execution:completed", {
            executionId,
            status: "completed",
            outputs,
            duration
        });
    }

    emitExecutionFailed(executionId: string, error: string, failedNodeId?: string): void {
        this.emit("execution:failed", {
            executionId,
            status: "failed",
            error,
            ...(failedNodeId && { failedNodeId })
        });
    }

    emitNodeStarted(executionId: string, nodeId: string, nodeName: string, nodeType: string): void {
        this.emit("node:started", {
            executionId,
            nodeId,
            nodeName,
            nodeType
        });
    }

    emitNodeCompleted(
        executionId: string,
        nodeId: string,
        output: JsonValue,
        duration: number,
        metadata?: JsonObject
    ): void {
        this.emit("node:completed", {
            executionId,
            nodeId,
            output,
            duration,
            ...(metadata && { metadata })
        });
    }

    emitNodeFailed(executionId: string, nodeId: string, error: string): void {
        this.emit("node:failed", {
            executionId,
            nodeId,
            error
        });
    }

    emitNodeRetry(
        executionId: string,
        nodeId: string,
        attempt: number,
        nextRetryIn: number,
        error: string
    ): void {
        this.emit("node:retry", {
            executionId,
            nodeId,
            attempt,
            nextRetryIn,
            error
        });
    }

    emitNodeStream(executionId: string, nodeId: string, chunk: string): void {
        this.emit("node:stream", {
            executionId,
            nodeId,
            chunk
        });
    }

    emitUserInputRequired(
        executionId: string,
        nodeId: string,
        prompt: string,
        inputType: string,
        validation?: JsonValue
    ): void {
        this.emit("user:input:required", {
            executionId,
            nodeId,
            prompt,
            inputType,
            ...(validation && { validation })
        });
    }

    // Knowledge Base events
    emitDocumentProcessing(
        knowledgeBaseId: string,
        documentId: string,
        documentName: string
    ): void {
        this.emit("kb:document:processing", {
            knowledgeBaseId,
            documentId,
            documentName
        });
    }

    emitDocumentCompleted(knowledgeBaseId: string, documentId: string, chunkCount: number): void {
        this.emit("kb:document:completed", {
            knowledgeBaseId,
            documentId,
            chunkCount
        });
    }

    emitDocumentFailed(knowledgeBaseId: string, documentId: string, error: string): void {
        this.emit("kb:document:failed", {
            knowledgeBaseId,
            documentId,
            error
        });
    }

    // Call events
    emitCallIncoming(
        callExecutionId: string,
        callerNumber: string,
        calledNumber: string,
        userId?: string
    ): void {
        this.emit("call:incoming", {
            callExecutionId,
            callerNumber,
            calledNumber,
            ...(userId && { userId })
        });
    }

    emitCallRinging(callExecutionId: string, callerNumber: string): void {
        this.emit("call:ringing", {
            callExecutionId,
            callerNumber
        });
    }

    emitCallActive(callExecutionId: string, executionId: string, answeredAt: number): void {
        this.emit("call:active", {
            callExecutionId,
            executionId,
            answeredAt
        });
    }

    emitCallTranscript(
        callExecutionId: string,
        speaker: string,
        text: string,
        isFinal: boolean,
        confidence?: number
    ): void {
        this.emit("call:transcript", {
            callExecutionId,
            speaker,
            text,
            isFinal,
            ...(confidence !== undefined && { confidence })
        });
    }

    emitCallEnded(
        callExecutionId: string,
        duration: number,
        status: string,
        hangupCause?: string,
        recordingUrl?: string
    ): void {
        this.emit("call:ended", {
            callExecutionId,
            duration,
            status,
            ...(hangupCause && { hangupCause }),
            ...(recordingUrl && { recordingUrl })
        });
    }

    emitCallError(callExecutionId: string, error: string, errorCode?: string): void {
        this.emit("call:error", {
            callExecutionId,
            error,
            ...(errorCode && { errorCode })
        });
    }
}

// Global singleton instance
export const globalEventEmitter = new WorkflowEventEmitter();
