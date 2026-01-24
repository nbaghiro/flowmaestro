/**
 * AIClient Tests
 *
 * Tests for the unified AI client (AIClient.ts)
 */

// Mock the capability classes
jest.mock("../../capabilities/text/index", () => ({
    TextCapability: jest.fn().mockImplementation(() => ({
        complete: jest.fn(),
        stream: jest.fn()
    }))
}));

jest.mock("../../capabilities/embedding/index", () => ({
    EmbeddingCapability: jest.fn().mockImplementation(() => ({
        generate: jest.fn()
    }))
}));

jest.mock("../../capabilities/image/index", () => ({
    ImageCapability: jest.fn().mockImplementation(() => ({
        generate: jest.fn()
    }))
}));

jest.mock("../../capabilities/video/index", () => ({
    VideoCapability: jest.fn().mockImplementation(() => ({
        generate: jest.fn()
    }))
}));

jest.mock("../../capabilities/vision/index", () => ({
    VisionCapability: jest.fn().mockImplementation(() => ({
        analyze: jest.fn()
    }))
}));

jest.mock("../../capabilities/speech/index", () => ({
    SpeechCapability: jest.fn().mockImplementation(() => ({
        synthesize: jest.fn()
    }))
}));

// Mock the provider registry
const mockResolveApiKey = jest.fn();
const mockIsProviderAvailable = jest.fn();
const mockGetAvailableProviders = jest.fn();
const mockConfigureProvider = jest.fn();
const mockSetDefaultProvider = jest.fn();
const mockRegisterTextProvider = jest.fn();
const mockRegisterEmbeddingProvider = jest.fn();
const mockRegisterImageProvider = jest.fn();
const mockRegisterVideoProvider = jest.fn();
const mockRegisterVisionProvider = jest.fn();
const mockRegisterSpeechProvider = jest.fn();

jest.mock("../../providers/registry", () => ({
    ProviderRegistry: jest.fn().mockImplementation(() => ({
        resolveApiKey: mockResolveApiKey,
        isProviderAvailable: mockIsProviderAvailable,
        getAvailableProviders: mockGetAvailableProviders,
        configureProvider: mockConfigureProvider,
        setDefaultProvider: mockSetDefaultProvider,
        registerTextProvider: mockRegisterTextProvider,
        registerEmbeddingProvider: mockRegisterEmbeddingProvider,
        registerImageProvider: mockRegisterImageProvider,
        registerVideoProvider: mockRegisterVideoProvider,
        registerVisionProvider: mockRegisterVisionProvider,
        registerSpeechProvider: mockRegisterSpeechProvider
    }))
}));

// Mock all provider classes
jest.mock("../../providers/text/index", () => ({
    OpenAITextProvider: jest.fn(),
    AnthropicTextProvider: jest.fn(),
    GoogleTextProvider: jest.fn(),
    CohereTextProvider: jest.fn(),
    HuggingFaceTextProvider: jest.fn(),
    XAITextProvider: jest.fn()
}));

jest.mock("../../providers/embedding/index", () => ({
    OpenAIEmbeddingProvider: jest.fn(),
    CohereEmbeddingProvider: jest.fn(),
    GoogleEmbeddingProvider: jest.fn()
}));

jest.mock("../../providers/image/index", () => ({
    OpenAIImageProvider: jest.fn(),
    ReplicateImageProvider: jest.fn(),
    StabilityImageProvider: jest.fn(),
    FALImageProvider: jest.fn()
}));

jest.mock("../../providers/video/index", () => ({
    ReplicateVideoProvider: jest.fn(),
    GoogleVideoProvider: jest.fn(),
    RunwayVideoProvider: jest.fn(),
    LumaVideoProvider: jest.fn(),
    FALVideoProvider: jest.fn(),
    StabilityVideoProvider: jest.fn()
}));

jest.mock("../../providers/vision/index", () => ({
    OpenAIVisionProvider: jest.fn(),
    AnthropicVisionProvider: jest.fn(),
    GoogleVisionProvider: jest.fn()
}));

jest.mock("../../providers/speech/index", () => ({
    OpenAISpeechProvider: jest.fn(),
    ElevenLabsSpeechProvider: jest.fn()
}));

import { EmbeddingCapability } from "../../capabilities/embedding/index";
import { ImageCapability } from "../../capabilities/image/index";
import { SpeechCapability } from "../../capabilities/speech/index";
import { TextCapability } from "../../capabilities/text/index";
import { VideoCapability } from "../../capabilities/video/index";
import { VisionCapability } from "../../capabilities/vision/index";
import { ProviderRegistry } from "../../providers/registry";
import { AIClient } from "../AIClient";

