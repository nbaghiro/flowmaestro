import {
    X,
    FileText,
    Globe,
    Search,
    ArrowLeft,
    Loader2,
    Settings,
    Download,
    ChevronDown,
    ChevronUp,
    MousePointer,
    Upload
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { logger } from "../../lib/logger";
import { Input } from "../common/Input";
import { IframeViewer, PDFViewer, TextViewer } from "./viewers";
import type { KnowledgeDocument, ChunkSearchResult } from "../../lib/api";

type PanelMode = "empty" | "viewer" | "search" | "settings";

interface KBContextPanelProps {
    mode: PanelMode;
    selectedDocument: KnowledgeDocument | null;
    knowledgeBaseId: string;
    documents: KnowledgeDocument[];
    onClose: () => void;
    onModeChange: (mode: PanelMode) => void;
    onSearch: (
        query: string,
        topK: number,
        similarityThreshold: number
    ) => Promise<ChunkSearchResult[]>;
    width: number;
    onWidthChange: (width: number) => void;
}

const MIN_WIDTH = 350;
const MAX_WIDTH = 900;

function highlightSearchTerms(text: string, searchQuery: string): React.ReactNode {
    if (!searchQuery.trim()) {
        return text;
    }

    const searchTerms = searchQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 2);

    if (searchTerms.length === 0) {
        return text;
    }

    const escapedTerms = searchTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => {
        const isMatch = searchTerms.some((term) => part.toLowerCase() === term.toLowerCase());

        if (isMatch) {
            return (
                <mark
                    key={index}
                    className="bg-muted text-foreground px-0.5 rounded-sm font-medium"
                >
                    {part}
                </mark>
            );
        }

        return part;
    });
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MousePointer className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-2">Select a document</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
                Click on a document to view its contents, or use search to find specific information
            </p>
            <div className="space-y-2 text-left w-full max-w-[200px]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload files to add documents</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Search className="w-3.5 h-3.5" />
                    <span>Search across all documents</span>
                </div>
            </div>
        </div>
    );
}

