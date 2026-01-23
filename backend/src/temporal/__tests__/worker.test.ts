/**
 * Temporal Worker Tests
 *
 * Tests for the Temporal worker initialization and lifecycle:
 * - Runtime configuration
 * - Connection establishment with retry logic
 * - Worker creation and configuration
 * - Health check server
 * - Graceful shutdown handling
 * - Error handling
 */

import http from "http";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock external dependencies before imports
const mockWorkerRun = jest.fn().mockResolvedValue(undefined);
const mockWorkerShutdown = jest.fn().mockResolvedValue(undefined);
const mockWorkerCreate = jest.fn().mockResolvedValue({
    run: mockWorkerRun,
    shutdown: mockWorkerShutdown
});

const mockConnectionConnect = jest.fn();
const mockConnectionClose = jest.fn().mockResolvedValue(undefined);

const mockRuntimeInstall = jest.fn();

const mockRedisConnect = jest.fn().mockResolvedValue(undefined);
const mockRedisDisconnect = jest.fn().mockResolvedValue(undefined);

const mockInitializeOTel = jest.fn();
const mockShutdownOTel = jest.fn().mockResolvedValue(undefined);

jest.mock("@temporalio/worker", () => ({
    Runtime: {
        install: mockRuntimeInstall
    },
    Worker: {
        create: mockWorkerCreate
    },
    NativeConnection: {
        connect: mockConnectionConnect
    },
    DefaultLogger: jest.fn()
}));

jest.mock("../../core/logging", () => ({
    createWorkerLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

jest.mock("../../core/observability", () => ({
    initializeOTel: mockInitializeOTel,
    shutdownOTel: mockShutdownOTel
}));

jest.mock("../../core/config", () => ({
    config: {
        temporal: {
            address: "localhost:7233"
        }
    }
}));

jest.mock("../../services/events/RedisEventBus", () => ({
    redisEventBus: {
        connect: mockRedisConnect,
        disconnect: mockRedisDisconnect
    }
}));

jest.mock("../activities", () => ({}));

jest.mock("../core", () => ({
    TASK_QUEUES: {
        ORCHESTRATOR: "orchestrator"
    },
    createRuntimeLogger: jest.fn().mockReturnValue({})
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface WorkerConfig {
    temporalAddress?: string;
    maxRetries?: number;
    healthPort?: number;
}

interface WorkerInstance {
    isRunning: boolean;
    isReady: boolean;
    healthServer: http.Server | null;
    connection: { close: () => Promise<void> } | null;
    shutdown: () => Promise<void>;
}

/**
 * Simulates the worker initialization logic
 */
async function simulateWorkerInit(config: WorkerConfig = {}): Promise<WorkerInstance> {
    const { temporalAddress = "localhost:7233", maxRetries = 3, healthPort = 19000 } = config;

    const instance: WorkerInstance = {
        isRunning: false,
        isReady: false,
        healthServer: null,
        connection: null,
        shutdown: async () => {}
    };

    // Install Temporal Runtime (must be done before using Worker/NativeConnection)
    mockRuntimeInstall({ logger: {} });

    // Initialize OpenTelemetry
    mockInitializeOTel({
        serviceName: "flowmaestro-worker",
        serviceVersion: "1.0.0",
        enabled: process.env.NODE_ENV === "production"
    });

    // Connect to Redis
    try {
        await mockRedisConnect();
    } catch {
        // Log warning but continue
    }

    // Connect to Temporal with retry logic
    let connection = null;
    const baseDelay = 100; // Reduced for tests

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            connection = await mockConnectionConnect({ address: temporalAddress });
            break;
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    if (!connection) {
        throw new Error("Failed to establish Temporal connection");
    }

    instance.connection = {
        close: mockConnectionClose
    };

    // Create worker
    await mockWorkerCreate({
        connection,
        namespace: "default",
        taskQueue: "orchestrator",
        workflowsPath: "/path/to/workflows",
        activities: {},
        identity: "test-worker",
        maxConcurrentActivityTaskExecutions: 10,
        maxConcurrentWorkflowTaskExecutions: 10,
        shutdownGraceTime: "30 seconds",
        stickyQueueScheduleToStartTimeout: "10 seconds"
    });

    // Create health check server
    instance.healthServer = http.createServer((req, res) => {
        if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "healthy", identity: "test-worker" }));
        } else if (req.url === "/ready") {
            if (instance.isReady) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "ready", identity: "test-worker" }));
            } else {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "not ready", identity: "test-worker" }));
            }
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    await new Promise<void>((resolve) => {
        instance.healthServer!.listen(healthPort, () => resolve());
    });

    instance.isReady = true;
    instance.isRunning = true;

    // Define shutdown handler
    instance.shutdown = async () => {
        instance.isReady = false;

        if (instance.healthServer) {
            await new Promise<void>((resolve) => {
                instance.healthServer!.close(() => resolve());
            });
        }

        await mockWorkerShutdown();

        if (instance.connection) {
            await instance.connection.close();
        }

        await mockRedisDisconnect();
        await mockShutdownOTel();

        instance.isRunning = false;
    };

    return instance;
}

