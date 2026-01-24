import { X, FileText, Globe, File } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { IframeViewer, PDFViewer, TextViewer } from "./viewers";
import type { KnowledgeDocument } from "../../lib/api";

const MIN_WIDTH = 384;
const MAX_WIDTH = 700;

interface DocumentViewerPanelProps {
    doc: KnowledgeDocument | null;
    knowledgeBaseId: string;
    isOpen: boolean;
    onClose: () => void;
    width: number;
    onWidthChange: (width: number) => void;
}

export function DocumentViewerPanel({
    doc,
    knowledgeBaseId,
    isOpen,
    onClose,
    width,
    onWidthChange
}: DocumentViewerPanelProps) {
    const isResizing = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing.current || !panelRef.current) return;

            const containerRect = panelRef.current.parentElement?.getBoundingClientRect();
            if (!containerRect) return;

            const newWidth = containerRect.right - e.clientX;
            const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
            onWidthChange(clampedWidth);
        },
        [onWidthChange]
    );

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    if (!isOpen || !doc) {
        return null;
    }

    const getDocumentIcon = () => {
        if (doc.source_type === "url") {
            return <Globe className="w-4 h-4 text-primary" />;
        }
        if (doc.file_type === "pdf") {
            return <File className="w-4 h-4 text-red-500" />;
        }
        return <FileText className="w-4 h-4 text-primary" />;
    };

    const renderViewer = () => {
        // URL-based documents - show in iframe
        if (doc.source_type === "url" && doc.source_url) {
            return <IframeViewer url={doc.source_url} title={doc.name} />;
        }

        // PDF files - use PDF viewer
        if (doc.file_type === "pdf") {
            return (
                <PDFViewer
                    knowledgeBaseId={knowledgeBaseId}
                    documentId={doc.id}
                    documentName={doc.name}
                />
            );
        }

        // All other file types - show extracted text content
        return <TextViewer content={doc.content} fileType={doc.file_type} />;
    };

    return (
        <div
            ref={panelRef}
            className="relative flex-shrink-0 border-l border-border bg-card flex flex-col h-full"
            style={{ width: `${width}px` }}
        >
            {/* Resize Handle - invisible, cursor indicates draggable */}
            <div
                className="absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize z-10"
                onMouseDown={handleMouseDown}
            />

            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getDocumentIcon()}
                    <span className="font-medium text-sm truncate" title={doc.name}>
                        {doc.name}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase flex-shrink-0">
                        {doc.file_type}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0 ml-2"
                    title="Close viewer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">{renderViewer()}</div>
        </div>
    );
}
