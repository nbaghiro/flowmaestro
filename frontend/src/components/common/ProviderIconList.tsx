import { ALL_PROVIDERS, getProviderLogo } from "@flowmaestro/shared";
import { Tooltip } from "./Tooltip";

interface ProviderIconListProps {
    providers: string[];
    maxVisible?: number;
    iconSize?: "sm" | "md";
    className?: string;
}

/**
 * Get logo URL for a provider.
 * First checks ALL_PROVIDERS for a defined logoUrl, then falls back to Brandfetch.
 */
function getIntegrationLogo(providerId: string): string {
    const provider = ALL_PROVIDERS.find((p) => p.provider === providerId);
    if (provider?.logoUrl) {
        return provider.logoUrl;
    }
    return getProviderLogo(providerId);
}

/**
 * Get display name for a provider.
 */
function getProviderDisplayName(providerId: string): string {
    const provider = ALL_PROVIDERS.find((p) => p.provider === providerId);
    return provider?.displayName || providerId;
}

/**
 * Displays a row of provider icons with tooltips.
 * Shows up to maxVisible icons, with a "+X" badge for overflow.
 */
export function ProviderIconList({
    providers,
    maxVisible = 4,
    iconSize = "sm",
    className = ""
}: ProviderIconListProps) {
    if (!providers || providers.length === 0) {
        return null;
    }

    const visibleProviders = providers.slice(0, maxVisible);
    const overflowCount = providers.length - maxVisible;
    const overflowProviders = providers.slice(maxVisible);

    const sizeClasses = iconSize === "sm" ? "w-4 h-4" : "w-5 h-5";

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {visibleProviders.map((provider) => (
                <Tooltip key={provider} content={getProviderDisplayName(provider)}>
                    <img
                        src={getIntegrationLogo(provider)}
                        alt={provider}
                        className={`${sizeClasses} object-contain rounded-sm`}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                </Tooltip>
            ))}
            {overflowCount > 0 && (
                <Tooltip
                    content={overflowProviders.map((p) => getProviderDisplayName(p)).join(", ")}
                >
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                        +{overflowCount}
                    </span>
                </Tooltip>
            )}
        </div>
    );
}
