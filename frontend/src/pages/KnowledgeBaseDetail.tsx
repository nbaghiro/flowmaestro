import {
    BookOpen,
    ArrowLeft,
    Loader2,
    Trash2,
    FileText,
    Search,
    Settings,
    Pencil,
    Check,
    X
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileBuilderGuard } from "../components/common/MobileBuilderGuard";
import {
    AddUrlModal,
    DeleteDocumentModal,
    DeleteKnowledgeBaseModal,
    DocumentList,
    DocumentViewerPanel,
    KBSettingsSection,
    SearchSection,
    UploadSection
} from "../components/knowledgebases";
import { logger } from "../lib/logger";
import { wsClient } from "../lib/websocket";
import { useKnowledgeBaseStore } from "../stores/knowledgeBaseStore";
import type { KnowledgeDocument } from "../lib/api";

type TabType = "documents" | "search" | "settings";

function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

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
        updateKB
    } = useKnowledgeBaseStore();

    const [activeTab, setActiveTab] = useState<TabType>("documents");
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteConfirmDocId, setDeleteConfirmDocId] = useState<string | null>(null);
    const [processingDocId, setProcessingDocId] = useState<string | null>(null);
    const [showDeleteKBModal, setShowDeleteKBModal] = useState(false);
    const [deletingKB, setDeletingKB] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
    const [viewerWidth, setViewerWidth] = useState(450);

    // Name editing state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (id) {
            fetchKnowledgeBase(id);
            fetchDocuments(id);
            fetchStats(id);
        }
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        wsClient.connect(token).catch((err) => logger.error("Failed to connect WebSocket", err));

        const handleDocumentProcessing = () => {
            fetchDocuments(id);
        };

        const handleDocumentCompleted = () => {
            fetchDocuments(id);
            fetchStats(id);
        };

        const handleDocumentFailed = () => {
            fetchDocuments(id);
        };

        wsClient.on("kb:document:processing", handleDocumentProcessing);
        wsClient.on("kb:document:completed", handleDocumentCompleted);
        wsClient.on("kb:document:failed", handleDocumentFailed);

        pollingIntervalRef.current = setInterval(() => {
            fetchDocuments(id);
            fetchStats(id);
        }, 5000);

        return () => {
            wsClient.off("kb:document:processing", handleDocumentProcessing);
            wsClient.off("kb:document:completed", handleDocumentCompleted);
            wsClient.off("kb:document:failed", handleDocumentFailed);
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
            fetchStats(id);
        } catch (error) {
            logger.error("Failed to upload file", error);
        } finally {
            setUploading(false);
        }
    };

    const handleAddUrl = async (url: string, name?: string) => {
        if (!id) return;

        setUploading(true);
        try {
            await addUrl(id, url, name);
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
            setDeleteConfirmDocId(null);
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

        return await query(id, {
            query: searchQuery,
            top_k: topK,
            similarity_threshold: similarityThreshold
        });
    };

    const handleDeleteKnowledgeBase = async () => {
        if (!id) return;

        setDeletingKB(true);
        try {
            await deleteKB(id);
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
        }
    };

    const handleCloseViewer = () => {
        setSelectedDocument(null);
    };

    const tabs: { id: TabType; label: string; icon: typeof FileText }[] = [
        { id: "documents", label: "Documents", icon: FileText },
        { id: "search", label: "Search", icon: Search },
        { id: "settings", label: "Settings", icon: Settings }
    ];

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
                {/* Header */}
                <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-4">
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
                                        className="text-lg font-semibold text-foreground bg-muted border border-border rounded px-2 py-0.5 outline-none focus:border-primary"
                                        disabled={isSavingName}
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={isSavingName}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
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
                                    <h1 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {currentKB.name}
                                    </h1>
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Center: Stats badges */}
                    {currentStats && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground bg-background border border-border px-2.5 py-1 rounded-md">
                                {currentStats.document_count} docs
                            </span>
                            <span className="text-xs text-muted-foreground bg-background border border-border px-2.5 py-1 rounded-md">
                                {currentStats.chunk_count} chunks
                            </span>
                            <span className="text-xs text-muted-foreground bg-background border border-border px-2.5 py-1 rounded-md">
                                {formatFileSize(currentStats.total_size_bytes)}
                            </span>
                        </div>
                    )}

                    {/* Right: Delete */}
                    <button
                        onClick={() => setShowDeleteKBModal(true)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete knowledge base"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar */}
                    <div className="w-56 border-r border-border bg-card flex-shrink-0">
                        <nav className="p-4 space-y-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                                            activeTab === tab.id
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Center Panel */}
                    <div className="flex-1 overflow-auto bg-muted/30">
                        <div className="max-w-4xl mx-auto p-6">
                            {activeTab === "documents" && (
                                <div className="space-y-6">
                                    <UploadSection
                                        onFileUpload={handleFileUpload}
                                        onAddUrlClick={() => setShowUrlModal(true)}
                                        isUploading={uploading}
                                    />
                                    <DocumentList
                                        documents={currentDocuments}
                                        onDeleteClick={setDeleteConfirmDocId}
                                        onReprocess={handleReprocessDocument}
                                        processingDocId={processingDocId}
                                        onDocumentClick={handleDocumentClick}
                                        selectedDocumentId={selectedDocument?.id}
                                    />
                                </div>
                            )}

                            {activeTab === "search" && (
                                <SearchSection
                                    knowledgeBaseId={id || ""}
                                    documents={currentDocuments}
                                    onSearch={handleSearch}
                                />
                            )}

                            {activeTab === "settings" && (
                                <KBSettingsSection
                                    kb={currentKB}
                                    onUpdate={async (input) => {
                                        if (id) {
                                            await updateKB(id, input);
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Document Viewer Panel */}
                    <DocumentViewerPanel
                        doc={selectedDocument}
                        knowledgeBaseId={id || ""}
                        isOpen={selectedDocument !== null}
                        onClose={handleCloseViewer}
                        width={viewerWidth}
                        onWidthChange={setViewerWidth}
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
            </div>
        </MobileBuilderGuard>
    );
}
