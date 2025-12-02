import {
    Search,
    Settings,
    History,
    Loader2,
    FileText,
    Download,
    X,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { useState } from "react";
import { Input } from "../common/Input";
import type { ChunkSearchResult, KnowledgeDocument } from "../../lib/api";

interface SearchSectionProps {
    knowledgeBaseId: string;
    documents: KnowledgeDocument[];
    onSearch: (
        query: string,
        topK: number,
        similarityThreshold: number
    ) => Promise<ChunkSearchResult[]>;
}

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
                <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded-sm">
                    {part}
                </mark>
            );
        }

        return part;
    });
}

export function SearchSection({ knowledgeBaseId, documents, onSearch }: SearchSectionProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ChunkSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [topK, setTopK] = useState(10);
    const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

    const handleSearch = async () => {
        if (!searchQuery.trim() || !knowledgeBaseId) return;

        setSearching(true);
        setShowSearchResults(true);
        try {
            const results = await onSearch(searchQuery, topK, similarityThreshold);
            setSearchResults(results);

            setSearchHistory((prev) => {
                const updated = [searchQuery, ...prev.filter((q) => q !== searchQuery)];
                return updated.slice(0, 10);
            });
        } catch (error) {
            console.error("Failed to search knowledge base:", error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleHistoryClick = (query: string) => {
        setSearchQuery(query);
        setTimeout(() => {
            handleSearch();
        }, 100);
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
            parameters: {
                top_k: topK,
                similarity_threshold: similarityThreshold
            },
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
        a.download = `knowledge-base-search-${Date.now()}.json`;
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

    Object.keys(groupedResults).forEach((docName) => {
        groupedResults[docName].sort((a, b) => a.chunk_index - b.chunk_index);
    });

    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Search Knowledge Base</h2>
                </div>
                <div className="flex items-center gap-2">
                    {searchHistory.length > 0 && (
                        <button
                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Search History"
                        >
                            <History className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Advanced Options"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {showAdvancedOptions && searchHistory.length > 0 && (
                    <div className="border border-border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                            <History className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Recent Searches</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {searchHistory.map((query, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleHistoryClick(query)}
                                    className="text-xs px-2 py-1 bg-background border border-border rounded hover:bg-muted transition-colors"
                                >
                                    {query}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {showAdvancedOptions && (
                    <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Top K Results</label>
                            <span className="text-sm text-muted-foreground">{topK}</span>
                        </div>
                        <Input
                            type="range"
                            min="1"
                            max="50"
                            value={topK}
                            onChange={(e) => setTopK(Number(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>1</span>
                            <span>50</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Similarity Threshold</label>
                            <span className="text-sm text-muted-foreground">
                                {(similarityThreshold * 100).toFixed(0)}%
                            </span>
                        </div>
                        <Input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={similarityThreshold * 100}
                            onChange={(e) => setSimilarityThreshold(Number(e.target.value) / 100)}
                            className="w-full"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>100%</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleSearchKeyPress}
                        placeholder="Ask a question or search for information..."
                        className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={!searchQuery.trim() || searching}
                        className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Search"
                    >
                        {searching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {showSearchResults && (
                    <div className="mt-6 border-t border-border pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">
                                Search Results
                                {searchResults.length > 0 && (
                                    <span className="text-sm text-muted-foreground ml-2">
                                        ({searchResults.length}{" "}
                                        {searchResults.length === 1 ? "result" : "results"})
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-2">
                                {searchResults.length > 0 && (
                                    <button
                                        onClick={exportResults}
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                        title="Export Results"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowSearchResults(false)}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    title="Hide Results"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {searching ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">No results found</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Try adjusting your query, increasing top K, or lowering the
                                    similarity threshold
                                </p>
                            </div>
                        ) : Object.keys(groupedResults).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(groupedResults).map(([docName, results]) => {
                                    const docInfo = documents.find(
                                        (d) =>
                                            (d.source_type === "url" && d.source_url === docName) ||
                                            d.name === docName
                                    );

                                    return (
                                        <div
                                            key={docName}
                                            className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-base truncate">
                                                            {docName}
                                                        </h4>
                                                        {docInfo && (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs text-muted-foreground">
                                                                    {docInfo.file_type.toUpperCase()}
                                                                </span>
                                                                {docInfo.source_type === "url" &&
                                                                    docInfo.source_url && (
                                                                        <a
                                                                            href={
                                                                                docInfo.source_url
                                                                            }
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-xs text-primary hover:underline"
                                                                            onClick={(e) =>
                                                                                e.stopPropagation()
                                                                            }
                                                                        >
                                                                            View Source
                                                                        </a>
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                    {results.length}{" "}
                                                    {results.length === 1 ? "match" : "matches"}
                                                </div>
                                            </div>

                                            <div className="space-y-2 pl-7">
                                                {results.map((result) => {
                                                    const isExpanded = expandedChunks.has(
                                                        result.id
                                                    );
                                                    const contentPreview =
                                                        result.content.length > 200
                                                            ? result.content.substring(0, 200) +
                                                              "..."
                                                            : result.content;

                                                    return (
                                                        <div
                                                            key={result.id}
                                                            className="border-l-2 border-primary/30 pl-3 py-2 hover:bg-muted/30 rounded-r transition-colors"
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-medium text-primary">
                                                                            Chunk{" "}
                                                                            {result.chunk_index + 1}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {(
                                                                                result.similarity *
                                                                                100
                                                                            ).toFixed(1)}
                                                                            % match
                                                                        </span>
                                                                        {result.metadata &&
                                                                            Object.keys(
                                                                                result.metadata
                                                                            ).length > 0 && (
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {(() => {
                                                                                        const meta =
                                                                                            result.metadata as Record<
                                                                                                string,
                                                                                                unknown
                                                                                            >;
                                                                                        return (
                                                                                            <>
                                                                                                {meta.page && (
                                                                                                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                                                                                        Page{" "}
                                                                                                        {String(
                                                                                                            meta.page
                                                                                                        )}
                                                                                                    </span>
                                                                                                )}
                                                                                                {meta.section && (
                                                                                                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                                                                                        {String(
                                                                                                            meta.section
                                                                                                        )}
                                                                                                    </span>
                                                                                                )}
                                                                                            </>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            )}
                                                                    </div>
                                                                    <div className="text-sm text-foreground leading-relaxed">
                                                                        {highlightSearchTerms(
                                                                            isExpanded
                                                                                ? result.content
                                                                                : contentPreview,
                                                                            searchQuery
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {result.content.length > 200 ? (
                                                                    <button
                                                                        onClick={() =>
                                                                            toggleChunkExpansion(
                                                                                result.id
                                                                            )
                                                                        }
                                                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex-shrink-0"
                                                                        title={
                                                                            isExpanded
                                                                                ? "Collapse"
                                                                                : "Expand"
                                                                        }
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronUp className="w-4 h-4" />
                                                                        ) : (
                                                                            <ChevronDown className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Use semantic search to find relevant information across
                    all your documents. Press Enter to search. Adjust advanced options to fine-tune
                    results.
                </div>
            </div>
        </div>
    );
}
