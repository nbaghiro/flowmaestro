/**
 * Circuit Breaker Pattern Implementation
 *
 * Protects the system from cascading failures by temporarily blocking
 * operations that are consistently failing.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Blocking all requests, failures exceed threshold
 * - HALF_OPEN: Testing if system recovered, allow one request
 */

export enum CircuitState {
    CLOSED = "CLOSED", // Normal operation
    OPEN = "OPEN", // Blocking requests
    HALF_OPEN = "HALF_OPEN" // Testing recovery
}

export interface CircuitBreakerConfig {
    /**
     * Number of consecutive failures before opening circuit
     * @default 3
     */
    failureThreshold: number;

    /**
     * Time in milliseconds to wait before attempting recovery (HALF_OPEN)
     * @default 60000 (1 minute)
     */
    resetTimeout: number;

    /**
     * Name of the circuit breaker (for logging)
     */
    name: string;

    /**
     * Optional callback when circuit opens
     */
    onOpen?: () => void;

    /**
     * Optional callback when circuit closes (recovers)
     */
    onClose?: () => void;
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount = 0;
    private lastFailureTime: number | null = null;
    private resetTimer: NodeJS.Timeout | null = null;

    constructor(private config: CircuitBreakerConfig) {}

    /**
     * Get current circuit breaker state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get statistics
     */
    getStats(): {
        state: CircuitState;
        failureCount: number;
        lastFailureTime: number | null;
    } {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
        };
    }

    /**
     * Execute a function with circuit breaker protection
     *
     * @param fn Function to execute
     * @returns Result of the function
     * @throws CircuitBreakerOpenError if circuit is open
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if circuit is OPEN
        if (this.state === CircuitState.OPEN) {
            // Check if reset timeout has passed
            if (this.shouldAttemptReset()) {
                console.log(`[CircuitBreaker:${this.config.name}] Attempting reset (HALF_OPEN)`);
                this.state = CircuitState.HALF_OPEN;
            } else {
                throw new CircuitBreakerOpenError(
                    `Circuit breaker [${this.config.name}] is OPEN. ` +
                        `Last failure: ${this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : "unknown"}`
                );
            }
        }

        // Execute the function
        try {
            const result = await fn();

            // Success! Record it
            this.onSuccess();

            return result;
        } catch (error) {
            // Failure! Record it
            this.onFailure();

            throw error;
        }
    }

    /**
     * Check if circuit is open (blocking requests)
     */
    isOpen(): boolean {
        return this.state === CircuitState.OPEN;
    }

    /**
     * Check if circuit is closed (allowing requests)
     */
    isClosed(): boolean {
        return this.state === CircuitState.CLOSED;
    }

    /**
     * Manually open the circuit (for testing or emergency use)
     */
    forceOpen(): void {
        console.log(`[CircuitBreaker:${this.config.name}] Manually opened`);
        this.state = CircuitState.OPEN;
        this.lastFailureTime = Date.now();
        this.scheduleReset();
    }

    /**
     * Manually close the circuit (reset to normal)
     */
    forceClose(): void {
        console.log(`[CircuitBreaker:${this.config.name}] Manually closed (reset)`);
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.clearResetTimer();
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        // If we were HALF_OPEN, we've recovered!
        if (this.state === CircuitState.HALF_OPEN) {
            console.log(
                `[CircuitBreaker:${this.config.name}] ✓ Recovery successful, ` +
                    `closing circuit (failures: ${this.failureCount})`
            );
            this.state = CircuitState.CLOSED;
            this.failureCount = 0;
            this.lastFailureTime = null;
            this.clearResetTimer();

            // Notify recovery
            if (this.config.onClose) {
                this.config.onClose();
            }
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success
            if (this.failureCount > 0) {
                console.log(
                    `[CircuitBreaker:${this.config.name}] Success after ${this.failureCount} failures, ` +
                        "resetting counter"
                );
                this.failureCount = 0;
            }
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        console.log(
            `[CircuitBreaker:${this.config.name}] ✗ Failure ${this.failureCount}/${this.config.failureThreshold} ` +
                `(state: ${this.state})`
        );

        // If we're HALF_OPEN and fail, go back to OPEN
        if (this.state === CircuitState.HALF_OPEN) {
            console.log(
                `[CircuitBreaker:${this.config.name}] HALF_OPEN test failed, reopening circuit`
            );
            this.state = CircuitState.OPEN;
            this.scheduleReset();
        }
        // If we're CLOSED and hit threshold, OPEN the circuit
        else if (
            this.state === CircuitState.CLOSED &&
            this.failureCount >= this.config.failureThreshold
        ) {
            console.error(
                `[CircuitBreaker:${this.config.name}] ⚠️  Failure threshold reached, OPENING circuit ` +
                    `(will retry in ${this.config.resetTimeout / 1000}s)`
            );
            this.state = CircuitState.OPEN;
            this.scheduleReset();

            // Notify circuit opened
            if (this.config.onOpen) {
                this.config.onOpen();
            }
        }
    }

    /**
     * Check if we should attempt to reset (HALF_OPEN)
     */
    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) return false;

        const timeSinceLastFailure = Date.now() - this.lastFailureTime;
        return timeSinceLastFailure >= this.config.resetTimeout;
    }

    /**
     * Schedule automatic reset attempt
     */
    private scheduleReset(): void {
        this.clearResetTimer();

        this.resetTimer = setTimeout(() => {
            if (this.state === CircuitState.OPEN) {
                console.log(
                    `[CircuitBreaker:${this.config.name}] Reset timeout reached, ` +
                        "transitioning to HALF_OPEN"
                );
                this.state = CircuitState.HALF_OPEN;
            }
        }, this.config.resetTimeout);
    }

    /**
     * Clear reset timer
     */
    private clearResetTimer(): void {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.clearResetTimer();
    }
}

/**
 * Custom error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CircuitBreakerOpenError";
    }
}
