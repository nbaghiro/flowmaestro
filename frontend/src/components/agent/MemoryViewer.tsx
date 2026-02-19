import {
    Search,
    RefreshCw,
    Trash2,
    Edit2,
    X,
    Check,
    Brain,
    User,
    Clock,
    ChevronDown,
    ChevronRight,
    Loader2,
    Database,
    Sparkles,
    MessageSquare,
    AlertCircle
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
    getAgentMemories,
    getAgentMemoryStats,
    searchAgentMemory,
    updateAgentMemory,
    deleteAgentMemory,
    type AgentWorkingMemory,
    type AgentMemoryStats,
    type AgentMemorySearchResult
} from "../../lib/api";
import { cn } from "../../lib/utils";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface MemoryViewerProps {
    agentId: string;
}

export function MemoryViewer({ agentId }: MemoryViewerProps) {
    // State
    const [memories, setMemories] = useState<AgentWorkingMemory[]>([]);
    const [stats, setStats] = useState<AgentMemoryStats | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<AgentMemorySearchResult[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMemory, setSelectedMemory] = useState<AgentWorkingMemory | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editedContent, setEditedContent] = useState("");
    const [memoryToDelete, setMemoryToDelete] = useState<AgentWorkingMemory | null>(null);
    const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

    // Load memories and stats
    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [memoriesResponse, statsResponse] = await Promise.all([
                getAgentMemories(agentId, { per_page: 100 }),
                getAgentMemoryStats(agentId)
            ]);
            setMemories(memoriesResponse.data || []);
            setStats(statsResponse);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load memories");
        } finally {
            setIsLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Search handler
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }

        setIsSearching(true);
        setError(null);
        try {
            const result = await searchAgentMemory(agentId, searchQuery.trim(), {
                top_k: 10,
                similarity_threshold: 0.5
            });
            setSearchResults(result.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Search failed");
        } finally {
            setIsSearching(false);
        }
    };

    // Edit handlers
    const handleStartEdit = (memory: AgentWorkingMemory) => {
        setEditingUserId(memory.user_id);
        setEditedContent(memory.working_memory);
    };

    const handleSaveEdit = async () => {
        if (!editingUserId) return;

        try {
            await updateAgentMemory(agentId, editingUserId, editedContent);
            setEditingUserId(null);
            loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update memory");
        }
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setEditedContent("");
    };

    // Delete handlers
    const handleConfirmDelete = async () => {
        if (!memoryToDelete) return;

        try {
            await deleteAgentMemory(agentId, memoryToDelete.user_id);
            setMemoryToDelete(null);
            if (selectedMemory?.user_id === memoryToDelete.user_id) {
                setSelectedMemory(null);
            }
            loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete memory");
        }
    };

    // Toggle search result context
    const toggleResultExpanded = (index: number) => {
        const newExpanded = new Set(expandedResults);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedResults(newExpanded);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Format relative time
    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateString);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Loading memories...</p>
            </div>
        );
    }

    // Empty state
    const isEmpty = memories.length === 0 && !searchResults;

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-border">
                <div className="px-6 py-5">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-xl font-semibold text-foreground">Memory</h2>
                        <button
                            onClick={loadData}
                            disabled={isLoading}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        View and manage what your agent remembers about users
                    </p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="px-6 pb-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <User className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold text-foreground">
                                            {stats.working_memory_count}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Users with memory
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <Database className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold text-foreground">
                                            {stats.embedding_count}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Conversation embeddings
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search */}
                {!isEmpty && (
                    <div className="px-6 pb-5">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    placeholder="Search memories semantically..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={isSearching || !searchQuery.trim()}
                                className={cn(
                                    "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    "bg-primary text-primary-foreground hover:bg-primary/90",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    "flex items-center gap-2"
                                )}
                            >
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                Search
                            </button>
                            {searchResults && (
                                <button
                                    onClick={() => {
                                        setSearchResults(null);
                                        setSearchQuery("");
                                    }}
                                    className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    title="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {/* Empty State */}
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-full px-6">
                        <div className="max-w-md text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                <Brain className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                No memories yet
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                                Your agent hasn't stored any memories yet. As users interact with
                                your agent, it will automatically remember important information
                                about them to provide more personalized responses.
                            </p>
                            <div className="flex flex-col gap-3 text-left bg-muted/50 rounded-xl p-4 border border-border/50">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    How memories work
                                </p>
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-blue-500/10 rounded-lg mt-0.5">
                                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            Automatic storage
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Important details from conversations are saved
                                            automatically
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-purple-500/10 rounded-lg mt-0.5">
                                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            Semantic search
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Find relevant memories by meaning, not just keywords
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-green-500/10 rounded-lg mt-0.5">
                                        <User className="w-3.5 h-3.5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            Per-user context
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Each user has their own memory, enabling personalized
                                            experiences
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : searchResults ? (
                    /* Search Results */
                    <div className="h-full overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}{" "}
                                found
                            </h3>
                        </div>
                        {searchResults.length === 0 ? (
                            <div className="text-center py-12">
                                <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    No similar memories found. Try a different query.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {searchResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className="border border-border rounded-xl overflow-hidden bg-card hover:border-border/80 transition-colors"
                                    >
                                        <button
                                            onClick={() => toggleResultExpanded(index)}
                                            className="w-full p-4 flex items-start gap-3 text-left"
                                        >
                                            <div className="flex-shrink-0 mt-0.5">
                                                {expandedResults.has(index) ? (
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span
                                                        className={cn(
                                                            "px-2 py-0.5 text-xs font-medium rounded-full capitalize",
                                                            result.role === "user" &&
                                                                "bg-blue-500/10 text-blue-500",
                                                            result.role === "assistant" &&
                                                                "bg-green-500/10 text-green-500",
                                                            result.role === "system" &&
                                                                "bg-orange-500/10 text-orange-500",
                                                            result.role === "tool" &&
                                                                "bg-purple-500/10 text-purple-500"
                                                        )}
                                                    >
                                                        {result.role}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        {(result.similarity * 100).toFixed(0)}%
                                                        match
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground line-clamp-2">
                                                    {result.content}
                                                </p>
                                            </div>
                                        </button>
                                        {expandedResults.has(index) && (
                                            <div className="px-4 pb-4 border-t border-border bg-muted/30">
                                                {result.context_before &&
                                                    result.context_before.length > 0 && (
                                                        <div className="mt-4">
                                                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                                                Context Before
                                                            </p>
                                                            <div className="space-y-2">
                                                                {result.context_before.map(
                                                                    (ctx, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="text-xs text-muted-foreground p-3 bg-muted rounded-lg"
                                                                        >
                                                                            <span className="font-medium capitalize text-foreground/70">
                                                                                {ctx.message_role}:
                                                                            </span>{" "}
                                                                            {ctx.content}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                                    <p className="text-sm text-foreground">
                                                        {result.content}
                                                    </p>
                                                </div>
                                                {result.context_after &&
                                                    result.context_after.length > 0 && (
                                                        <div className="mt-4">
                                                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                                                Context After
                                                            </p>
                                                            <div className="space-y-2">
                                                                {result.context_after.map(
                                                                    (ctx, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="text-xs text-muted-foreground p-3 bg-muted rounded-lg"
                                                                        >
                                                                            <span className="font-medium capitalize text-foreground/70">
                                                                                {ctx.message_role}:
                                                                            </span>{" "}
                                                                            {ctx.content}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Memory List */
                    <div className="h-full flex">
                        {/* List Panel */}
                        <div className="w-80 border-r border-border overflow-y-auto flex-shrink-0">
                            <div className="p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                    User Memories ({memories.length})
                                </p>
                                <div className="space-y-2">
                                    {memories.map((memory) => (
                                        <button
                                            key={memory.user_id}
                                            onClick={() => setSelectedMemory(memory)}
                                            className={cn(
                                                "w-full p-3 rounded-xl text-left transition-all",
                                                "border border-transparent",
                                                selectedMemory?.user_id === memory.user_id
                                                    ? "bg-primary/10 border-primary/20"
                                                    : "hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {memory.user_id.slice(0, 8)}...
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatRelativeTime(memory.updated_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 pl-11">
                                                {memory.working_memory}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Detail Panel */}
                        <div className="flex-1 overflow-y-auto">
                            {selectedMemory ? (
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                                <User className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-foreground">
                                                    User Memory
                                                </h3>
                                                <p className="text-sm text-muted-foreground font-mono">
                                                    {selectedMemory.user_id}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {editingUserId === selectedMemory.user_id ? (
                                                <>
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                                                        title="Save"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            handleStartEdit(selectedMemory)
                                                        }
                                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setMemoryToDelete(selectedMemory)
                                                        }
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            <span>
                                                Updated {formatDate(selectedMemory.updated_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border border-border rounded-xl overflow-hidden">
                                        <div className="px-4 py-3 bg-muted/50 border-b border-border">
                                            <span className="text-sm font-medium text-foreground">
                                                Working Memory
                                            </span>
                                        </div>
                                        {editingUserId === selectedMemory.user_id ? (
                                            <textarea
                                                value={editedContent}
                                                onChange={(e) => setEditedContent(e.target.value)}
                                                className="w-full p-4 bg-transparent text-sm text-foreground resize-none focus:outline-none min-h-[300px] font-mono"
                                                autoFocus
                                            />
                                        ) : (
                                            <pre className="p-4 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                                                {selectedMemory.working_memory}
                                            </pre>
                                        )}
                                    </div>

                                    {selectedMemory.metadata &&
                                        Object.keys(selectedMemory.metadata).length > 0 && (
                                            <div className="mt-6 border border-border rounded-xl overflow-hidden">
                                                <div className="px-4 py-3 bg-muted/50 border-b border-border">
                                                    <span className="text-sm font-medium text-foreground">
                                                        Metadata
                                                    </span>
                                                </div>
                                                <pre className="p-4 text-xs text-muted-foreground overflow-x-auto font-mono">
                                                    {JSON.stringify(
                                                        selectedMemory.metadata,
                                                        null,
                                                        2
                                                    )}
                                                </pre>
                                            </div>
                                        )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                        <Brain className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="text-sm font-medium">
                                        Select a memory to view details
                                    </p>
                                    <p className="text-xs mt-1 text-muted-foreground/70">
                                        Click on a user from the list
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!memoryToDelete}
                onClose={() => setMemoryToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Memory"
                message={`Are you sure you want to delete the working memory for user ${memoryToDelete?.user_id.slice(0, 8)}...? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
