import { Search, FlaskConical, Loader2, RefreshCw } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { getSandboxFixtures, type SandboxFixtureSummary } from "../../../lib/api";
import { logger } from "../../../lib/logger";
import { Button } from "../../common/Button";
import { Dialog } from "../../common/Dialog";
import { OperationCard } from "../sandbox/OperationCard";

interface SandboxDataExplorerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    provider: string;
    providerDisplayName: string;
    providerIcon?: React.ReactNode;
}

/**
 * Sandbox Data Explorer Dialog
 *
 * Displays all sandbox fixtures for a provider with search and filtering.
 */
export function SandboxDataExplorerDialog({
    isOpen,
    onClose,
    provider,
    providerDisplayName,
    providerIcon
}: SandboxDataExplorerDialogProps) {
    const [operations, setOperations] = useState<SandboxFixtureSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Load fixtures when dialog opens
    useEffect(() => {
        if (isOpen && provider) {
            loadFixtures();
        }
    }, [isOpen, provider]);

    const loadFixtures = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await getSandboxFixtures(provider);
            setOperations(response.data.operations);
        } catch (err) {
            logger.error("Failed to load sandbox fixtures", err);
            setError(err instanceof Error ? err.message : "Failed to load fixtures");
        } finally {
            setIsLoading(false);
        }
    };

    // Filter operations by search query
    const filteredOperations = useMemo(() => {
        if (!searchQuery) return operations;

        const query = searchQuery.toLowerCase();
        return operations.filter((op) => op.operationId.toLowerCase().includes(query));
    }, [operations, searchQuery]);

    // Calculate stats
    const stats = useMemo(() => {
        return {
            total: operations.length,
            filterable: operations.filter((op) => op.hasFilterableData).length,
            totalCases: operations.reduce(
                (acc, op) => acc + op.validCaseCount + op.errorCaseCount + op.edgeCaseCount,
                0
            )
        };
    }, [operations]);

    const header = (
        <div className="flex items-center gap-3">
            {providerIcon && <div className="w-8 h-8 flex-shrink-0">{providerIcon}</div>}
            <div>
                <h2 className="text-lg font-semibold text-foreground">Sandbox Data Explorer</h2>
                <p className="text-sm text-muted-foreground">
                    {providerDisplayName} mock data and test cases
                </p>
            </div>
        </div>
    );

    return (
        <Dialog isOpen={isOpen} onClose={onClose} header={header} size="5xl" maxHeight="85vh">
            <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <FlaskConical className="w-4 h-4" />
                            <span>
                                {stats.total} operations, {stats.totalCases} test cases
                            </span>
                        </div>
                        {stats.filterable > 0 && (
                            <span className="text-muted-foreground">
                                {stats.filterable} filterable
                            </span>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={loadFixtures} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search operations..."
                        className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    {searchQuery && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {filteredOperations.length} results
                        </span>
                    )}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading fixtures...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-md">
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        <Button variant="ghost" size="sm" onClick={loadFixtures} className="mt-2">
                            Retry
                        </Button>
                    </div>
                ) : filteredOperations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <FlaskConical className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? "No operations match your search"
                                : "No fixtures available for this provider"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredOperations.map((operation) => (
                            <OperationCard
                                key={operation.operationId}
                                provider={provider}
                                operation={operation}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Dialog>
    );
}