function DocumentViewer({
    doc,
    knowledgeBaseId,
    onClose
}: {
    doc: KnowledgeDocument;
    knowledgeBaseId: string;
    onClose: () => void;
}) {
    const getDocumentIcon = () => {
        if (doc.source_type === "url") {
            return <Globe className="w-4 h-4 text-muted-foreground" />;
        }
        return <FileText className="w-4 h-4 text-muted-foreground" />;
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
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

function SearchPanel({
    knowledgeBaseId,
    documents: _documents,
    onSearch,
    onBack
}: {
    knowledgeBaseId: string;
    documents: KnowledgeDocument[];
    onSearch: (
        query: string,
        topK: number,
        similarityThreshold: number
    ) => Promise<ChunkSearchResult[]>;
    onBack: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ChunkSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [topK, setTopK] = useState(10);
    const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
    const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Focus the search input when panel opens
        inputRef.current?.focus();
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim() || !knowledgeBaseId) return;

        setSearching(true);
        setHasSearched(true);
        try {
            const results = await onSearch(searchQuery, topK, similarityThreshold);
            setSearchResults(results);
        } catch (error) {
            logger.error("Failed to search knowledge base", error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    const toggleChunkExpansion = (chunkId: string) => {
        setExpandedChunks((prev) => {
            const next = new Set(prev);
            if (next.has(chunkId)) {
                next.delete(chunkId);
            } else {
                next.add(chunkId);
            }
            return next;
        });
    };

    const exportResults = () => {
        const data = {
            query: searchQuery,
            timestamp: new Date().toISOString(),
            parameters: { top_k: topK, similarity_threshold: similarityThreshold },
            results: searchResults.map((r) => ({
                document: r.document_name,
                chunk_index: r.chunk_index,
                similarity: r.similarity,
                content: r.content,
                metadata: r.metadata
            }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kb-search-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const groupedResults = searchResults.reduce(
        (acc, result) => {
            const docName = result.document_name;
            if (!acc[docName]) {
                acc[docName] = [];
            }
            acc[docName].push(result);
            return acc;
        },
        {} as Record<string, ChunkSearchResult[]>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="h-12 border-b border-border flex items-center justify-between px-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        title="Back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Search</span>
                </div>
                <div className="flex items-center gap-1">
                    {searchResults.length > 0 && (
                        <button
                            onClick={exportResults}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Export Results"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`p-1.5 hover:bg-muted rounded-lg transition-colors ${showAdvanced ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        title="Advanced Options"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-border space-y-3">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Search documents..."
                        className="flex-1 px-3 py-2 text-sm"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={!searchQuery.trim() || searching}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Search"
                    >
                        {searching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Advanced Options */}
                {showAdvanced && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                        <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Top K Results</span>
                                <span className="font-medium">{topK}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={topK}
                                onChange={(e) => setTopK(Number(e.target.value))}
                                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Similarity Threshold</span>
                                <span className="font-medium">
                                    {(similarityThreshold * 100).toFixed(0)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={similarityThreshold * 100}
                                onChange={(e) =>
                                    setSimilarityThreshold(Number(e.target.value) / 100)
                                }
                                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-auto">
                {searching ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Searching...</p>
                    </div>
                ) : !hasSearched ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <Search className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Enter a search query to find relevant content across all documents
                        </p>
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-foreground font-medium mb-1">No results found</p>
                        <p className="text-sm text-muted-foreground">
                            Try different keywords or lower the similarity threshold
                        </p>
                    </div>
                ) : (
                    <div className="p-3 space-y-3">
                        <p className="text-xs text-muted-foreground">
                            {searchResults.length}{" "}
                            {searchResults.length === 1 ? "result" : "results"} found
                        </p>
                        {Object.entries(groupedResults).map(([docName, results]) => {
                            return (
                                <div
                                    key={docName}
                                    className="border border-border rounded-lg overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 p-3 border-b border-border">
                                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium text-sm truncate flex-1">
                                            {docName}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {results.length}{" "}
                                            {results.length === 1 ? "match" : "matches"}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {results.map((result) => {
                                            const isExpanded = expandedChunks.has(result.id);
                                            const contentPreview =
                                                result.content.length > 200
                                                    ? result.content.substring(0, 200) + "..."
                                                    : result.content;

                                            return (
                                                <div key={result.id} className="p-3">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            Chunk {result.chunk_index + 1}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {(result.similarity * 100).toFixed(1)}%
                                                            match
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-foreground leading-relaxed">
                                                        {highlightSearchTerms(
                                                            isExpanded
                                                                ? result.content
                                                                : contentPreview,
                                                            searchQuery
                                                        )}
                                                    </p>
                                                    {result.content.length > 200 && (
                                                        <button
                                                            onClick={() =>
                                                                toggleChunkExpansion(result.id)
                                                            }
                                                            className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground"
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                    <ChevronUp className="w-3 h-3" />
                                                                    Show less
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="w-3 h-3" />
                                                                    Show more
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export function KBContextPanel({
    mode,
    selectedDocument,
    knowledgeBaseId,
    documents,
    onClose,
    onModeChange,
    onSearch,
    width,
    onWidthChange
}: KBContextPanelProps) {
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

    const handleBack = () => {
        onModeChange("empty");
    };

    return (
        <div
            ref={panelRef}
            className="relative flex-shrink-0 border-l border-border bg-card flex flex-col h-full"
            style={{ width: `${width}px` }}
        >
            {/* Resize Handle */}
            <div
                className="absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-primary/10 transition-colors"
                onMouseDown={handleMouseDown}
            />

            {/* Content based on mode */}
            {mode === "empty" && <EmptyState />}

            {mode === "viewer" && selectedDocument && (
                <DocumentViewer
                    doc={selectedDocument}
                    knowledgeBaseId={knowledgeBaseId}
                    onClose={onClose}
                />
            )}

            {mode === "search" && (
                <SearchPanel
                    knowledgeBaseId={knowledgeBaseId}
                    documents={documents}
                    onSearch={onSearch}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}
