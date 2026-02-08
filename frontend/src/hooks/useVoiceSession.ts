import { useState, useEffect, useRef, useCallback } from "react";
import type {
    VoiceClientMessage,
    VoiceServerMessage,
    VoiceSessionState
} from "@flowmaestro/shared";
import { AudioCapture } from "../lib/audio/AudioCapture";
import { AudioPlayback } from "../lib/audio/AudioPlayback";
import { logger } from "../lib/logger";
import { getCurrentWorkspaceId } from "../stores/workspaceStore";

/**
 * Voice session hook configuration
 */
export interface UseVoiceSessionConfig {
    agentId: string;
    threadId: string;
    autoConnect?: boolean;
    /** Called when agent execution starts with the user's voice message */
    onExecutionStarted?: (data: {
        executionId: string;
        threadId: string;
        userMessage: string;
    }) => void;
    /** Called for each token of the agent's response */
    onAgentToken?: (token: string) => void;
    /** Called when agent response is complete */
    onAgentDone?: () => void;
}

/**
 * Voice session hook return type
 */
export interface UseVoiceSessionReturn {
    // Connection state
    isConnected: boolean;
    isConnecting: boolean;
    sessionState: VoiceSessionState;
    error: string | null;

    // Recording state
    isRecording: boolean;

    // Playback state
    isPlaying: boolean;

    // Transcript
    transcript: string;
    isInterimTranscript: boolean;

    // Actions
    connect: () => Promise<void>;
    disconnect: () => void;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    interrupt: () => void;
}

/**
 * Hook for managing voice chat session
 */
