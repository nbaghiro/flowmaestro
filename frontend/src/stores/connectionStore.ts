import { create } from "zustand";
import {
    getConnections,
    createConnection,
    updateConnection,
    deleteConnection,
    CreateConnectionInput
} from "../lib/api";
import type { Connection, ConnectionMethod, ConnectionStatus } from "../lib/api";

interface ConnectionStore {
    connections: Connection[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchConnections: (params?: {
        provider?: string;
        connection_method?: ConnectionMethod;
        status?: ConnectionStatus;
    }) => Promise<void>;
    addConnection: (input: CreateConnectionInput) => Promise<Connection>;
    updateConnectionById: (id: string, input: Partial<CreateConnectionInput>) => Promise<void>;
    deleteConnectionById: (id: string) => Promise<void>;
    getByProvider: (provider: string) => Connection[];
    getByMethod: (method: ConnectionMethod) => Connection[];
    clearError: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
    connections: [],
    loading: false,
    error: null,

    fetchConnections: async (params) => {
        set({ loading: true, error: null });
        try {
            const response = await getConnections(params);
            if (response.success && response.data) {
                set({ connections: response.data, loading: false });
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch connections",
                loading: false
            });
        }
    },

    addConnection: async (input) => {
        set({ loading: true, error: null });
        try {
            const response = await createConnection(input);
            if (response.success && response.data) {
                set((state) => ({
                    connections: [...state.connections, response.data],
                    loading: false
                }));
                return response.data;
            }
            throw new Error("Failed to create connection");
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to create connection",
                loading: false
            });
            throw error;
        }
    },

    updateConnectionById: async (id, input) => {
        set({ loading: true, error: null });
        try {
            const response = await updateConnection(id, input);
            if (response.success && response.data) {
                set((state) => ({
                    connections: state.connections.map((conn) =>
                        conn.id === id ? response.data : conn
                    ),
                    loading: false
                }));
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to update connection",
                loading: false
            });
            throw error;
        }
    },

    deleteConnectionById: async (id) => {
        set({ loading: true, error: null });
        try {
            await deleteConnection(id);
            set((state) => ({
                connections: state.connections.filter((conn) => conn.id !== id),
                loading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to delete connection",
                loading: false
            });
            throw error;
        }
    },

    getByProvider: (provider) => {
        return get().connections.filter((conn) => conn.provider === provider);
    },

    getByMethod: (method) => {
        return get().connections.filter((conn) => conn.connection_method === method);
    },

    clearError: () => set({ error: null })
}));
