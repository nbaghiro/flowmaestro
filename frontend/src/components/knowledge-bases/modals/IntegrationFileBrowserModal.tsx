import {
    ArrowLeft,
    Check,
    ChevronRight,
    File,
    Folder,
    FolderSync,
    Plus,
    Search,
    X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
    ALL_PROVIDERS,
    supportsOAuth,
    type CreateKBSourceInput,
    type DocumentProviderCapability,
    type IntegrationBrowseResult,
    type IntegrationFile,
    type Provider
} from "@flowmaestro/shared";

import {
    browseKBIntegration,
    getKBCapableProviderIds,
    getKBIntegrationProviders
} from "../../../lib/api";
import { logger } from "../../../lib/logger";
import { useConnectionStore } from "../../../stores/connectionStore";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { Select } from "../../common/Select";
import { Spinner } from "../../common/Spinner";
import { Switch } from "../../common/Switch";
import { NewConnectionDialog } from "../../connections/dialogs/NewConnectionDialog";

import type { Connection } from "../../../lib/api";

interface IntegrationFileBrowserModalProps {
    isOpen: boolean;
    onClose: () => void;
    knowledgeBaseId: string;
    onImport: (input: CreateKBSourceInput) => Promise<void>;
    isLoading: boolean;
}

type DialogView = "provider-list" | "connection-list" | "file-browser";

