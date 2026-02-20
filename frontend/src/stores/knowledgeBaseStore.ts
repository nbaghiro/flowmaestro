import { create } from "zustand";
import {
    getKnowledgeBases,
    getKnowledgeBase,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    getKnowledgeBaseStats,
    getKnowledgeDocuments,
    uploadDocument,
    addUrlToKnowledgeBase,
    queryKnowledgeBase,
    deleteDocument,
    reprocessDocument,
    // Integration imports
    getKBIntegrationProviders,
    getKBIntegrationSources,
    createKBIntegrationSource,
    updateKBIntegrationSource,
    deleteKBIntegrationSource,
    triggerKBIntegrationSync
} from "../lib/api";
import type {
    KnowledgeBase,
    KnowledgeDocument,
    KnowledgeBaseStats,
    CreateKnowledgeBaseInput,
    UpdateKnowledgeBaseInput,
    QueryKnowledgeBaseInput,
    ChunkSearchResult,
    // Integration types
    DocumentProviderCapability,
    KnowledgeBaseSource,
    CreateKBSourceInput,
    UpdateKBSourceInput
} from "../lib/api";

interface KnowledgeBaseStore {
    // State
    knowledgeBases: KnowledgeBase[];
    currentKB: KnowledgeBase | null;
    currentDocuments: KnowledgeDocument[];
    currentStats: KnowledgeBaseStats | null;
    loading: boolean;
    error: string | null;

    // Integration state
    integrationProviders: DocumentProviderCapability[];
    integrationSources: KnowledgeBaseSource[];
    loadingIntegration: boolean;
    syncingSourceIds: Set<string>;
    currentImportJobId: string | null;

    // Actions
    fetchKnowledgeBases: (params?: { folderId?: string }) => Promise<void>;
    fetchKnowledgeBase: (id: string) => Promise<void>;
    createKB: (input: CreateKnowledgeBaseInput) => Promise<KnowledgeBase>;
    updateKB: (id: string, input: UpdateKnowledgeBaseInput) => Promise<void>;
    deleteKB: (id: string) => Promise<void>;
    fetchStats: (id: string) => Promise<void>;
    fetchDocuments: (id: string) => Promise<void>;
    uploadDoc: (id: string, file: File) => Promise<void>;
    addUrl: (id: string, url: string, name?: string) => Promise<void>;
    deleteDoc: (kbId: string, docId: string) => Promise<void>;
    reprocessDoc: (kbId: string, docId: string) => Promise<void>;
    query: (id: string, input: QueryKnowledgeBaseInput) => Promise<ChunkSearchResult[]>;
    clearError: () => void;
    clearCurrent: () => void;

    // Integration actions
    fetchIntegrationProviders: (kbId: string) => Promise<void>;
    fetchIntegrationSources: (kbId: string) => Promise<void>;
    createIntegrationSource: (kbId: string, input: CreateKBSourceInput) => Promise<string>;
    updateIntegrationSource: (
        kbId: string,
        sourceId: string,
        input: UpdateKBSourceInput
    ) => Promise<void>;
    deleteIntegrationSource: (kbId: string, sourceId: string) => Promise<void>;
    triggerSync: (kbId: string, sourceId: string) => Promise<string>;
    setCurrentImportJobId: (jobId: string | null) => void;
}

