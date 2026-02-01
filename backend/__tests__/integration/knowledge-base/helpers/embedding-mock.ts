/**
 * Embedding Mock Helpers
 *
 * Provides deterministic embedding generation for knowledge base tests.
 * Embeddings are generated based on text hash to ensure consistent, reproducible results.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MockEmbeddingService {
    /** Generate embedding for a single text */
    generateEmbedding: jest.Mock<Promise<number[]>, [string]>;
    /** Generate embeddings for multiple texts (batch) */
    generateEmbeddings: jest.Mock<Promise<number[][]>, [string[]]>;
    /** Generate query embedding (same as generateEmbedding) */
    generateQueryEmbedding: jest.Mock<Promise<number[]>, [string]>;
    /** Get call history */
    getCallHistory: () => EmbeddingCall[];
    /** Clear call history */
    clearHistory: () => void;
    /** Get total tokens used */
    getTotalTokens: () => number;
    /** Reset the mock */
    reset: () => void;
}

export interface EmbeddingCall {
    type: "single" | "batch" | "query";
    texts: string[];
    timestamp: number;
    tokenCount: number;
}

export interface EmbeddingMockOptions {
    /** Embedding dimensions (default: 1536 for OpenAI text-embedding-3-small) */
    dimensions?: number;
    /** Simulated delay per embedding in ms (default: 0) */
    delayMs?: number;
    /** Tokens per 1000 characters (default: 250) */
    tokensPerKChars?: number;
    /** Should fail on specific texts */
    failOnTexts?: string[];
    /** Error message when failing */
    errorMessage?: string;
}

// ============================================================================
// DETERMINISTIC EMBEDDING GENERATION
// ============================================================================

/**
 * Simple hash function for deterministic embedding generation.
 * Uses djb2 algorithm with additional mixing.
 */
function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0; // Convert to unsigned
}

/**
 * Generate a deterministic embedding based on text content.
 * The same text will always produce the same embedding.
 */
export function generateDeterministicEmbedding(text: string, dimensions: number = 1536): number[] {
    const seed = hashString(text);
    const embedding: number[] = [];

    // Use a simple LCG (Linear Congruential Generator) seeded by the hash
    let state = seed;
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    for (let i = 0; i < dimensions; i++) {
        state = (a * state + c) % m;
        // Normalize to [-1, 1] range
        embedding.push((state / m) * 2 - 1);
    }

    // Normalize the vector to unit length (L2 normalization)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
}

/**
 * Generate an embedding similar to a base embedding with controllable similarity.
 * Useful for testing similarity search with known similarity scores.
 *
 * @param base - The base embedding to be similar to
 * @param similarity - Target cosine similarity (0.0 to 1.0)
 * @param seed - Optional seed for reproducible results
 */
export function generateSimilarEmbedding(
    base: number[],
    similarity: number,
    seed: number = Date.now()
): number[] {
    if (similarity < 0 || similarity > 1) {
        throw new Error("Similarity must be between 0 and 1");
    }

    const dimensions = base.length;

    // Generate a random orthogonal component
    let state = seed;
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    const random: number[] = [];
    for (let i = 0; i < dimensions; i++) {
        state = (a * state + c) % m;
        random.push((state / m) * 2 - 1);
    }

    // Make random vector orthogonal to base using Gram-Schmidt
    const dotProduct = base.reduce((sum, val, i) => sum + val * random[i], 0);
    const orthogonal = random.map((val, i) => val - dotProduct * base[i]);

    // Normalize orthogonal vector
    const orthMag = Math.sqrt(orthogonal.reduce((sum, val) => sum + val * val, 0));
    const normalizedOrth = orthogonal.map((val) => val / orthMag);

    // Combine: result = similarity * base + sqrt(1 - similarity^2) * orthogonal
    const orthWeight = Math.sqrt(1 - similarity * similarity);
    const result = base.map((val, i) => similarity * val + orthWeight * normalizedOrth[i]);

    // Normalize result
    const resultMag = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
    return result.map((val) => val / resultMag);
}

/**
 * Calculate cosine similarity between two embeddings.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error("Embeddings must have the same dimensions");
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magA * magB);
}

// ============================================================================
// MOCK EMBEDDING SERVICE
// ============================================================================

/**
 * Create a mock embedding service with deterministic behavior.
 */
