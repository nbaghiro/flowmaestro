/**
 * FormInterfaceSubmissionRepository Tests
 *
 * Tests for form interface submission CRUD operations including
 * status updates, output management, and execution tracking.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { FormInterfaceSubmissionRepository } from "../FormInterfaceSubmissionRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockCountResult,
    generateFormInterfaceSubmissionRow,
    generateId
} from "./setup";

describe("FormInterfaceSubmissionRepository", () => {
    let repository: FormInterfaceSubmissionRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new FormInterfaceSubmissionRepository();
    });

    describe("create", () => {
        it("should create a new submission with message", async () => {
            const interfaceId = generateId();
            const input = {
                interfaceId,
                message: "Test submission message",
                files: [],
                urls: [],
                ipAddress: "192.168.1.1",
                userAgent: "Mozilla/5.0"
            };

            const mockRow = generateFormInterfaceSubmissionRow({
                interface_id: interfaceId,
                message: input.message,
                ip_address: input.ipAddress
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.form_interface_submissions"),
                expect.arrayContaining([interfaceId, input.message])
            );
            expect(result.message).toBe(input.message);
            expect(result.interfaceId).toBe(interfaceId);
        });

        it("should create submission with file attachments", async () => {
            const interfaceId = generateId();
            const files = [
                {
                    filename: "test.pdf",
                    originalName: "test.pdf",
                    mimeType: "application/pdf",
                    size: 1024,
                    gcsUri: "gs://bucket/test.pdf"
                }
            ];
            const input = {
                interfaceId,
                message: "With attachment",
                files,
                urls: [],
                ipAddress: null,
                userAgent: null
            };

            const mockRow = generateFormInterfaceSubmissionRow({
                interface_id: interfaceId,
                files: JSON.stringify(files)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(files)])
            );
        });

        it("should create submission with URL attachments", async () => {
            const interfaceId = generateId();
            const urls = [{ url: "https://example.com/doc.pdf", title: "Document" }];
            const input = {
                interfaceId,
                message: "With URL",
                files: [],
                urls,
                ipAddress: null,
                userAgent: null
            };

            const mockRow = generateFormInterfaceSubmissionRow({
                interface_id: interfaceId,
                urls: JSON.stringify(urls)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(urls)])
            );
        });

        it("should default execution status to pending", async () => {
            const input = {
                interfaceId: generateId(),
                message: "Test",
                files: [],
                urls: [],
                ipAddress: null,
                userAgent: null
            };

            const mockRow = generateFormInterfaceSubmissionRow();
            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining(["pending"])
            );
        });

        it("should allow setting initial execution status", async () => {
            const input = {
                interfaceId: generateId(),
                message: "Test",
                files: [],
                urls: [],
                ipAddress: null,
                userAgent: null,
                executionStatus: "running" as const
            };

            const mockRow = generateFormInterfaceSubmissionRow();
            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining(["running"])
            );
        });
    });

    describe("findById", () => {
        it("should return submission when found", async () => {
            const submissionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({ id: submissionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1"),
                [submissionId]
            );
            expect(result?.id).toBe(submissionId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByInterfaceId", () => {
        it("should return paginated submissions with total count", async () => {
            const interfaceId = generateId();
            const mockSubmissions = [
                generateFormInterfaceSubmissionRow({ interface_id: interfaceId }),
                generateFormInterfaceSubmissionRow({ interface_id: interfaceId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockSubmissions));

            const result = await repository.findByInterfaceId(interfaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.submissions).toHaveLength(2);
        });

        it("should use default pagination values", async () => {
            const interfaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByInterfaceId(interfaceId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT $2 OFFSET $3"),
                [interfaceId, 50, 0]
            );
        });

        it("should order by submitted_at DESC", async () => {
            const interfaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(0))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByInterfaceId(interfaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY submitted_at DESC"),
                expect.anything()
            );
        });
    });

    describe("countByInterfaceId", () => {
        it("should return count of submissions", async () => {
            const interfaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(42));

            const result = await repository.countByInterfaceId(interfaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT COUNT(*)"),
                [interfaceId]
            );
            expect(result).toBe(42);
        });

        it("should return 0 when no submissions", async () => {
            mockQuery.mockResolvedValueOnce(mockCountResult(0));

            const result = await repository.countByInterfaceId(generateId());

            expect(result).toBe(0);
        });
    });

    describe("updateOutput", () => {
        it("should update the output field", async () => {
            const submissionId = generateId();
            const output = "Generated output content";
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                output
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateOutput(submissionId, output);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET output = $2"),
                [submissionId, output]
            );
            expect(result?.output).toBe(output);
        });

        it("should return null when submission not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.updateOutput(generateId(), "output");

            expect(result).toBeNull();
        });
    });

    describe("markOutputEdited", () => {
        it("should set output_edited_at timestamp", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1, command: "UPDATE", oid: 0, fields: [] });

            await repository.markOutputEdited(submissionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET output_edited_at = CURRENT_TIMESTAMP"),
                [submissionId]
            );
        });
    });

    describe("getRecentSubmissions", () => {
        it("should return submissions within time window", async () => {
            const interfaceId = generateId();
            const mockSubmissions = [
                generateFormInterfaceSubmissionRow({ interface_id: interfaceId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockSubmissions));

            const result = await repository.getRecentSubmissions(interfaceId, 24);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("NOW() - INTERVAL '24 hours'"),
                [interfaceId]
            );
            expect(result).toHaveLength(1);
        });

        it("should use default 24 hours when not specified", async () => {
            const interfaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.getRecentSubmissions(interfaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("NOW() - INTERVAL '24 hours'"),
                expect.anything()
            );
        });
    });

    describe("updateExecutionStatus", () => {
        it("should update status only", async () => {
            const submissionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId
            });
            (mockRow as Record<string, unknown>).execution_status = "running";

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateExecutionStatus(submissionId, "running");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET execution_status = $2"),
                [submissionId, "running"]
            );
            expect(result?.executionStatus).toBe("running");
        });

        it("should update status and execution ID", async () => {
            const submissionId = generateId();
            const executionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({ id: submissionId });
            (mockRow as Record<string, unknown>).execution_status = "running";
            (mockRow as Record<string, unknown>).execution_id = executionId;

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.updateExecutionStatus(submissionId, "running", executionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("execution_id = $3"),
                [submissionId, "running", executionId]
            );
        });

        it("should update status and output", async () => {
            const submissionId = generateId();
            const output = "Final output";
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                output
            });
            (mockRow as Record<string, unknown>).execution_status = "completed";

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.updateExecutionStatus(submissionId, "completed", undefined, output);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("output = $3"),
                [submissionId, "completed", output]
            );
        });

        it("should update status, execution ID, and output together", async () => {
            const submissionId = generateId();
            const executionId = generateId();
            const output = "Complete output";
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                output
            });
            (mockRow as Record<string, unknown>).execution_status = "completed";
            (mockRow as Record<string, unknown>).execution_id = executionId;

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.updateExecutionStatus(submissionId, "completed", executionId, output);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("execution_id = $3, output = $4"),
                [submissionId, "completed", executionId, output]
            );
        });

        it("should return null when submission not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.updateExecutionStatus(generateId(), "running");

            expect(result).toBeNull();
        });
    });

    describe("updateAttachmentsStatus", () => {
        it("should update attachments status", async () => {
            const submissionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({ id: submissionId });
            (mockRow as Record<string, unknown>).attachments_status = "processing";

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateAttachmentsStatus(submissionId, "processing");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET attachments_status = $2"),
                [submissionId, "processing"]
            );
            expect(result?.attachmentsStatus).toBe("processing");
        });

        it("should return null when submission not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.updateAttachmentsStatus(generateId(), "completed");

            expect(result).toBeNull();
        });
    });

    describe("findByExecutionId", () => {
        it("should return submission by execution ID", async () => {
            const executionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow();
            (mockRow as Record<string, unknown>).execution_id = executionId;

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByExecutionId(executionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE execution_id = $1"),
                [executionId]
            );
            expect(result).not.toBeNull();
        });

        it("should return null when no submission with that execution ID", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByExecutionId(generateId());

            expect(result).toBeNull();
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const submissionId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                submitted_at: now,
                created_at: now,
                output_edited_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.submittedAt).toBeInstanceOf(Date);
            expect(result?.createdAt).toBeInstanceOf(Date);
            expect(result?.outputEditedAt).toBeInstanceOf(Date);
        });

        it("should handle null output_edited_at", async () => {
            const submissionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                output_edited_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.outputEditedAt).toBeNull();
        });

        it("should parse files JSON string", async () => {
            const submissionId = generateId();
            const files = [{ filename: "test.pdf", size: 1024 }];
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                files: JSON.stringify(files)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.files).toEqual(files);
        });

        it("should handle files as array directly", async () => {
            const submissionId = generateId();
            const files = [{ filename: "test.pdf", size: 1024 }];
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId
            });
            // Simulate database returning array directly (postgres jsonb)
            (mockRow as Record<string, unknown>).files = files;

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.files).toEqual(files);
        });

        it("should handle empty files and urls", async () => {
            const submissionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                files: "[]",
                urls: "[]"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.files).toEqual([]);
            expect(result?.urls).toEqual([]);
        });

        it("should default execution status to pending", async () => {
            const submissionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({ id: submissionId });
            (mockRow as Record<string, unknown>).execution_status = null;

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.executionStatus).toBe("pending");
        });

        it("should default attachments status to pending", async () => {
            const submissionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({ id: submissionId });
            (mockRow as Record<string, unknown>).attachments_status = null;

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.attachmentsStatus).toBe("pending");
        });
    });
});
