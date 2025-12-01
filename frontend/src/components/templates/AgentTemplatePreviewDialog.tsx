import {
    Bot,
    Check,
    Copy,
    Eye,
    ExternalLink,
    User,
    X,
    Wrench,
    Thermometer,
    Hash
} from "lucide-react";
import { useEffect, useState } from "react";
import { ALL_PROVIDERS, TEMPLATE_CATEGORY_META, findModelByValue } from "@flowmaestro/shared";
import type { AgentTemplate } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { Button } from "../common/Button";

// Brandfetch Logo API
const BRANDFETCH_CLIENT_ID = "1idCpJZqz6etuVweFEJ";
const getBrandLogo = (domain: string): string =>
    `https://cdn.brandfetch.io/${domain}?c=${BRANDFETCH_CLIENT_ID}`;

// Domain mapping for providers
const providerDomains: Record<string, string> = {
    google_sheets: "google.com",
    google_calendar: "google.com",
    gmail: "gmail.com",
    microsoft_teams: "microsoft.com",
    hubspot: "hubspot.com"
};

// Get logo URL for an integration
const getIntegrationLogo = (integration: string): string => {
    const provider = ALL_PROVIDERS.find((p) => p.provider === integration);
    if (provider) {
        return provider.logoUrl;
    }
    if (providerDomains[integration]) {
        return getBrandLogo(providerDomains[integration]);
    }
    return getBrandLogo(`${integration}.com`);
};

// Provider display names
const providerDisplayNames: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google AI",
    cohere: "Cohere"
};

interface AgentTemplatePreviewDialogProps {
    template: AgentTemplate | null;
    isOpen: boolean;
    onClose: () => void;
    onUse: (template: AgentTemplate) => void;
    isUsing?: boolean;
}

export function AgentTemplatePreviewDialog({
    template,
    isOpen,
    onClose,
    onUse,
    isUsing = false
}: AgentTemplatePreviewDialogProps) {
    const [copied, setCopied] = useState(false);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when dialog is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const handleCopyId = async () => {
        if (!template) return;
        await navigator.clipboard.writeText(template.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen || !template) return null;

    const categoryMeta = TEMPLATE_CATEGORY_META[template.category];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                {template.name}
                            </h2>
                            <span
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                    categoryMeta.color
                                )}
                            >
                                {categoryMeta.label}
                            </span>
                            {template.featured && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                    Featured
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            {template.author_name && (
                                <span className="flex items-center gap-1.5">
                                    {template.author_avatar_url ? (
                                        <img
                                            src={template.author_avatar_url}
                                            alt={template.author_name}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    ) : (
                                        <User className="w-4 h-4" />
                                    )}
                                    {template.author_name}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {template.view_count.toLocaleString()} views
                            </span>
                            <span className="flex items-center gap-1">
                                <Copy className="w-4 h-4" />
                                {template.use_count.toLocaleString()} uses
                            </span>
                            <span className="text-xs">v{template.version}</span>
                        </div>
                    </div>
                    <Button variant="icon" onClick={onClose} className="ml-4">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content - Split view */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left - System Prompt Preview */}
                    <div className="flex-1 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                System Prompt
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                    {template.system_prompt}
                                </pre>
                            </div>
                        </div>
                    </div>

                    {/* Right - Details panel */}
                    <div className="w-80 flex-shrink-0 overflow-y-auto p-6 space-y-6">
                        {/* Description */}
                        {template.description && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                    Description
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {template.description}
                                </p>
                            </div>
                        )}

                        {/* Model Configuration */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                Model Configuration
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Provider
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {providerDisplayNames[template.provider] ||
                                            template.provider}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Model
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white text-right">
                                        {findModelByValue(template.model)?.label || template.model}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Thermometer className="w-3 h-3" />
                                        Temperature
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {template.temperature}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Hash className="w-3 h-3" />
                                        Max Tokens
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {template.max_tokens.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Available Tools */}
                        {template.available_tools.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Wrench className="w-4 h-4" />
                                    Recommended Tools ({template.available_tools.length})
                                </h3>
                                <div className="space-y-2">
                                    {template.available_tools.map((tool, index) => (
                                        <div
                                            key={index}
                                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                {tool.provider ? (
                                                    <img
                                                        src={getIntegrationLogo(tool.provider)}
                                                        alt={tool.provider}
                                                        className="w-4 h-4 object-contain"
                                                        onError={(e) => {
                                                            (
                                                                e.target as HTMLImageElement
                                                            ).style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <Wrench className="w-4 h-4 text-gray-400" />
                                                )}
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {tool.name}
                                                </span>
                                                <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                                    {tool.type}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {tool.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                    Note: You&apos;ll need to connect your own integrations after
                                    creating this agent.
                                </p>
                            </div>
                        )}

                        {/* Required Integrations */}
                        {template.required_integrations.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Required Integrations
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {template.required_integrations.map((integration) => (
                                        <div
                                            key={integration}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                        >
                                            <img
                                                src={getIntegrationLogo(integration)}
                                                alt={integration}
                                                className="w-4 h-4 object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display =
                                                        "none";
                                                }}
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                                {integration}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {template.tags.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Tags
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {template.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Template ID */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Template ID
                            </h3>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-mono truncate">
                                    {template.id}
                                </code>
                                <button
                                    onClick={handleCopyId}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Copy template ID"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-gray-500" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Updated {new Date(template.updated_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => onUse(template)}
                            disabled={isUsing}
                            loading={isUsing}
                        >
                            <ExternalLink className="w-4 h-4" />
                            {isUsing ? "Creating..." : "Use Template"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
