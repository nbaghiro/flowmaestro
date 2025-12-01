/**
 * SpanService - Distributed Tracing Service
 * Implements Mastra-inspired span-based observability
 */

import { randomUUID } from "crypto";
import { calculateCost } from "./cost-calculator";
import {
    CreateSpanInput,
    EndSpanInput,
    Span,
    SpanContext,
    SpanError,
    SpanFilters,
    SpanStatus,
    SpanType,
    Trace,
    PaginatedSpans,
    PaginationOptions
} from "./span-types";
import type { Pool } from "pg";

/**
 * Configuration for SpanService
 */
export interface SpanServiceConfig {
    pool: Pool;
    batchSize?: number; // Number of spans to batch before writing
    flushIntervalMs?: number; // Max time to wait before flushing batch
}

/**
 * Active span class with fluent API
 */
export class ActiveSpan {
    private spanData: Span;
    private service: SpanService;
    private isEnded = false;

    constructor(span: Span, service: SpanService) {
        this.spanData = span;
        this.service = service;
    }

    get spanId(): string {
        return this.spanData.spanId;
    }

    get traceId(): string {
        return this.spanData.traceId;
    }

    getContext(): SpanContext {
        return {
            traceId: this.spanData.traceId,
            spanId: this.spanData.spanId,
            parentSpanId: this.spanData.parentSpanId
        };
    }

    /**
     * Create a child span
     */
    createChild(input: Omit<CreateSpanInput, "traceId" | "parentSpanId">): ActiveSpan {
        return this.service.createSpan({
            ...input,
            traceId: this.spanData.traceId,
            parentSpanId: this.spanData.spanId
        });
    }

    /**
     * Set attributes on the span
     */
    setAttributes(attributes: Record<string, string | number | boolean>): void {
        this.spanData.attributes = {
            ...this.spanData.attributes,
            ...attributes
        };
    }

    /**
     * Add metadata to the span
     */
    setMetadata(metadata: Record<string, unknown>): void {
        this.spanData.metadata = {
            ...this.spanData.metadata,
            ...metadata
        };
    }

    /**
     * End the span successfully
     */
    async end(input?: Omit<EndSpanInput, "spanId">): Promise<void> {
        if (this.isEnded) {
            console.warn(`Span ${this.spanData.spanId} already ended`);
            return;
        }

        this.isEnded = true;

        await this.service.endSpan({
            spanId: this.spanData.spanId,
            ...input
        });
    }

    /**
     * End the span with an error
     */
    async endWithError(error: Error | SpanError): Promise<void> {
        await this.end({ error });
    }

    /**
     * Get the span data (for testing/debugging)
     */
    getData(): Span {
        return { ...this.spanData };
    }
}

/**
 * SpanService - Main service for span management
 */
export class SpanService {
    private pool: Pool;
    private spanBatch: Span[] = [];
    private batchSize: number;
    private flushIntervalMs: number;
    private flushTimer?: NodeJS.Timeout;

    constructor(config: SpanServiceConfig) {
        this.pool = config.pool;
        this.batchSize = config.batchSize ?? 10;
        this.flushIntervalMs = config.flushIntervalMs ?? 5000;

        // Start flush timer
        this.startFlushTimer();
    }

    /**
     * Create a new span
     */
    createSpan(input: CreateSpanInput): ActiveSpan {
        const traceId = input.traceId ?? randomUUID();
        const spanId = randomUUID();
        const now = new Date();

        const span: Span = {
            traceId,
            spanId,
            parentSpanId: input.parentSpanId,
            name: input.name,
            spanType: input.spanType,
            entityId: input.entityId,
            startedAt: now,
            status: SpanStatus.STARTED,
            input: input.input,
            attributes: input.attributes,
            metadata: input.metadata
        };

        // Add to batch for async storage
        this.spanBatch.push(span);

        // Check if we need to flush
        if (this.spanBatch.length >= this.batchSize) {
            void this.flush();
        }

        return new ActiveSpan(span, this);
    }

