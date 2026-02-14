/**
 * FormInterfaceRepository Tests
 *
 * Tests for form interface CRUD operations including slug handling,
 * publish/unpublish, workspace-scoped methods, duplicate, and folder filtering.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { FormInterfaceRepository } from "../FormInterfaceRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateFormInterfaceRow,
    generateId
} from "./setup";

describe("FormInterfaceRepository", () => {
    let repository: FormInterfaceRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new FormInterfaceRepository();
    });

    describe("create", () => {
        it("should insert a new form interface with workflow target", async () => {
            const userId = generateId();
            const workspaceId = generateId();
            const workflowId = generateId();
            const input = {
                name: "Customer Form",
                slug: "customer-form",
                title: "Customer Intake",
                description: "Collect customer information",
                targetType: "workflow" as const,
                workflowId,
                coverType: "color" as const,
                coverValue: "#6366f1"
            };

            const mockRow = generateFormInterfaceRow({
                user_id: userId,
                workspace_id: workspaceId,
                name: input.name,
                slug: input.slug,
                title: input.title,
                target_type: "workflow",
                workflow_id: workflowId
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(userId, workspaceId, input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.form_interfaces"),
                expect.arrayContaining([userId, workspaceId, input.name, input.slug])
            );
            expect(result.name).toBe(input.name);
            expect(result.slug).toBe(input.slug);
            expect(result.targetType).toBe("workflow");
        });

        it("should insert a new form interface with agent target", async () => {
            const userId = generateId();
            const workspaceId = generateId();
            const agentId = generateId();
            const input = {
                name: "Agent Form",
                slug: "agent-form",
                title: "Chat Form",
                targetType: "agent" as const,
                agentId
            };

            const mockRow = generateFormInterfaceRow({
                user_id: userId,
                workspace_id: workspaceId,
                name: input.name,
                slug: input.slug,
                target_type: "agent",
                agent_id: agentId,
                workflow_id: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(userId, workspaceId, input);

            expect(result.targetType).toBe("agent");
            expect(result.agentId).toBe(agentId);
        });

        it("should use default values when not specified", async () => {
            const userId = generateId();
            const workspaceId = generateId();
            const input = {
                name: "Basic Form",
                slug: "basic-form",
                title: "Form",
                targetType: "workflow" as const,
                workflowId: generateId()
            };

            const mockRow = generateFormInterfaceRow({
                user_id: userId,
                workspace_id: workspaceId,
                name: input.name,
                cover_type: "color",
                cover_value: "#6366f1"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(userId, workspaceId, input);

            expect(result.coverType).toBe("color");
            expect(result.coverValue).toBe("#6366f1");
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should return form interface when found", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                workflow_name: "Test Workflow"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(formId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE fi.id = $1 AND fi.workspace_id = $2"),
                [formId, workspaceId]
            );
            expect(result?.id).toBe(formId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByIdAndWorkspaceId("non-existent", generateId());

            expect(result).toBeNull();
        });

        it("should join with workflows and agents tables", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({ id: formId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            await repository.findByIdAndWorkspaceId(formId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LEFT JOIN flowmaestro.workflows"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LEFT JOIN flowmaestro.agents"),
                expect.anything()
            );
        });

        it("should exclude soft-deleted records", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({ id: formId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            await repository.findByIdAndWorkspaceId(formId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("deleted_at IS NULL"),
                expect.anything()
            );
        });
    });

    describe("findBySlug", () => {
        it("should return published form interface by slug", async () => {
            const slug = "test-form";
            const mockRow = generateFormInterfaceRow({ slug, status: "published" });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findBySlug(slug);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE slug = $1 AND status = 'published'"),
                [slug]
            );
            expect(result?.slug).toBe(slug);
        });

        it("should return null for unpublished form", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findBySlug("draft-form");

            expect(result).toBeNull();
        });

        it("should return null for deleted form", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findBySlug("deleted-form");

            expect(result).toBeNull();
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return paginated form interfaces with total count", async () => {
            const workspaceId = generateId();
            const mockInterfaces = [
                generateFormInterfaceRow({ workspace_id: workspaceId }),
                generateFormInterfaceRow({ workspace_id: workspaceId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockInterfaces));

            const result = await repository.findByWorkspaceId(workspaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.formInterfaces).toHaveLength(2);
        });

        it("should filter by folder when folderId is provided", async () => {
            const workspaceId = generateId();
            const folderId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateFormInterfaceRow()]));

            await repository.findByWorkspaceId(workspaceId, { folderId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ANY(COALESCE(fi.folder_ids"),
                expect.arrayContaining([workspaceId, folderId])
            );
        });

        it("should filter for root items when folderId is null", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(3)).mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId, { folderId: null });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("folder_ids IS NULL OR fi.folder_ids = ARRAY[]::UUID[]"),
                expect.arrayContaining([workspaceId])
            );
        });

        it("should use default pagination values", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(100)).mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT"),
                expect.arrayContaining([workspaceId, 50, 0])
            );
        });

        it("should order by updated_at DESC", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(0)).mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY fi.updated_at DESC"),
                expect.anything()
            );
        });
    });

    describe("findByWorkflowIdAndWorkspaceId", () => {
        it("should return form interfaces linked to workflow", async () => {
            const workflowId = generateId();
            const workspaceId = generateId();
            const mockInterfaces = [
                generateFormInterfaceRow({ workflow_id: workflowId, workspace_id: workspaceId }),
                generateFormInterfaceRow({ workflow_id: workflowId, workspace_id: workspaceId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockInterfaces));

            const result = await repository.findByWorkflowIdAndWorkspaceId(workflowId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workflow_id = $1 AND workspace_id = $2"),
                [workflowId, workspaceId]
            );
            expect(result).toHaveLength(2);
        });

        it("should return empty array when no forms linked", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            const result = await repository.findByWorkflowIdAndWorkspaceId(
                generateId(),
                generateId()
            );

            expect(result).toHaveLength(0);
        });
    });

    describe("findByAgentIdAndWorkspaceId", () => {
        it("should return form interfaces linked to agent", async () => {
            const agentId = generateId();
            const workspaceId = generateId();
            const mockInterfaces = [
                generateFormInterfaceRow({
                    agent_id: agentId,
                    workspace_id: workspaceId,
                    target_type: "agent"
                })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockInterfaces));

            const result = await repository.findByAgentIdAndWorkspaceId(agentId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1 AND workspace_id = $2"),
                [agentId, workspaceId]
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("updateByWorkspaceId", () => {
        it("should update specified fields only", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                name: "Updated Form"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateByWorkspaceId(formId, workspaceId, {
                name: "Updated Form"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.form_interfaces"),
                expect.arrayContaining(["Updated Form", formId, workspaceId])
            );
            expect(result?.name).toBe("Updated Form");
        });

        it("should return existing form when no updates provided", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({ id: formId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.updateByWorkspaceId(formId, workspaceId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT"),
                expect.anything()
            );
            expect(result?.id).toBe(formId);
        });

        it("should handle target type change to workflow", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const newWorkflowId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                target_type: "workflow",
                workflow_id: newWorkflowId,
                agent_id: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.updateByWorkspaceId(formId, workspaceId, {
                targetType: "workflow",
                workflowId: newWorkflowId
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("target_type ="),
                expect.arrayContaining(["workflow", newWorkflowId])
            );
        });

        it("should handle target type change to agent", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const newAgentId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                target_type: "agent",
                agent_id: newAgentId,
                workflow_id: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.updateByWorkspaceId(formId, workspaceId, {
                targetType: "agent",
                agentId: newAgentId
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("target_type ="),
                expect.arrayContaining(["agent", newAgentId])
            );
        });

        it("should return null when form not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.updateByWorkspaceId(
                generateId(),
                generateId(),
                { name: "New Name" }
            );

            expect(result).toBeNull();
        });
    });

    describe("publishByWorkspaceId", () => {
        it("should set status to published and set published_at", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                status: "published",
                published_at: new Date().toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.publishByWorkspaceId(formId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'published', published_at = CURRENT_TIMESTAMP"),
                [formId, workspaceId]
            );
            expect(result?.status).toBe("published");
        });

        it("should return null when form not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.publishByWorkspaceId(generateId(), generateId());

            expect(result).toBeNull();
        });
    });

    describe("unpublishByWorkspaceId", () => {
        it("should set status to draft and clear published_at", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                status: "draft",
                published_at: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.unpublishByWorkspaceId(formId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'draft', published_at = NULL"),
                [formId, workspaceId]
            );
            expect(result?.status).toBe("draft");
            expect(result?.publishedAt).toBeNull();
        });
    });

    describe("softDeleteByWorkspaceId", () => {
        it("should soft delete and return true", async () => {
            const formId = generateId();
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.softDeleteByWorkspaceId(formId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP"),
                [formId, workspaceId]
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
            const slug = "new-form";
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
            const slug = "existing-form";
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([{ id: "1" }]));

            const result = await repository.isSlugAvailableInWorkspace(slug, workspaceId);

            expect(result).toBe(false);
        });

        it("should exclude specified ID when checking", async () => {
            const slug = "form";
            const workspaceId = generateId();
            const excludeId = generateId();

            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            await repository.isSlugAvailableInWorkspace(slug, workspaceId, excludeId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND id != $3"),
                [slug, workspaceId, excludeId]
            );
        });
    });

    describe("duplicateByWorkspaceId", () => {
        it("should duplicate form with new slug and name", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const originalForm = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                name: "Original Form",
                slug: "original-form"
            });
            const duplicatedForm = generateFormInterfaceRow({
                workspace_id: workspaceId,
                name: "Original Form (Copy)",
                slug: "original-form-copy",
                status: "draft"
            });

            // First call: findByIdAndWorkspaceId
            mockQuery.mockResolvedValueOnce(mockRows([originalForm]));
            // Second call: isSlugAvailableInWorkspace
            mockQuery.mockResolvedValueOnce(mockEmptyResult());
            // Third call: INSERT
            mockQuery.mockResolvedValueOnce(mockInsertReturning([duplicatedForm]));

            const result = await repository.duplicateByWorkspaceId(formId, workspaceId);

            expect(result?.name).toBe("Original Form (Copy)");
            expect(result?.status).toBe("draft");
        });

        it("should generate unique slug when copy exists", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const originalForm = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                name: "Form",
                slug: "form"
            });
            const duplicatedForm = generateFormInterfaceRow({
                workspace_id: workspaceId,
                slug: "form-copy-1",
                status: "draft"
            });

            // findByIdAndWorkspaceId
            mockQuery.mockResolvedValueOnce(mockRows([originalForm]));
            // isSlugAvailableInWorkspace for "form-copy" - taken
            mockQuery.mockResolvedValueOnce(mockRows([{ id: "1" }]));
            // isSlugAvailableInWorkspace for "form-copy-1" - available
            mockQuery.mockResolvedValueOnce(mockEmptyResult());
            // INSERT
            mockQuery.mockResolvedValueOnce(mockInsertReturning([duplicatedForm]));

            const result = await repository.duplicateByWorkspaceId(formId, workspaceId);

            expect(result?.slug).toBe("form-copy-1");
        });

        it("should return null when original form not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.duplicateByWorkspaceId(generateId(), generateId());

            expect(result).toBeNull();
        });

        it("should always create duplicate as draft", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const publishedForm = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                status: "published"
            });
            const duplicatedForm = generateFormInterfaceRow({
                workspace_id: workspaceId,
                status: "draft"
            });

            mockQuery.mockResolvedValueOnce(mockRows([publishedForm]));
            mockQuery.mockResolvedValueOnce(mockEmptyResult());
            mockQuery.mockResolvedValueOnce(mockInsertReturning([duplicatedForm]));

            const result = await repository.duplicateByWorkspaceId(formId, workspaceId);

            expect(result?.status).toBe("draft");
        });
    });

    describe("setTriggerId", () => {
        it("should set trigger ID on form", async () => {
            const formId = generateId();
            const triggerId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId
            });
            // Manually set trigger_id since the generator doesn't include it
            (mockRow as Record<string, unknown>).trigger_id = triggerId;

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.setTriggerId(formId, triggerId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET trigger_id = $2"),
                [formId, triggerId]
            );
            expect(result).not.toBeNull();
        });

        it("should allow clearing trigger ID with null", async () => {
            const formId = generateId();
            const mockRow = generateFormInterfaceRow({ id: formId });
            (mockRow as Record<string, unknown>).trigger_id = null;

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.setTriggerId(formId, null);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET trigger_id = $2"),
                [formId, null]
            );
        });

        it("should return null when form not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.setTriggerId(generateId(), generateId());

            expect(result).toBeNull();
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                created_at: now,
                updated_at: now,
                published_at: now,
                last_submission_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(formId, workspaceId);

            expect(result?.createdAt).toBeInstanceOf(Date);
            expect(result?.updatedAt).toBeInstanceOf(Date);
            expect(result?.publishedAt).toBeInstanceOf(Date);
            expect(result?.lastSubmissionAt).toBeInstanceOf(Date);
        });

        it("should handle null optional dates", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                published_at: null,
                last_submission_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(formId, workspaceId);

            expect(result?.publishedAt).toBeNull();
            expect(result?.lastSubmissionAt).toBeNull();
        });

        it("should coerce submission_count from string", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                submission_count: "150"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(formId, workspaceId);

            expect(result?.submissionCount).toBe(150);
            expect(typeof result?.submissionCount).toBe("number");
        });

        it("should handle allowed_file_types as array", async () => {
            const formId = generateId();
            const workspaceId = generateId();
            const fileTypes = ["application/pdf", "image/png"];
            const mockRow = generateFormInterfaceRow({
                id: formId,
                workspace_id: workspaceId,
                allowed_file_types: fileTypes
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(formId, workspaceId);

            expect(result?.allowedFileTypes).toEqual(fileTypes);
        });
    });
});
