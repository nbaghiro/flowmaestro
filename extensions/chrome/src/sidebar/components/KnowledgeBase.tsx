import { clsx } from "clsx";
import { BookOpen, Plus, Loader2, Check, FileText, Database } from "lucide-react";
import { useState } from "react";
import { api } from "../../shared/api";
import { useSidebarStore } from "../stores/sidebarStore";

export function KnowledgeBase() {
    const { userContext, pageContext, extractPageContext, isExtractingPage } = useSidebarStore();

    const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [addResult, setAddResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const knowledgeBases = userContext?.knowledgeBases || [];

    const handleAddToKnowledgeBase = async () => {
        if (!selectedKbId) return;

        setIsAdding(true);
        setAddResult(null);

        try {
            // Extract page context if not already done
            if (!pageContext) {
                await extractPageContext();
            }

            const currentContext = useSidebarStore.getState().pageContext;
            if (!currentContext) {
                throw new Error("Failed to extract page content");
            }

            await api.addToKnowledgeBase(selectedKbId, currentContext);

            setAddResult({
                success: true,
                message: "Page content added to knowledge base"
            });
        } catch (error) {
            setAddResult({
                success: false,
                message: error instanceof Error ? error.message : "Failed to add to knowledge base"
            });
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-y-auto p-3">
                {/* Info Banner */}
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                                Add Page to Knowledge Base
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                Extract content from the current page and add it to your knowledge
                                base for use with agents and workflows.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Knowledge Base Selection */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Select Knowledge Base
                    </h3>

                    {knowledgeBases.length === 0 ? (
                        <div className="text-center py-8">
                            <Database className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No knowledge bases available
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                                Create one in FlowMaestro to get started
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {knowledgeBases.map((kb) => (
                                <button
                                    key={kb.id}
                                    onClick={() => setSelectedKbId(kb.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors",
                                        selectedKbId === kb.id
                                            ? "bg-accent border border-border"
                                            : "hover:bg-accent border border-transparent"
                                    )}
                                >
                                    <Database
                                        className={clsx(
                                            "w-4 h-4 flex-shrink-0",
                                            selectedKbId === kb.id
                                                ? "text-foreground"
                                                : "text-muted-foreground"
                                        )}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate">
                                            {kb.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {kb.documentCount} documents
                                        </div>
                                    </div>
                                    {selectedKbId === kb.id && (
                                        <Check className="w-4 h-4 text-foreground flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Page Preview */}
                {pageContext && (
                    <div className="mt-4">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Page Preview
                        </h3>
                        <div className="p-3 bg-muted rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground truncate">
                                    {pageContext.title}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3">
                                {pageContext.text.substring(0, 200)}...
                            </p>
                            <div className="mt-2 text-xs text-muted-foreground/70">
                                {pageContext.text.length.toLocaleString()} characters
                            </div>
                        </div>
                    </div>
                )}

                {/* Result Message */}
                {addResult && (
                    <div
                        className={clsx(
                            "mt-4 p-3 rounded-lg",
                            addResult.success
                                ? "bg-green-500/10 border border-green-500/20"
                                : "bg-destructive/10 border border-destructive/20"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {addResult.success ? (
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                                <span className="w-4 h-4 text-destructive">!</span>
                            )}
                            <span
                                className={clsx(
                                    "text-sm",
                                    addResult.success
                                        ? "text-green-700 dark:text-green-400"
                                        : "text-destructive"
                                )}
                            >
                                {addResult.message}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Button */}
            <div className="p-3 border-t border-border bg-card">
                <button
                    onClick={handleAddToKnowledgeBase}
                    disabled={!selectedKbId || isAdding || isExtractingPage}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                    {isAdding || isExtractingPage ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{isExtractingPage ? "Extracting..." : "Adding..."}</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-5 h-5" />
                            <span>Add to Knowledge Base</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
