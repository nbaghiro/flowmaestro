import {
    Room,
    RoomEvent,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication
} from "livekit-client";
import {
    VoiceCommandBus,
    VoiceCommand,
    VoiceCommandResponse
} from "../services/events/VoiceCommandBus";
import { CallExecutionRepository } from "../storage/repositories/CallExecutionRepository";
import { DeepgramSTT } from "./services/DeepgramSTT";
import { ElevenLabsTTS } from "./services/ElevenLabsTTS";
import { VoiceActivityDetector } from "./services/VoiceActivityDetector";

// Type stubs for browser APIs
type MediaStream = unknown;
type AudioBuffer = unknown;

/**
 * VoiceAgent - Handles a single phone call session
 * Manages the voice pipeline: STT → Processing → TTS
 */
export class VoiceAgent {
    private room: Room;
    private callExecutionId: string;
    private commandBus: VoiceCommandBus;
    private callRepo: CallExecutionRepository;

    // Voice pipeline components
    private stt: DeepgramSTT;
    private tts: ElevenLabsTTS;
    private vad: VoiceActivityDetector;

    // State
    private currentCommand: VoiceCommand | null = null;

    constructor(room: Room, callExecutionId: string, commandBus: VoiceCommandBus) {
        this.room = room;
        this.callExecutionId = callExecutionId;
        this.commandBus = commandBus;
        this.callRepo = new CallExecutionRepository();

        // Initialize pipeline components
        this.stt = new DeepgramSTT();
        this.tts = new ElevenLabsTTS();
        this.vad = new VoiceActivityDetector();
    }

    /**
     * Start the agent and begin processing
     */
    async start(): Promise<void> {
        console.log(`[VoiceAgent] Starting agent for call ${this.callExecutionId}`);

        // Set up room event handlers
        this.setupRoomHandlers();

        // Subscribe to commands from backend
        await this.subscribeToCommands();

        // Log agent joined event
        await this.callRepo.createEvent({
            call_execution_id: this.callExecutionId,
            event_type: "agent:joined",
            event_data: {
                room_name: this.room.name
            },
            severity: "info"
        });

        console.log("[VoiceAgent] Agent started and listening for commands");
    }

    /**
     * Stop the agent and clean up
     */
    async stop(): Promise<void> {
        console.log(`[VoiceAgent] Stopping agent for call ${this.callExecutionId}`);

        // Stop all pipeline components
        await this.stt.stop();
        await this.tts.stop();
        this.vad.stop();

        // Disconnect from room
        await this.room.disconnect();

        // Log agent left event
        await this.callRepo.createEvent({
            call_execution_id: this.callExecutionId,
            event_type: "agent:left",
            event_data: {
                room_name: this.room.name
            },
            severity: "info"
        });

        console.log("[VoiceAgent] Agent stopped");
    }

