/**
 * ChatInterfaceRepository Tests
 *
 * Tests for chat interface CRUD operations including slug handling,
 * publish/unpublish, workspace-scoped methods, and folder filtering.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { ChatInterfaceRepository } from "../ChatInterfaceRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateChatInterfaceRow,
    generateId
} from "./setup";

describe("ChatInterfaceRepository", () => {
    let repository: ChatInterfaceRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ChatInterfaceRepository();
    });

    describe("create", () => {
        it("should insert a new chat interface with all fields", async () => {
            const userId = generateId();
            const workspaceId = generateId();
            const agentId = generateId();
            const input = {
                name: "Customer Support Chat",
                slug: "customer-support",
                agentId,
                title: "Support Chat",
                description: "Chat with our support agent",
                coverType: "color" as const,
                coverValue: "#6366f1",
                primaryColor: "#6366f1",
                welcomeMessage: "Hello! How can I help?",
                suggestedPrompts: [{ text: "Help me", prompt: "I need help" }]
            };

            const mockRow = generateChatInterfaceRow({
                user_id: userId,
                workspace_id: workspaceId,
                name: input.name,
                slug: input.slug,
                agent_id: agentId,
                title: input.title,
                description: input.description
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(userId, workspaceId, input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.chat_interfaces"),
                expect.arrayContaining([userId, workspaceId, input.name, input.slug, agentId])
            );
            expect(result.name).toBe(input.name);
            expect(result.slug).toBe(input.slug);
        });

        it("should use default values when not specified", async () => {
            const userId = generateId();
            const workspaceId = generateId();
            const input = {
                name: "Basic Chat",
                slug: "basic-chat",
                agentId: generateId(),
                title: "Chat"
            };

            const mockRow = generateChatInterfaceRow({
                user_id: userId,
                workspace_id: workspaceId,
                name: input.name,
                cover_type: "color",
                cover_value: "#6366f1",
                welcome_message: "Hello! How can I help you today?"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(userId, workspaceId, input);

            expect(result.coverType).toBe("color");
            expect(result.coverValue).toBe("#6366f1");
        });

        it("should stringify suggestedPrompts JSON", async () => {
            const userId = generateId();
            const workspaceId = generateId();
            const suggestedPrompts = [{ text: "Help", prompt: "Help me" }];
            const input = {
                name: "Chat",
                slug: "chat",
                agentId: generateId(),
                title: "Chat",
                suggestedPrompts
            };

            const mockRow = generateChatInterfaceRow({
                user_id: userId,
                workspace_id: workspaceId,
                suggested_prompts: suggestedPrompts
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(userId, workspaceId, input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(suggestedPrompts)])
            );
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should return chat interface when found", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const mockRow = generateChatInterfaceRow({
                id: chatId,
                workspace_id: workspaceId,
                agent_name: "Test Agent"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(chatId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE ci.id = $1 AND ci.workspace_id = $2"),
                [chatId, workspaceId]
            );
            expect(result?.id).toBe(chatId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByIdAndWorkspaceId("non-existent", generateId());

            expect(result).toBeNull();
        });

        it("should join with agents table for agent_name", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const mockRow = generateChatInterfaceRow({ id: chatId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            await repository.findByIdAndWorkspaceId(chatId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LEFT JOIN flowmaestro.agents"),
                expect.anything()
            );
        });
    });

    describe("findBySlug", () => {
        it("should return published chat interface by slug", async () => {
            const slug = "test-chat";
            const mockRow = generateChatInterfaceRow({ slug, status: "published" });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findBySlug(slug);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE slug = $1 AND status = 'published'"),
                [slug]
            );
            expect(result?.slug).toBe(slug);
        });

        it("should return null for unpublished interface", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findBySlug("draft-chat");

            expect(result).toBeNull();
        });
    });

    describe("findBySlugPublic", () => {
        it("should return public interface with limited fields", async () => {
            const slug = "public-chat";
            const mockRow = generateChatInterfaceRow({ slug, status: "published" });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findBySlugPublic(slug);

            expect(result).not.toBeNull();
            expect(result?.slug).toBe(slug);
            // Public interface should not include userId
            expect(result).not.toHaveProperty("userId");
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return paginated chat interfaces with total count", async () => {
            const workspaceId = generateId();
            const mockInterfaces = [
                generateChatInterfaceRow({ workspace_id: workspaceId }),
                generateChatInterfaceRow({ workspace_id: workspaceId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockInterfaces));

            const result = await repository.findByWorkspaceId(workspaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.chatInterfaces).toHaveLength(2);
        });

        it("should filter by folder when folderId is provided", async () => {
            const workspaceId = generateId();
            const folderId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateChatInterfaceRow()]));

            await repository.findByWorkspaceId(workspaceId, { folderId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ANY(COALESCE(ci.folder_ids"),
                expect.arrayContaining([workspaceId, folderId])
            );
        });

        it("should filter for root items when folderId is null", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(3)).mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId, { folderId: null });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("folder_ids IS NULL OR ci.folder_ids = ARRAY[]::UUID[]"),
                expect.arrayContaining([workspaceId])
            );
        });

        it("should use default pagination values", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT"),
                expect.arrayContaining([workspaceId, 50, 0])
            );
        });
    });

    describe("findByAgentIdAndWorkspaceId", () => {
        it("should return chat interfaces linked to agent", async () => {
            const agentId = generateId();
            const workspaceId = generateId();
            const mockInterfaces = [
                generateChatInterfaceRow({ agent_id: agentId, workspace_id: workspaceId }),
                generateChatInterfaceRow({ agent_id: agentId, workspace_id: workspaceId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockInterfaces));

            const result = await repository.findByAgentIdAndWorkspaceId(agentId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1 AND workspace_id = $2"),
                [agentId, workspaceId]
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("updateByWorkspaceId", () => {
        it("should update specified fields only", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const mockRow = generateChatInterfaceRow({
                id: chatId,
                workspace_id: workspaceId,
                name: "Updated Chat"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateByWorkspaceId(chatId, workspaceId, {
                name: "Updated Chat"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.chat_interfaces"),
                expect.arrayContaining(["Updated Chat", chatId, workspaceId])
            );
            expect(result?.name).toBe("Updated Chat");
        });

        it("should return existing interface when no updates provided", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const mockRow = generateChatInterfaceRow({ id: chatId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.updateByWorkspaceId(chatId, workspaceId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT"),
                expect.anything()
            );
            expect(result?.id).toBe(chatId);
        });

        it("should stringify suggestedPrompts when updating", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const suggestedPrompts = [{ text: "New prompt", prompt: "Help" }];
            const mockRow = generateChatInterfaceRow({ id: chatId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.updateByWorkspaceId(chatId, workspaceId, { suggestedPrompts });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(suggestedPrompts)])
            );
        });
    });

    describe("publishByWorkspaceId", () => {
        it("should set status to published and set published_at", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const mockRow = generateChatInterfaceRow({
                id: chatId,
                status: "published",
                published_at: new Date().toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.publishByWorkspaceId(chatId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'published', published_at = CURRENT_TIMESTAMP"),
                [chatId, workspaceId]
            );
            expect(result?.status).toBe("published");
        });
    });

    describe("unpublishByWorkspaceId", () => {
        it("should set status to draft and clear published_at", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const mockRow = generateChatInterfaceRow({
                id: chatId,
                status: "draft",
                published_at: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.unpublishByWorkspaceId(chatId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'draft', published_at = NULL"),
                [chatId, workspaceId]
            );
            expect(result?.status).toBe("draft");
        });
    });

    describe("softDeleteByWorkspaceId", () => {
        it("should soft delete and return true", async () => {
            const chatId = generateId();
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.softDeleteByWorkspaceId(chatId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP"),
                [chatId, workspaceId]
            );
            expect(result).toBe(true);
        });

        it("should return false when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.softDeleteByWorkspaceId("non-existent", generateId());

            expect(result).toBe(false);
        });
    });

    describe("isSlugAvailableInWorkspace", () => {
        it("should return true when slug is available", async () => {
            const slug = "new-chat";
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.isSlugAvailableInWorkspace(slug, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE slug = $1 AND workspace_id = $2"),
                [slug, workspaceId]
            );
            expect(result).toBe(true);
        });

        it("should return false when slug is taken", async () => {
            const slug = "existing-chat";
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([{ id: "1" }]));

            const result = await repository.isSlugAvailableInWorkspace(slug, workspaceId);

            expect(result).toBe(false);
        });

        it("should exclude specified ID when checking", async () => {
            const slug = "chat";
            const workspaceId = generateId();
            const excludeId = generateId();

            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            await repository.isSlugAvailableInWorkspace(slug, workspaceId, excludeId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("AND id != $3"), [
                slug,
                workspaceId,
                excludeId
            ]);
        });
    });

    describe("getAgentIdBySlug", () => {
        it("should return agent_id for published chat", async () => {
            const slug = "test-chat";
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([{ agent_id: agentId }]));

            const result = await repository.getAgentIdBySlug(slug);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE slug = $1 AND status = 'published'"),
                [slug]
            );
            expect(result).toBe(agentId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getAgentIdBySlug("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("getOwnerUserIdBySlug", () => {
        it("should return user_id for published chat", async () => {
            const slug = "test-chat";
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([{ user_id: userId }]));

            const result = await repository.getOwnerUserIdBySlug(slug);

            expect(result).toBe(userId);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateChatInterfaceRow({
                id: chatId,
                workspace_id: workspaceId,
                created_at: now,
                updated_at: now,
                published_at: now,
                last_activity_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(chatId, workspaceId);

            expect(result?.createdAt).toBeInstanceOf(Date);
            expect(result?.updatedAt).toBeInstanceOf(Date);
            expect(result?.publishedAt).toBeInstanceOf(Date);
            expect(result?.lastActivityAt).toBeInstanceOf(Date);
        });

        it("should handle null optional dates", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const mockRow = generateChatInterfaceRow({
                id: chatId,
                workspace_id: workspaceId,
                published_at: null,
                last_activity_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(chatId, workspaceId);

            expect(result?.publishedAt).toBeNull();
            expect(result?.lastActivityAt).toBeNull();
        });

        it("should coerce count fields from string", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const mockRow = generateChatInterfaceRow({
                id: chatId,
                workspace_id: workspaceId,
                session_count: "150",
                message_count: "3000"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(chatId, workspaceId);

            expect(result?.sessionCount).toBe(150);
            expect(result?.messageCount).toBe(3000);
            expect(typeof result?.sessionCount).toBe("number");
            expect(typeof result?.messageCount).toBe("number");
        });

        it("should handle suggested_prompts as array", async () => {
            const chatId = generateId();
            const workspaceId = generateId();
            const prompts = [{ text: "Help", prompt: "I need help" }];
            const mockRow = generateChatInterfaceRow({
                id: chatId,
                workspace_id: workspaceId,
                suggested_prompts: prompts
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(chatId, workspaceId);

            expect(result?.suggestedPrompts).toEqual(prompts);
        });
    });
});