    /**
     * End a span
     */
    async endSpan(input: EndSpanInput): Promise<void> {
        const now = new Date();

        // Find span in batch
        const span = this.spanBatch.find((s) => s.spanId === input.spanId);

        if (!span) {
            console.warn(`Span ${input.spanId} not found in batch`);
            return;
        }

        // Update span
        span.endedAt = now;
        span.durationMs = now.getTime() - span.startedAt.getTime();
        span.status = input.error ? SpanStatus.FAILED : SpanStatus.COMPLETED;

        if (input.output) {
            span.output = input.output;
        }

        if (input.error) {
            span.error = this.normalizeError(input.error);
        }

        if (input.attributes) {
            span.attributes = {
                ...span.attributes,
                ...input.attributes
            };
        }

        // Auto-calculate cost for MODEL_GENERATION spans with token usage
        if (
            span.spanType === SpanType.MODEL_GENERATION &&
            span.attributes?.provider &&
            span.attributes?.model &&
            span.attributes?.promptTokens &&
            span.attributes?.completionTokens
        ) {
            const costResult = calculateCost({
                provider: String(span.attributes.provider),
                model: String(span.attributes.model),
                promptTokens: Number(span.attributes.promptTokens),
                completionTokens: Number(span.attributes.completionTokens)
            });

            if (costResult.found) {
                span.attributes.inputCost = costResult.inputCost;
                span.attributes.outputCost = costResult.outputCost;
                span.attributes.totalCost = costResult.totalCost;

                console.log(
                    `[SpanService] Calculated cost for ${span.attributes.provider}:${span.attributes.model}: $${costResult.totalCost.toFixed(6)}`
                );
            } else {
                console.warn(
                    `[SpanService] No pricing found for ${span.attributes.provider}:${span.attributes.model}`
                );
            }
        }

        // Flush immediately on error for debugging
        if (input.error) {
            await this.flush();
        }
    }

    /**
     * Update attributes on a span that's still in the batch
     * Note: This only works for spans that haven't been flushed yet
     */
    updateSpanAttributes(
        spanId: string,
        attributes: Record<string, string | number | boolean>
    ): void {
        const span = this.spanBatch.find((s) => s.spanId === spanId);

        if (!span) {
            console.warn(`Span ${spanId} not found in batch, may have been flushed`);
            return;
        }

        span.attributes = {
            ...span.attributes,
            ...attributes
        };
    }

    /**
     * Get a trace by ID
     */
    async getTrace(traceId: string): Promise<Trace | null> {
        const result = await this.pool.query<Span>(
            `
            SELECT * FROM flowmaestro.execution_spans
            WHERE trace_id = $1
            ORDER BY started_at ASC
            `,
            [traceId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const spans = result.rows.map(this.mapRowToSpan);
        const rootSpan = spans.find((s) => !s.parentSpanId) || spans[0];

        return {
            traceId,
            rootSpan,
            spans,
            startedAt: rootSpan.startedAt,
            endedAt: rootSpan.endedAt,
            durationMs: rootSpan.durationMs,
            status: rootSpan.status
        };
    }

    /**
     * Query spans with filters and pagination
     */
    async querySpans(
        filters: SpanFilters,
        pagination?: PaginationOptions
    ): Promise<PaginatedSpans> {
        const page = pagination?.page ?? 0;
        const perPage = pagination?.perPage ?? 50;
        const offset = page * perPage;

        // Build WHERE clause
        const conditions: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (filters.traceId) {
            conditions.push(`trace_id = $${paramIndex++}`);
            params.push(filters.traceId);
        }

        if (filters.spanType) {
            if (Array.isArray(filters.spanType)) {
                conditions.push(`span_type = ANY($${paramIndex++})`);
                params.push(filters.spanType);
            } else {
                conditions.push(`span_type = $${paramIndex++}`);
                params.push(filters.spanType);
            }
        }

        if (filters.entityId) {
            conditions.push(`entity_id = $${paramIndex++}`);
            params.push(filters.entityId);
        }

        if (filters.userId) {
            conditions.push(`attributes->>'userId' = $${paramIndex++}`);
            params.push(filters.userId);
        }

        if (filters.status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(filters.status);
        }

        if (filters.dateRange?.start) {
            conditions.push(`started_at >= $${paramIndex++}`);
            params.push(filters.dateRange.start);
        }

        if (filters.dateRange?.end) {
            conditions.push(`started_at <= $${paramIndex++}`);
            params.push(filters.dateRange.end);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Get total count
        const countResult = await this.pool.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM flowmaestro.execution_spans ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        // Get spans
        const spansResult = await this.pool.query<Span>(
            `
            SELECT * FROM flowmaestro.execution_spans
            ${whereClause}
            ORDER BY started_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `,
            [...params, perPage, offset]
        );

        const spans = spansResult.rows.map(this.mapRowToSpan);

        return {
            spans,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage)
        };
    }

    /**
     * Get token usage by entity (agent/workflow)
     */
    async getTokenUsage(
        entityId: string,
        dateRange?: { start: Date; end: Date }
    ): Promise<{
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }> {
        const conditions = ["span_type = $1", "entity_id = $2"];
        const params: unknown[] = [SpanType.MODEL_GENERATION, entityId];
        let paramIndex = 3;

        if (dateRange?.start) {
            conditions.push(`started_at >= $${paramIndex++}`);
            params.push(dateRange.start);
        }

        if (dateRange?.end) {
            conditions.push(`started_at <= $${paramIndex++}`);
            params.push(dateRange.end);
        }

        const result = await this.pool.query<{
            prompt_tokens: string;
            completion_tokens: string;
            total_tokens: string;
        }>(
            `
            SELECT
                COALESCE(SUM((attributes->>'promptTokens')::int), 0) as prompt_tokens,
                COALESCE(SUM((attributes->>'completionTokens')::int), 0) as completion_tokens,
                COALESCE(SUM((attributes->>'totalTokens')::int), 0) as total_tokens
            FROM flowmaestro.execution_spans
            WHERE ${conditions.join(" AND ")}
            `,
            params
        );

        return {
            promptTokens: parseInt(result.rows[0].prompt_tokens, 10),
            completionTokens: parseInt(result.rows[0].completion_tokens, 10),
            totalTokens: parseInt(result.rows[0].total_tokens, 10)
        };
    }

    /**
     * Flush pending spans to database
     */
    async flush(): Promise<void> {
        if (this.spanBatch.length === 0) {
            return;
        }

        const spansToWrite = [...this.spanBatch];
        this.spanBatch = [];

        try {
            // Batch insert
            const values: unknown[] = [];
            const placeholders: string[] = [];

            spansToWrite.forEach((span, index) => {
                const base = index * 14;
                placeholders.push(
                    `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14})`
                );

                values.push(
                    span.traceId,
                    span.spanId,
                    span.parentSpanId ?? null,
                    span.name,
                    span.spanType,
                    span.entityId ?? null,
                    span.startedAt,
                    span.endedAt ?? null,
                    span.durationMs ?? null,
                    span.status,
                    JSON.stringify(span.input ?? null),
                    JSON.stringify(span.output ?? null),
                    JSON.stringify(span.error ?? null),
                    JSON.stringify({
                        ...span.attributes,
                        ...span.metadata
                    })
                );
            });

            await this.pool.query(
                `
                INSERT INTO flowmaestro.execution_spans
                (trace_id, span_id, parent_span_id, name, span_type, entity_id,
                 started_at, ended_at, duration_ms, status, input, output, error, attributes)
                VALUES ${placeholders.join(", ")}
                `,
                values
            );
        } catch (error) {
            console.error("Failed to flush spans to database:", error);
            // Re-add failed spans back to batch for retry
            this.spanBatch.push(...spansToWrite);
        }
    }

    /**
     * Shutdown the service and flush remaining spans
     */
    async shutdown(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        await this.flush();
    }

    /**
     * Start periodic flush timer
     */
    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => {
            void this.flush();
        }, this.flushIntervalMs);
    }

