/**
 * URL Node Configuration Panel
 *
 * Configuration panel for the URL node.
 * Includes default URLs, scraping options, and chunking settings in collapsible sections.
 */

import {
    ChevronDown,
    ChevronUp,
    HelpCircle,
    Link,
    Plus,
    Settings,
    SlidersHorizontal
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Select } from "../../../components/common/Select";
import { Tooltip } from "../../../components/common/Tooltip";

interface URLNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

// Toggle Switch component
function Toggle({
    checked,
    onChange,
    disabled = false
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                border-2 transition-colors duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${checked ? "border-foreground bg-transparent" : "border-transparent bg-muted"}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full
                    shadow ring-0 transition duration-200 ease-in-out
                    ${checked ? "translate-x-5 bg-foreground" : "translate-x-0 bg-muted-foreground"}
                `}
            />
        </button>
    );
}

// Collapsible Section component
function CollapsibleSection({
    title,
    icon: Icon,
    defaultOpen = false,
    tooltip,
    children
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultOpen?: boolean;
    tooltip?: string;
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-border">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{title}</span>
                    {tooltip && (
                        <Tooltip content={tooltip}>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </Tooltip>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>
            {isOpen && <div className="px-4 pb-4">{children}</div>}
        </div>
    );
}

// Setting Row component for toggle settings
function SettingRow({
    label,
    tooltip,
    children
}: {
    label: string;
    tooltip?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-1.5">
                <span className="text-sm text-foreground">{label}</span>
                {tooltip && (
                    <Tooltip content={tooltip}>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </Tooltip>
                )}
            </div>
            {children}
        </div>
    );
}

// Slider with value display
function SliderWithValue({
    label,
    value,
    onChange,
    min,
    max,
    step
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
}) {
    return (
        <div className="py-2">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">{label}</span>
                <span className="text-sm font-mono text-muted-foreground">{value}</span>
            </div>
            <input
                type="range"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                min={min}
                max={max}
                step={step}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
        </div>
    );
}

export function URLNodeConfig({ data, onUpdate }: URLNodeConfigProps) {
    // URL State
    const [urls, setUrls] = useState<string[]>((data.urls as string[]) || []);
    const [newUrl, setNewUrl] = useState("");

    // Scraping Options State
    const [scrapingMode, setScrapingMode] = useState((data.scrapingMode as string) || "html");
    const [scrapeSubpages, setScrapeSubpages] = useState((data.scrapeSubpages as boolean) ?? false);
    const [timeout, setTimeout] = useState((data.timeout as number) || 30);
    const [followRedirects, setFollowRedirects] = useState(
        (data.followRedirects as boolean) ?? true
    );

    // Chunking Settings State
    const [chunkingAlgorithm, setChunkingAlgorithm] = useState(
        (data.chunkingAlgorithm as string) || "sentence"
    );
    const [chunkOverlap, setChunkOverlap] = useState((data.chunkOverlap as number) || 1000);
    const [chunkSize, setChunkSize] = useState((data.chunkSize as number) || 2500);
    const [advancedExtraction, setAdvancedExtraction] = useState(
        (data.advancedExtraction as boolean) ?? false
    );
    const [ocrEnabled, setOcrEnabled] = useState((data.ocrEnabled as boolean) ?? false);

    // Sync state to parent
    useEffect(() => {
        onUpdate({
            urls,
            scrapingMode,
            scrapeSubpages,
            timeout,
            followRedirects,
            chunkingAlgorithm,
            chunkOverlap,
            chunkSize,
            advancedExtraction,
            ocrEnabled,
            // Keep these defaults for backend compatibility
            inputName: "urls",
            outputVariable: "fetchedContent",
            required: true
        });
    }, [
        urls,
        scrapingMode,
        scrapeSubpages,
        timeout,
        followRedirects,
        chunkingAlgorithm,
        chunkOverlap,
        chunkSize,
        advancedExtraction,
        ocrEnabled
    ]);

    // URL validation helper
    const isValidUrl = (url: string): boolean => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    // Add URL handler
    const handleAddUrl = useCallback(() => {
        const trimmedUrl = newUrl.trim();
        if (trimmedUrl && isValidUrl(trimmedUrl) && !urls.includes(trimmedUrl)) {
            setUrls((prev) => [...prev, trimmedUrl]);
            setNewUrl("");
        }
    }, [newUrl, urls]);

    // Handle Enter key in URL input
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleAddUrl();
            }
        },
        [handleAddUrl]
    );

    // Remove URL handler
    const handleRemoveUrl = useCallback((index: number) => {
        setUrls((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const scrapingModeOptions = [
        { value: "html", label: "Page HTML" },
        { value: "text", label: "Text Only" },
        { value: "markdown", label: "Markdown" }
    ];

    const chunkingOptions = [
        { value: "sentence", label: "Sentence" },
        { value: "paragraph", label: "Paragraph" },
        { value: "fixed", label: "Fixed Size" },
        { value: "semantic", label: "Semantic" }
    ];

    return (
        <div>
            {/* Default URLs Section */}
            <CollapsibleSection
                title="Default URLs"
                icon={Link}
                defaultOpen={true}
                tooltip="These URLs will be fetched when running the workflow. You can also trigger the workflow via API with custom URLs instead."
            >
                {/* URL Input */}
                <div className="flex gap-2 mb-3">
                    <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="https://example.com"
                        className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                        type="button"
                        onClick={handleAddUrl}
                        disabled={!newUrl.trim() || !isValidUrl(newUrl.trim())}
                        className="inline-flex items-center justify-center w-10 h-10 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* URL List */}
                {urls.length > 0 && (
                    <div className="space-y-1">
                        {urls.map((url, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm"
                            >
                                <span className="truncate flex-1 mr-2">{url}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveUrl(idx)}
                                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <p className="mt-3 text-xs text-muted-foreground">
                    How to fetch URLs via API?{" "}
                    <a href="#" className="text-foreground underline">
                        Learn more
                    </a>
                </p>
            </CollapsibleSection>

            {/* Scraping Options Section */}
            <CollapsibleSection
                title="Scraping Options"
                icon={SlidersHorizontal}
                defaultOpen={false}
            >
                <div className="space-y-1">
                    <SettingRow label="Scraping Mode">
                        <div className="w-32">
                            <Select
                                value={scrapingMode}
                                onChange={setScrapingMode}
                                options={scrapingModeOptions}
                            />
                        </div>
                    </SettingRow>

                    <SettingRow
                        label="Scrape Subpages"
                        tooltip="Automatically discover and scrape linked pages from the same domain."
                    >
                        <Toggle checked={scrapeSubpages} onChange={setScrapeSubpages} />
                    </SettingRow>

                    <SettingRow label="Follow Redirects">
                        <Toggle checked={followRedirects} onChange={setFollowRedirects} />
                    </SettingRow>

                    <SliderWithValue
                        label="Fetch Timeout"
                        value={timeout}
                        onChange={setTimeout}
                        min={5}
                        max={60}
                        step={5}
                    />
                </div>
            </CollapsibleSection>

            {/* Chunking Settings Section */}
            <CollapsibleSection title="Chunking Settings" icon={Settings} defaultOpen={false}>
                <div className="space-y-1">
                    <SettingRow label="Chunking Algorithm">
                        <div className="w-32">
                            <Select
                                value={chunkingAlgorithm}
                                onChange={setChunkingAlgorithm}
                                options={chunkingOptions}
                            />
                        </div>
                    </SettingRow>

                    <SliderWithValue
                        label="Chunk Overlap"
                        value={chunkOverlap}
                        onChange={setChunkOverlap}
                        min={0}
                        max={2000}
                        step={100}
                    />

                    <SliderWithValue
                        label="Chunk Length"
                        value={chunkSize}
                        onChange={setChunkSize}
                        min={500}
                        max={5000}
                        step={100}
                    />

                    <SettingRow
                        label="Advanced Data Extraction"
                        tooltip="Extract structured data like tables, lists, and metadata from pages for more accurate processing."
                    >
                        <Toggle checked={advancedExtraction} onChange={setAdvancedExtraction} />
                    </SettingRow>

                    <SettingRow
                        label="Text in images (OCR)"
                        tooltip="Use optical character recognition to extract text from images on the page."
                    >
                        <Toggle checked={ocrEnabled} onChange={setOcrEnabled} />
                    </SettingRow>
                </div>
            </CollapsibleSection>
        </div>
    );
}
