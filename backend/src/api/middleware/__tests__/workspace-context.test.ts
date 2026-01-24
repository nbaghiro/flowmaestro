/**
 * Workspace Context Middleware Tests
 *
 * Tests for workspace context extraction and validation (workspace-context.ts)
 */

import {
    createMockRequest,
    createMockReply,
    assertThrowsError
} from "../../../../__tests__/helpers/middleware-test-utils";
import {
    createMockWorkspace,
    createMockWorkspaceMember,
    createMockWorkspaceRepository,
    createMockWorkspaceMemberRepository
} from "../../../../__tests__/helpers/service-mocks";

// Mock repositories
jest.mock("../../../storage/repositories/WorkspaceRepository");
jest.mock("../../../storage/repositories/WorkspaceMemberRepository");

import { WorkspaceMemberRepository } from "../../../storage/repositories/WorkspaceMemberRepository";
import { WorkspaceRepository } from "../../../storage/repositories/WorkspaceRepository";
import {
    workspaceContextMiddleware,
    optionalWorkspaceContextMiddleware
} from "../workspace-context";

const MockedWorkspaceRepository = WorkspaceRepository as jest.MockedClass<
    typeof WorkspaceRepository
>;
const MockedWorkspaceMemberRepository = WorkspaceMemberRepository as jest.MockedClass<
    typeof WorkspaceMemberRepository
>;

