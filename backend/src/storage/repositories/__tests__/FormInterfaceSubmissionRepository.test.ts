/**
 * FormInterfaceSubmissionRepository Tests
 *
 * Tests for form interface submission CRUD operations including
 * file attachments, URL attachments, and output handling.
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
        it("should insert a new submission with all fields", async () => {
            const input = {
                interfaceId: generateId(),
                message: "Generate a report on market trends",
                files: [
                    {
                        fileName: "data.csv",
                        fileSize: 1024,
                        mimeType: "text/csv",
                        gcsUri: "gs://bucket/data.csv"
                    }
                ],
                urls: [{ url: "https://example.com/article", title: "Article" }],
                ipAddress: "192.168.1.1",
                userAgent: "Mozilla/5.0"
            };

            const mockRow = generateFormInterfaceSubmissionRow({
                interface_id: input.interfaceId,
                message: input.message,
                files: JSON.stringify(input.files),
                urls: JSON.stringify(input.urls),
                ip_address: input.ipAddress,
                user_agent: input.userAgent
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.form_interface_submissions"),
                expect.arrayContaining([
                    input.interfaceId,
                    input.message,
                    JSON.stringify(input.files),
                    JSON.stringify(input.urls),
                    input.ipAddress,
                    input.userAgent
                ])
            );
            expect(result.interfaceId).toBe(input.interfaceId);
            expect(result.message).toBe(input.message);
        });

        it("should handle empty files and urls arrays", async () => {
            const input = {
                interfaceId: generateId(),
                message: "Just a message",
                files: [],
                urls: [],
                ipAddress: null,
                userAgent: null
            };

            const mockRow = generateFormInterfaceSubmissionRow({
                interface_id: input.interfaceId,
                files: "[]",
                urls: "[]"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.files).toEqual([]);
            expect(result.urls).toEqual([]);
        });
    });

    describe("findById", () => {
        it("should return submission when found", async () => {
            const submissionId = generateId();
            const mockRow = generateFormInterfaceSubmissionRow({ id: submissionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                submissionId
            ]);
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

        it("should order by submitted_at descending", async () => {
            const interfaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(0)).mockResolvedValueOnce(mockRows([]));

            await repository.findByInterfaceId(interfaceId);

            expect(mockQuery).toHaveBeenLastCalledWith(
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
                expect.stringContaining("WHERE interface_id = $1"),
                [interfaceId]
            );
            expect(result).toBe(42);
        });
    });

    describe("updateOutput", () => {
        it("should update the output field", async () => {
            const submissionId = generateId();
            const output = "Generated report content here...";
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                output
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateOutput(submissionId, output);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SET output = $2"), [
                submissionId,
                output
            ]);
            expect(result?.output).toBe(output);
        });

        it("should return null when submission not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.updateOutput("non-existent", "output");

            expect(result).toBeNull();
        });
    });

    describe("markOutputEdited", () => {
        it("should set output_edited_at timestamp", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 1,
                command: "UPDATE",
                oid: 0,
                fields: []
            });

            await repository.markOutputEdited(submissionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET output_edited_at = CURRENT_TIMESTAMP"),
                [submissionId]
            );
        });
    });

    describe("getRecentSubmissions", () => {
        it("should return submissions from recent hours", async () => {
            const interfaceId = generateId();
            const mockSubmissions = [
                generateFormInterfaceSubmissionRow({ interface_id: interfaceId }),
                generateFormInterfaceSubmissionRow({ interface_id: interfaceId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockSubmissions));

            const result = await repository.getRecentSubmissions(interfaceId, 24);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("submitted_at > NOW() - INTERVAL '24 hours'"),
                [interfaceId]
            );
            expect(result).toHaveLength(2);
        });

        it("should use default hours value", async () => {
            const interfaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.getRecentSubmissions(interfaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INTERVAL '24 hours'"),
                expect.anything()
            );
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

        it("should parse files from JSON string", async () => {
            const submissionId = generateId();
            const files = [
                { name: "test.pdf", size: 1024, type: "application/pdf", url: "/uploads/test.pdf" }
            ];
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                files: JSON.stringify(files)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.files).toEqual(files);
        });

        it("should handle files already parsed by pg", async () => {
            const submissionId = generateId();
            const files = [
                { name: "test.pdf", size: 1024, type: "application/pdf", url: "/uploads/test.pdf" }
            ];
            const mockRow = {
                ...generateFormInterfaceSubmissionRow({ id: submissionId }),
                files // Already an array
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.files).toEqual(files);
        });

        it("should parse urls from JSON string", async () => {
            const submissionId = generateId();
            const urls = [{ url: "https://example.com", title: "Example" }];
            const mockRow = generateFormInterfaceSubmissionRow({
                id: submissionId,
                urls: JSON.stringify(urls)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.urls).toEqual(urls);
        });

        it("should handle urls already parsed by pg", async () => {
            const submissionId = generateId();
            const urls = [{ url: "https://example.com", title: "Example" }];
            const mockRow = {
                ...generateFormInterfaceSubmissionRow({ id: submissionId }),
                urls // Already an array
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(submissionId);

            expect(result?.urls).toEqual(urls);
        });
    });
});