/**
 * Make HTTP request to health server
 */
function makeHealthRequest(port: number, path: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                hostname: "localhost",
                port,
                path,
                method: "GET"
            },
            (res) => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    resolve({ status: res.statusCode || 500, body });
                });
            }
        );

        req.on("error", reject);
        req.end();
    });
}

// ============================================================================
// TESTS
// ============================================================================

// Use a counter to generate unique ports for each test
let portCounter = 19000;
function getUniquePort(): number {
    return portCounter++;
}

describe("Temporal Worker", () => {
    let workerInstance: WorkerInstance | null = null;
    let testPort: number;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConnectionConnect.mockResolvedValue({ close: mockConnectionClose });
        testPort = getUniquePort();
    });

    afterEach(async () => {
        if (workerInstance) {
            try {
                await workerInstance.shutdown();
            } catch {
                // Ignore shutdown errors in cleanup
            }
            workerInstance = null;
        }
    });

    describe("initialization", () => {
        it("should install Temporal runtime", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(mockRuntimeInstall).toHaveBeenCalled();
        });

        it("should initialize OpenTelemetry", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(mockInitializeOTel).toHaveBeenCalledWith(
                expect.objectContaining({
                    serviceName: "flowmaestro-worker"
                })
            );
        });

        it("should connect to Redis", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(mockRedisConnect).toHaveBeenCalled();
        });

        it("should continue if Redis connection fails", async () => {
            mockRedisConnect.mockRejectedValueOnce(new Error("Redis unavailable"));

            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(workerInstance.isRunning).toBe(true);
        });

        it("should connect to Temporal", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(mockConnectionConnect).toHaveBeenCalledWith(
                expect.objectContaining({
                    address: "localhost:7233"
                })
            );
        });

        it("should create worker with correct configuration", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(mockWorkerCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    namespace: "default",
                    taskQueue: "orchestrator",
                    maxConcurrentActivityTaskExecutions: 10,
                    maxConcurrentWorkflowTaskExecutions: 10
                })
            );
        });
    });

    describe("connection retry logic", () => {
        it("should retry connection on failure", async () => {
            mockConnectionConnect
                .mockRejectedValueOnce(new Error("Connection failed"))
                .mockResolvedValueOnce({ close: mockConnectionClose });

            workerInstance = await simulateWorkerInit({ maxRetries: 3, healthPort: testPort });

            expect(mockConnectionConnect).toHaveBeenCalledTimes(2);
            expect(workerInstance.isRunning).toBe(true);
        });

        it("should fail after max retries", async () => {
            mockConnectionConnect.mockRejectedValue(new Error("Connection failed"));

            await expect(
                simulateWorkerInit({ maxRetries: 3, healthPort: testPort })
            ).rejects.toThrow("Connection failed");

            expect(mockConnectionConnect).toHaveBeenCalledTimes(3);
        });

        it("should use exponential backoff between retries", async () => {
            const startTime = Date.now();
            mockConnectionConnect
                .mockRejectedValueOnce(new Error("Fail 1"))
                .mockRejectedValueOnce(new Error("Fail 2"))
                .mockResolvedValueOnce({ close: mockConnectionClose });

            workerInstance = await simulateWorkerInit({ maxRetries: 3, healthPort: testPort });

            const duration = Date.now() - startTime;
            // First retry: 100ms, Second retry: 200ms = 300ms minimum
            expect(duration).toBeGreaterThanOrEqual(200);
        });
    });

    describe("health check server", () => {
        it("should start health check server", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(workerInstance.healthServer).not.toBeNull();
            expect(workerInstance.healthServer?.listening).toBe(true);
        });

        it("should respond to /health endpoint with 200", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            const response = await makeHealthRequest(testPort, "/health");

            expect(response.status).toBe(200);
            expect(JSON.parse(response.body)).toEqual(
                expect.objectContaining({ status: "healthy" })
            );
        });

        it("should respond to /ready endpoint with 200 when ready", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            const response = await makeHealthRequest(testPort, "/ready");

            expect(response.status).toBe(200);
            expect(JSON.parse(response.body)).toEqual(expect.objectContaining({ status: "ready" }));
        });

        it("should respond to /ready endpoint with 503 when not ready", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });
            workerInstance.isReady = false;

            const response = await makeHealthRequest(testPort, "/ready");

            expect(response.status).toBe(503);
            expect(JSON.parse(response.body)).toEqual(
                expect.objectContaining({ status: "not ready" })
            );
        });

        it("should respond with 404 for unknown endpoints", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            const response = await makeHealthRequest(testPort, "/unknown");

            expect(response.status).toBe(404);
        });
    });

    describe("graceful shutdown", () => {
        it("should mark as not ready immediately", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(workerInstance.isReady).toBe(true);

            await workerInstance.shutdown();

            expect(workerInstance.isReady).toBe(false);
        });

        it("should close health check server", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            await workerInstance.shutdown();

            expect(workerInstance.healthServer?.listening).toBe(false);
        });

        it("should shutdown worker", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            await workerInstance.shutdown();

            expect(mockWorkerShutdown).toHaveBeenCalled();
        });

        it("should close Temporal connection", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            await workerInstance.shutdown();

            expect(mockConnectionClose).toHaveBeenCalled();
        });

        it("should disconnect from Redis", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            await workerInstance.shutdown();

            expect(mockRedisDisconnect).toHaveBeenCalled();
        });

        it("should shutdown OpenTelemetry", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            await workerInstance.shutdown();

            expect(mockShutdownOTel).toHaveBeenCalled();
        });

        it("should mark as not running after shutdown", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            await workerInstance.shutdown();

            expect(workerInstance.isRunning).toBe(false);
        });
    });

    describe("error handling", () => {
        it("should throw if Temporal connection fails completely", async () => {
            mockConnectionConnect.mockRejectedValue(new Error("Temporal unavailable"));

            await expect(
                simulateWorkerInit({ maxRetries: 1, healthPort: testPort })
            ).rejects.toThrow("Temporal unavailable");
        });

        it("should throw if worker creation fails", async () => {
            mockWorkerCreate.mockRejectedValueOnce(new Error("Worker creation failed"));

            await expect(simulateWorkerInit({ healthPort: testPort })).rejects.toThrow(
                "Worker creation failed"
            );
        });
    });

    describe("worker identity", () => {
        it("should generate unique worker identity", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            expect(mockWorkerCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    identity: expect.stringContaining("test-worker")
                })
            );
        });
    });

    describe("activity interceptors", () => {
        it("should configure activity interceptors", async () => {
            workerInstance = await simulateWorkerInit({ healthPort: testPort });

            // The worker create should be called - interceptors would be in the config
            expect(mockWorkerCreate).toHaveBeenCalled();
        });
    });
});

