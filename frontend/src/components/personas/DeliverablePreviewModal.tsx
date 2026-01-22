import {
    X,
    Download,
    Copy,
    Check,
    FileText,
    FileSpreadsheet,
    FileJson,
    FileCode,
    Globe
} from "lucide-react";
import React, { useState, useEffect } from "react";
import type { PersonaInstanceDeliverable, DeliverableType } from "../../lib/api";

interface DeliverablePreviewModalProps {
    deliverable: PersonaInstanceDeliverable;
    isOpen: boolean;
    onClose: () => void;
}

// Map deliverable types to icons
const typeIcons: Record<DeliverableType | string, React.ReactNode> = {
    markdown: <FileText className="w-5 h-5" />,
    csv: <FileSpreadsheet className="w-5 h-5" />,
    json: <FileJson className="w-5 h-5" />,
    code: <FileCode className="w-5 h-5" />,
    html: <Globe className="w-5 h-5" />
};

export const DeliverablePreviewModal: React.FC<DeliverablePreviewModalProps> = ({
    deliverable,
    isOpen,
    onClose
}) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    const handleCopy = async () => {
        if (deliverable.content) {
            await navigator.clipboard.writeText(deliverable.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (deliverable.url) {
            window.open(deliverable.url, "_blank");
        } else if (deliverable.content) {
            // Create a blob and download
            const extension = getFileExtension(deliverable.type);
            const mimeType = getMimeType(deliverable.type);
            const blob = new Blob([deliverable.content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${deliverable.name}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    if (!isOpen) return null;

    const icon = typeIcons[deliverable.type] || <FileText className="w-5 h-5" />;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{icon}</span>
                        <div>
                            <h2 className="font-semibold text-foreground">{deliverable.name}</h2>
                            <p className="text-xs text-muted-foreground uppercase">
                                {deliverable.type}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                            title="Copy to clipboard"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors ml-2"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">{renderContent(deliverable)}</div>
            </div>
        </div>
    );
};

// Render content based on type
function renderContent(deliverable: PersonaInstanceDeliverable): React.ReactNode {
    const content = deliverable.content || "";

    switch (deliverable.type) {
        case "markdown":
            // For now, render as preformatted text with basic formatting
            // A full implementation would use a markdown renderer
            return (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-foreground">{content}</pre>
                </div>
            );

        case "json":
            try {
                const formatted = JSON.stringify(JSON.parse(content), null, 2);
                return (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground">
                        {formatted}
                    </pre>
                );
            } catch {
                return (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground">
                        {content}
                    </pre>
                );
            }

        case "csv":
            return renderCSVPreview(content);

        case "code":
            return (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground">
                    {content}
                </pre>
            );

        case "html":
            return (
                <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted px-3 py-2 border-b border-border text-xs text-muted-foreground">
                        HTML Preview
                    </div>
                    <div className="p-4 bg-white" dangerouslySetInnerHTML={{ __html: content }} />
                    <div className="border-t border-border">
                        <details className="p-4">
                            <summary className="text-sm text-muted-foreground cursor-pointer">
                                View source
                            </summary>
                            <pre className="mt-2 bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground">
                                {content}
                            </pre>
                        </details>
                    </div>
                </div>
            );

        default:
            return (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono text-foreground whitespace-pre-wrap">
                    {content}
                </pre>
            );
    }
}

// Render CSV as a table
function renderCSVPreview(content: string): React.ReactNode {
    const lines = content.trim().split("\n");
    if (lines.length === 0) return <p>Empty CSV</p>;

    const rows = lines.map((line) => {
        // Simple CSV parsing (doesn't handle quoted fields with commas)
        return line.split(",").map((cell) => cell.trim());
    });

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-muted">
                        {headers.map((header, i) => (
                            <th
                                key={i}
                                className="px-3 py-2 text-left font-medium text-foreground border border-border"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dataRows.slice(0, 100).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-muted/50">
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className="px-3 py-2 text-foreground border border-border"
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {dataRows.length > 100 && (
                <p className="mt-2 text-sm text-muted-foreground text-center">
                    Showing first 100 rows of {dataRows.length}
                </p>
            )}
        </div>
    );
}

// Get file extension for download
function getFileExtension(type: string): string {
    const extensions: Record<string, string> = {
        markdown: "md",
        csv: "csv",
        json: "json",
        code: "txt",
        html: "html",
        pdf: "pdf"
    };
    return extensions[type] || "txt";
}

// Get MIME type for download
function getMimeType(type: string): string {
    const mimeTypes: Record<string, string> = {
        markdown: "text/markdown",
        csv: "text/csv",
        json: "application/json",
        code: "text/plain",
        html: "text/html",
        pdf: "application/pdf"
    };
    return mimeTypes[type] || "text/plain";
}