export function IntegrationFileBrowserModal({
    isOpen,
    onClose,
    knowledgeBaseId,
    onImport,
    isLoading
}: IntegrationFileBrowserModalProps) {
    const { connections, loading: loadingConnections, fetchConnections } = useConnectionStore();

    // View state
    const [view, setView] = useState<DialogView>("provider-list");
    const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);

    // Provider state (for file browsing capability info)
    const [capableProviders, setCapableProviders] = useState<DocumentProviderCapability[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

    // Search and filter state for provider list
    const [providerSearchQuery, setProviderSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Browse state
    const [browseResult, setBrowseResult] = useState<IntegrationBrowseResult | null>(null);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [selectedFolder, setSelectedFolder] = useState<IntegrationFile | null>(null);

    // Sync options
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [syncInterval, setSyncInterval] = useState(60);

    // Import mode: 'files' (specific files) or 'folder' (entire folder)
    const [importMode, setImportMode] = useState<"files" | "folder">("files");

    // New connection dialog
    const [isNewConnectionDialogOpen, setIsNewConnectionDialogOpen] = useState(false);

    // Capable provider IDs (fetched from backend)
    const [capableProviderIds, setCapableProviderIds] = useState<string[]>([]);

    // Get document-capable providers from ALL_PROVIDERS filtered by backend detection
    const documentProviders = ALL_PROVIDERS.filter(
        (p) => capableProviderIds.includes(p.provider) && !p.comingSoon
    );

    // Filter providers based on search query and category
    const filteredProviders = documentProviders.filter((provider) => {
        const query = providerSearchQuery.toLowerCase();
        const matchesSearch =
            provider.displayName.toLowerCase().includes(query) ||
            provider.description.toLowerCase().includes(query) ||
            provider.category.toLowerCase().includes(query);

        const matchesCategory =
            selectedCategory === "all" || provider.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Category order for sorting
    const categoryOrder = [
        "File Storage",
        "Productivity",
        "Developer Tools",
        "Project Management",
        "Communication",
        "CRM & Sales",
        "E-commerce",
        "Marketing",
        "Social Media"
    ];

    const categories = Array.from(new Set(filteredProviders.map((p) => p.category)));
    const sortedCategories = categories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const providersByCategory = sortedCategories.map((category) => ({
        name: category,
        providers: filteredProviders.filter((p) => p.category === category)
    }));

    // Load providers and connections on open
    useEffect(() => {
        if (isOpen) {
            setView("provider-list");
            setCurrentProvider(null);
            setSelectedConnection(null);
            setBrowseResult(null);
            setSelectedFiles(new Set());
            setSelectedFolder(null);
            setSearchQuery("");
            setProviderSearchQuery("");
            setSelectedCategory("all");
            setImportMode("files");
            loadProviders();
            fetchConnections();
        }
    }, [isOpen, fetchConnections]);

    const loadProviders = async () => {
        setLoadingProviders(true);
        try {
            // Fetch both: capable provider IDs (for showing all options) and connected providers (for capability info)
            const [capableResponse, connectedResponse] = await Promise.all([
                getKBCapableProviderIds(knowledgeBaseId),
                getKBIntegrationProviders(knowledgeBaseId)
            ]);

            if (capableResponse.success) {
                setCapableProviderIds(capableResponse.data);
            }
            if (connectedResponse.success) {
                setCapableProviders(connectedResponse.data);
            }
        } catch (error) {
            logger.error("Failed to load providers", error);
        } finally {
            setLoadingProviders(false);
        }
    };

    // Get connections for selected provider
    const providerConnections = currentProvider
        ? connections.filter(
              (conn) => conn.provider === currentProvider.provider && conn.status === "active"
          )
        : [];

    // Get capability info for a connection
    const getCapabilityForConnection = (connectionId: string) => {
        return capableProviders.find((p) => p.connectionId === connectionId);
    };

    const handleProviderClick = (provider: Provider) => {
        setCurrentProvider(provider);
        setView("connection-list");
    };

    const handleConnectionSelect = async (connection: Connection) => {
        setSelectedConnection(connection);
        setView("file-browser");
        setBrowseResult(null);
        setSelectedFiles(new Set());
        setSelectedFolder(null);

        // Start browsing files
        setLoadingFiles(true);
        try {
            const response = await browseKBIntegration(knowledgeBaseId, connection.id, {});
            if (response.success) {
                setBrowseResult(response.data);
            }
        } catch (error) {
            logger.error("Failed to browse files", error);
        } finally {
            setLoadingFiles(false);
        }
    };

    const browseFiles = useCallback(
        async (folderId?: string, query?: string) => {
            if (!selectedConnection) return;

            setLoadingFiles(true);
            try {
                const response = await browseKBIntegration(knowledgeBaseId, selectedConnection.id, {
                    folderId,
                    query
                });
                if (response.success) {
                    setBrowseResult(response.data);
                }
            } catch (error) {
                logger.error("Failed to browse files", error);
            } finally {
                setLoadingFiles(false);
            }
        },
        [selectedConnection, knowledgeBaseId]
    );

    const handleSearch = () => {
        if (searchQuery.trim()) {
            browseFiles(undefined, searchQuery.trim());
        }
    };

    const handleFolderClick = (folder: IntegrationFile) => {
        browseFiles(folder.id);
        setSelectedFolder(folder);
        setSelectedFiles(new Set());
        setImportMode("files");
    };

    const handleBreadcrumbClick = (id: string) => {
        if (id === "root") {
            browseFiles();
            setSelectedFolder(null);
        } else {
            browseFiles(id);
        }
        setSelectedFiles(new Set());
        setImportMode("files");
    };

    const handleFileToggle = (file: IntegrationFile) => {
        if (file.isFolder) {
            handleFolderClick(file);
            return;
        }

        const newSelected = new Set(selectedFiles);
        if (newSelected.has(file.id)) {
            newSelected.delete(file.id);
        } else {
            newSelected.add(file.id);
        }
        setSelectedFiles(newSelected);
        setImportMode("files");
    };

    const handleSelectFolder = () => {
        setImportMode("folder");
        setSelectedFiles(new Set());
    };

    const handleImport = async () => {
        if (!selectedConnection) return;

        const input: CreateKBSourceInput = {
            connectionId: selectedConnection.id,
            sourceType: importMode === "folder" ? "folder" : "file",
            sourceConfig:
                importMode === "folder"
                    ? {
                          folderId: selectedFolder?.id || undefined,
                          folderPath:
                              browseResult?.breadcrumbs?.map((b) => b.name).join("/") || undefined,
                          recursive: true
                      }
                    : {
                          fileIds: Array.from(selectedFiles)
                      },
            syncEnabled,
            syncIntervalMinutes: syncInterval
        };

        await onImport(input);
    };

    const handleClose = () => {
        setView("provider-list");
        setCurrentProvider(null);
        setSelectedConnection(null);
        setBrowseResult(null);
        setSelectedFiles(new Set());
        setSelectedFolder(null);
        setSearchQuery("");
        setProviderSearchQuery("");
        setSelectedCategory("all");
        setImportMode("files");
        onClose();
    };

    const handleBack = () => {
        if (view === "file-browser") {
            setView("connection-list");
            setSelectedConnection(null);
            setBrowseResult(null);
            setSelectedFiles(new Set());
            setSelectedFolder(null);
        } else if (view === "connection-list") {
            setView("provider-list");
            setCurrentProvider(null);
            setProviderSearchQuery("");
            setSelectedCategory("all");
        }
    };

    const handleAddNewConnection = () => {
        setIsNewConnectionDialogOpen(true);
    };

    const handleConnectionCreated = () => {
        setIsNewConnectionDialogOpen(false);
        fetchConnections();
        loadProviders();
    };

    const canImport = selectedConnection && (importMode === "folder" || selectedFiles.size > 0);

    // Get capability for current connection
    const currentCapability = selectedConnection
        ? getCapabilityForConnection(selectedConnection.id)
        : null;

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 !m-0 bg-black/50 backdrop-blur-sm"
                    onClick={isLoading ? undefined : handleClose}
                />

                {/* Dialog */}
                <div
                    className={`relative bg-card border border-border rounded-lg shadow-xl w-full mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 ${
                        view === "provider-list" ? "max-w-6xl" : "max-w-2xl"
                    }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            {view !== "provider-list" && (
                                <Button variant="icon" onClick={handleBack}>
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            )}
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {view === "provider-list" && "Import from Apps"}
                                    {view === "connection-list" &&
                                        `Select ${currentProvider?.displayName} Connection`}
                                    {view === "file-browser" && "Select Files"}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {view === "provider-list" &&
                                        "Choose an app to import documents from"}
                                    {view === "connection-list" &&
                                        "Select an existing connection or create a new one"}
                                    {view === "file-browser" &&
                                        `${selectedConnection?.name} - Select files to import`}
                                </p>
                            </div>
                        </div>
                        <Button variant="icon" onClick={handleClose} disabled={isLoading}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Provider List View */}
                        {view === "provider-list" && (
                            <>
                                {/* Search and Filter Bar */}
                                <div className="p-6 pb-4">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {/* Search Input */}
                                        <div className="relative sm:flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                                            <Input
                                                type="text"
                                                placeholder="Search providers..."
                                                value={providerSearchQuery}
                                                onChange={(e) =>
                                                    setProviderSearchQuery(e.target.value)
                                                }
                                                className="pl-10"
                                            />
                                        </div>

                                        {/* Category Dropdown */}
                                        <Select
                                            value={selectedCategory}
                                            onChange={setSelectedCategory}
                                            options={[
                                                { value: "all", label: "All Categories" },
                                                ...sortedCategories.map((category) => ({
                                                    value: category,
                                                    label: category
                                                }))
                                            ]}
                                            className="sm:w-[240px] sm:flex-shrink-0"
                                        />
                                    </div>
                                </div>

                                {/* Provider List */}
                                <div className="px-6 pb-6">
                                    {loadingProviders || loadingConnections ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <Spinner size="md" />
                                            <span className="text-sm text-muted-foreground">
                                                Loading apps...
                                            </span>
                                        </div>
                                    ) : filteredProviders.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-sm text-muted-foreground">
                                                No providers found
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {providersByCategory.map((category) => (
                                                <section key={category.name}>
                                                    <h3 className="text-base font-semibold text-foreground mb-4">
                                                        {category.name}
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {category.providers.map((provider) => {
                                                            const providerConns =
                                                                connections.filter(
                                                                    (c) =>
                                                                        c.provider ===
                                                                            provider.provider &&
                                                                        c.status === "active"
                                                                );
                                                            const connectionCount =
                                                                providerConns.length;

                                                            return (
                                                                <ProviderCard
                                                                    key={provider.provider}
                                                                    provider={provider}
                                                                    connectionCount={
                                                                        connectionCount
                                                                    }
                                                                    onClick={() =>
                                                                        handleProviderClick(
                                                                            provider
                                                                        )
                                                                    }
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Connection List View */}
                        {view === "connection-list" && currentProvider && (
                            <div className="p-6">
                                {loadingConnections ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <Spinner size="md" />
                                        <span className="text-sm text-muted-foreground">
                                            Loading connections...
                                        </span>
                                    </div>
                                ) : providerConnections.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                            {currentProvider.logoUrl ? (
                                                <img
                                                    src={currentProvider.logoUrl}
                                                    alt={currentProvider.displayName}
                                                    className="w-10 h-10 object-contain"
                                                />
                                            ) : (
                                                <Plus className="w-8 h-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <h3 className="text-base font-medium text-foreground mb-2">
                                            No connections found
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-6">
                                            Create your first {currentProvider.displayName}{" "}
                                            connection to import documents
                                        </p>
                                        <Button variant="primary" onClick={handleAddNewConnection}>
                                            <Plus className="w-4 h-4" />
                                            Add Connection
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                                            {providerConnections.map((connection) => (
                                                <ConnectionCard
                                                    key={connection.id}
                                                    connection={connection}
                                                    onSelect={() =>
                                                        handleConnectionSelect(connection)
                                                    }
                                                    providerLogoUrl={currentProvider.logoUrl}
                                                />
                                            ))}
                                        </div>

                                        <Button
                                            variant="secondary"
                                            onClick={handleAddNewConnection}
                                            className="w-full"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add New Connection
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* File Browser View */}
                        {view === "file-browser" && selectedConnection && (
                            <div className="p-6 space-y-5">
                                {/* Search bar (if supported) */}
                                {currentCapability?.supportsSearch && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Search Files
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                <Input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search files..."
                                                    onKeyDown={(e) =>
                                                        e.key === "Enter" && handleSearch()
                                                    }
                                                    className="pl-10"
                                                />
                                            </div>
                                            <Button variant="secondary" onClick={handleSearch}>
                                                Search
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Breadcrumbs */}
                                {browseResult && browseResult.breadcrumbs.length > 0 && (
                                    <div className="flex items-center gap-1 text-sm">
                                        <button
                                            onClick={() => handleBreadcrumbClick("root")}
                                            className="text-primary hover:underline font-medium"
                                        >
                                            Root
                                        </button>
                                        {browseResult.breadcrumbs.map((crumb) => (
                                            <span key={crumb.id} className="flex items-center">
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                <button
                                                    onClick={() => handleBreadcrumbClick(crumb.id)}
                                                    className="text-primary hover:underline font-medium"
                                                >
                                                    {crumb.name}
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* File list */}
                                <div className="border border-border rounded-lg overflow-hidden bg-background">
                                    {loadingFiles ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <Spinner size="md" />
                                            <span className="text-sm text-muted-foreground">
                                                Loading files...
                                            </span>
                                        </div>
                                    ) : !browseResult || browseResult.files.length === 0 ? (
                                        <div className="text-center py-12">
                                            <File className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                            <p className="text-sm text-muted-foreground">
                                                No files found
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Import folder option */}
                                            <button
                                                onClick={handleSelectFolder}
                                                className={`w-full flex items-center gap-3 p-4 border-b border-border transition-colors text-left ${
                                                    importMode === "folder"
                                                        ? "bg-primary/10"
                                                        : "hover:bg-muted/50"
                                                }`}
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                        importMode === "folder"
                                                            ? "bg-primary border-primary"
                                                            : "border-muted-foreground/30"
                                                    }`}
                                                >
                                                    {importMode === "folder" && (
                                                        <Check className="w-3 h-3 text-primary-foreground" />
                                                    )}
                                                </div>
                                                <FolderSync className="w-5 h-5 text-primary" />
                                                <div className="flex-1">
                                                    <span className="font-medium text-foreground">
                                                        Import entire folder
                                                    </span>
                                                    {syncEnabled && (
                                                        <span className="text-muted-foreground text-sm ml-2">
                                                            (with sync)
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            {/* File list */}
                                            <div className="max-h-64 overflow-y-auto divide-y divide-border">
                                                {browseResult.files.map((file) => (
                                                    <button
                                                        key={file.id}
                                                        onClick={() => handleFileToggle(file)}
                                                        className={`w-full flex items-center gap-3 p-4 transition-colors text-left ${
                                                            selectedFiles.has(file.id) &&
                                                            importMode === "files"
                                                                ? "bg-primary/10"
                                                                : "hover:bg-muted/50"
                                                        }`}
                                                    >
                                                        {!file.isFolder && (
                                                            <div
                                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                                    selectedFiles.has(file.id) &&
                                                                    importMode === "files"
                                                                        ? "bg-primary border-primary"
                                                                        : "border-muted-foreground/30"
                                                                }`}
                                                            >
                                                                {selectedFiles.has(file.id) &&
                                                                    importMode === "files" && (
                                                                        <Check className="w-3 h-3 text-primary-foreground" />
                                                                    )}
                                                            </div>
                                                        )}
                                                        {file.isFolder ? (
                                                            <Folder className="w-5 h-5 text-yellow-500" />
                                                        ) : (
                                                            <File className="w-5 h-5 text-muted-foreground" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="truncate text-foreground">
                                                                {file.name}
                                                            </p>
                                                            {!file.isFolder && file.size && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatFileSize(file.size)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {file.isFolder && (
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Load more */}
                                            {browseResult.nextPageToken && (
                                                <button
                                                    onClick={() =>
                                                        browseFiles(selectedFolder?.id, undefined)
                                                    }
                                                    className="w-full p-3 text-center text-sm text-primary hover:bg-muted/50 transition-colors border-t border-border"
                                                >
                                                    Load more...
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer - Only show on file browser view */}
                    {view === "file-browser" && (
                        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
                            {/* Sync options */}
                            <div className="flex items-center gap-4">
                                <Switch
                                    checked={syncEnabled}
                                    onCheckedChange={setSyncEnabled}
                                    label="Enable sync"
                                />
                                {syncEnabled && (
                                    <Select
                                        value={String(syncInterval)}
                                        onChange={(value) => setSyncInterval(parseInt(value))}
                                        options={[
                                            { value: "15", label: "Every 15 min" },
                                            { value: "30", label: "Every 30 min" },
                                            { value: "60", label: "Every hour" },
                                            { value: "360", label: "Every 6 hours" },
                                            { value: "1440", label: "Every day" }
                                        ]}
                                        className="w-36"
                                    />
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleImport}
                                    disabled={!canImport || isLoading}
                                    loading={isLoading}
                                >
                                    {isLoading
                                        ? "Importing..."
                                        : importMode === "folder"
                                          ? "Import Folder"
                                          : `Import ${selectedFiles.size} File${selectedFiles.size !== 1 ? "s" : ""}`}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Connection Dialog */}
            {currentProvider && (
                <NewConnectionDialog
                    isOpen={isNewConnectionDialogOpen}
                    onClose={() => setIsNewConnectionDialogOpen(false)}
                    provider={currentProvider.provider}
                    providerDisplayName={currentProvider.displayName}
                    providerIcon={
                        <img
                            src={currentProvider.logoUrl}
                            alt={currentProvider.displayName}
                            className="w-10 h-10 object-contain"
                        />
                    }
                    onSuccess={handleConnectionCreated}
                    supportsOAuth={supportsOAuth(currentProvider.methods)}
                    supportsApiKey={currentProvider.methods.includes("api_key")}
                    oauthSettings={currentProvider.oauthSettings}
                />
            )}
        </>
    );
}

// Provider Card Component
interface ProviderCardProps {
    provider: Provider;
    connectionCount: number;
    onClick: () => void;
}

function ProviderCard({ provider, connectionCount, onClick }: ProviderCardProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-start gap-4 p-5 text-left border border-border rounded-xl transition-all bg-card hover:border-primary/50 hover:bg-accent hover:shadow-sm"
            type="button"
        >
            {/* Logo */}
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                <img
                    src={provider.logoUrl}
                    alt={`${provider.displayName} logo`}
                    className="w-10 h-10 object-contain"
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-foreground truncate">
                        {provider.displayName}
                    </h4>
                    {connectionCount > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md">
                            {connectionCount} connected
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
            </div>
        </button>
    );
}

// Connection Card Component
interface ConnectionCardProps {
    connection: Connection;
    onSelect: () => void;
    providerLogoUrl?: string;
}

function ConnectionCard({ connection, onSelect, providerLogoUrl }: ConnectionCardProps) {
    const methodLabels: Record<string, string> = {
        oauth2: "OAuth",
        api_key: "API Key",
        mcp: "MCP",
        basic_auth: "Basic Auth",
        custom: "Custom"
    };

    const methodColors: Record<string, string> = {
        oauth2: "bg-purple-900/30 text-purple-400",
        api_key: "bg-blue-900/30 text-blue-400",
        mcp: "bg-indigo-900/30 text-indigo-400",
        basic_auth: "bg-muted text-muted-foreground",
        custom: "bg-muted text-muted-foreground"
    };

    return (
        <button
            onClick={onSelect}
            className="w-full flex items-start gap-4 p-4 text-left border rounded-lg transition-all border-border hover:border-primary/50 hover:bg-accent"
            type="button"
        >
            {/* Provider Icon */}
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {providerLogoUrl ? (
                    <img
                        src={providerLogoUrl}
                        alt="Provider logo"
                        className="w-10 h-10 object-contain"
                    />
                ) : (
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                )}
            </div>

            {/* Connection Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-foreground truncate">
                        {connection.name}
                    </h3>
                    <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                            methodColors[connection.connection_method] || methodColors.custom
                        }`}
                    >
                        {methodLabels[connection.connection_method] || "Custom"}
                    </span>
                </div>

                {connection.metadata?.account_info?.email && (
                    <p className="text-xs text-muted-foreground truncate">
                        {connection.metadata.account_info.email}
                    </p>
                )}
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
        </button>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
