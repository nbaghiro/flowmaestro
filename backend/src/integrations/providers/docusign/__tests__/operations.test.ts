/**
 * DocuSign Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import {
    executeCreateEnvelope,
    createEnvelopeSchema,
    executeCreateFromTemplate,
    createFromTemplateSchema,
    executeDownloadDocuments,
    downloadDocumentsSchema,
    executeGetEnvelope,
    getEnvelopeSchema,
    executeGetRecipients,
    getRecipientsSchema,
    executeListEnvelopes,
    listEnvelopesSchema,
    executeListTemplates,
    listTemplatesSchema,
    executeVoidEnvelope,
    voidEnvelopeSchema
} from "../operations";
import type { DocuSignClient } from "../client/DocuSignClient";

// Mock DocuSignClient factory
function createMockDocuSignClient(): jest.Mocked<DocuSignClient> {
    return {
        getAccountId: jest.fn(),
        createEnvelope: jest.fn(),
        getEnvelope: jest.fn(),
        listEnvelopes: jest.fn(),
        voidEnvelope: jest.fn(),
        getRecipients: jest.fn(),
        downloadDocuments: jest.fn(),
        listTemplates: jest.fn(),
        getTemplate: jest.fn(),
        createFromTemplate: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<DocuSignClient>;
}

describe("DocuSign Operation Executors", () => {
    let mockClient: jest.Mocked<DocuSignClient>;

    beforeEach(() => {
        mockClient = createMockDocuSignClient();
    });

    describe("executeCreateEnvelope", () => {
        const validParams = {
            emailSubject: "Please sign: Employment Agreement",
            emailBlurb: "Please review and sign the attached agreement.",
            status: "sent" as const,
            documents: [
                {
                    documentId: "1",
                    name: "Employment_Agreement.pdf",
                    fileExtension: "pdf",
                    documentBase64: "JVBERi0xLjQKJeLjz9MK..."
                }
            ],
            signers: [
                {
                    email: "john.smith@example.com",
                    name: "John Smith",
                    recipientId: "1",
                    routingOrder: "1"
                }
            ]
        };

        it("calls client with correct params", async () => {
            mockClient.createEnvelope.mockResolvedValueOnce({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                status: "sent",
                statusDateTime: "2024-03-15T14:30:00.000Z",
                uri: "/envelopes/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            });

            await executeCreateEnvelope(mockClient, validParams);

            expect(mockClient.createEnvelope).toHaveBeenCalledWith({
                emailSubject: "Please sign: Employment Agreement",
                emailBlurb: "Please review and sign the attached agreement.",
                status: "sent",
                documents: [
                    {
                        documentId: "1",
                        name: "Employment_Agreement.pdf",
                        fileExtension: "pdf",
                        documentBase64: "JVBERi0xLjQKJeLjz9MK...",
                        remoteUrl: undefined
                    }
                ],
                recipients: {
                    signers: [
                        {
                            email: "john.smith@example.com",
                            name: "John Smith",
                            recipientId: "1",
                            routingOrder: "1",
                            clientUserId: undefined
                        }
                    ],
                    carbonCopies: undefined
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createEnvelope.mockResolvedValueOnce({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                status: "sent",
                statusDateTime: "2024-03-15T14:30:00.000Z",
                uri: "/envelopes/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            });

            const result = await executeCreateEnvelope(mockClient, validParams);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                status: "sent",
                statusDateTime: "2024-03-15T14:30:00.000Z",
                uri: "/envelopes/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            });
        });

        it("passes carbon copies when provided", async () => {
            mockClient.createEnvelope.mockResolvedValueOnce({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                status: "sent",
                statusDateTime: "2024-03-15T14:30:00.000Z",
                uri: "/envelopes/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            });

            const paramsWithCC = {
                ...validParams,
                carbonCopies: [
                    {
                        email: "cc@example.com",
                        name: "CC Recipient",
                        recipientId: "2",
                        routingOrder: "2"
                    }
                ]
            };

            await executeCreateEnvelope(mockClient, paramsWithCC);

            expect(mockClient.createEnvelope).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipients: expect.objectContaining({
                        carbonCopies: [
                            {
                                email: "cc@example.com",
                                name: "CC Recipient",
                                recipientId: "2",
                                routingOrder: "2"
                            }
                        ]
                    })
                })
            );
        });

        it("creates draft envelope when status is 'created'", async () => {
            mockClient.createEnvelope.mockResolvedValueOnce({
                envelopeId: "draft-envelope-id",
                status: "created",
                statusDateTime: "2024-03-15T14:30:00.000Z",
                uri: "/envelopes/draft-envelope-id"
            });

            const draftParams = { ...validParams, status: "created" as const };
            const result = await executeCreateEnvelope(mockClient, draftParams);

            expect(result.success).toBe(true);
            expect((result.data as { status: string }).status).toBe("created");
        });

        it("returns error on client failure", async () => {
            mockClient.createEnvelope.mockRejectedValueOnce(
                new Error("The envelope is incomplete and cannot be sent.")
            );

            const result = await executeCreateEnvelope(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The envelope is incomplete and cannot be sent.");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createEnvelope.mockRejectedValueOnce("string error");

            const result = await executeCreateEnvelope(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create envelope");
        });
    });

    describe("executeCreateFromTemplate", () => {
        const validParams = {
            templateId: "tmpl-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            emailSubject: "Your Employment Offer",
            emailBlurb: "Please review and sign your offer letter.",
            status: "sent" as const,
            templateRoles: [
                {
                    roleName: "Employee",
                    email: "jane.doe@gmail.com",
                    name: "Jane Doe",
                    tabs: {
                        textTabs: [
                            { tabLabel: "StartDate", value: "April 1, 2024" },
                            { tabLabel: "Salary", value: "$125,000" }
                        ]
                    }
                }
            ]
        };

        it("calls client with correct params", async () => {
            mockClient.createFromTemplate.mockResolvedValueOnce({
                envelopeId: "f6a7b8c9-d0e1-2345-f012-456789012345",
                status: "sent",
                statusDateTime: "2024-03-15T10:00:00.000Z",
                uri: "/envelopes/f6a7b8c9-d0e1-2345-f012-456789012345"
            });

            await executeCreateFromTemplate(mockClient, validParams);

            expect(mockClient.createFromTemplate).toHaveBeenCalledWith({
                templateId: "tmpl-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                emailSubject: "Your Employment Offer",
                emailBlurb: "Please review and sign your offer letter.",
                status: "sent",
                templateRoles: [
                    {
                        roleName: "Employee",
                        email: "jane.doe@gmail.com",
                        name: "Jane Doe",
                        clientUserId: undefined,
                        tabs: {
                            textTabs: [
                                { tabLabel: "StartDate", value: "April 1, 2024" },
                                { tabLabel: "Salary", value: "$125,000" }
                            ]
                        }
                    }
                ]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createFromTemplate.mockResolvedValueOnce({
                envelopeId: "f6a7b8c9-d0e1-2345-f012-456789012345",
                status: "sent",
                statusDateTime: "2024-03-15T10:00:00.000Z",
                uri: "/envelopes/f6a7b8c9-d0e1-2345-f012-456789012345"
            });

            const result = await executeCreateFromTemplate(mockClient, validParams);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                envelopeId: "f6a7b8c9-d0e1-2345-f012-456789012345",
                status: "sent",
                statusDateTime: "2024-03-15T10:00:00.000Z",
                uri: "/envelopes/f6a7b8c9-d0e1-2345-f012-456789012345"
            });
        });

        it("handles multiple template roles", async () => {
            mockClient.createFromTemplate.mockResolvedValueOnce({
                envelopeId: "multi-role-envelope",
                status: "sent",
                statusDateTime: "2024-03-15T10:00:00.000Z",
                uri: "/envelopes/multi-role-envelope"
            });

            const multiRoleParams = {
                ...validParams,
                templateRoles: [
                    {
                        roleName: "Employee",
                        email: "employee@example.com",
                        name: "Employee Name"
                    },
                    {
                        roleName: "HR Manager",
                        email: "hr@example.com",
                        name: "HR Manager"
                    }
                ]
            };

            const result = await executeCreateFromTemplate(mockClient, multiRoleParams);

            expect(result.success).toBe(true);
            expect(mockClient.createFromTemplate).toHaveBeenCalledWith(
                expect.objectContaining({
                    templateRoles: expect.arrayContaining([
                        expect.objectContaining({ roleName: "Employee" }),
                        expect.objectContaining({ roleName: "HR Manager" })
                    ])
                })
            );
        });

        it("returns error on template not found", async () => {
            mockClient.createFromTemplate.mockRejectedValueOnce(new Error("Template not found"));

            const result = await executeCreateFromTemplate(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Template not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createFromTemplate.mockRejectedValueOnce(null);

            const result = await executeCreateFromTemplate(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create envelope from template");
        });
    });

    describe("executeDownloadDocuments", () => {
        const validParams = {
            envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            documentId: "combined"
        };

        it("calls client with correct params", async () => {
            mockClient.downloadDocuments.mockResolvedValueOnce({
                contentType: "application/pdf",
                contentLength: 1048576,
                fileName: "combined_documents.pdf"
            });

            await executeDownloadDocuments(mockClient, validParams);

            expect(mockClient.downloadDocuments).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "combined"
            );
        });

        it("returns normalized output on success", async () => {
            const documentInfo = {
                contentType: "application/pdf",
                contentLength: 1048576,
                fileName: "combined_documents.pdf"
            };
            mockClient.downloadDocuments.mockResolvedValueOnce(documentInfo);

            const result = await executeDownloadDocuments(mockClient, validParams);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                documentId: "combined",
                documentInfo
            });
        });

        it("downloads specific document by ID", async () => {
            mockClient.downloadDocuments.mockResolvedValueOnce({
                contentType: "application/pdf",
                fileName: "document_1.pdf"
            });

            const specificDocParams = {
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                documentId: "1"
            };

            const result = await executeDownloadDocuments(mockClient, specificDocParams);

            expect(result.success).toBe(true);
            expect(mockClient.downloadDocuments).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "1"
            );
        });

        it("downloads signing certificate", async () => {
            mockClient.downloadDocuments.mockResolvedValueOnce({
                contentType: "application/pdf",
                fileName: "certificate.pdf"
            });

            const certParams = {
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                documentId: "certificate"
            };

            await executeDownloadDocuments(mockClient, certParams);

            expect(mockClient.downloadDocuments).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "certificate"
            );
        });

        it("returns error on envelope not found", async () => {
            mockClient.downloadDocuments.mockRejectedValueOnce(
                new Error("The requested envelope was not found.")
            );

            const result = await executeDownloadDocuments(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested envelope was not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.downloadDocuments.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeDownloadDocuments(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to download documents");
        });
    });

    describe("executeGetEnvelope", () => {
        const validParams = {
            envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        };

        it("calls client with correct params", async () => {
            mockClient.getEnvelope.mockResolvedValueOnce({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                status: "sent",
                emailSubject: "Please sign: Employment Agreement",
                createdDateTime: "2024-03-15T14:30:00.000Z"
            });

            await executeGetEnvelope(mockClient, validParams);

            expect(mockClient.getEnvelope).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                undefined
            );
        });

        it("passes include parameter when provided", async () => {
            mockClient.getEnvelope.mockResolvedValueOnce({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                status: "sent",
                createdDateTime: "2024-03-15T14:30:00.000Z",
                recipients: { signers: [] },
                documents: []
            });

            await executeGetEnvelope(mockClient, {
                ...validParams,
                include: "recipients,documents"
            });

            expect(mockClient.getEnvelope).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "recipients,documents"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getEnvelope.mockResolvedValueOnce({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                status: "sent",
                emailSubject: "Please sign: Employment Agreement",
                emailBlurb: "Please review and sign.",
                createdDateTime: "2024-03-15T14:30:00.000Z",
                sentDateTime: "2024-03-15T14:30:05.000Z",
                completedDateTime: undefined,
                voidedDateTime: undefined,
                voidedReason: undefined,
                documents: undefined,
                recipients: undefined
            });

            const result = await executeGetEnvelope(mockClient, validParams);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                status: "sent",
                emailSubject: "Please sign: Employment Agreement",
                emailBlurb: "Please review and sign.",
                createdDateTime: "2024-03-15T14:30:00.000Z",
                sentDateTime: "2024-03-15T14:30:05.000Z",
                completedDateTime: undefined,
                voidedDateTime: undefined,
                voidedReason: undefined,
                documents: undefined,
                recipients: undefined
            });
        });

        it("returns completed envelope details", async () => {
            mockClient.getEnvelope.mockResolvedValueOnce({
                envelopeId: "completed-envelope-id",
                status: "completed",
                emailSubject: "Signed Document",
                createdDateTime: "2024-03-15T14:30:00.000Z",
                sentDateTime: "2024-03-15T14:30:05.000Z",
                completedDateTime: "2024-03-16T10:00:00.000Z"
            });

            const result = await executeGetEnvelope(mockClient, {
                envelopeId: "completed-envelope-id"
            });

            expect(result.success).toBe(true);
            const data = result.data as { status: string; completedDateTime: string };
            expect(data.status).toBe("completed");
            expect(data.completedDateTime).toBe("2024-03-16T10:00:00.000Z");
        });

        it("returns voided envelope details", async () => {
            mockClient.getEnvelope.mockResolvedValueOnce({
                envelopeId: "voided-envelope-id",
                status: "voided",
                emailSubject: "Voided Document",
                createdDateTime: "2024-03-15T14:30:00.000Z",
                voidedDateTime: "2024-03-16T08:00:00.000Z",
                voidedReason: "Contract terms changed"
            });

            const result = await executeGetEnvelope(mockClient, {
                envelopeId: "voided-envelope-id"
            });

            expect(result.success).toBe(true);
            const data = result.data as { status: string; voidedReason: string };
            expect(data.status).toBe("voided");
            expect(data.voidedReason).toBe("Contract terms changed");
        });

        it("returns error on envelope not found", async () => {
            mockClient.getEnvelope.mockRejectedValueOnce(
                new Error("The requested envelope was not found.")
            );

            const result = await executeGetEnvelope(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested envelope was not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getEnvelope.mockRejectedValueOnce(undefined);

            const result = await executeGetEnvelope(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get envelope");
        });
    });

    describe("executeGetRecipients", () => {
        const validParams = {
            envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            includeTabs: false
        };

        it("calls client with correct params", async () => {
            mockClient.getRecipients.mockResolvedValueOnce({
                recipientCount: "1",
                signers: [
                    {
                        recipientId: "1",
                        recipientIdGuid: "guid-123",
                        email: "signer@example.com",
                        name: "Test Signer",
                        status: "sent",
                        routingOrder: "1"
                    }
                ]
            });

            await executeGetRecipients(mockClient, validParams);

            expect(mockClient.getRecipients).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                undefined
            );
        });

        it("passes includeTabs when true", async () => {
            mockClient.getRecipients.mockResolvedValueOnce({
                recipientCount: "1",
                signers: []
            });

            await executeGetRecipients(mockClient, {
                ...validParams,
                includeTabs: true
            });

            expect(mockClient.getRecipients).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "true"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getRecipients.mockResolvedValueOnce({
                recipientCount: "2",
                signers: [
                    {
                        recipientId: "1",
                        recipientIdGuid: "guid-123",
                        email: "signer@example.com",
                        name: "Test Signer",
                        status: "completed",
                        signedDateTime: "2024-03-16T10:00:00.000Z",
                        deliveredDateTime: "2024-03-15T14:30:00.000Z",
                        routingOrder: "1"
                    }
                ],
                carbonCopies: [
                    {
                        recipientId: "2",
                        recipientIdGuid: "guid-456",
                        email: "cc@example.com",
                        name: "CC Recipient",
                        status: "sent",
                        routingOrder: "2"
                    }
                ]
            });

            const result = await executeGetRecipients(mockClient, validParams);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                recipientCount: "2",
                signers: [
                    {
                        recipientId: "1",
                        email: "signer@example.com",
                        name: "Test Signer",
                        status: "completed",
                        signedDateTime: "2024-03-16T10:00:00.000Z",
                        deliveredDateTime: "2024-03-15T14:30:00.000Z",
                        declinedDateTime: undefined,
                        declinedReason: undefined,
                        routingOrder: "1"
                    }
                ],
                carbonCopies: [
                    {
                        recipientId: "2",
                        email: "cc@example.com",
                        name: "CC Recipient",
                        status: "sent",
                        routingOrder: "2"
                    }
                ]
            });
        });

        it("handles declined recipient", async () => {
            mockClient.getRecipients.mockResolvedValueOnce({
                recipientCount: "1",
                signers: [
                    {
                        recipientId: "1",
                        recipientIdGuid: "guid-123",
                        email: "signer@example.com",
                        name: "Declining Signer",
                        status: "declined",
                        declinedDateTime: "2024-03-16T09:00:00.000Z",
                        declinedReason: "Terms not acceptable",
                        routingOrder: "1"
                    }
                ]
            });

            const result = await executeGetRecipients(mockClient, validParams);

            expect(result.success).toBe(true);
            const data = result.data as {
                signers: Array<{ status: string; declinedReason: string }>;
            };
            expect(data.signers[0].status).toBe("declined");
            expect(data.signers[0].declinedReason).toBe("Terms not acceptable");
        });

        it("returns empty arrays when no recipients", async () => {
            mockClient.getRecipients.mockResolvedValueOnce({
                recipientCount: "0"
            });

            const result = await executeGetRecipients(mockClient, validParams);

            expect(result.success).toBe(true);
            const data = result.data as { signers: unknown[]; carbonCopies: unknown[] };
            expect(data.signers).toEqual([]);
            expect(data.carbonCopies).toEqual([]);
        });

        it("returns error on envelope not found", async () => {
            mockClient.getRecipients.mockRejectedValueOnce(
                new Error("The requested envelope was not found.")
            );

            const result = await executeGetRecipients(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested envelope was not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getRecipients.mockRejectedValueOnce(42);

            const result = await executeGetRecipients(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get recipients");
        });
    });

    describe("executeListEnvelopes", () => {
        const validParams = {
            count: "25"
        };

        it("calls client with correct params", async () => {
            mockClient.listEnvelopes.mockResolvedValueOnce({
                envelopes: [],
                resultSetSize: "0",
                totalSetSize: "0",
                startPosition: "0"
            });

            await executeListEnvelopes(mockClient, validParams);

            expect(mockClient.listEnvelopes).toHaveBeenCalledWith({
                fromDate: undefined,
                toDate: undefined,
                status: undefined,
                count: "25",
                startPosition: undefined,
                include: undefined
            });
        });

        it("passes all filter parameters", async () => {
            mockClient.listEnvelopes.mockResolvedValueOnce({
                envelopes: [],
                resultSetSize: "0",
                totalSetSize: "0",
                startPosition: "0"
            });

            await executeListEnvelopes(mockClient, {
                fromDate: "2024-01-01",
                toDate: "2024-03-15",
                status: "completed",
                count: "50",
                startPosition: "25",
                include: "recipients"
            });

            expect(mockClient.listEnvelopes).toHaveBeenCalledWith({
                fromDate: "2024-01-01",
                toDate: "2024-03-15",
                status: "completed",
                count: "50",
                startPosition: "25",
                include: "recipients"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listEnvelopes.mockResolvedValueOnce({
                envelopes: [
                    {
                        envelopeId: "env-1",
                        status: "completed",
                        emailSubject: "Document 1",
                        createdDateTime: "2024-03-15T14:30:00.000Z",
                        sentDateTime: "2024-03-15T14:30:05.000Z",
                        completedDateTime: "2024-03-16T10:00:00.000Z"
                    },
                    {
                        envelopeId: "env-2",
                        status: "sent",
                        emailSubject: "Document 2",
                        createdDateTime: "2024-03-15T12:00:00.000Z",
                        sentDateTime: "2024-03-15T12:00:10.000Z"
                    }
                ],
                resultSetSize: "2",
                totalSetSize: "150",
                startPosition: "0",
                endPosition: "1"
            });

            const result = await executeListEnvelopes(mockClient, validParams);

            expect(result.success).toBe(true);
            const data = result.data as { envelopes: unknown[]; pagination: unknown };
            expect(data.envelopes).toHaveLength(2);
            expect(data.envelopes[0]).toEqual({
                envelopeId: "env-1",
                status: "completed",
                emailSubject: "Document 1",
                createdDateTime: "2024-03-15T14:30:00.000Z",
                sentDateTime: "2024-03-15T14:30:05.000Z",
                completedDateTime: "2024-03-16T10:00:00.000Z"
            });
            expect(data.pagination).toEqual({
                resultSetSize: 2,
                totalSetSize: 150,
                startPosition: 0,
                endPosition: 1
            });
        });

        it("handles empty envelope list", async () => {
            mockClient.listEnvelopes.mockResolvedValueOnce({
                resultSetSize: "0",
                totalSetSize: "0",
                startPosition: "0"
            });

            const result = await executeListEnvelopes(mockClient, validParams);

            expect(result.success).toBe(true);
            const data = result.data as {
                envelopes: unknown[];
                pagination: { resultSetSize: number };
            };
            expect(data.envelopes).toEqual([]);
            expect(data.pagination.resultSetSize).toBe(0);
        });

        it("handles missing endPosition", async () => {
            mockClient.listEnvelopes.mockResolvedValueOnce({
                envelopes: [
                    {
                        envelopeId: "env-1",
                        status: "sent",
                        createdDateTime: "2024-03-15T14:30:00.000Z"
                    }
                ],
                resultSetSize: "1",
                totalSetSize: "1",
                startPosition: "0"
            });

            const result = await executeListEnvelopes(mockClient, validParams);

            expect(result.success).toBe(true);
            const data = result.data as { pagination: { endPosition?: number } };
            expect(data.pagination.endPosition).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.listEnvelopes.mockRejectedValueOnce(
                new Error("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)")
            );

            const result = await executeListEnvelopes(mockClient, {
                fromDate: "invalid-date",
                count: "25"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listEnvelopes.mockRejectedValueOnce(new Set());

            const result = await executeListEnvelopes(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list envelopes");
        });
    });

    describe("executeListTemplates", () => {
        const validParams = {
            count: "25"
        };

        it("calls client with correct params", async () => {
            mockClient.listTemplates.mockResolvedValueOnce({
                envelopeTemplates: [],
                resultSetSize: "0",
                totalSetSize: "0",
                startPosition: "0"
            });

            await executeListTemplates(mockClient, validParams);

            expect(mockClient.listTemplates).toHaveBeenCalledWith({
                count: "25",
                startPosition: undefined,
                searchText: undefined,
                folder: undefined
            });
        });

        it("passes all filter parameters", async () => {
            mockClient.listTemplates.mockResolvedValueOnce({
                envelopeTemplates: [],
                resultSetSize: "0",
                totalSetSize: "0",
                startPosition: "0"
            });

            await executeListTemplates(mockClient, {
                count: "50",
                startPosition: "10",
                searchText: "employment",
                folder: "shared_templates"
            });

            expect(mockClient.listTemplates).toHaveBeenCalledWith({
                count: "50",
                startPosition: "10",
                searchText: "employment",
                folder: "shared_templates"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listTemplates.mockResolvedValueOnce({
                envelopeTemplates: [
                    {
                        templateId: "tmpl-123",
                        name: "Employment Offer",
                        description: "Standard offer letter",
                        shared: "true",
                        created: "2024-01-15T10:00:00.000Z",
                        lastModified: "2024-03-01T14:30:00.000Z",
                        folderName: "HR Templates",
                        owner: {
                            userName: "HR Admin",
                            email: "hr@company.com",
                            userId: "user-123"
                        },
                        recipients: {
                            signers: [{ roleName: "Employee", recipientId: "1", routingOrder: "1" }]
                        }
                    }
                ],
                resultSetSize: "1",
                totalSetSize: "25",
                startPosition: "0"
            });

            const result = await executeListTemplates(mockClient, validParams);

            expect(result.success).toBe(true);
            const data = result.data as { templates: unknown[]; pagination: unknown };
            expect(data.templates).toHaveLength(1);
            expect(data.templates[0]).toEqual({
                templateId: "tmpl-123",
                name: "Employment Offer",
                description: "Standard offer letter",
                shared: "true",
                created: "2024-01-15T10:00:00.000Z",
                lastModified: "2024-03-01T14:30:00.000Z",
                folderName: "HR Templates",
                owner: {
                    userName: "HR Admin",
                    email: "hr@company.com",
                    userId: "user-123"
                },
                recipients: {
                    signers: [{ roleName: "Employee", recipientId: "1", routingOrder: "1" }]
                }
            });
            expect(data.pagination).toEqual({
                resultSetSize: 1,
                totalSetSize: 25,
                startPosition: 0
            });
        });

        it("handles empty template list", async () => {
            mockClient.listTemplates.mockResolvedValueOnce({
                resultSetSize: "0",
                totalSetSize: "0",
                startPosition: "0"
            });

            const result = await executeListTemplates(mockClient, validParams);

            expect(result.success).toBe(true);
            const data = result.data as { templates: unknown[] };
            expect(data.templates).toEqual([]);
        });

        it("returns error on folder not found", async () => {
            mockClient.listTemplates.mockRejectedValueOnce(new Error("Folder not found"));

            const result = await executeListTemplates(mockClient, {
                folder: "nonexistent-folder",
                count: "25"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Folder not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listTemplates.mockRejectedValueOnce(Symbol("error"));

            const result = await executeListTemplates(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list templates");
        });
    });

    describe("executeVoidEnvelope", () => {
        const validParams = {
            envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            voidedReason: "Contract terms have changed."
        };

        it("calls client with correct params", async () => {
            mockClient.voidEnvelope.mockResolvedValueOnce({});

            await executeVoidEnvelope(mockClient, validParams);

            expect(mockClient.voidEnvelope).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "Contract terms have changed."
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.voidEnvelope.mockResolvedValueOnce({});

            const result = await executeVoidEnvelope(mockClient, validParams);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                envelopeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                voided: true,
                voidedReason: "Contract terms have changed.",
                message: "Envelope has been voided"
            });
        });

        it("returns error on envelope not found", async () => {
            mockClient.voidEnvelope.mockRejectedValueOnce(
                new Error("The requested envelope was not found.")
            );

            const result = await executeVoidEnvelope(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The requested envelope was not found.");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on already completed envelope", async () => {
            mockClient.voidEnvelope.mockRejectedValueOnce(
                new Error("Cannot void a completed envelope")
            );

            const result = await executeVoidEnvelope(mockClient, {
                envelopeId: "completed-envelope",
                voidedReason: "Trying to void"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Cannot void a completed envelope");
        });

        it("returns error on already voided envelope", async () => {
            mockClient.voidEnvelope.mockRejectedValueOnce(new Error("Envelope is already voided"));

            const result = await executeVoidEnvelope(mockClient, {
                envelopeId: "voided-envelope",
                voidedReason: "Second attempt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Envelope is already voided");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.voidEnvelope.mockRejectedValueOnce(false);

            const result = await executeVoidEnvelope(mockClient, validParams);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to void envelope");
        });
    });

    describe("Schema Validation", () => {
        describe("createEnvelopeSchema", () => {
            it("validates minimal input", () => {
                const result = createEnvelopeSchema.safeParse({
                    emailSubject: "Test Document",
                    documents: [{ documentId: "1", name: "test.pdf" }],
                    signers: [
                        { email: "signer@example.com", name: "Test Signer", recipientId: "1" }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with all fields", () => {
                const result = createEnvelopeSchema.safeParse({
                    emailSubject: "Full Test",
                    emailBlurb: "Please sign this document",
                    status: "created",
                    documents: [
                        {
                            documentId: "1",
                            name: "contract.pdf",
                            fileExtension: "pdf",
                            documentBase64: "base64content"
                        }
                    ],
                    signers: [
                        {
                            email: "signer@example.com",
                            name: "Test Signer",
                            recipientId: "1",
                            routingOrder: "1",
                            clientUserId: "client123"
                        }
                    ],
                    carbonCopies: [
                        {
                            email: "cc@example.com",
                            name: "CC Recipient",
                            recipientId: "2"
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing emailSubject", () => {
                const result = createEnvelopeSchema.safeParse({
                    documents: [{ documentId: "1", name: "test.pdf" }],
                    signers: [
                        { email: "signer@example.com", name: "Test Signer", recipientId: "1" }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty documents array", () => {
                const result = createEnvelopeSchema.safeParse({
                    emailSubject: "Test",
                    documents: [],
                    signers: [
                        { email: "signer@example.com", name: "Test Signer", recipientId: "1" }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty signers array", () => {
                const result = createEnvelopeSchema.safeParse({
                    emailSubject: "Test",
                    documents: [{ documentId: "1", name: "test.pdf" }],
                    signers: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createEnvelopeSchema.safeParse({
                    emailSubject: "Test",
                    documents: [{ documentId: "1", name: "test.pdf" }],
                    signers: [{ email: "not-an-email", name: "Test Signer", recipientId: "1" }]
                });
                expect(result.success).toBe(false);
            });

            it("applies default status", () => {
                const result = createEnvelopeSchema.parse({
                    emailSubject: "Test",
                    documents: [{ documentId: "1", name: "test.pdf" }],
                    signers: [
                        { email: "signer@example.com", name: "Test Signer", recipientId: "1" }
                    ]
                });
                expect(result.status).toBe("sent");
            });
        });

        describe("createFromTemplateSchema", () => {
            it("validates minimal input", () => {
                const result = createFromTemplateSchema.safeParse({
                    templateId: "tmpl-123",
                    templateRoles: [
                        { roleName: "Signer", email: "signer@example.com", name: "Test Signer" }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("validates with tabs", () => {
                const result = createFromTemplateSchema.safeParse({
                    templateId: "tmpl-123",
                    templateRoles: [
                        {
                            roleName: "Employee",
                            email: "emp@example.com",
                            name: "Employee",
                            tabs: {
                                textTabs: [{ tabLabel: "salary", value: "$100,000" }]
                            }
                        }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing templateId", () => {
                const result = createFromTemplateSchema.safeParse({
                    templateRoles: [
                        { roleName: "Signer", email: "signer@example.com", name: "Test Signer" }
                    ]
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty templateRoles", () => {
                const result = createFromTemplateSchema.safeParse({
                    templateId: "tmpl-123",
                    templateRoles: []
                });
                expect(result.success).toBe(false);
            });

            it("applies default status", () => {
                const result = createFromTemplateSchema.parse({
                    templateId: "tmpl-123",
                    templateRoles: [
                        { roleName: "Signer", email: "signer@example.com", name: "Test" }
                    ]
                });
                expect(result.status).toBe("sent");
            });
        });

        describe("downloadDocumentsSchema", () => {
            it("validates with envelope ID only", () => {
                const result = downloadDocumentsSchema.safeParse({
                    envelopeId: "env-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with document ID", () => {
                const result = downloadDocumentsSchema.safeParse({
                    envelopeId: "env-123",
                    documentId: "1"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing envelopeId", () => {
                const result = downloadDocumentsSchema.safeParse({
                    documentId: "combined"
                });
                expect(result.success).toBe(false);
            });

            it("applies default documentId", () => {
                const result = downloadDocumentsSchema.parse({
                    envelopeId: "env-123"
                });
                expect(result.documentId).toBe("combined");
            });
        });

        describe("getEnvelopeSchema", () => {
            it("validates with envelope ID only", () => {
                const result = getEnvelopeSchema.safeParse({
                    envelopeId: "env-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with include parameter", () => {
                const result = getEnvelopeSchema.safeParse({
                    envelopeId: "env-123",
                    include: "recipients,documents"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing envelopeId", () => {
                const result = getEnvelopeSchema.safeParse({
                    include: "recipients"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getRecipientsSchema", () => {
            it("validates with envelope ID only", () => {
                const result = getRecipientsSchema.safeParse({
                    envelopeId: "env-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with includeTabs", () => {
                const result = getRecipientsSchema.safeParse({
                    envelopeId: "env-123",
                    includeTabs: true
                });
                expect(result.success).toBe(true);
            });

            it("applies default includeTabs", () => {
                const result = getRecipientsSchema.parse({
                    envelopeId: "env-123"
                });
                expect(result.includeTabs).toBe(false);
            });
        });

        describe("listEnvelopesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listEnvelopesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with all filters", () => {
                const result = listEnvelopesSchema.safeParse({
                    fromDate: "2024-01-01",
                    toDate: "2024-03-15",
                    status: "completed",
                    count: "50",
                    startPosition: "0",
                    include: "recipients"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = listEnvelopesSchema.safeParse({
                    status: "invalid_status"
                });
                expect(result.success).toBe(false);
            });

            it("applies default count", () => {
                const result = listEnvelopesSchema.parse({});
                expect(result.count).toBe("25");
            });
        });

        describe("listTemplatesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listTemplatesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with all parameters", () => {
                const result = listTemplatesSchema.safeParse({
                    count: "50",
                    startPosition: "10",
                    searchText: "employment",
                    folder: "shared_templates"
                });
                expect(result.success).toBe(true);
            });

            it("applies default count", () => {
                const result = listTemplatesSchema.parse({});
                expect(result.count).toBe("25");
            });
        });

        describe("voidEnvelopeSchema", () => {
            it("validates with required fields", () => {
                const result = voidEnvelopeSchema.safeParse({
                    envelopeId: "env-123",
                    voidedReason: "Contract cancelled"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing envelopeId", () => {
                const result = voidEnvelopeSchema.safeParse({
                    voidedReason: "Contract cancelled"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing voidedReason", () => {
                const result = voidEnvelopeSchema.safeParse({
                    envelopeId: "env-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty voidedReason", () => {
                const result = voidEnvelopeSchema.safeParse({
                    envelopeId: "env-123",
                    voidedReason: ""
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