    /**
     * Normalize error to SpanError
     */
    private normalizeError(error: Error | SpanError): SpanError {
        if ("message" in error && "type" in error) {
            return error as SpanError;
        }

        const err = error as Error;
        return {
            message: err.message,
            type: err.name || "Error",
            stack: err.stack,
            code: (err as Error & { code?: string }).code
        };
    }

    /**
     * Map database row to Span object
     */
    private mapRowToSpan(row: unknown): Span {
        const r = row as {
            trace_id: string;
            span_id: string;
            parent_span_id: string | null;
            name: string;
            span_type: SpanType;
            entity_id: string | null;
            started_at: Date;
            ended_at: Date | null;
            duration_ms: number | null;
            status: SpanStatus;
            input: string | null;
            output: string | null;
            error: string | null;
            attributes: string;
        };

        return {
            traceId: r.trace_id,
            spanId: r.span_id,
            parentSpanId: r.parent_span_id ?? undefined,
            name: r.name,
            spanType: r.span_type,
            entityId: r.entity_id ?? undefined,
            startedAt: new Date(r.started_at),
            endedAt: r.ended_at ? new Date(r.ended_at) : undefined,
            durationMs: r.duration_ms ?? undefined,
            status: r.status,
            input: r.input ? JSON.parse(r.input) : undefined,
            output: r.output ? JSON.parse(r.output) : undefined,
            error: r.error ? JSON.parse(r.error) : undefined,
            attributes: JSON.parse(r.attributes)
        };
    }
}

/**
 * Singleton instance for easy access
 */
let spanServiceInstance: SpanService | null = null;

export function initializeSpanService(config: SpanServiceConfig): SpanService {
    spanServiceInstance = new SpanService(config);
    return spanServiceInstance;
}

export function getSpanService(): SpanService {
    if (!spanServiceInstance) {
        throw new Error("SpanService not initialized. Call initializeSpanService first.");
    }
    return spanServiceInstance;
}