export function createMockEmbeddingService(
    options: EmbeddingMockOptions = {}
): MockEmbeddingService {
    const {
        dimensions = 1536,
        delayMs = 0,
        tokensPerKChars = 250,
        failOnTexts = [],
        errorMessage = "Embedding generation failed"
    } = options;

    const callHistory: EmbeddingCall[] = [];
    let totalTokens = 0;

    const calculateTokens = (text: string): number => {
        return Math.ceil((text.length / 1000) * tokensPerKChars);
    };

    const checkFailure = (texts: string[]): void => {
        for (const text of texts) {
            if (failOnTexts.some((failText) => text.includes(failText))) {
                throw new Error(errorMessage);
            }
        }
    };

    const delay = async (): Promise<void> => {
        if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    };

    const generateEmbedding = jest.fn(async (text: string): Promise<number[]> => {
        checkFailure([text]);
        await delay();

        const tokens = calculateTokens(text);
        totalTokens += tokens;
        callHistory.push({
            type: "single",
            texts: [text],
            timestamp: Date.now(),
            tokenCount: tokens
        });

        return generateDeterministicEmbedding(text, dimensions);
    });

    const generateEmbeddings = jest.fn(async (texts: string[]): Promise<number[][]> => {
        checkFailure(texts);
        await delay();

        const tokens = texts.reduce((sum, text) => sum + calculateTokens(text), 0);
        totalTokens += tokens;
        callHistory.push({
            type: "batch",
            texts,
            timestamp: Date.now(),
            tokenCount: tokens
        });

        return texts.map((text) => generateDeterministicEmbedding(text, dimensions));
    });

    const generateQueryEmbedding = jest.fn(async (text: string): Promise<number[]> => {
        checkFailure([text]);
        await delay();

        const tokens = calculateTokens(text);
        totalTokens += tokens;
        callHistory.push({
            type: "query",
            texts: [text],
            timestamp: Date.now(),
            tokenCount: tokens
        });

        return generateDeterministicEmbedding(text, dimensions);
    });

    return {
        generateEmbedding,
        generateEmbeddings,
        generateQueryEmbedding,
        getCallHistory: () => [...callHistory],
        clearHistory: () => {
            callHistory.length = 0;
        },
        getTotalTokens: () => totalTokens,
        reset: () => {
            callHistory.length = 0;
            totalTokens = 0;
            generateEmbedding.mockClear();
            generateEmbeddings.mockClear();
            generateQueryEmbedding.mockClear();
        }
    };
}

// ============================================================================
// PRE-GENERATED EMBEDDINGS FOR COMMON TEST SCENARIOS
// ============================================================================

/**
 * Pre-generated embeddings for common test texts.
 * These ensure consistent test results across runs.
 */
export const testEmbeddings = {
    /** Embedding for "vacation policy" query */
    vacationPolicy: generateDeterministicEmbedding("vacation policy"),
    /** Embedding for "remote work" query */
    remoteWork: generateDeterministicEmbedding("remote work"),
    /** Embedding for "expense reimbursement" query */
    expenseReimbursement: generateDeterministicEmbedding("expense reimbursement"),
    /** Embedding for "security protocols" query */
    securityProtocols: generateDeterministicEmbedding("security protocols"),
    /** Embedding for "onboarding process" query */
    onboardingProcess: generateDeterministicEmbedding("onboarding process")
};

/**
 * Generate a set of related embeddings for testing similarity search.
 * Returns embeddings with decreasing similarity to the query.
 */
export function generateTestEmbeddingSet(
    queryText: string,
    count: number = 5,
    dimensions: number = 1536
): {
    query: number[];
    results: Array<{ embedding: number[]; similarity: number }>;
} {
    const query = generateDeterministicEmbedding(queryText, dimensions);
    const results: Array<{ embedding: number[]; similarity: number }> = [];

    // Generate embeddings with decreasing similarity (0.95, 0.85, 0.75, etc.)
    for (let i = 0; i < count; i++) {
        const similarity = 0.95 - i * 0.1;
        if (similarity > 0) {
            const embedding = generateSimilarEmbedding(query, similarity, i);
            results.push({
                embedding,
                similarity: Math.round(similarity * 100) / 100 // Round to 2 decimal places
            });
        }
    }

    return { query, results };
}
