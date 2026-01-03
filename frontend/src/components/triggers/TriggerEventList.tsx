/**
 * Trigger Event List Component
 * Displays events for a selected provider with search functionality
 */

import { useQuery } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { getProviderLogo } from "@flowmaestro/shared";
import { getTriggerProvider, type TriggerEvent, type TriggerProviderSummary } from "../../lib/api";
import { cn } from "../../lib/utils";

interface TriggerEventListProps {
    provider: TriggerProviderSummary;
    onSelectEvent: (event: TriggerEvent) => void;
    onBack: () => void;
}

export function TriggerEventList({ provider, onSelectEvent, onBack }: TriggerEventListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [imageError, setImageError] = useState(false);

    const {
        data: providerResponse,
        isLoading,
        error
    } = useQuery({
        queryKey: ["triggerProvider", provider.providerId],
        queryFn: () => getTriggerProvider(provider.providerId),
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    });

    const events = providerResponse?.data?.provider?.triggers || [];

    // Filter events by search query
    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) {
            return events;
        }

        const query = searchQuery.toLowerCase();
        return events.filter(
            (event) =>
                event.name.toLowerCase().includes(query) ||
                event.description.toLowerCase().includes(query) ||
                event.tags?.some((tag) => tag.toLowerCase().includes(query))
        );
    }, [events, searchQuery]);

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
                <p className="text-sm text-destructive">Failed to load events. Please try again.</p>
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
                    Triggers in
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                        {imageError ? (
                            <span className="text-xs font-semibold text-muted-foreground">
                                {provider.name.charAt(0).toUpperCase()}
                            </span>
                        ) : (
                            <img
                                src={getProviderLogo(provider.providerId)}
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
                    placeholder={`Search for a trigger in ${provider.name}...`}
                    className={cn(
                        "w-full pl-10 pr-4 py-2 text-sm",
                        "bg-background border border-border rounded-lg",
                        "placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    )}
                />
            </div>

            {/* Event List */}
            {filteredEvents.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        {searchQuery
                            ? "No triggers match your search"
                            : "No triggers available for this provider"}
                    </p>
                </div>
            ) : (
                <div className="space-y-1">
                    {filteredEvents.map((event) => (
                        <EventItem
                            key={event.id}
                            event={event}
                            providerId={provider.providerId}
                            onClick={() => onSelectEvent(event)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface EventItemProps {
    event: TriggerEvent;
    providerId: string;
    onClick: () => void;
}

function EventItem({ event, providerId, onClick }: EventItemProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 p-3",
                "bg-card hover:bg-muted/50 rounded-lg border border-border",
                "transition-colors cursor-pointer text-left"
            )}
        >
            {/* Event Icon (uses provider logo with play indicator) */}
            <div className="relative w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {imageError ? (
                    <span className="text-lg font-semibold text-muted-foreground">
                        {event.name.charAt(0).toUpperCase()}
                    </span>
                ) : (
                    <img
                        src={getProviderLogo(providerId)}
                        alt={event.name}
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

            {/* Event Info */}
            <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-foreground block">{event.name}</span>
                <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {event.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[10px] bg-muted rounded text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
    );
}
