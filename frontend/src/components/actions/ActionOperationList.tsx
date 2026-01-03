/**
 * Action Operation List Component
 * Displays write operations for a selected provider with search functionality
 */

import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Loader2, Play } from "lucide-react";
import { useState, useMemo } from "react";
import { getProviderOperations, type OperationSummary } from "../../lib/api";
import { cn } from "../../lib/utils";
import type { ActionProviderSummary } from "./ActionProviderList";

interface ActionOperationListProps {
    provider: ActionProviderSummary;
    onSelectOperation: (operation: OperationSummary) => void;
    onBack: () => void;
}

export function ActionOperationList({
    provider,
    onSelectOperation,
    onBack
}: ActionOperationListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [imageError, setImageError] = useState(false);

    const {
        data: operationsResponse,
        isLoading,
        error
    } = useQuery({
        queryKey: ["providerActions", provider.providerId],
        queryFn: () => getProviderOperations(provider.providerId, "action"),
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    });

    const operations = operationsResponse?.data?.operations || [];

    // Filter operations by search query
    const filteredOperations = useMemo(() => {
        if (!searchQuery.trim()) {
            return operations;
        }

        const query = searchQuery.toLowerCase();
        return operations.filter(
            (operation) =>
                operation.name.toLowerCase().includes(query) ||
                operation.description.toLowerCase().includes(query) ||
                operation.category?.toLowerCase().includes(query)
        );
    }, [operations, searchQuery]);

    // Group operations by category
    const groupedOperations = useMemo(() => {
        const groups: Record<string, OperationSummary[]> = {};

        for (const operation of filteredOperations) {
            const category = operation.category || "General";
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(operation);
        }

        // Sort categories alphabetically
        const sortedCategories = Object.keys(groups).sort();

        return sortedCategories.map((category) => ({
            category,
            operations: groups[category]
        }));
    }, [filteredOperations]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                    Failed to load actions. Please try again.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Breadcrumb Header */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Back to providers"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Actions in
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                        {imageError || !provider.logoUrl ? (
                            <span className="text-xs font-semibold text-muted-foreground">
                                {provider.name.charAt(0).toUpperCase()}
                            </span>
                        ) : (
                            <img
                                src={provider.logoUrl}
                                alt={provider.name}
                                className="w-4 h-4 object-contain"
                                onError={() => setImageError(true)}
                            />
                        )}
                    </div>
                    <span className="font-medium text-sm">{provider.name}</span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search for an action in ${provider.name}...`}
                    className={cn(
                        "w-full pl-10 pr-4 py-2 text-sm",
                        "bg-background border border-border rounded-lg",
                        "placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    )}
                />
            </div>

            {/* Operation List */}
            {filteredOperations.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        {searchQuery
                            ? "No actions match your search"
                            : "No actions available for this provider"}
                    </p>
                </div>
            ) : groupedOperations.length === 1 ? (
                // Single category - show flat list
                <div className="space-y-1">
                    {filteredOperations.map((operation) => (
                        <OperationItem
                            key={operation.id}
                            operation={operation}
                            provider={provider}
                            onClick={() => onSelectOperation(operation)}
                        />
                    ))}
                </div>
            ) : (
                // Multiple categories - show grouped list
                <div className="space-y-4">
                    {groupedOperations.map((group) => (
                        <div key={group.category}>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                {group.category}
                            </h4>
                            <div className="space-y-1">
                                {group.operations.map((operation) => (
                                    <OperationItem
                                        key={operation.id}
                                        operation={operation}
                                        provider={provider}
                                        onClick={() => onSelectOperation(operation)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface OperationItemProps {
    operation: OperationSummary;
    provider: ActionProviderSummary;
    onClick: () => void;
}

function OperationItem({ operation, provider, onClick }: OperationItemProps) {
    const [imageError, setImageError] = useState(false);

    // Format operation name for display
    const formatOperationName = (name: string): string => {
        // Replace underscores with spaces
        let formatted = name.replace(/_/g, " ");
        // Add spaces before capital letters (camelCase to space case)
        formatted = formatted.replace(/([A-Z])/g, " $1");
        // Capitalize first letter and trim
        return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 p-3",
                "bg-card hover:bg-muted/50 rounded-lg border border-border",
                "transition-colors cursor-pointer text-left"
            )}
        >
            {/* Operation Icon (uses provider logo with play indicator) */}
            <div className="relative w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {imageError || !provider.logoUrl ? (
                    <Play className="w-5 h-5 text-muted-foreground" />
                ) : (
                    <img
                        src={provider.logoUrl}
                        alt={operation.name}
                        className="w-6 h-6 object-contain"
                        onError={() => setImageError(true)}
                    />
                )}
                {/* Play indicator */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-1.5 h-1.5 text-primary-foreground" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>

            {/* Operation Info */}
            <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-foreground block">
                    {formatOperationName(operation.name)}
                </span>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {operation.description}
                </p>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
    );
}