describe("workspaceContextMiddleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Workspace ID extraction", () => {
        it("should extract workspace ID from route params", async () => {
            const workspace = createMockWorkspace({ id: "ws-from-params" });
            const member = createMockWorkspaceMember({
                workspace_id: "ws-from-params",
                user_id: "user-123"
            });

            const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
            const memberRepo = createMockWorkspaceMemberRepository({
                findByWorkspaceAndUser: member
            });

            MockedWorkspaceRepository.mockImplementation(
                () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
            );
            MockedWorkspaceMemberRepository.mockImplementation(
                () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
            );

            const request = createMockRequest({
                params: { workspaceId: "ws-from-params" },
                user: { id: "user-123", email: "test@example.com" }
            });
            const reply = createMockReply();

            await workspaceContextMiddleware(request, reply);

            expect(workspaceRepo.findById).toHaveBeenCalledWith("ws-from-params");
            expect(request.workspace).toBeDefined();
            expect(request.workspace?.id).toBe("ws-from-params");
        });

        it("should extract workspace ID from X-Workspace-Id header", async () => {
            const workspace = createMockWorkspace({ id: "ws-from-header" });
            const member = createMockWorkspaceMember({
                workspace_id: "ws-from-header",
                user_id: "user-123"
            });

            const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
            const memberRepo = createMockWorkspaceMemberRepository({
                findByWorkspaceAndUser: member
            });

            MockedWorkspaceRepository.mockImplementation(
                () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
            );
            MockedWorkspaceMemberRepository.mockImplementation(
                () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
            );

            const request = createMockRequest({
                headers: { "x-workspace-id": "ws-from-header" },
                user: { id: "user-123", email: "test@example.com" }
            });
            const reply = createMockReply();

            await workspaceContextMiddleware(request, reply);

            expect(workspaceRepo.findById).toHaveBeenCalledWith("ws-from-header");
            expect(request.workspace?.id).toBe("ws-from-header");
        });

        it("should extract workspace ID from query parameter", async () => {
            const workspace = createMockWorkspace({ id: "ws-from-query" });
            const member = createMockWorkspaceMember({
                workspace_id: "ws-from-query",
                user_id: "user-123"
            });

            const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
            const memberRepo = createMockWorkspaceMemberRepository({
                findByWorkspaceAndUser: member
            });

            MockedWorkspaceRepository.mockImplementation(
                () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
            );
            MockedWorkspaceMemberRepository.mockImplementation(
                () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
            );

            const request = createMockRequest({
                query: { workspaceId: "ws-from-query" },
                user: { id: "user-123", email: "test@example.com" }
            });
            const reply = createMockReply();

            await workspaceContextMiddleware(request, reply);

            expect(workspaceRepo.findById).toHaveBeenCalledWith("ws-from-query");
            expect(request.workspace?.id).toBe("ws-from-query");
        });

        it("should prioritize params > header > query", async () => {
            const workspace = createMockWorkspace({ id: "ws-from-params" });
            const member = createMockWorkspaceMember({
                workspace_id: "ws-from-params",
                user_id: "user-123"
            });

            const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
            const memberRepo = createMockWorkspaceMemberRepository({
                findByWorkspaceAndUser: member
            });

            MockedWorkspaceRepository.mockImplementation(
                () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
            );
            MockedWorkspaceMemberRepository.mockImplementation(
                () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
            );

            const request = createMockRequest({
                params: { workspaceId: "ws-from-params" },
                headers: { "x-workspace-id": "ws-from-header" },
                query: { workspaceId: "ws-from-query" },
                user: { id: "user-123", email: "test@example.com" }
            });
            const reply = createMockReply();

            await workspaceContextMiddleware(request, reply);

            expect(workspaceRepo.findById).toHaveBeenCalledWith("ws-from-params");
        });
    });

    describe("Error cases", () => {
        it("should throw BadRequestError when workspace ID is missing", async () => {
            const request = createMockRequest({
                user: { id: "user-123", email: "test@example.com" }
            });

            await assertThrowsError(
                () => workspaceContextMiddleware(request, createMockReply()),
                "BadRequestError",
                /Workspace ID is required/
            );
        });

        it("should throw ForbiddenError when user is not authenticated", async () => {
            const request = createMockRequest({
                headers: { "x-workspace-id": "ws-123" },
                user: undefined
            });

            await assertThrowsError(
                () => workspaceContextMiddleware(request, createMockReply()),
                "ForbiddenError",
                /Authentication required/
            );
        });

        it("should throw NotFoundError when workspace does not exist", async () => {
            const workspaceRepo = createMockWorkspaceRepository({ findById: null });
            const memberRepo = createMockWorkspaceMemberRepository({
                findByWorkspaceAndUser: null
            });

            MockedWorkspaceRepository.mockImplementation(
                () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
            );
            MockedWorkspaceMemberRepository.mockImplementation(
                () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
            );

            const request = createMockRequest({
                headers: { "x-workspace-id": "non-existent" },
                user: { id: "user-123", email: "test@example.com" }
            });

            await assertThrowsError(
                () => workspaceContextMiddleware(request, createMockReply()),
                "NotFoundError",
                /Workspace not found/
            );
        });

        it("should throw ForbiddenError when user is not a member", async () => {
            const workspace = createMockWorkspace({ id: "ws-123" });
            const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
            const memberRepo = createMockWorkspaceMemberRepository({
                findByWorkspaceAndUser: null
            });

            MockedWorkspaceRepository.mockImplementation(
                () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
            );
            MockedWorkspaceMemberRepository.mockImplementation(
                () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
            );

            const request = createMockRequest({
                headers: { "x-workspace-id": "ws-123" },
                user: { id: "user-456", email: "stranger@example.com" }
            });

            await assertThrowsError(
                () => workspaceContextMiddleware(request, createMockReply()),
                "ForbiddenError",
                /not a member/
            );
        });
    });

    describe("Workspace context construction", () => {
        it("should construct correct context for owner", async () => {
            const workspace = createMockWorkspace({
                id: "ws-123",
                type: "team",
                max_workflows: 200,
                max_agents: 100,
                max_knowledge_bases: 50,
                max_kb_chunks: 25000,
                max_members: 25,
                max_connections: 100
            });
            const member = createMockWorkspaceMember({
                workspace_id: "ws-123",
                user_id: "user-123",
                role: "owner"
            });

            const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
            const memberRepo = createMockWorkspaceMemberRepository({
                findByWorkspaceAndUser: member
            });

            MockedWorkspaceRepository.mockImplementation(
                () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
            );
            MockedWorkspaceMemberRepository.mockImplementation(
                () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
            );

            const request = createMockRequest({
                headers: { "x-workspace-id": "ws-123" },
                user: { id: "user-123", email: "owner@example.com" }
            });
            const reply = createMockReply();

            await workspaceContextMiddleware(request, reply);

            expect(request.workspace).toEqual({
                id: "ws-123",
                type: "team",
                role: "owner",
                isOwner: true,
                limits: {
                    maxWorkflows: 200,
                    maxAgents: 100,
                    maxKnowledgeBases: 50,
                    maxKbChunks: 25000,
                    maxMembers: 25,
                    maxConnections: 100
                }
            });
        });

        it("should set isOwner=false for non-owner roles", async () => {
            const workspace = createMockWorkspace({ id: "ws-123" });
            const member = createMockWorkspaceMember({
                workspace_id: "ws-123",
                user_id: "user-123",
                role: "member"
            });

            const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
            const memberRepo = createMockWorkspaceMemberRepository({
                findByWorkspaceAndUser: member
            });

            MockedWorkspaceRepository.mockImplementation(
                () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
            );
            MockedWorkspaceMemberRepository.mockImplementation(
                () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
            );

            const request = createMockRequest({
                headers: { "x-workspace-id": "ws-123" },
                user: { id: "user-123", email: "member@example.com" }
            });
            const reply = createMockReply();

            await workspaceContextMiddleware(request, reply);

            expect(request.workspace?.role).toBe("member");
            expect(request.workspace?.isOwner).toBe(false);
        });

        it("should handle all role types", async () => {
            const roles = ["owner", "admin", "member", "viewer"] as const;

            for (const role of roles) {
                jest.clearAllMocks();

                const workspace = createMockWorkspace({ id: "ws-123" });
                const member = createMockWorkspaceMember({
                    workspace_id: "ws-123",
                    user_id: "user-123",
                    role
                });

                const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
                const memberRepo = createMockWorkspaceMemberRepository({
                    findByWorkspaceAndUser: member
                });

                MockedWorkspaceRepository.mockImplementation(
                    () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
                );
                MockedWorkspaceMemberRepository.mockImplementation(
                    () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
                );

                const request = createMockRequest({
                    headers: { "x-workspace-id": "ws-123" },
                    user: { id: "user-123", email: "test@example.com" }
                });
                const reply = createMockReply();

                await workspaceContextMiddleware(request, reply);

                expect(request.workspace?.role).toBe(role);
                expect(request.workspace?.isOwner).toBe(role === "owner");
            }
        });
    });
});

describe("optionalWorkspaceContextMiddleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should set workspace context when valid workspace ID is provided", async () => {
        const workspace = createMockWorkspace({ id: "ws-123" });
        const member = createMockWorkspaceMember({
            workspace_id: "ws-123",
            user_id: "user-123"
        });

        const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
        const memberRepo = createMockWorkspaceMemberRepository({
            findByWorkspaceAndUser: member
        });

        MockedWorkspaceRepository.mockImplementation(
            () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
        );
        MockedWorkspaceMemberRepository.mockImplementation(
            () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
        );

        const request = createMockRequest({
            headers: { "x-workspace-id": "ws-123" },
            user: { id: "user-123", email: "test@example.com" }
        });
        const reply = createMockReply();

        await optionalWorkspaceContextMiddleware(request, reply);

        expect(request.workspace).toBeDefined();
        expect(request.workspace?.id).toBe("ws-123");
    });

    it("should not fail when workspace ID is missing", async () => {
        const request = createMockRequest({
            user: { id: "user-123", email: "test@example.com" }
        });
        const reply = createMockReply();

        await optionalWorkspaceContextMiddleware(request, reply);

        expect(request.workspace).toBeUndefined();
    });

    it("should not fail when user is not authenticated", async () => {
        const request = createMockRequest({
            headers: { "x-workspace-id": "ws-123" },
            user: undefined
        });
        const reply = createMockReply();

        await optionalWorkspaceContextMiddleware(request, reply);

        expect(request.workspace).toBeUndefined();
    });

    it("should not fail when workspace does not exist", async () => {
        const workspaceRepo = createMockWorkspaceRepository({ findById: null });
        const memberRepo = createMockWorkspaceMemberRepository({
            findByWorkspaceAndUser: null
        });

        MockedWorkspaceRepository.mockImplementation(
            () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
        );
        MockedWorkspaceMemberRepository.mockImplementation(
            () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
        );

        const request = createMockRequest({
            headers: { "x-workspace-id": "non-existent" },
            user: { id: "user-123", email: "test@example.com" }
        });
        const reply = createMockReply();

        await optionalWorkspaceContextMiddleware(request, reply);

        expect(request.workspace).toBeUndefined();
    });

    it("should not fail when user is not a member", async () => {
        const workspace = createMockWorkspace({ id: "ws-123" });
        const workspaceRepo = createMockWorkspaceRepository({ findById: workspace });
        const memberRepo = createMockWorkspaceMemberRepository({
            findByWorkspaceAndUser: null
        });

        MockedWorkspaceRepository.mockImplementation(
            () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
        );
        MockedWorkspaceMemberRepository.mockImplementation(
            () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
        );

        const request = createMockRequest({
            headers: { "x-workspace-id": "ws-123" },
            user: { id: "stranger", email: "stranger@example.com" }
        });
        const reply = createMockReply();

        await optionalWorkspaceContextMiddleware(request, reply);

        expect(request.workspace).toBeUndefined();
    });

    it("should silently handle database errors", async () => {
        const workspaceRepo = createMockWorkspaceRepository({ findById: null });
        workspaceRepo.findById = jest.fn().mockRejectedValue(new Error("DB Error"));
        MockedWorkspaceRepository.mockImplementation(
            () => workspaceRepo as unknown as InstanceType<typeof WorkspaceRepository>
        );

        const memberRepo = createMockWorkspaceMemberRepository({
            findByWorkspaceAndUser: null
        });
        MockedWorkspaceMemberRepository.mockImplementation(
            () => memberRepo as unknown as InstanceType<typeof WorkspaceMemberRepository>
        );

        const request = createMockRequest({
            headers: { "x-workspace-id": "ws-123" },
            user: { id: "user-123", email: "test@example.com" }
        });
        const reply = createMockReply();

        // Should not throw
        await optionalWorkspaceContextMiddleware(request, reply);

        expect(request.workspace).toBeUndefined();
    });
});
