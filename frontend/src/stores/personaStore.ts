import { create } from "zustand";
import * as api from "../lib/api";
import { logger } from "../lib/logger";
import type {
    PersonaDefinition,
    PersonaDefinitionSummary,
    PersonaCategory,
    PersonaInstance,
    PersonaInstanceSummary,
    PersonaInstanceStatus,
    CreatePersonaInstanceRequest,
    PersonaInstanceDashboardResponse
} from "../lib/api";

// Storage key for custom avatars
const CUSTOM_AVATARS_KEY = "flowmaestro-custom-avatars";

// Load custom avatars from localStorage
function loadCustomAvatars(): Record<string, string> {
    try {
        const stored = localStorage.getItem(CUSTOM_AVATARS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

// Save custom avatars to localStorage
function saveCustomAvatars(avatars: Record<string, string>): void {
    try {
        localStorage.setItem(CUSTOM_AVATARS_KEY, JSON.stringify(avatars));
    } catch (error) {
        logger.error("Failed to save custom avatars to localStorage", error);
    }
}

interface PersonaStore {
    // === PERSONA DEFINITIONS STATE ===
    personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]>;
    currentPersona: PersonaDefinition | null;
    isLoadingPersonas: boolean;
    personasError: string | null;

    // === CUSTOM AVATARS STATE ===
    customAvatars: Record<string, string>; // Maps persona ID to custom avatar URL

    // === PERSONA INSTANCES STATE ===
    dashboard: PersonaInstanceDashboardResponse | null;
    instances: PersonaInstanceSummary[];
    currentInstance:
        | (PersonaInstance & {
              persona: {
                  name: string;
                  slug: string;
                  avatar_url: string | null;
                  category: PersonaCategory;
              } | null;
          })
        | null;
    instancesTotal: number;
    needsAttentionCount: number;
    isLoadingInstances: boolean;
    instancesError: string | null;

    // === PERSONA DEFINITIONS ACTIONS ===
    fetchPersonasByCategory: () => Promise<void>;
    fetchPersona: (slug: string) => Promise<void>;
    setCurrentPersona: (persona: PersonaDefinition | null) => void;
    clearPersonasError: () => void;

    // === CUSTOM AVATAR ACTIONS ===
    setCustomAvatar: (personaId: string, avatarUrl: string) => void;
    getCustomAvatar: (personaId: string) => string | null;
    clearCustomAvatar: (personaId: string) => void;

    // === PERSONA INSTANCES ACTIONS ===
    fetchDashboard: () => Promise<void>;
    fetchInstances: (params?: {
        status?: PersonaInstanceStatus | PersonaInstanceStatus[];
        persona_definition_id?: string;
        limit?: number;
        offset?: number;
    }) => Promise<void>;
    fetchInstance: (id: string) => Promise<void>;
    fetchNeedsAttentionCount: () => Promise<void>;
    createInstance: (data: CreatePersonaInstanceRequest) => Promise<PersonaInstance>;
    sendMessage: (instanceId: string, content: string) => Promise<void>;
    cancelInstance: (id: string) => Promise<void>;
    completeInstance: (id: string) => Promise<void>;
    deleteInstance: (id: string) => Promise<void>;
    setCurrentInstance: (
        instance:
            | (PersonaInstance & {
                  persona: {
                      name: string;
                      slug: string;
                      avatar_url: string | null;
                      category: PersonaCategory;
                  } | null;
              })
            | null
    ) => void;
    clearInstancesError: () => void;
    resetInstancesState: () => void;
}

export const usePersonaStore = create<PersonaStore>((set, get) => ({
    // === INITIAL STATE ===
    personasByCategory: {
        research: [],
        content: [],
        development: [],
        data: [],
        operations: [],
        business: [],
        proposals: []
    },
    currentPersona: null,
    isLoadingPersonas: false,
    personasError: null,

    // Custom avatars loaded from localStorage
    customAvatars: loadCustomAvatars(),

    dashboard: null,
    instances: [],
    currentInstance: null,
    instancesTotal: 0,
    needsAttentionCount: 0,
    isLoadingInstances: false,
    instancesError: null,

    // === PERSONA DEFINITIONS ACTIONS ===

    fetchPersonasByCategory: async () => {
        set({ isLoadingPersonas: true, personasError: null });
        try {
            const response = await api.getPersonasByCategory();
            set({ personasByCategory: response.data, isLoadingPersonas: false });
        } catch (error) {
            logger.error("Failed to fetch personas by category", error);
            set({
                personasError: error instanceof Error ? error.message : "Failed to fetch personas",
                isLoadingPersonas: false
            });
        }
    },

    fetchPersona: async (slug: string) => {
        set({ isLoadingPersonas: true, personasError: null });
        try {
            const response = await api.getPersona(slug);
            set({ currentPersona: response.data, isLoadingPersonas: false });
        } catch (error) {
            logger.error("Failed to fetch persona", error, { slug });
            set({
                personasError: error instanceof Error ? error.message : "Failed to fetch persona",
                isLoadingPersonas: false
            });
        }
    },

    setCurrentPersona: (persona: PersonaDefinition | null) => {
        set({ currentPersona: persona });
    },

    clearPersonasError: () => {
        set({ personasError: null });
    },

    // === CUSTOM AVATAR ACTIONS ===

    setCustomAvatar: (personaId: string, avatarUrl: string) => {
        const newAvatars = { ...get().customAvatars, [personaId]: avatarUrl };
        saveCustomAvatars(newAvatars);
        set({ customAvatars: newAvatars });
    },

    getCustomAvatar: (personaId: string) => {
        return get().customAvatars[personaId] || null;
    },

    clearCustomAvatar: (personaId: string) => {
        const newAvatars = { ...get().customAvatars };
        delete newAvatars[personaId];
        saveCustomAvatars(newAvatars);
        set({ customAvatars: newAvatars });
    },

    // === PERSONA INSTANCES ACTIONS ===

    fetchDashboard: async () => {
        set({ isLoadingInstances: true, instancesError: null });
        try {
            const response = await api.getPersonaInstancesDashboard();
            set({ dashboard: response.data, isLoadingInstances: false });
        } catch (error) {
            logger.error("Failed to fetch persona instances dashboard", error);
            set({
                instancesError:
                    error instanceof Error ? error.message : "Failed to fetch dashboard",
                isLoadingInstances: false
            });
        }
    },

    fetchInstances: async (params) => {
        set({ isLoadingInstances: true, instancesError: null });
        try {
            const response = await api.getPersonaInstances(params);
            set({
                instances: response.data.instances,
                instancesTotal: response.data.total,
                isLoadingInstances: false
            });
        } catch (error) {
            logger.error("Failed to fetch persona instances", error);
            set({
                instancesError:
                    error instanceof Error ? error.message : "Failed to fetch instances",
                isLoadingInstances: false,
                instances: [],
                instancesTotal: 0
            });
        }
    },

    fetchInstance: async (id: string) => {
        set({ isLoadingInstances: true, instancesError: null });
        try {
            const response = await api.getPersonaInstance(id);
            set({ currentInstance: response.data, isLoadingInstances: false });
        } catch (error) {
            logger.error("Failed to fetch persona instance", error, { id });
            set({
                instancesError: error instanceof Error ? error.message : "Failed to fetch instance",
                isLoadingInstances: false
            });
        }
    },

    fetchNeedsAttentionCount: async () => {
        try {
            const response = await api.getPersonaInstancesCount();
            set({ needsAttentionCount: response.data.count });
        } catch (error) {
            logger.error("Failed to fetch needs attention count", error);
            // Don't set error state for badge count failure
        }
    },

    createInstance: async (data: CreatePersonaInstanceRequest) => {
        set({ isLoadingInstances: true, instancesError: null });
        try {
            const response = await api.createPersonaInstance(data);
            const newInstance = response.data;

            // Refresh dashboard to show the new instance
            get().fetchDashboard();
            get().fetchNeedsAttentionCount();

            set({ isLoadingInstances: false });
            return newInstance;
        } catch (error) {
            logger.error("Failed to create persona instance", error);
            set({
                instancesError:
                    error instanceof Error ? error.message : "Failed to create instance",
                isLoadingInstances: false
            });
            throw error;
        }
    },

    sendMessage: async (instanceId: string, content: string) => {
        try {
            await api.sendPersonaInstanceMessage(instanceId, content);
            // Refresh instance to get updated state
            get().fetchInstance(instanceId);
        } catch (error) {
            logger.error("Failed to send message", error, { instanceId });
            set({
                instancesError: error instanceof Error ? error.message : "Failed to send message"
            });
            throw error;
        }
    },

    cancelInstance: async (id: string) => {
        set({ isLoadingInstances: true, instancesError: null });
        try {
            await api.cancelPersonaInstance(id);
            // Refresh dashboard
            get().fetchDashboard();
            get().fetchNeedsAttentionCount();

            // Update current instance if it's the one being cancelled
            if (get().currentInstance?.id === id) {
                get().fetchInstance(id);
            }

            set({ isLoadingInstances: false });
        } catch (error) {
            logger.error("Failed to cancel instance", error, { id });
            set({
                instancesError:
                    error instanceof Error ? error.message : "Failed to cancel instance",
                isLoadingInstances: false
            });
            throw error;
        }
    },

    completeInstance: async (id: string) => {
        set({ isLoadingInstances: true, instancesError: null });
        try {
            await api.completePersonaInstance(id);
            // Refresh dashboard
            get().fetchDashboard();
            get().fetchNeedsAttentionCount();

            // Update current instance if it's the one being completed
            if (get().currentInstance?.id === id) {
                get().fetchInstance(id);
            }

            set({ isLoadingInstances: false });
        } catch (error) {
            logger.error("Failed to complete instance", error, { id });
            set({
                instancesError:
                    error instanceof Error ? error.message : "Failed to complete instance",
                isLoadingInstances: false
            });
            throw error;
        }
    },

    deleteInstance: async (id: string) => {
        set({ isLoadingInstances: true, instancesError: null });
        try {
            await api.deletePersonaInstance(id);

            // Remove from instances list
            set((state) => ({
                instances: state.instances.filter((i) => i.id !== id),
                instancesTotal: state.instancesTotal - 1,
                isLoadingInstances: false
            }));

            // Clear current instance if it's the one being deleted
            if (get().currentInstance?.id === id) {
                set({ currentInstance: null });
            }

            // Refresh dashboard and count
            get().fetchDashboard();
            get().fetchNeedsAttentionCount();
        } catch (error) {
            logger.error("Failed to delete instance", error, { id });
            set({
                instancesError:
                    error instanceof Error ? error.message : "Failed to delete instance",
                isLoadingInstances: false
            });
            throw error;
        }
    },

    setCurrentInstance: (instance) => {
        set({ currentInstance: instance });
    },

    clearInstancesError: () => {
        set({ instancesError: null });
    },

    resetInstancesState: () => {
        set({
            dashboard: null,
            instances: [],
            currentInstance: null,
            instancesTotal: 0,
            needsAttentionCount: 0,
            instancesError: null
        });
    }
}));
