import { Mic, MicOff, Volume2, VolumeX, Loader2, X } from "lucide-react";
import { useEffect, useCallback } from "react";
import { useVoiceSession } from "../../../hooks/useVoiceSession";
import { cn } from "../../../lib/utils";
import { Button } from "../../common/Button";

interface VoiceChatProps {
    agentId: string;
    threadId: string;
    onClose?: () => void;
    compact?: boolean;
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
 * Voice chat interface for real-time voice conversation with an agent
 */
export function VoiceChat({
    agentId,
    threadId,
    onClose,
    compact = false,
    onExecutionStarted,
    onAgentToken,
    onAgentDone
}: VoiceChatProps) {
    const {
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
    } = useVoiceSession({
        agentId,
        threadId,
        onExecutionStarted,
        onAgentToken,
        onAgentDone
    });

    // Auto-connect when component mounts
    useEffect(() => {
        if (!isConnected && !isConnecting) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, []);

    // Handle microphone button click
    const handleMicClick = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    // Handle interrupt button click
    const handleInterrupt = useCallback(() => {
        if (isPlaying) {
            interrupt();
        }
    }, [isPlaying, interrupt]);

    // Get status text
    const getStatusText = () => {
        if (error) return error;
        if (isConnecting) return "Connecting...";
        if (!isConnected) return "Disconnected";

        switch (sessionState) {
            case "initializing":
                return "Initializing...";
            case "ready":
                return isRecording ? "Listening..." : "Ready to listen";
            case "listening":
                return "Listening...";
            case "processing":
                return "Agent is thinking...";
            case "speaking":
                return "Agent is speaking...";
            case "interrupted":
                return "Interrupted";
            case "error":
                return error || "Error";
            case "closed":
                return "Session ended";
            default:
                return "Ready";
        }
    };

    // Get status color
    const getStatusColor = () => {
        if (error || sessionState === "error") return "text-red-500";
        if (isRecording || sessionState === "listening") return "text-green-500";
        if (isPlaying || sessionState === "speaking") return "text-primary";
        if (sessionState === "processing") return "text-yellow-500";
        return "text-muted-foreground";
    };

    // Compact mode - inline controls for input area
    if (compact) {
        return (
            <div className="flex items-center gap-3">
                {/* Microphone button */}
                <Button
                    variant={isRecording ? "destructive" : "primary"}
                    onClick={handleMicClick}
                    disabled={!isConnected || isPlaying || sessionState === "processing"}
                    className="w-12 h-12 rounded-full p-0 flex-shrink-0"
                >
                    {isConnecting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isRecording ? (
                        <MicOff className="w-5 h-5" />
                    ) : (
                        <Mic className="w-5 h-5" />
                    )}
                </Button>

                {/* Status and transcript */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {/* Status indicator dot */}
                        <div
                            className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                isRecording && "bg-green-500 animate-pulse",
                                isPlaying && "bg-primary animate-pulse",
                                sessionState === "processing" && "bg-yellow-500 animate-pulse",
                                !isRecording &&
                                    !isPlaying &&
                                    sessionState !== "processing" &&
                                    "bg-muted-foreground"
                            )}
                        />
                        <span className={cn("text-sm font-medium truncate", getStatusColor())}>
                            {getStatusText()}
                        </span>
                    </div>
                    {transcript && (
                        <p
                            className={cn(
                                "text-xs text-muted-foreground truncate mt-0.5",
                                isInterimTranscript && "opacity-70"
                            )}
                        >
                            {transcript}
                            {isInterimTranscript && "..."}
                        </p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Interrupt button (visible when playing) */}
                    {isPlaying && (
                        <Button
                            variant="secondary"
                            onClick={handleInterrupt}
                            className="w-10 h-10 rounded-full p-0"
                            title="Interrupt"
                        >
                            <VolumeX className="w-4 h-4" />
                        </Button>
                    )}

                    {/* Speaker indicator when playing */}
                    {isPlaying && (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                    )}

                    {/* Close button */}
                    {onClose && (
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="w-10 h-10 rounded-full p-0"
                            title="Back to text chat"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Full mode - centered layout
    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
            {/* Status indicator */}
            <div className="flex flex-col items-center space-y-2">
                <div
                    className={cn(
                        "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                        isRecording && "bg-green-500/20 animate-pulse",
                        isPlaying && "bg-primary/20 animate-pulse",
                        sessionState === "processing" && "bg-yellow-500/20",
                        !isRecording && !isPlaying && "bg-muted"
                    )}
                >
                    {isConnecting ? (
                        <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
                    ) : isPlaying ? (
                        <Volume2 className="w-10 h-10 text-primary" />
                    ) : isRecording ? (
                        <Mic className="w-10 h-10 text-green-500" />
                    ) : (
                        <MicOff className="w-10 h-10 text-muted-foreground" />
                    )}
                </div>

                <p className={cn("text-sm font-medium", getStatusColor())}>{getStatusText()}</p>
            </div>

            {/* Transcript display */}
            {transcript && (
                <div
                    className={cn(
                        "w-full max-w-md p-4 rounded-lg bg-muted border border-border",
                        isInterimTranscript && "opacity-70"
                    )}
                >
                    <p className="text-sm text-foreground">
                        {transcript}
                        {isInterimTranscript && <span className="animate-pulse">...</span>}
                    </p>
                </div>
            )}

            {/* Control buttons */}
            <div className="flex items-center gap-4">
                {/* Microphone button */}
                <Button
                    variant={isRecording ? "destructive" : "primary"}
                    onClick={handleMicClick}
                    disabled={!isConnected || isPlaying || sessionState === "processing"}
                    className="w-16 h-16 rounded-full p-0"
                >
                    {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                {/* Interrupt button (visible when playing) */}
                {isPlaying && (
                    <Button
                        variant="secondary"
                        onClick={handleInterrupt}
                        className="w-12 h-12 rounded-full p-0"
                        title="Interrupt"
                    >
                        <VolumeX className="w-5 h-5" />
                    </Button>
                )}
            </div>

            {/* Instructions */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
                <p>
                    {isRecording
                        ? "Speak clearly into your microphone"
                        : "Click the microphone to start speaking"}
                </p>
                <p>
                    {isPlaying
                        ? "Click the mute button to interrupt"
                        : "The agent will respond with voice"}
                </p>
            </div>

            {/* Error display */}
            {error && (
                <div className="w-full max-w-md p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-500">{error}</p>
                </div>
            )}

            {/* Close button */}
            {onClose && (
                <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
                    Back to text chat
                </Button>
            )}
        </div>
    );
}
