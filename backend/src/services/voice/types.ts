import type { VoiceSessionState, VoiceServerMessage } from "@flowmaestro/shared";
import type WebSocket from "ws";

/**
 * Internal voice session context
 */
export interface VoiceSessionContext {
    sessionId: string;
    agentId: string;
    threadId: string;
    userId: string;
    workspaceId: string;
    state: VoiceSessionState;
    createdAt: Date;
}

/**
 * Voice session event handlers
 */
export interface VoiceSessionEventHandlers {
    onTranscript: (text: string, isFinal: boolean) => void;
    onAgentThinking: () => void;
    onAgentSpeaking: () => void;
    onAudioChunk: (data: string) => void;
    onAgentDone: () => void;
    onError: (message: string, code?: string) => void;
    onStateChange: (state: VoiceSessionState) => void;
}

/**
 * WebSocket connection wrapper with metadata
 */
export interface VoiceWebSocketConnection {
    socket: WebSocket;
    sessionId: string;
    userId: string;
    agentId?: string;
    threadId?: string;
    isAlive: boolean;
}

/**
 * Send a message to WebSocket connection
 */
export function sendVoiceMessage(socket: WebSocket, message: VoiceServerMessage): void {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}