    /**
     * Set up LiveKit room event handlers
     */
    private setupRoomHandlers(): void {
        // Handle participant connected (the SIP participant)
        this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            console.log(`[VoiceAgent] Participant connected: ${participant.identity}`);

            // Subscribe to their audio track
            participant.on(
                "trackSubscribed",
                (track: RemoteTrack, _publication: RemoteTrackPublication) => {
                    if (track.kind === "audio") {
                        console.log("[VoiceAgent] Subscribed to audio track");
                        this.onAudioTrackReceived(track);
                    }
                }
            );
        });

        // Handle participant disconnected
        this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            console.log(`[VoiceAgent] Participant disconnected: ${participant.identity}`);
            this.stop();
        });

        // Handle room disconnected
        this.room.on(RoomEvent.Disconnected, () => {
            console.log("[VoiceAgent] Room disconnected");
            this.stop();
        });
    }

    /**
     * Subscribe to commands from the backend
     */
    private async subscribeToCommands(): Promise<void> {
        await this.commandBus.subscribeToEvents(this.callExecutionId, async (_event) => {
            // For now, we'll implement command handling via the separate subscribe
            // The VoiceCommandBus will need a method to subscribe to commands
        });

        // We need to add a method to VoiceCommandBus to subscribe to commands
        // For now, let's handle this with Redis directly in the worker
    }

    /**
     * Handle audio track from SIP participant
     */
    private onAudioTrackReceived(track: RemoteTrack): void {
        console.log("[VoiceAgent] Setting up audio pipeline");

        // Connect audio track to VAD
        this.vad.start(track.mediaStream as MediaStream);

        // Set up VAD events
        this.vad.on("speech-start", () => {
            console.log("[VoiceAgent] Speech detected");

            // If currently playing TTS, stop it (interruption)
            if (this.currentCommand?.type === "speak") {
                this.tts.stop();
                this.sendCommandResponse(this.currentCommand.requestId, {
                    success: true,
                    result: { interrupted: true }
                });
                this.currentCommand = null;
            }

            // Start STT if in listen mode
            if (this.currentCommand?.type === "listen") {
                this.stt.start(track.mediaStream as MediaStream);
            }
        });

        this.vad.on("speech-end", () => {
            console.log("[VoiceAgent] Speech ended");

            // Stop STT if running
            if (this.currentCommand?.type === "listen") {
                this.stt.stop();
            }
        });
    }

    /**
     * Handle speak command
     * TODO: Wire this up to command subscription in subscribeToCommands()
     */
    // @ts-expect-error - Method reserved for future command handling implementation
    private async _handleSpeakCommand(command: VoiceCommand): Promise<void> {
        this.currentCommand = command;

        const payload = command.payload as {
            text?: unknown;
            voice?: unknown;
            voiceProvider?: unknown;
            speed?: unknown;
            interruptible?: unknown;
        };

        const text = typeof payload.text === "string" ? payload.text : "";
        const voice = typeof payload.voice === "string" ? payload.voice : "default";
        const voiceProvider =
            payload.voiceProvider === "openai" || payload.voiceProvider === "elevenlabs"
                ? payload.voiceProvider
                : "elevenlabs";
        const speed = typeof payload.speed === "number" ? payload.speed : 1.0;
        // Note: interruptible handling would be implemented when this method is activated

        console.log(`[VoiceAgent] Speaking: "${text}"`);

        try {
            // Generate TTS audio
            const audioBuffer = await this.tts.synthesize({
                text,
                voice,
                voiceProvider,
                speed
            });

            // Play audio to room
            await this.playAudioToRoom(audioBuffer);

            const audioBufferTyped = audioBuffer as {
                duration: number;
            };

            // Send success response
            this.sendCommandResponse(command.requestId, {
                success: true,
                result: {
                    durationMs: audioBufferTyped.duration * 1000,
                    interrupted: false
                }
            });
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error("[VoiceAgent] Speak error:", errorMsg);
            this.sendCommandResponse(command.requestId, {
                success: false,
                error: errorMsg
            });
        } finally {
            this.currentCommand = null;
        }
    }

    /**
     * Handle listen command
     * TODO: Wire this up to command subscription in subscribeToCommands()
     */
    // @ts-expect-error - Method reserved for future command handling implementation
    private async _handleListenCommand(command: VoiceCommand): Promise<void> {
        this.currentCommand = command;

        const payload = command.payload as {
            maxDuration?: unknown;
            endSilenceMs?: unknown;
            language?: unknown;
            sttProvider?: unknown;
        };

        const maxDuration = typeof payload.maxDuration === "number" ? payload.maxDuration : 30;
        const endSilenceMs = typeof payload.endSilenceMs === "number" ? payload.endSilenceMs : 1500;
        // Note: language and sttProvider handling would be implemented when this method is activated

        console.log(`[VoiceAgent] Listening for speech (max ${maxDuration}s)`);

        try {
            // Wait for speech with timeout
            const transcript = await this.waitForSpeech(maxDuration * 1000, endSilenceMs);

            // Send success response
            this.sendCommandResponse(command.requestId, {
                success: true,
                result: {
                    transcript: transcript.text,
                    confidence: transcript.confidence,
                    durationMs: transcript.durationMs,
                    timedOut: transcript.timedOut
                }
            });
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error("[VoiceAgent] Listen error:", errorMsg);
            this.sendCommandResponse(command.requestId, {
                success: false,
                error: errorMsg
            });
        } finally {
            this.currentCommand = null;
        }
    }

    /**
     * Handle menu command
     * TODO: Wire this up to command subscription in subscribeToCommands()
     */
    // @ts-expect-error - Method reserved for future command handling implementation
    private async _handleMenuCommand(command: VoiceCommand): Promise<void> {
        this.currentCommand = command;

        const payload = command.payload as {
            options?: unknown;
            inputMethod?: unknown;
            timeoutSeconds?: unknown;
        };

        const options = Array.isArray(payload.options)
            ? (payload.options as Array<{ key: string; label: string }>)
            : [];
        const inputMethod = payload.inputMethod;
        const timeoutSeconds =
            typeof payload.timeoutSeconds === "number" ? payload.timeoutSeconds : 10;

        console.log(`[VoiceAgent] Presenting menu with ${options.length} options`);

        try {
            // For voice input, listen for speech and match to options
            if (inputMethod === "voice" || inputMethod === "both") {
                const transcript = await this.waitForSpeech(timeoutSeconds * 1000, 1500);

                // Try to match transcript to menu options
                const selectedOption = this.matchTranscriptToOption(transcript.text, options);

                this.sendCommandResponse(command.requestId, {
                    success: true,
                    result: {
                        selectedOption,
                        inputMethod: "voice"
                    }
                });
            }
            // TODO: Implement DTMF handling
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error("[VoiceAgent] Menu error:", errorMsg);
            this.sendCommandResponse(command.requestId, {
                success: false,
                error: errorMsg
            });
        } finally {
            this.currentCommand = null;
        }
    }

    /**
     * Handle hangup command
     * TODO: Wire this up to command subscription in subscribeToCommands()
     */
    // @ts-expect-error - Method reserved for future command handling implementation
    private async _handleHangupCommand(command: VoiceCommand): Promise<void> {
        console.log("[VoiceAgent] Hanging up call");

        try {
            await this.stop();

            this.sendCommandResponse(command.requestId, {
                success: true,
                result: {}
            });
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error("[VoiceAgent] Hangup error:", errorMsg);
            this.sendCommandResponse(command.requestId, {
                success: false,
                error: errorMsg
            });
        }
    }

    /**
     * Wait for user speech and return transcript
     */
    private async waitForSpeech(
        maxDurationMs: number,
        endSilenceMs: number
    ): Promise<{
        text: string;
        confidence: number;
        durationMs: number;
        timedOut: boolean;
    }> {
        return new Promise((resolve, _reject) => {
            const startTime = Date.now();
            let speechDetected = false;
            let finalTranscript = "";
            let confidence = 0;

            // Timeout handler
            const timeout = setTimeout(() => {
                this.stt.stop();
                resolve({
                    text: finalTranscript,
                    confidence,
                    durationMs: Date.now() - startTime,
                    timedOut: true
                });
            }, maxDurationMs);

            // STT result handler
            this.stt.on("transcript", (result: unknown) => {
                const transcriptResult = result as {
                    is_final?: boolean;
                    text?: string;
                    confidence?: number;
                };
                if (transcriptResult.is_final) {
                    finalTranscript = transcriptResult.text || "";
                    confidence = transcriptResult.confidence || 0;
                    speechDetected = true;
                }
            });

            // VAD silence handler
            this.vad.on("speech-end", () => {
                if (speechDetected) {
                    clearTimeout(timeout);
                    setTimeout(() => {
                        resolve({
                            text: finalTranscript,
                            confidence,
                            durationMs: Date.now() - startTime,
                            timedOut: false
                        });
                    }, endSilenceMs);
                }
            });
        });
    }

    /**
     * Match transcript text to menu option
     */
    private matchTranscriptToOption(
        transcript: string,
        options: Array<{ key: string; label: string }>
    ): string | null {
        const lowerTranscript = transcript.toLowerCase();

        // Try exact key match
        for (const option of options) {
            if (lowerTranscript.includes(option.key.toLowerCase())) {
                return option.key;
            }
        }

        // Try label match
        for (const option of options) {
            if (lowerTranscript.includes(option.label.toLowerCase())) {
                return option.key;
            }
        }

        return null;
    }

    /**
     * Play audio buffer to LiveKit room
     */
    private async playAudioToRoom(audioBuffer: AudioBuffer): Promise<void> {
        // TODO: Implement audio playback to room
        // This requires creating a local audio track and publishing it
        const audioBufferTyped = audioBuffer as {
            duration: number;
        };
        console.log(`[VoiceAgent] Playing audio (${audioBufferTyped.duration}s)`);
    }

    /**
     * Send command response via Redis
     */
    private sendCommandResponse(requestId: string, response: Partial<VoiceCommandResponse>): void {
        const fullResponse: VoiceCommandResponse = {
            requestId,
            callExecutionId: this.callExecutionId,
            success: response.success || false,
            result: response.result,
            error: response.error
        };

        // Publish response - convert to Record<string, unknown>
        const eventData: Record<string, unknown> = {
            requestId: fullResponse.requestId,
            callExecutionId: fullResponse.callExecutionId,
            success: fullResponse.success,
            result: fullResponse.result,
            error: fullResponse.error
        };

        this.commandBus.publishEvent({
            type: "command:response",
            callExecutionId: this.callExecutionId,
            timestamp: Date.now(),
            data: eventData
        });
    }
}
