import {
    BookOpen,
    ArrowLeft,
    Loader2,
    Trash2,
    Pencil,
    Check,
    X,
    Upload,
    Link as LinkIcon,
    Search,
    Settings,
    Cloud
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "../components/common/Input";
import { MobileBuilderGuard } from "../components/common/MobileBuilderGuard";
import {
    AddUrlModal,
    DeleteDocumentModal,
    DeleteKnowledgeBaseModal,
    KBSettingsSection
} from "../components/knowledge-bases";
import { DocumentList } from "../components/knowledge-bases/DocumentList";
import { IntegrationImportProgress } from "../components/knowledge-bases/IntegrationImportProgress";
import { IntegrationSourcesPanel } from "../components/knowledge-bases/IntegrationSourcesPanel";
import { KBContextPanel } from "../components/knowledge-bases/KBContextPanel";
import { KBOverviewSidebar } from "../components/knowledge-bases/KBOverviewSidebar";
import { IntegrationFileBrowserModal } from "../components/knowledge-bases/modals/IntegrationFileBrowserModal";
import { KnowledgeBaseEvents } from "../lib/analytics";
import { logger } from "../lib/logger";
import { streamKnowledgeBase } from "../lib/sse";
import { useKnowledgeBaseStore } from "../stores/knowledgeBaseStore";
import type { KnowledgeDocument, CreateKBSourceInput } from "../lib/api";

type PanelMode = "empty" | "viewer" | "search" | "settings";

export function KnowledgeBaseDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        currentKB,
        currentDocuments,
        currentStats,
        loading,
        fetchKnowledgeBase,
        fetchDocuments,
        fetchStats,
        uploadDoc,
        addUrl,
        deleteDoc,
        reprocessDoc,
        query,
        deleteKB,
        updateKB,
        // Integration
        integrationProviders: _integrationProviders,
        integrationSources,
        syncingSourceIds,
        currentImportJobId,
        fetchIntegrationProviders,
        fetchIntegrationSources,
        createIntegrationSource,
        updateIntegrationSource,
        deleteIntegrationSource,
        triggerSync,
        setCurrentImportJobId
    } = useKnowledgeBaseStore();

    const [showUrlModal, setShowUrlModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteConfirmDocId, setDeleteConfirmDocId] = useState<string | null>(null);
    const [processingDocId, setProcessingDocId] = useState<string | null>(null);
    const [showDeleteKBModal, setShowDeleteKBModal] = useState(false);
    const [deletingKB, setDeletingKB] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
    const [panelWidth, setPanelWidth] = useState(500);
    const [panelMode, setPanelMode] = useState<PanelMode>("empty");
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showIntegrationBrowser, setShowIntegrationBrowser] = useState(false);
    const [importingFromIntegration, setImportingFromIntegration] = useState(false);

    // Name editing state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasTrackedPageView = useRef(false);

    useEffect(() => {
        if (id) {
            // Track page view
            if (!hasTrackedPageView.current) {
                KnowledgeBaseEvents.documentListViewed({ kbId: id });
                hasTrackedPageView.current = true;
            }
            fetchKnowledgeBase(id);
            fetchDocuments(id);
            fetchStats(id);
            // Fetch integration data
            fetchIntegrationProviders(id);
            fetchIntegrationSources(id);
        }
    }, [id]);

    // SSE streaming for real-time document processing updates
    useEffect(() => {
        if (!id) return;

        const cleanup = streamKnowledgeBase(id, {
            onConnected: () => {
                logger.info("Connected to KB stream", { knowledgeBaseId: id });
            },
            onDocumentProcessing: () => {
                fetchDocuments(id);
            },
            onDocumentCompleted: () => {
                fetchDocuments(id);
                fetchStats(id);
            },
            onDocumentFailed: () => {
                fetchDocuments(id);
            },
            onError: (error) => {
                logger.error("KB stream error", { error, knowledgeBaseId: id });
            }
        });

        // Fallback polling at reduced frequency (SSE handles real-time)
        pollingIntervalRef.current = setInterval(() => {
            fetchDocuments(id);
            fetchStats(id);
        }, 30000);

        return () => {
            cleanup();
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [id, fetchDocuments, fetchStats]);

    const handleFileUpload = async (file: File) => {
        if (!id) return;

        setUploading(true);
        try {
            await uploadDoc(id, file);
            // Track document upload
            const fileExtension = file.name.split(".").pop()?.toLowerCase() || "unknown";
            const fileSizeMb = file.size / (1024 * 1024);
            KnowledgeBaseEvents.documentUploaded({
                kbId: id,
                fileType: fileExtension,
                fileSizeMb: Math.round(fileSizeMb * 100) / 100
            });
            fetchStats(id);
        } catch (error) {
            logger.error("Failed to upload file", error);
        } finally {
            setUploading(false);
        }
    };

    const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        await handleFileUpload(file);
        e.target.value = "";
    };

    const handleAddUrl = async (url: string, name?: string) => {
        if (!id) return;

        setUploading(true);
        try {
            await addUrl(id, url, name);
            // Track URL addition
            let domain = "unknown";
            try {
                domain = new URL(url).hostname;
            } catch {
                // Keep domain as unknown if URL parsing fails
            }
            KnowledgeBaseEvents.documentUrlAdded({ kbId: id, domain });
            setShowUrlModal(false);
            fetchStats(id);
        } catch (error) {
            logger.error("Failed to add URL", error);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async () => {
        if (!id || !deleteConfirmDocId) return;

        setProcessingDocId(deleteConfirmDocId);
        try {
            await deleteDoc(id, deleteConfirmDocId);
            // Track document deletion
            KnowledgeBaseEvents.documentDeleted({ kbId: id, documentId: deleteConfirmDocId });
            setDeleteConfirmDocId(null);
            // If we were viewing this document, close the viewer
            if (selectedDocument?.id === deleteConfirmDocId) {
                setSelectedDocument(null);
                setPanelMode("empty");
            }
        } catch (error) {
            logger.error("Failed to delete document", error);
        } finally {
            setProcessingDocId(null);
        }
    };

    const handleReprocessDocument = async (docId: string) => {
        if (!id) return;

        setProcessingDocId(docId);
        try {
            await reprocessDoc(id, docId);
        } catch (error) {
            logger.error("Failed to reprocess document", error);
        } finally {
            setProcessingDocId(null);
        }
    };

    const handleSearch = async (searchQuery: string, topK: number, similarityThreshold: number) => {
        if (!id) return [];

        const startTime = Date.now();
        const results = await query(id, {
            query: searchQuery,
            top_k: topK,
            similarity_threshold: similarityThreshold
        });

        // Track KB query
        KnowledgeBaseEvents.queried({
            kbId: id,
            queryTextLength: searchQuery.length,
            resultsCount: results.length,
            queryTimeMs: Date.now() - startTime
        });

        return results;
    };

    const handleDeleteKnowledgeBase = async () => {
        if (!id) return;

        setDeletingKB(true);
        try {
            await deleteKB(id);
            // Track KB deletion
            KnowledgeBaseEvents.deleted({ kbId: id });
            navigate("/knowledge-bases");
        } catch (error) {
            logger.error("Failed to delete knowledge base", error);
            setDeletingKB(false);
        }
    };

    const handleStartEditName = () => {
        setEditedName(currentKB?.name || "");
        setIsEditingName(true);
    };

    const handleCancelEditName = () => {
        setIsEditingName(false);
        setEditedName("");
    };

    const handleSaveName = async () => {
        if (!id || !editedName.trim() || editedName.trim() === currentKB?.name) {
            setIsEditingName(false);
            return;
        }

        setIsSavingName(true);
        try {
            await updateKB(id, { name: editedName.trim() });
            setIsEditingName(false);
        } catch (error) {
            logger.error("Failed to update knowledge base name", error);
        } finally {
            setIsSavingName(false);
        }
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSaveName();
        } else if (e.key === "Escape") {
            handleCancelEditName();
        }
    };

    // Focus input when editing
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const handleDocumentClick = (doc: KnowledgeDocument) => {
        if (doc.status === "ready") {
            setSelectedDocument(doc);
            setPanelMode("viewer");
        }
    };

    const handleCloseViewer = () => {
        setSelectedDocument(null);
        setPanelMode("empty");
    };

    const handleSearchClick = () => {
        setPanelMode("search");
        setSelectedDocument(null);
    };

    const handlePanelModeChange = (mode: PanelMode) => {
        setPanelMode(mode);
        if (mode !== "viewer") {
            setSelectedDocument(null);
        }
    };

    const handleIntegrationImport = async (input: CreateKBSourceInput) => {
        if (!id) return;

        setImportingFromIntegration(true);
        try {
            await createIntegrationSource(id, input);
            setShowIntegrationBrowser(false);
            // Refresh documents as they'll start appearing
            fetchDocuments(id);
            fetchStats(id);
        } catch (error) {
            logger.error("Failed to import from integration", error);
        } finally {
            setImportingFromIntegration(false);
        }
    };

    const handleSyncSource = async (sourceId: string) => {
        if (!id) return;
        try {
            await triggerSync(id, sourceId);
        } catch (error) {
            logger.error("Failed to trigger sync", error);
        }
    };

    const handleDeleteSource = async (sourceId: string) => {
        if (!id) return;
        try {
            await deleteIntegrationSource(id, sourceId);
        } catch (error) {
            logger.error("Failed to delete integration source", error);
        }
    };

    const handleUpdateSource = async (
        sourceId: string,
        syncEnabled: boolean,
        syncIntervalMinutes?: number
    ) => {
        if (!id) return;
        try {
            await updateIntegrationSource(id, sourceId, {
                syncEnabled,
                syncIntervalMinutes
            });
        } catch (error) {
            logger.error("Failed to update integration source", error);
        }
    };

    const handleImportComplete = () => {
        if (id) {
            fetchDocuments(id);
            fetchStats(id);
            fetchIntegrationSources(id);
        }
    };

    if (loading && !currentKB) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading knowledge base...</p>
                </div>
            </div>
        );
    }

    if (!currentKB) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-destructive mb-4">Knowledge base not found</p>
                    <button
                        onClick={() => navigate("/knowledge-bases")}
                        className="text-sm text-primary hover:underline"
                    >
                        Back to Knowledge Bases
                    </button>
                </div>
            </div>
        );
    }

    return (
        <MobileBuilderGuard backUrl="/knowledge-bases">
            <div className="h-screen flex flex-col bg-background">
                {/* Compact Header */}
                <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/knowledge-bases")}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Back to Knowledge Bases"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        onKeyDown={handleNameKeyDown}
                                        onBlur={handleSaveName}
                                        className="text-base font-semibold text-foreground bg-muted border border-border rounded px-2 py-0.5 outline-none focus:border-primary"
                                        disabled={isSavingName}
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={isSavingName}
                                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded transition-colors disabled:opacity-50"
                                        title="Save"
                                    >
                                        {isSavingName ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancelEditName}
                                        disabled={isSavingName}
                                        className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
                                        title="Cancel"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleStartEditName}
                                    className="flex items-center gap-2 group"
                                    title="Click to edit name"
                                >
                                    <h1 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {currentKB.name}
                                    </h1>
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Settings + Delete */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowDeleteKBModal(true)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete knowledge base"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Content - Three Column Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar - Overview */}
                    <div className="w-52 border-r border-border bg-card flex-shrink-0 overflow-y-auto">
                        <KBOverviewSidebar stats={currentStats} documents={currentDocuments} />
                    </div>

                    {/* Center - Document Grid */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
                        {/* Toolbar */}
                        <div className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-4 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                {/* Upload Button */}
                                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileInputChange}
                                        accept=".pdf,.docx,.doc,.txt,.md,.html,.json,.csv"
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    Upload
                                </label>

                                {/* Add URL Button */}
                                <button
                                    onClick={() => setShowUrlModal(true)}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    Add URL
                                </button>

                                {/* Import from Apps Button */}
                                <button
                                    onClick={() => setShowIntegrationBrowser(true)}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Import files from connected apps"
                                >
                                    <Cloud className="w-4 h-4" />
                                    Import
                                </button>
                            </div>

                            {/* Search Button */}
                            <button
                                onClick={handleSearchClick}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                    panelMode === "search"
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-foreground hover:bg-muted/80"
                                }`}
                            >
                                <Search className="w-4 h-4" />
                                Search
                            </button>
                        </div>

                        {/* Document Grid */}
                        <div className="flex-1 overflow-auto p-4 space-y-4">
                            {/* Import Progress */}
                            {currentImportJobId && (
                                <IntegrationImportProgress
                                    knowledgeBaseId={id || ""}
                                    jobId={currentImportJobId}
                                    onComplete={handleImportComplete}
                                    onClose={() => setCurrentImportJobId(null)}
                                />
                            )}

                            {/* Integration Sources */}
                            {integrationSources.length > 0 && (
                                <IntegrationSourcesPanel
                                    sources={integrationSources}
                                    onSync={handleSyncSource}
                                    onDelete={handleDeleteSource}
                                    onUpdate={handleUpdateSource}
                                    isSyncing={syncingSourceIds}
                                />
                            )}

                            <DocumentList
                                documents={currentDocuments}
                                onDeleteClick={setDeleteConfirmDocId}
                                onReprocess={handleReprocessDocument}
                                processingDocId={processingDocId}
                                onDocumentClick={handleDocumentClick}
                                selectedDocumentId={selectedDocument?.id}
                            />
                        </div>
                    </div>

                    {/* Right Panel - Context Panel */}
                    <KBContextPanel
                        mode={panelMode}
                        selectedDocument={selectedDocument}
                        knowledgeBaseId={id || ""}
                        documents={currentDocuments}
                        onClose={handleCloseViewer}
                        onModeChange={handlePanelModeChange}
                        onSearch={handleSearch}
                        width={panelWidth}
                        onWidthChange={setPanelWidth}
                    />
                </div>

                {/* Modals */}
                <AddUrlModal
                    isOpen={showUrlModal}
                    onClose={() => setShowUrlModal(false)}
                    onSubmit={handleAddUrl}
                    isLoading={uploading}
                />

                <DeleteDocumentModal
                    isOpen={deleteConfirmDocId !== null}
                    onClose={() => setDeleteConfirmDocId(null)}
                    onConfirm={handleDeleteDocument}
                    isLoading={processingDocId === deleteConfirmDocId}
                />

                <DeleteKnowledgeBaseModal
                    isOpen={showDeleteKBModal}
                    onClose={() => setShowDeleteKBModal(false)}
                    onConfirm={handleDeleteKnowledgeBase}
                    isLoading={deletingKB}
                    knowledgeBaseName={currentKB.name}
                />

                <IntegrationFileBrowserModal
                    isOpen={showIntegrationBrowser}
                    onClose={() => setShowIntegrationBrowser(false)}
                    knowledgeBaseId={id || ""}
                    onImport={handleIntegrationImport}
                    isLoading={importingFromIntegration}
                />

                {/* Settings Modal */}
                {showSettingsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setShowSettingsModal(false)}
                        />
                        <div className="relative bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
                            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-foreground">
                                    Knowledge Base Settings
                                </h2>
                                <button
                                    onClick={() => setShowSettingsModal(false)}
                                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-6">
                                <KBSettingsSection
                                    kb={currentKB}
                                    onUpdate={async (input) => {
                                        if (id) {
                                            await updateKB(id, input);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MobileBuilderGuard>
    );
}