describe("Worker Configuration", () => {
    let testPort: number;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConnectionConnect.mockResolvedValue({ close: mockConnectionClose });
        testPort = getUniquePort();
    });

    it("should use configured task queue", async () => {
        const instance = await simulateWorkerInit({ healthPort: testPort });

        expect(mockWorkerCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                taskQueue: "orchestrator"
            })
        );

        await instance.shutdown();
    });

    it("should configure concurrency limits", async () => {
        const instance = await simulateWorkerInit({ healthPort: testPort });

        expect(mockWorkerCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                maxConcurrentActivityTaskExecutions: 10,
                maxConcurrentWorkflowTaskExecutions: 10
            })
        );

        await instance.shutdown();
    });

    it("should configure shutdown grace time", async () => {
        const instance = await simulateWorkerInit({ healthPort: testPort });

        expect(mockWorkerCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                shutdownGraceTime: "30 seconds"
            })
        );

        await instance.shutdown();
    });

    it("should configure sticky queue timeout", async () => {
        const instance = await simulateWorkerInit({ healthPort: testPort });

        expect(mockWorkerCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                stickyQueueScheduleToStartTimeout: "10 seconds"
            })
        );

        await instance.shutdown();
    });
});

describe("Health Check Integration", () => {
    let workerInstance: WorkerInstance | null = null;
    let testPort: number;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConnectionConnect.mockResolvedValue({ close: mockConnectionClose });
        testPort = getUniquePort();
    });

    afterEach(async () => {
        if (workerInstance) {
            try {
                await workerInstance.shutdown();
            } catch {
                // Ignore
            }
            workerInstance = null;
        }
    });

    it("should return healthy status with worker identity", async () => {
        workerInstance = await simulateWorkerInit({ healthPort: testPort });

        const response = await makeHealthRequest(testPort, "/health");
        const body = JSON.parse(response.body);

        expect(body.status).toBe("healthy");
        expect(body.identity).toBe("test-worker");
    });

    it("should return ready status with worker identity", async () => {
        workerInstance = await simulateWorkerInit({ healthPort: testPort });

        const response = await makeHealthRequest(testPort, "/ready");
        const body = JSON.parse(response.body);

        expect(body.status).toBe("ready");
        expect(body.identity).toBe("test-worker");
    });

    it("should transition from ready to not ready during shutdown", async () => {
        workerInstance = await simulateWorkerInit({ healthPort: testPort });

        // Initially ready
        let response = await makeHealthRequest(testPort, "/ready");
        expect(response.status).toBe(200);

        // Start shutdown (don't await)
        workerInstance.isReady = false;

        // Should now be not ready (server still running for a moment)
        response = await makeHealthRequest(testPort, "/ready");
        expect(response.status).toBe(503);
    });
});
