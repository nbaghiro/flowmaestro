/**
 * ElevenLabs text-to-speech provider
 */

import { AbstractProvider, type SpeechProvider } from "../base";
import type {
    TranscriptionRequest,
    TranscriptionResponse,
    TTSRequest,
    TTSResponse
} from "../../capabilities/speech/types";
import type { AILogger, AIProvider } from "../../types";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

/**
 * ElevenLabs text-to-speech provider
 */
export class ElevenLabsSpeechProvider extends AbstractProvider implements SpeechProvider {
    readonly provider: AIProvider = "elevenlabs";
    readonly supportedModels = [
        "eleven_multilingual_v2",
        "eleven_turbo_v2_5",
        "eleven_turbo_v2",
        "eleven_monolingual_v1"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsTranscription(): boolean {
        return false;
    }

    supportsTTS(): boolean {
        return true;
    }

    async transcribe(
        _request: TranscriptionRequest,
        _apiKey: string
    ): Promise<TranscriptionResponse> {
        throw new Error("ElevenLabs does not support transcription");
    }

    async textToSpeech(request: TTSRequest, apiKey: string): Promise<TTSResponse> {
        const startTime = Date.now();
        const voiceId = request.voice || "21m00Tcm4TlvDq8ikWAM"; // Default to Rachel

        const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
                Accept: "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": apiKey
            },
            body: JSON.stringify({
                text: request.text,
                model_id: request.model || "eleven_multilingual_v2",
                voice_settings: {
                    stability: request.stability ?? 0.5,
                    similarity_boost: request.similarityBoost ?? 0.75,
                    style: request.style ?? 0,
                    use_speaker_boost: request.speakerBoost ?? true
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioData = Buffer.from(arrayBuffer).toString("base64");

        return {
            base64: audioData,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model || "eleven_multilingual_v2",
                charactersUsed: request.text.length
            }
        };
    }
}
