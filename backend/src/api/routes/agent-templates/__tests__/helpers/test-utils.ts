/**
 * Agent Templates Test Utilities
 *
 * Shared mocks and helper functions for agent template tests.
 */

import { v4 as uuidv4 } from "uuid";
import type { AgentTemplateModel } from "../../../../../storage/models/AgentTemplate";

// ============================================================================
// MOCKS
// ============================================================================

export const mockAgentTemplateRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getCategories: jest.fn(),
    incrementViewCount: jest.fn(),
    incrementUseCount: jest.fn()
};

export const mockAgentRepo = {
    create: jest.fn()
};

// ============================================================================
// TEST HELPERS
// ============================================================================

export function createMockAgentTemplate(
    overrides: Partial<AgentTemplateModel> = {}
): AgentTemplateModel {
    return {
        id: uuidv4(),
        name: "Test Agent Template",
        description: "A test agent template for customer support",
        system_prompt: "You are a helpful customer support agent.",
        model: "gpt-4",
        provider: "openai",
        temperature: 0.7,
        max_tokens: 4096,
        available_tools: [
            {
                name: "search_knowledge_base",
                description: "Search the knowledge base",
                type: "knowledge_base" as const
            }
        ],
        category: "support",
        tags: ["customer-service", "chatbot"],
        icon: "headphones",
        color: "#10B981",
        author_name: "FlowMaestro",
        author_avatar_url: null,
        view_count: 200,
        use_count: 100,
        featured: true,
        sort_order: 1,
        required_integrations: [],
        version: "1.0.0",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        published_at: new Date(),
        ...overrides
    };
}

export function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset default behaviors
    mockAgentTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });
    mockAgentTemplateRepo.findById.mockResolvedValue(null);
    mockAgentTemplateRepo.getCategories.mockResolvedValue([]);
    mockAgentTemplateRepo.incrementViewCount.mockResolvedValue(undefined);
    mockAgentTemplateRepo.incrementUseCount.mockResolvedValue(undefined);

    mockAgentRepo.create.mockImplementation((data) =>
        Promise.resolve({
            id: uuidv4(),
            ...data,
            created_at: new Date(),
            updated_at: new Date()
        })
    );
}

// ============================================================================
// MOCK SETUP
// ============================================================================

export function setupMocks(): void {
    jest.mock("../../../../../storage/repositories", () => ({
        AgentTemplateRepository: jest.fn().mockImplementation(() => mockAgentTemplateRepo),
        AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo),
        UserRepository: jest.fn().mockImplementation(() => ({
            findById: jest.fn(),
            findByEmail: jest.fn()
        }))
    }));
}
