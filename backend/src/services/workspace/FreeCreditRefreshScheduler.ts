import { createServiceLogger } from "../../core/logging";
import { CreditService } from "./CreditService";

const logger = createServiceLogger("FreeCreditRefreshScheduler");

/**
 * Monthly credit refresh for free workspaces.
 *
 * Paid plans get their monthly credits from the Stripe renewal webhook. Free
 * workspaces have no renewal event, so this scheduler runs hourly and resets the
 * subscription balance of every free workspace whose period has elapsed. The reset
 * itself is one atomic statement over locked rows (see
 * WorkspaceCreditRepository.refreshFreeSubscriptions), so running it from several
 * api replicas is safe.
 */
export class FreeCreditRefreshScheduler {
    private creditService = new CreditService();
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;
    private cycleInProgress = false;

    private readonly CHECK_INTERVAL = 60 * 60 * 1000; // hourly

    start(): void {
        if (this.isRunning) {
            logger.info("Scheduler already running");
            return;
        }

        this.isRunning = true;

        this.runCycle().catch((error) => {
            logger.error({ err: error }, "Initial free credit refresh failed");
        });

        this.intervalId = setInterval(() => {
            this.runCycle().catch((error) => {
                logger.error({ err: error }, "Free credit refresh failed");
            });
        }, this.CHECK_INTERVAL);

        logger.info({ checkIntervalSec: this.CHECK_INTERVAL / 1000 }, "Scheduler started");
    }

    stop(): void {
        if (!this.isRunning) {
            return;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        logger.info("Scheduler stopped");
    }

    private async runCycle(): Promise<void> {
        if (this.cycleInProgress) {
            return;
        }
        this.cycleInProgress = true;
        try {
            const count = await this.creditService.refreshFreeWorkspaceCredits();
            logger.debug({ count }, "Free credit refresh cycle completed");
        } finally {
            this.cycleInProgress = false;
        }
    }
}

export const freeCreditRefreshScheduler = new FreeCreditRefreshScheduler();