describe("AIClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Constructor", () => {
        it("should create client with default config", () => {
            new AIClient();

            expect(ProviderRegistry).toHaveBeenCalledWith({
                providers: undefined,
                authResolver: undefined,
                logger: expect.anything()
            });
        });

        it("should create client with provider config", () => {
            const config = {
                providers: {
                    openai: { apiKey: "sk-test" },
                    anthropic: { apiKey: "sk-ant-test" }
                }
            };

            new AIClient(config);

            expect(ProviderRegistry).toHaveBeenCalledWith(
                expect.objectContaining({
                    providers: config.providers
                })
            );
        });

        it("should create client with auth resolver", () => {
            const authResolver = jest.fn().mockResolvedValue("api-key");
            new AIClient({ authResolver });

            expect(ProviderRegistry).toHaveBeenCalledWith(
                expect.objectContaining({
                    authResolver
                })
            );
        });

        it("should initialize all capability namespaces", () => {
            const client = new AIClient();

            expect(client.text).toBeDefined();
            expect(client.embedding).toBeDefined();
            expect(client.image).toBeDefined();
            expect(client.video).toBeDefined();
            expect(client.vision).toBeDefined();
            expect(client.speech).toBeDefined();

            expect(TextCapability).toHaveBeenCalled();
            expect(EmbeddingCapability).toHaveBeenCalled();
            expect(ImageCapability).toHaveBeenCalled();
            expect(VideoCapability).toHaveBeenCalled();
            expect(VisionCapability).toHaveBeenCalled();
            expect(SpeechCapability).toHaveBeenCalled();
        });

        it("should register all text providers", () => {
            new AIClient();

            expect(mockRegisterTextProvider).toHaveBeenCalledWith("openai", expect.any(Function));
            expect(mockRegisterTextProvider).toHaveBeenCalledWith(
                "anthropic",
                expect.any(Function)
            );
            expect(mockRegisterTextProvider).toHaveBeenCalledWith("google", expect.any(Function));
            expect(mockRegisterTextProvider).toHaveBeenCalledWith("cohere", expect.any(Function));
            expect(mockRegisterTextProvider).toHaveBeenCalledWith(
                "huggingface",
                expect.any(Function)
            );
            expect(mockRegisterTextProvider).toHaveBeenCalledWith("xai", expect.any(Function));
        });

        it("should register all embedding providers", () => {
            new AIClient();

            expect(mockRegisterEmbeddingProvider).toHaveBeenCalledWith(
                "openai",
                expect.any(Function)
            );
            expect(mockRegisterEmbeddingProvider).toHaveBeenCalledWith(
                "cohere",
                expect.any(Function)
            );
            expect(mockRegisterEmbeddingProvider).toHaveBeenCalledWith(
                "google",
                expect.any(Function)
            );
        });

        it("should register all image providers", () => {
            new AIClient();

            expect(mockRegisterImageProvider).toHaveBeenCalledWith("openai", expect.any(Function));
            expect(mockRegisterImageProvider).toHaveBeenCalledWith(
                "replicate",
                expect.any(Function)
            );
            expect(mockRegisterImageProvider).toHaveBeenCalledWith(
                "stabilityai",
                expect.any(Function)
            );
            expect(mockRegisterImageProvider).toHaveBeenCalledWith("fal", expect.any(Function));
        });

        it("should register all video providers", () => {
            new AIClient();

            expect(mockRegisterVideoProvider).toHaveBeenCalledWith(
                "replicate",
                expect.any(Function)
            );
            expect(mockRegisterVideoProvider).toHaveBeenCalledWith("google", expect.any(Function));
            expect(mockRegisterVideoProvider).toHaveBeenCalledWith("runway", expect.any(Function));
            expect(mockRegisterVideoProvider).toHaveBeenCalledWith("luma", expect.any(Function));
            expect(mockRegisterVideoProvider).toHaveBeenCalledWith("fal", expect.any(Function));
            expect(mockRegisterVideoProvider).toHaveBeenCalledWith(
                "stabilityai",
                expect.any(Function)
            );
        });

        it("should register all vision providers", () => {
            new AIClient();

            expect(mockRegisterVisionProvider).toHaveBeenCalledWith("openai", expect.any(Function));
            expect(mockRegisterVisionProvider).toHaveBeenCalledWith(
                "anthropic",
                expect.any(Function)
            );
            expect(mockRegisterVisionProvider).toHaveBeenCalledWith("google", expect.any(Function));
        });

        it("should register all speech providers", () => {
            new AIClient();

            expect(mockRegisterSpeechProvider).toHaveBeenCalledWith("openai", expect.any(Function));
            expect(mockRegisterSpeechProvider).toHaveBeenCalledWith(
                "elevenlabs",
                expect.any(Function)
            );
        });
    });

    describe("Retry configuration", () => {
        it("should use default retry config", () => {
            new AIClient();

            // TextCapability should be called with retry config
            expect(TextCapability).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    maxRetries: expect.any(Number)
                }),
                expect.anything()
            );
        });

        it("should merge custom retry config", () => {
            new AIClient({
                retry: {
                    maxRetries: 5,
                    initialDelayMs: 2000
                }
            });

            expect(TextCapability).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    maxRetries: 5,
                    initialDelayMs: 2000
                }),
                expect.anything()
            );
        });
    });

    describe("Debug mode", () => {
        it("should use silent logger by default", () => {
            new AIClient();

            // Registry should be called with a silent logger
            expect(ProviderRegistry).toHaveBeenCalledWith(
                expect.objectContaining({
                    logger: expect.any(Object)
                })
            );
        });

        it("should use console logger in debug mode", () => {
            new AIClient({ debug: true });

            expect(ProviderRegistry).toHaveBeenCalledWith(
                expect.objectContaining({
                    logger: expect.any(Object)
                })
            );
        });

        it("should use custom logger when provided", () => {
            const customLogger = {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            };

            new AIClient({ logger: customLogger });

            expect(ProviderRegistry).toHaveBeenCalledWith(
                expect.objectContaining({
                    logger: customLogger
                })
            );
        });
    });

    describe("getApiKey", () => {
        it("should delegate to registry", async () => {
            mockResolveApiKey.mockResolvedValue("sk-test-key");
            const client = new AIClient();

            const key = await client.getApiKey("openai");

            expect(mockResolveApiKey).toHaveBeenCalledWith("openai", undefined);
            expect(key).toBe("sk-test-key");
        });

        it("should pass connection ID to registry", async () => {
            mockResolveApiKey.mockResolvedValue("sk-connection-key");
            const client = new AIClient();

            const key = await client.getApiKey("anthropic", "conn-123");

            expect(mockResolveApiKey).toHaveBeenCalledWith("anthropic", "conn-123");
            expect(key).toBe("sk-connection-key");
        });
    });

    describe("isProviderAvailable", () => {
        it("should return true for available provider", () => {
            mockIsProviderAvailable.mockReturnValue(true);
            const client = new AIClient();

            expect(client.isProviderAvailable("openai")).toBe(true);
            expect(mockIsProviderAvailable).toHaveBeenCalledWith("openai");
        });

        it("should return false for unavailable provider", () => {
            mockIsProviderAvailable.mockReturnValue(false);
            const client = new AIClient();

            expect(client.isProviderAvailable("replicate")).toBe(false);
        });
    });

    describe("getAvailableProviders", () => {
        it("should return list of available providers", () => {
            mockGetAvailableProviders.mockReturnValue(["openai", "anthropic", "google"]);
            const client = new AIClient();

            const providers = client.getAvailableProviders();

            expect(providers).toEqual(["openai", "anthropic", "google"]);
            expect(mockGetAvailableProviders).toHaveBeenCalled();
        });

        it("should return empty array when no providers configured", () => {
            mockGetAvailableProviders.mockReturnValue([]);
            const client = new AIClient();

            expect(client.getAvailableProviders()).toEqual([]);
        });
    });

    describe("configureProvider", () => {
        it("should delegate to registry", () => {
            const client = new AIClient();

            client.configureProvider("openai", { apiKey: "new-key" });

            expect(mockConfigureProvider).toHaveBeenCalledWith("openai", { apiKey: "new-key" });
        });

        it("should configure provider with base URL", () => {
            const client = new AIClient();

            client.configureProvider("openai", {
                apiKey: "key",
                baseUrl: "https://custom.openai.com"
            });

            expect(mockConfigureProvider).toHaveBeenCalledWith("openai", {
                apiKey: "key",
                baseUrl: "https://custom.openai.com"
            });
        });
    });

    describe("setDefaultProvider", () => {
        it("should set default provider for text capability", () => {
            const client = new AIClient();

            client.setDefaultProvider("text", "anthropic");

            expect(mockSetDefaultProvider).toHaveBeenCalledWith("text", "anthropic");
        });

        it("should set default provider for embedding capability", () => {
            const client = new AIClient();

            client.setDefaultProvider("embedding", "cohere");

            expect(mockSetDefaultProvider).toHaveBeenCalledWith("embedding", "cohere");
        });

        it("should set default provider for image capability", () => {
            const client = new AIClient();

            client.setDefaultProvider("image", "stabilityai");

            expect(mockSetDefaultProvider).toHaveBeenCalledWith("image", "stabilityai");
        });

        it("should set default provider for video capability", () => {
            const client = new AIClient();

            client.setDefaultProvider("video", "runway");

            expect(mockSetDefaultProvider).toHaveBeenCalledWith("video", "runway");
        });

        it("should set default provider for vision capability", () => {
            const client = new AIClient();

            client.setDefaultProvider("vision", "google");

            expect(mockSetDefaultProvider).toHaveBeenCalledWith("vision", "google");
        });

        it("should set default provider for speech capability", () => {
            const client = new AIClient();

            client.setDefaultProvider("speech", "elevenlabs");

            expect(mockSetDefaultProvider).toHaveBeenCalledWith("speech", "elevenlabs");
        });
    });
});
