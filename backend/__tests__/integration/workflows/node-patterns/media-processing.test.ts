/**
 * Media Processing Pattern Integration Tests
 *
 * True integration tests that verify audio and video processing
 * node behavior through the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Audio transcription (speech-to-text)
 * - Text-to-speech generation
 * - Video generation workflows
 * - Chained media processing (transcribe -> analyze -> generate)
 * - Error handling scenarios
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

const mockExecuteNode = jest.fn();
const mockValidateInputsActivity = jest.fn();
const mockValidateOutputsActivity = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();

const mockEmitExecutionStarted = jest.fn();
const mockEmitExecutionProgress = jest.fn();
const mockEmitExecutionCompleted = jest.fn();
const mockEmitExecutionFailed = jest.fn();
const mockEmitExecutionPaused = jest.fn();
const mockEmitNodeStarted = jest.fn();
const mockEmitNodeCompleted = jest.fn();
const mockEmitNodeFailed = jest.fn();

const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockReleaseCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockEstimateWorkflowCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();
const mockCalculateNodeCredits = jest.fn();

const mockActivities = {
    executeNode: mockExecuteNode,
    validateInputsActivity: mockValidateInputsActivity,
    validateOutputsActivity: mockValidateOutputsActivity,
    createSpan: mockCreateSpan,
    endSpan: mockEndSpan,
    emitExecutionStarted: mockEmitExecutionStarted,
    emitExecutionProgress: mockEmitExecutionProgress,
    emitExecutionCompleted: mockEmitExecutionCompleted,
    emitExecutionFailed: mockEmitExecutionFailed,
    emitExecutionPaused: mockEmitExecutionPaused,
    emitNodeStarted: mockEmitNodeStarted,
    emitNodeCompleted: mockEmitNodeCompleted,
    emitNodeFailed: mockEmitNodeFailed,
    shouldAllowExecution: mockShouldAllowExecution,
    reserveCredits: mockReserveCredits,
    releaseCredits: mockReleaseCredits,
    finalizeCredits: mockFinalizeCredits,
    estimateWorkflowCredits: mockEstimateWorkflowCredits,
    calculateLLMCredits: mockCalculateLLMCredits,
    calculateNodeCredits: mockCalculateNodeCredits
};

// ============================================================================
// WORKFLOW DEFINITION BUILDERS
// ============================================================================

/**
 * Create an audio transcription workflow
 * Input (audio file) -> Transcribe -> Output
 */
function createTranscriptionWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Audio Input",
        config: { inputName: "audioData" },
        position: { x: 0, y: 0 }
    };

    nodes["transcribe"] = {
        type: "audioTranscription",
        name: "Transcribe Audio",
        config: {
            audioSource: "${input.audioData.url}",
            model: "whisper-1",
            task: "transcribe",
            language: "en",
            outputFormat: "text",
            outputVariable: "transcription"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        { id: "input-transcribe", source: "input", target: "transcribe" },
        { id: "transcribe-output", source: "transcribe", target: "output" }
    );

    return {
        name: "Audio Transcription Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a text-to-speech workflow
 * Input (text) -> TTS -> Output
 */
function createTTSWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Text Input",
        config: { inputName: "textData" },
        position: { x: 0, y: 0 }
    };

    nodes["tts"] = {
        type: "audio",
        name: "Generate Speech",
        config: {
            provider: "openai",
            model: "tts-1",
            operation: "tts",
            textInput: "${input.textData.text}",
            voice: "alloy",
            speed: 1.0,
            returnFormat: "base64",
            outputVariable: "audioResult"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        { id: "input-tts", source: "input", target: "tts" },
        { id: "tts-output", source: "tts", target: "output" }
    );

    return {
        name: "Text-to-Speech Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a video generation workflow
 * Input (prompt) -> Generate Video -> Output
 */
function createVideoGenerationWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Video Prompt",
        config: { inputName: "videoPrompt" },
        position: { x: 0, y: 0 }
    };

    nodes["generate"] = {
        type: "videoGeneration",
        name: "Generate Video",
        config: {
            provider: "stabilityai",
            model: "stable-video-diffusion",
            prompt: "${input.videoPrompt.prompt}",
            duration: 4,
            aspectRatio: "16:9",
            outputFormat: "url",
            outputVariable: "videoResult"
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        { id: "input-generate", source: "input", target: "generate" },
        { id: "generate-output", source: "generate", target: "output" }
    );

    return {
        name: "Video Generation Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a chained media workflow: Transcribe -> Analyze -> Generate Audio Response
 * Input (audio) -> Transcribe -> LLM Analysis -> TTS Response -> Output
 */
function createVoiceAssistantWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Voice Input",
        config: { inputName: "voiceData" },
        position: { x: 0, y: 0 }
    };

    nodes["transcribe"] = {
        type: "audioTranscription",
        name: "Transcribe Question",
        config: {
            audioSource: "${input.voiceData.audioUrl}",
            model: "whisper-1",
            task: "transcribe",
            outputVariable: "transcription"
        },
        position: { x: 200, y: 0 }
    };

    nodes["analyze"] = {
        type: "llm",
        name: "Generate Response",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "You are a helpful assistant. Respond to this query: ${transcribe.transcription.text}",
            outputVariable: "response"
        },
        position: { x: 400, y: 0 }
    };

    nodes["speak"] = {
        type: "audio",
        name: "Speak Response",
        config: {
            provider: "openai",
            model: "tts-1",
            operation: "tts",
            textInput: "${analyze.response}",
            voice: "nova",
            returnFormat: "base64",
            outputVariable: "audioResponse"
        },
        position: { x: 600, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 0 }
    };

    edges.push(
        { id: "input-transcribe", source: "input", target: "transcribe" },
        { id: "transcribe-analyze", source: "transcribe", target: "analyze" },
        { id: "analyze-speak", source: "analyze", target: "speak" },
        { id: "speak-output", source: "speak", target: "output" }
    );

    return {
        name: "Voice Assistant Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a content creation workflow: Generate Script -> TTS -> Video with Audio
 * Input (topic) -> LLM Script -> TTS Narration -> Video Generation -> Output
 */
function createContentCreationWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Content Topic",
        config: { inputName: "contentRequest" },
        position: { x: 0, y: 0 }
    };

    nodes["script"] = {
        type: "llm",
        name: "Write Script",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Write a 30-second video script about: ${input.contentRequest.topic}",
            outputVariable: "scriptText"
        },
        position: { x: 200, y: 0 }
    };

    nodes["narration"] = {
        type: "audio",
        name: "Generate Narration",
        config: {
            provider: "elevenlabs",
            model: "eleven_monolingual_v1",
            operation: "tts",
            textInput: "${script.scriptText}",
            voice: "21m00Tcm4TlvDq8ikWAM",
            stability: 0.5,
            similarityBoost: 0.75,
            returnFormat: "url",
            outputVariable: "narrationAudio"
        },
        position: { x: 400, y: 0 }
    };

    nodes["video"] = {
        type: "videoGeneration",
        name: "Generate Video",
        config: {
            provider: "runway",
            model: "gen-3-alpha",
            prompt: "Visual for video script: ${script.scriptText}",
            duration: 4,
            aspectRatio: "16:9",
            outputVariable: "generatedVideo"
        },
        position: { x: 600, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 0 }
    };

    edges.push(
        { id: "input-script", source: "input", target: "script" },
        { id: "script-narration", source: "script", target: "narration" },
        { id: "narration-video", source: "narration", target: "video" },
        { id: "video-output", source: "video", target: "output" }
    );

    return {
        name: "Content Creation Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

// ============================================================================
// MOCK SETUP
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        return {
            result: { executed: nodeId },
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output: { executed: nodeId }
        };
    });

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });
    mockCreateSpan.mockResolvedValue({ traceId: "test-trace-id", spanId: "test-span-id" });
    mockEndSpan.mockResolvedValue(undefined);
    mockEmitExecutionStarted.mockResolvedValue(undefined);
    mockEmitExecutionProgress.mockResolvedValue(undefined);
    mockEmitExecutionCompleted.mockResolvedValue(undefined);
    mockEmitExecutionFailed.mockResolvedValue(undefined);
    mockEmitExecutionPaused.mockResolvedValue(undefined);
    mockEmitNodeStarted.mockResolvedValue(undefined);
    mockEmitNodeCompleted.mockResolvedValue(undefined);
    mockEmitNodeFailed.mockResolvedValue(undefined);
    mockShouldAllowExecution.mockResolvedValue(true);
    mockReserveCredits.mockResolvedValue({ success: true, reservationId: "test-reservation" });
    mockReleaseCredits.mockResolvedValue(undefined);
    mockFinalizeCredits.mockResolvedValue(undefined);
    mockEstimateWorkflowCredits.mockResolvedValue({ totalCredits: 10 });
    mockCalculateLLMCredits.mockResolvedValue(5);
    mockCalculateNodeCredits.mockResolvedValue(1);
}

interface ExecuteNodeParams {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    executionContext: { nodeId: string };
}

