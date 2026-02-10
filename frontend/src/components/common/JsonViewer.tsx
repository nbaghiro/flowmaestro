import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { useState } from "react";

interface JsonViewerProps {
    data: unknown;
    collapsed?: boolean;
    maxHeight?: string;
    className?: string;
}

/**
 * JSON Viewer Component
 *
 * Displays JSON data with syntax highlighting and collapsible sections.
 */
export function JsonViewer({
    data,
    collapsed = false,
    maxHeight = "400px",
    className = ""
}: JsonViewerProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API might not be available
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
                title="Copy JSON"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <div
                className="overflow-auto p-4 bg-slate-100 dark:bg-muted/30 rounded-md font-mono text-sm"
                style={{ maxHeight }}
            >
                <JsonValue value={data} depth={0} initialCollapsed={collapsed} />
            </div>
        </div>
    );
}

interface JsonValueProps {
    value: unknown;
    depth: number;
    initialCollapsed?: boolean;
    isLast?: boolean;
}

function JsonValue({ value, depth, initialCollapsed = false, isLast = true }: JsonValueProps) {
    const [collapsed, setCollapsed] = useState(initialCollapsed && depth > 0);

    if (value === null) {
        return <span className="text-orange-600 dark:text-orange-400">null</span>;
    }

    if (value === undefined) {
        return <span className="text-gray-500">undefined</span>;
    }

    if (typeof value === "boolean") {
        return (
            <span className="text-purple-600 dark:text-purple-400">{value ? "true" : "false"}</span>
        );
    }

    if (typeof value === "number") {
        return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
    }

    if (typeof value === "string") {
        return <span className="text-emerald-600 dark:text-emerald-400">&quot;{value}&quot;</span>;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return (
                <span>
                    <span className="text-foreground">[]</span>
                    {!isLast && <span className="text-muted-foreground">,</span>}
                </span>
            );
        }

        if (collapsed) {
            return (
                <span className="inline-flex items-center">
                    <button
                        onClick={() => setCollapsed(false)}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                    >
                        <ChevronRight className="w-3 h-3" />
                    </button>
                    <span className="text-muted-foreground">[{value.length} items]</span>
                    {!isLast && <span className="text-muted-foreground">,</span>}
                </span>
            );
        }

        return (
            <span>
                <span className="inline-flex items-center">
                    <button
                        onClick={() => setCollapsed(true)}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                    >
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    <span className="text-foreground">[</span>
                </span>
                <div style={{ paddingLeft: "1rem" }}>
                    {value.map((item, index) => (
                        <div key={index}>
                            <JsonValue
                                value={item}
                                depth={depth + 1}
                                initialCollapsed={initialCollapsed}
                                isLast={index === value.length - 1}
                            />
                        </div>
                    ))}
                </div>
                <span className="text-foreground">]</span>
                {!isLast && <span className="text-muted-foreground">,</span>}
            </span>
        );
    }

    if (typeof value === "object") {
        const entries = Object.entries(value);

        if (entries.length === 0) {
            return (
                <span>
                    <span className="text-foreground">{"{}"}</span>
                    {!isLast && <span className="text-muted-foreground">,</span>}
                </span>
            );
        }

        if (collapsed) {
            return (
                <span className="inline-flex items-center">
                    <button
                        onClick={() => setCollapsed(false)}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                    >
                        <ChevronRight className="w-3 h-3" />
                    </button>
                    <span className="text-muted-foreground">
                        {"{"}...{"}"}
                    </span>
                    {!isLast && <span className="text-muted-foreground">,</span>}
                </span>
            );
        }

        return (
            <span>
                <span className="inline-flex items-center">
                    <button
                        onClick={() => setCollapsed(true)}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                    >
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    <span className="text-foreground">{"{"}</span>
                </span>
                <div style={{ paddingLeft: "1rem" }}>
                    {entries.map(([key, val], index) => (
                        <div key={key}>
                            <span className="text-sky-700 dark:text-sky-400">
                                &quot;{key}&quot;
                            </span>
                            <span className="text-foreground">: </span>
                            <JsonValue
                                value={val}
                                depth={depth + 1}
                                initialCollapsed={initialCollapsed}
                                isLast={index === entries.length - 1}
                            />
                        </div>
                    ))}
                </div>
                <span className="text-foreground">{"}"}</span>
                {!isLast && <span className="text-muted-foreground">,</span>}
            </span>
        );
    }

    return <span className="text-muted-foreground">{String(value)}</span>;
}