export function useVoiceSession(config: UseVoiceSessionConfig): UseVoiceSessionReturn {
    const {
        agentId,
        threadId,
        autoConnect = false,
        onExecutionStarted,
        onAgentToken,
        onAgentDone
    } = config;

    // Connection state
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [sessionState, setSessionState] = useState<VoiceSessionState>("initializing");
    const [error, setError] = useState<string | null>(null);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);

    // Transcript state
    const [transcript, setTranscript] = useState("");
    const [isInterimTranscript, setIsInterimTranscript] = useState(false);

    // Refs
    const socketRef = useRef<WebSocket | null>(null);
    const audioCaptureRef = useRef<AudioCapture | null>(null);
    const audioPlaybackRef = useRef<AudioPlayback | null>(null);

    // Callback refs - keep latest callbacks accessible without recreating handlers
    const onExecutionStartedRef = useRef(onExecutionStarted);
    const onAgentTokenRef = useRef(onAgentToken);
    const onAgentDoneRef = useRef(onAgentDone);

    // Update refs when callbacks change
    useEffect(() => {
        onExecutionStartedRef.current = onExecutionStarted;
    }, [onExecutionStarted]);

    useEffect(() => {
        onAgentTokenRef.current = onAgentToken;
    }, [onAgentToken]);

    useEffect(() => {
        onAgentDoneRef.current = onAgentDone;
    }, [onAgentDone]);

    /**
     * Get auth token from localStorage
     */
    const getAuthToken = useCallback((): string | null => {
        return localStorage.getItem("auth_token");
    }, []);

    /**
     * Handle WebSocket messages
     */
    const handleMessage = useCallback(
        (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data) as VoiceServerMessage;
                logger.debug("Voice WebSocket message received", { type: message.type });

                switch (message.type) {
                    case "session_ready":
                        setSessionState("ready");
                        setIsConnected(true);
                        setIsConnecting(false);
                        logger.info("Voice session ready");
                        break;

                    case "transcript":
                        setTranscript(message.text);
                        setIsInterimTranscript(!message.isFinal);
                        break;

                    case "execution_started":
                        // Notify parent component that execution started
                        // so it can display the user message and prepare for streaming
                        logger.info("Voice execution_started received", {
                            executionId: message.executionId,
                            threadId: message.threadId,
                            userMessage: message.userMessage,
                            hasCallback: !!onExecutionStartedRef.current
                        });
                        onExecutionStartedRef.current?.({
                            executionId: message.executionId,
                            threadId: message.threadId,
                            userMessage: message.userMessage
                        });
                        break;

                    case "agent_thinking":
                        setSessionState("processing");
                        break;

                    case "agent_speaking":
                        setSessionState("speaking");
                        setIsPlaying(true);
                        break;

                    case "agent_token":
                        // Forward token to parent for chat display
                        onAgentTokenRef.current?.(message.token);
                        break;

                    case "audio_chunk":
                        // Queue audio for playback
                        audioPlaybackRef.current?.queueAudio(message.data);
                        break;

                    case "agent_done":
                        setSessionState("ready");
                        setIsPlaying(false);
                        onAgentDoneRef.current?.();
                        break;

                    case "error":
                        setError(message.message);
                        setSessionState("error");
                        logger.error("Voice session error", { message: message.message });
                        break;
                }
            } catch (err) {
                logger.error("Failed to parse voice message", err);
            }
        },
        [] // Uses refs for callbacks so no dependencies needed
    );

    /**
     * Send message to WebSocket
     */
    const sendMessage = useCallback((message: VoiceClientMessage) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        }
    }, []);

    /**
     * Connect to voice WebSocket
     */
    const connect = useCallback(async () => {
        if (isConnected || isConnecting) {
            return;
        }

        const token = getAuthToken();
        if (!token) {
            setError("Not authenticated");
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Initialize audio playback
            audioPlaybackRef.current = new AudioPlayback();
            await audioPlaybackRef.current.initialize();
            audioPlaybackRef.current.setOnPlaybackStart(() => setIsPlaying(true));
            audioPlaybackRef.current.setOnPlaybackEnd(() => {
                setIsPlaying(false);
                setSessionState("ready");
            });

            // Create WebSocket connection
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsHost =
                import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, "") || "localhost:3001";
            const workspaceId = getCurrentWorkspaceId();
            if (!workspaceId) {
                setError("No workspace selected");
                setIsConnecting(false);
                return;
            }
            const wsUrl = `${wsProtocol}//${wsHost}/ws/voice?token=${encodeURIComponent(token)}&workspaceId=${encodeURIComponent(workspaceId)}`;

            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                logger.info("Voice WebSocket connected");
                // Send start_session message
                sendMessage({
                    type: "start_session",
                    agentId,
                    threadId
                });
            };

            socket.onmessage = handleMessage;

            socket.onerror = (event) => {
                logger.error("Voice WebSocket error", event);
                setError("Connection error");
                setIsConnecting(false);
            };

            socket.onclose = (event) => {
                logger.info("Voice WebSocket closed", { code: event.code, reason: event.reason });
                setIsConnected(false);
                setIsConnecting(false);
                setSessionState("closed");

                // Cleanup audio
                audioCaptureRef.current?.stop();
                audioPlaybackRef.current?.cleanup();
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Connection failed";
            setError(errorMessage);
            setIsConnecting(false);
            logger.error("Failed to connect voice session", err);
        }
    }, [agentId, threadId, isConnected, isConnecting, getAuthToken, handleMessage, sendMessage]);

    /**
     * Disconnect from voice WebSocket
     */
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            sendMessage({ type: "end_session" });
            socketRef.current.close();
            socketRef.current = null;
        }

        audioCaptureRef.current?.stop();
        audioPlaybackRef.current?.cleanup();

        setIsConnected(false);
        setIsRecording(false);
        setIsPlaying(false);
        setSessionState("closed");
    }, [sendMessage]);

    /**
     * Start recording audio
     */
    const startRecording = useCallback(async () => {
        if (!isConnected || isRecording) {
            return;
        }

        try {
            // Check if AudioCapture is supported
            if (!AudioCapture.isSupported()) {
                setError("Audio capture not supported in this browser");
                return;
            }

            // Initialize audio capture
            audioCaptureRef.current = new AudioCapture();

            // Start capturing and send audio chunks
            await audioCaptureRef.current.start((audioData) => {
                // Convert to base64 and send
                const base64 = btoa(String.fromCharCode(...new Uint8Array(audioData)));
                sendMessage({
                    type: "audio_chunk",
                    data: base64
                });
            });

            setIsRecording(true);
            setSessionState("listening");
            setTranscript("");
            logger.info("Voice recording started");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to start recording";
            setError(errorMessage);
            logger.error("Failed to start recording", err);
        }
    }, [isConnected, isRecording, sendMessage]);

    /**
     * Stop recording audio
     */
    const stopRecording = useCallback(() => {
        if (!isRecording) {
            return;
        }

        audioCaptureRef.current?.stop();
        sendMessage({ type: "stop_recording" });
        setIsRecording(false);
        logger.info("Voice recording stopped");
    }, [isRecording, sendMessage]);

    /**
     * Interrupt playback (barge-in)
     */
    const interrupt = useCallback(() => {
        if (!isPlaying) {
            return;
        }

        // Stop local playback
        audioPlaybackRef.current?.stop();

        // Notify server
        sendMessage({ type: "interrupt" });

        setIsPlaying(false);
        setSessionState("ready");
        logger.info("Playback interrupted");
    }, [isPlaying, sendMessage]);

    // Auto-connect if configured
    useEffect(() => {
        if (autoConnect && !isConnected && !isConnecting) {
            connect();
        }
    }, [autoConnect, isConnected, isConnecting, connect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        isConnecting,
        sessionState,
        error,
        isRecording,
        isPlaying,
        transcript,
        isInterimTranscript,
        connect,
        disconnect,
        startRecording,
        stopRecording,
        interrupt
    };
}