function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };

        return {
            result: output,
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Media Processing Pattern Integration Tests", () => {
    let testEnv: TestWorkflowEnvironment;
    let worker: Worker;

    beforeAll(async () => {
        testEnv = await TestWorkflowEnvironment.createLocal();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    beforeEach(async () => {
        setupDefaultMocks();

        worker = await Worker.create({
            connection: testEnv.nativeConnection,
            taskQueue: "test-workflow-queue",
            workflowsPath: require.resolve(
                "../../../../src/temporal/workflows/workflow-orchestrator"
            ),
            activities: mockActivities
        });
    });

    describe("audio transcription", () => {
        it("should transcribe audio file to text", async () => {
            const workflowDef = createTranscriptionWorkflowDefinition();

            configureMockNodeOutputs({
                transcribe: {
                    transcription: {
                        text: "Hello, this is a test transcription.",
                        language: "en",
                        duration: 5.5,
                        wordCount: 7
                    }
                },
                output: {
                    result: {
                        text: "Hello, this is a test transcription.",
                        language: "en"
                    }
                }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transcription-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transcription",
                            workflowDefinition: workflowDef,
                            inputs: {
                                audioData: {
                                    url: "https://example.com/audio.mp3"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("transcribe");
            expect(nodeIds).toContain("output");
        });

        it("should handle transcription with timestamps", async () => {
            const workflowDef = createTranscriptionWorkflowDefinition();

            configureMockNodeOutputs({
                transcribe: {
                    transcription: {
                        text: "Hello world.",
                        language: "en",
                        duration: 2.0,
                        wordCount: 2,
                        segments: [
                            {
                                id: 0,
                                start: 0.0,
                                end: 1.0,
                                text: "Hello",
                                words: [{ word: "Hello", start: 0.0, end: 0.5 }]
                            },
                            {
                                id: 1,
                                start: 1.0,
                                end: 2.0,
                                text: "world.",
                                words: [{ word: "world.", start: 1.0, end: 1.5 }]
                            }
                        ]
                    }
                },
                output: { result: { transcribed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transcription-timestamps-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transcription-timestamps",
                            workflowDefinition: workflowDef,
                            inputs: {
                                audioData: {
                                    url: "https://example.com/audio.wav"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("text-to-speech", () => {
        it("should generate speech from text", async () => {
            const workflowDef = createTTSWorkflowDefinition();

            configureMockNodeOutputs({
                tts: {
                    audioResult: {
                        operation: "tts",
                        provider: "openai",
                        model: "tts-1",
                        audio: {
                            base64: "SGVsbG8gV29ybGQ=" // Base64 encoded audio
                        },
                        metadata: {
                            processingTime: 1500,
                            charactersUsed: 50
                        }
                    }
                },
                output: { result: { audioGenerated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-tts-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-tts",
                            workflowDefinition: workflowDef,
                            inputs: {
                                textData: {
                                    text: "Hello, this is a text-to-speech test."
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("tts");
        });

        it("should support different voice options", async () => {
            const workflowDef = createTTSWorkflowDefinition();

            configureMockNodeOutputs({
                tts: {
                    audioResult: {
                        operation: "tts",
                        provider: "openai",
                        model: "tts-1-hd",
                        audio: { base64: "YXVkaW9fZGF0YQ==" },
                        metadata: { processingTime: 2000 }
                    }
                },
                output: { result: { voice: "nova" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-tts-voice-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-tts-voice",
                            workflowDefinition: workflowDef,
                            inputs: {
                                textData: {
                                    text: "Testing different voice.",
                                    voice: "nova"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("video generation", () => {
        it("should generate video from prompt", async () => {
            const workflowDef = createVideoGenerationWorkflowDefinition();

            configureMockNodeOutputs({
                generate: {
                    videoResult: {
                        provider: "stabilityai",
                        model: "stable-video-diffusion",
                        video: {
                            url: "https://cdn.example.com/generated-video.mp4"
                        },
                        metadata: {
                            processingTime: 30000,
                            duration: 4,
                            taskId: "task-123"
                        }
                    }
                },
                output: { result: { videoGenerated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-video-gen-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-video-gen",
                            workflowDefinition: workflowDef,
                            inputs: {
                                videoPrompt: {
                                    prompt: "A serene sunset over the ocean with gentle waves"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("generate");
        });
    });

    describe("chained media processing", () => {
        it("should process voice assistant workflow (transcribe -> analyze -> speak)", async () => {
            const workflowDef = createVoiceAssistantWorkflowDefinition();

            configureMockNodeOutputs({
                transcribe: {
                    transcription: {
                        text: "What is the weather like today?",
                        language: "en",
                        duration: 3.0,
                        wordCount: 6
                    }
                },
                analyze: {
                    response:
                        "I don't have access to real-time weather data, but I can help you find weather information for your location."
                },
                speak: {
                    audioResponse: {
                        operation: "tts",
                        provider: "openai",
                        audio: { base64: "cmVzcG9uc2VfYXVkaW8=" }
                    }
                },
                output: { result: { conversationComplete: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-voice-assistant-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-voice-assistant",
                            workflowDefinition: workflowDef,
                            inputs: {
                                voiceData: {
                                    audioUrl: "https://example.com/user-question.mp3"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("transcribe");
            expect(nodeIds).toContain("analyze");
            expect(nodeIds).toContain("speak");
            expect(nodeIds).toContain("output");
        });

        it("should process content creation workflow (script -> narration -> video)", async () => {
            const workflowDef = createContentCreationWorkflowDefinition();

            configureMockNodeOutputs({
                script: {
                    scriptText:
                        "Welcome to our channel! Today we explore the wonders of AI technology and how it's transforming our daily lives."
                },
                narration: {
                    narrationAudio: {
                        operation: "tts",
                        provider: "elevenlabs",
                        audio: { url: "https://cdn.example.com/narration.mp3" }
                    }
                },
                video: {
                    generatedVideo: {
                        provider: "runway",
                        video: { url: "https://cdn.example.com/video.mp4" }
                    }
                },
                output: { result: { contentCreated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-content-creation-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-content-creation",
                            workflowDefinition: workflowDef,
                            inputs: {
                                contentRequest: {
                                    topic: "AI in everyday life"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("script");
            expect(nodeIds).toContain("narration");
            expect(nodeIds).toContain("video");
        });
    });

    describe("error handling", () => {
        it("should handle transcription failure", async () => {
            const workflowDef = createTranscriptionWorkflowDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "transcribe") {
                    throw new Error("Transcription failed: Audio format not supported");
                }

                return {
                    result: { audioData: {} },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { audioData: {} }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transcription-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transcription-error",
                            workflowDefinition: workflowDef,
                            inputs: {
                                audioData: {
                                    url: "https://example.com/invalid.xyz"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle TTS failure", async () => {
            const workflowDef = createTTSWorkflowDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "tts") {
                    throw new Error("TTS failed: API rate limit exceeded");
                }

                return {
                    result: { textData: {} },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { textData: {} }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-tts-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-tts-error",
                            workflowDefinition: workflowDef,
                            inputs: {
                                textData: {
                                    text: "This should fail"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle video generation failure", async () => {
            const workflowDef = createVideoGenerationWorkflowDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "generate") {
                    throw new Error("Video generation failed: NSFW content detected");
                }

                return {
                    result: { videoPrompt: {} },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { videoPrompt: {} }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-video-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-video-error",
                            workflowDefinition: workflowDef,
                            inputs: {
                                videoPrompt: {
                                    prompt: "Invalid content"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe("real-world scenarios", () => {
        it("should handle podcast transcription workflow", async () => {
            const workflowDef = createTranscriptionWorkflowDefinition();

            configureMockNodeOutputs({
                transcribe: {
                    transcription: {
                        text: "Welcome to the tech podcast. Today we're discussing the latest developments in artificial intelligence and machine learning. Our guest is a leading researcher in the field...",
                        language: "en",
                        duration: 1800.0, // 30 minutes
                        wordCount: 5000
                    }
                },
                output: {
                    result: {
                        podcastTranscribed: true,
                        episodeLength: "30:00"
                    }
                }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-podcast-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-podcast",
                            workflowDefinition: workflowDef,
                            inputs: {
                                audioData: {
                                    url: "https://podcast.example.com/episode-42.mp3"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle audiobook chapter generation", async () => {
            const workflowDef = createTTSWorkflowDefinition();

            const chapterText = `Chapter 1: The Beginning

            It was a dark and stormy night. The wind howled through the ancient trees,
            their branches creaking and groaning under the weight of the tempest...`;

            configureMockNodeOutputs({
                tts: {
                    audioResult: {
                        operation: "tts",
                        provider: "elevenlabs",
                        model: "eleven_multilingual_v2",
                        audio: {
                            url: "https://cdn.example.com/audiobook/chapter-1.mp3"
                        },
                        metadata: {
                            processingTime: 15000,
                            charactersUsed: chapterText.length,
                            duration: 120 // 2 minutes
                        }
                    }
                },
                output: { result: { chapterGenerated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-audiobook-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-audiobook",
                            workflowDefinition: workflowDef,
                            inputs: {
                                textData: {
                                    text: chapterText
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
