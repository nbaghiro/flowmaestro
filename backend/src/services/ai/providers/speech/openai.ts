/**
 * OpenAI speech provider (Whisper + TTS)
 */

import OpenAI from "openai";
import { AbstractProvider, type SpeechProvider } from "../base";
import type {
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionSegment,
    TTSRequest,
    TTSResponse
} from "../../capabilities/speech/types";
import type { AILogger, AIProvider } from "../../client/types";

/**
 * OpenAI speech provider
 */
export class OpenAISpeechProvider extends AbstractProvider implements SpeechProvider {
    readonly provider: AIProvider = "openai";
    readonly supportedModels = ["whisper-1", "tts-1", "tts-1-hd"];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsTranscription(): boolean {
        return true;
    }

    supportsTTS(): boolean {
        return true;
    }

    async transcribe(
        request: TranscriptionRequest,
        apiKey: string
    ): Promise<TranscriptionResponse> {
        const client = new OpenAI({ apiKey });
        const startTime = Date.now();

        // Handle different input types
        let audioFile: File;
        if (request.audioInput.startsWith("http")) {
            // Fetch from URL
            const response = await fetch(request.audioInput);
            const blob = await response.blob();
            audioFile = new File([blob], "audio.mp3", { type: blob.type });
        } else if (request.audioInput.startsWith("data:")) {
            // Base64 data URL
            const base64 = request.audioInput.split(",")[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            audioFile = new File([bytes], "audio.mp3", { type: "audio/mp3" });
        } else {
            throw new Error("Unsupported audio input format");
        }

        // Determine if we need verbose response for timestamps
        const needsVerbose =
            request.timestamps || (request.timestampGranularities?.length ?? 0) > 0;

        if (needsVerbose) {
            // Use verbose_json for timestamps
            const granularities = request.timestampGranularities ?? ["segment"];
            const response = await client.audio.transcriptions.create({
                model: request.model,
                file: audioFile,
                language: request.language,
                prompt: request.prompt,
                temperature: request.temperature,
                response_format: "verbose_json",
                timestamp_granularities: granularities
            });

            // Parse verbose response
            const verboseResponse = response as OpenAI.Audio.Transcription & {
                language?: string;
                duration?: number;
                segments?: Array<{
                    id: number;
                    start: number;
                    end: number;
                    text: string;
                    words?: Array<{ word: string; start: number; end: number }>;
                }>;
            };

            const segments: TranscriptionSegment[] | undefined = verboseResponse.segments?.map(
                (seg, index) => ({
                    id: seg.id ?? index,
                    start: seg.start,
                    end: seg.end,
                    text: seg.text,
                    words: seg.words?.map((w) => ({
                        word: w.word,
                        start: w.start,
                        end: w.end
                    }))
                })
            );

            return {
                text: verboseResponse.text,
                language: verboseResponse.language,
                duration: verboseResponse.duration,
                segments,
                metadata: {
                    processingTimeMs: Date.now() - startTime,
                    provider: this.provider,
                    model: request.model
                }
            };
        }

        // Simple transcription without timestamps
        const response = await client.audio.transcriptions.create({
            model: request.model,
            file: audioFile,
            language: request.language,
            prompt: request.prompt,
            temperature: request.temperature
        });

        return {
            text: response.text,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model
            }
        };
    }

    async textToSpeech(request: TTSRequest, apiKey: string): Promise<TTSResponse> {
        const client = new OpenAI({ apiKey });
        const startTime = Date.now();

        const response = await client.audio.speech.create({
            model: request.model,
            input: request.text,
            voice: (request.voice ?? "alloy") as
                | "alloy"
                | "echo"
                | "fable"
                | "onyx"
                | "nova"
                | "shimmer",
            speed: request.speed ?? 1.0,
            response_format: (request.outputFormat ?? "mp3") as "mp3" | "opus" | "aac" | "flac"
        });

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        return {
            base64,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model,
                charactersUsed: request.text.length
            }
        };
    }
}