export const useKnowledgeBaseStore = create<KnowledgeBaseStore>((set, get) => ({
    // Initial state
    knowledgeBases: [],
    currentKB: null,
    currentDocuments: [],
    currentStats: null,
    loading: false,
    error: null,

    // Integration initial state
    integrationProviders: [],
    integrationSources: [],
    loadingIntegration: false,
    syncingSourceIds: new Set(),
    currentImportJobId: null,

    // Fetch all knowledge bases
    fetchKnowledgeBases: async (params?: { folderId?: string }) => {
        set({ loading: true, error: null });
        try {
            const response = await getKnowledgeBases({ folderId: params?.folderId });
            if (response.success && response.data) {
                set({ knowledgeBases: response.data, loading: false });
            } else {
                throw new Error(response.error || "Failed to fetch knowledge bases");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch knowledge bases",
                loading: false
            });
        }
    },

    // Fetch a single knowledge base
    fetchKnowledgeBase: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const response = await getKnowledgeBase(id);
            if (response.success && response.data) {
                set({ currentKB: response.data, loading: false });
            } else {
                throw new Error(response.error || "Failed to fetch knowledge base");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch knowledge base",
                loading: false
            });
        }
    },

    // Create a new knowledge base
    createKB: async (input: CreateKnowledgeBaseInput) => {
        set({ loading: true, error: null });
        try {
            const response = await createKnowledgeBase(input);
            if (response.success && response.data) {
                set((state) => ({
                    knowledgeBases: [...state.knowledgeBases, response.data!],
                    loading: false
                }));
                return response.data;
            }
            throw new Error(response.error || "Failed to create knowledge base");
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to create knowledge base",
                loading: false
            });
            throw error;
        }
    },

    // Update a knowledge base
    updateKB: async (id: string, input: UpdateKnowledgeBaseInput) => {
        set({ loading: true, error: null });
        try {
            const response = await updateKnowledgeBase(id, input);
            if (response.success && response.data) {
                set((state) => ({
                    knowledgeBases: state.knowledgeBases.map((kb) =>
                        kb.id === id ? response.data! : kb
                    ),
                    currentKB: state.currentKB?.id === id ? response.data! : state.currentKB,
                    loading: false
                }));
            } else {
                throw new Error(response.error || "Failed to update knowledge base");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to update knowledge base",
                loading: false
            });
            throw error;
        }
    },

    // Delete a knowledge base
    deleteKB: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const response = await deleteKnowledgeBase(id);
            if (response.success) {
                set((state) => ({
                    knowledgeBases: state.knowledgeBases.filter((kb) => kb.id !== id),
                    currentKB: state.currentKB?.id === id ? null : state.currentKB,
                    loading: false
                }));
            } else {
                throw new Error(response.error || "Failed to delete knowledge base");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to delete knowledge base",
                loading: false
            });
            throw error;
        }
    },

    // Fetch knowledge base stats
    fetchStats: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const response = await getKnowledgeBaseStats(id);
            if (response.success && response.data) {
                set({ currentStats: response.data, loading: false });
            } else {
                throw new Error(response.error || "Failed to fetch stats");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch stats",
                loading: false
            });
        }
    },

    // Fetch documents
    fetchDocuments: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const response = await getKnowledgeDocuments(id);
            if (response.success && response.data) {
                set({ currentDocuments: response.data, loading: false });
            } else {
                throw new Error(response.error || "Failed to fetch documents");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch documents",
                loading: false
            });
        }
    },

    // Upload a document
    uploadDoc: async (id: string, file: File) => {
        set({ loading: true, error: null });
        try {
            const response = await uploadDocument(id, file);
            if (response.success) {
                // Refresh documents list
                await get().fetchDocuments(id);
                set({ loading: false });
            } else {
                throw new Error(response.error || "Failed to upload document");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to upload document",
                loading: false
            });
            throw error;
        }
    },

    // Add a URL
    addUrl: async (id: string, url: string, name?: string) => {
        set({ loading: true, error: null });
        try {
            const response = await addUrlToKnowledgeBase(id, url, name);
            if (response.success) {
                // Refresh documents list
                await get().fetchDocuments(id);
                set({ loading: false });
            } else {
                throw new Error(response.error || "Failed to add URL");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to add URL",
                loading: false
            });
            throw error;
        }
    },

    // Delete a document
    deleteDoc: async (kbId: string, docId: string) => {
        set({ loading: true, error: null });
        try {
            const response = await deleteDocument(kbId, docId);
            if (response.success) {
                // Refresh documents list and stats
                await Promise.all([get().fetchDocuments(kbId), get().fetchStats(kbId)]);
                set({ loading: false });
            } else {
                throw new Error(response.error || "Failed to delete document");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to delete document",
                loading: false
            });
            throw error;
        }
    },

    // Reprocess a document
    reprocessDoc: async (kbId: string, docId: string) => {
        set({ loading: true, error: null });
        try {
            const response = await reprocessDocument(kbId, docId);
            if (response.success) {
                // Refresh documents list to show updated status
                await get().fetchDocuments(kbId);
                set({ loading: false });
            } else {
                throw new Error(response.error || "Failed to reprocess document");
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to reprocess document",
                loading: false
            });
            throw error;
        }
    },

    // Query knowledge base
    query: async (id: string, input: QueryKnowledgeBaseInput) => {
        set({ loading: true, error: null });
        try {
            const response = await queryKnowledgeBase(id, input);
            if (response.success && response.data) {
                set({ loading: false });
                return response.data.results;
            }
            throw new Error(response.error || "Failed to query knowledge base");
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to query knowledge base",
                loading: false
            });
            throw error;
        }
    },

    // Clear error
    clearError: () => {
        set({ error: null });
    },

    // Clear current knowledge base
    clearCurrent: () => {
        set({
            currentKB: null,
            currentDocuments: [],
            currentStats: null,
            integrationProviders: [],
            integrationSources: [],
            currentImportJobId: null
        });
    },

    // Fetch integration providers for a knowledge base
    fetchIntegrationProviders: async (kbId: string) => {
        set({ loadingIntegration: true });
        try {
            const response = await getKBIntegrationProviders(kbId);
            if (response.success) {
                set({ integrationProviders: response.data, loadingIntegration: false });
            } else {
                throw new Error(response.error || "Failed to fetch integration providers");
            }
        } catch (error) {
            set({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch integration providers",
                loadingIntegration: false
            });
        }
    },

    // Fetch integration sources for a knowledge base
    fetchIntegrationSources: async (kbId: string) => {
        set({ loadingIntegration: true });
        try {
            const response = await getKBIntegrationSources(kbId);
            if (response.success) {
                set({ integrationSources: response.data, loadingIntegration: false });
            } else {
                throw new Error(response.error || "Failed to fetch integration sources");
            }
        } catch (error) {
            set({
                error:
                    error instanceof Error ? error.message : "Failed to fetch integration sources",
                loadingIntegration: false
            });
        }
    },

    // Create an integration source and start import
    createIntegrationSource: async (kbId: string, input: CreateKBSourceInput) => {
        set({ loadingIntegration: true, error: null });
        try {
            const response = await createKBIntegrationSource(kbId, input);
            if (response.success && response.data) {
                // Refresh sources list
                await get().fetchIntegrationSources(kbId);
                set({
                    currentImportJobId: response.data.jobId,
                    loadingIntegration: false
                });
                return response.data.jobId;
            }
            throw new Error(response.error || "Failed to create integration source");
        } catch (error) {
            set({
                error:
                    error instanceof Error ? error.message : "Failed to create integration source",
                loadingIntegration: false
            });
            throw error;
        }
    },

    // Update an integration source
    updateIntegrationSource: async (kbId: string, sourceId: string, input: UpdateKBSourceInput) => {
        try {
            const response = await updateKBIntegrationSource(kbId, sourceId, input);
            if (response.success && response.data) {
                set((state) => ({
                    integrationSources: state.integrationSources.map((s) =>
                        s.id === sourceId ? response.data! : s
                    )
                }));
            } else {
                throw new Error(response.error || "Failed to update integration source");
            }
        } catch (error) {
            set({
                error:
                    error instanceof Error ? error.message : "Failed to update integration source"
            });
            throw error;
        }
    },

    // Delete an integration source
    deleteIntegrationSource: async (kbId: string, sourceId: string) => {
        try {
            const response = await deleteKBIntegrationSource(kbId, sourceId);
            if (response.success) {
                set((state) => ({
                    integrationSources: state.integrationSources.filter((s) => s.id !== sourceId)
                }));
            } else {
                throw new Error(response.error || "Failed to delete integration source");
            }
        } catch (error) {
            set({
                error:
                    error instanceof Error ? error.message : "Failed to delete integration source"
            });
            throw error;
        }
    },

    // Trigger a manual sync for a source
    triggerSync: async (kbId: string, sourceId: string) => {
        set((state) => ({
            syncingSourceIds: new Set([...state.syncingSourceIds, sourceId])
        }));
        try {
            const response = await triggerKBIntegrationSync(kbId, sourceId);
            if (response.success && response.data) {
                set({ currentImportJobId: response.data.jobId });
                // Refresh sources to show "syncing" status
                await get().fetchIntegrationSources(kbId);
                return response.data.jobId;
            }
            throw new Error(response.error || "Failed to trigger sync");
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to trigger sync"
            });
            throw error;
        } finally {
            set((state) => {
                const newSyncingIds = new Set(state.syncingSourceIds);
                newSyncingIds.delete(sourceId);
                return { syncingSourceIds: newSyncingIds };
            });
        }
    },

    // Set current import job ID
    setCurrentImportJobId: (jobId: string | null) => {
        set({ currentImportJobId: jobId });
    }
}));
