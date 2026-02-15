/**
 * Salesforce Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateRecord, createRecordSchema } from "../operations/createRecord";
import { executeDeleteRecord, deleteRecordSchema } from "../operations/deleteRecord";
import { executeDescribeObject, describeObjectSchema } from "../operations/describeObject";
import { executeGetRecord, getRecordSchema } from "../operations/getRecord";
import { executeListObjects, listObjectsSchema } from "../operations/listObjects";
import { executeQueryRecords, queryRecordsSchema } from "../operations/queryRecords";
import { executeSearchRecords, searchRecordsSchema } from "../operations/searchRecords";
import { executeUpdateRecord, updateRecordSchema } from "../operations/updateRecord";
import type { SalesforceClient } from "../client/SalesforceClient";

// Mock SalesforceClient factory
function createMockSalesforceClient(): jest.Mocked<SalesforceClient> {
    return {
        // Query operations
        query: jest.fn(),
        queryMore: jest.fn(),
        queryAll: jest.fn(),
        // Search operations
        search: jest.fn(),
        // CRUD operations
        createRecord: jest.fn(),
        getRecord: jest.fn(),
        updateRecord: jest.fn(),
        deleteRecord: jest.fn(),
        upsertRecord: jest.fn(),
        // Metadata operations
        describeGlobal: jest.fn(),
        describeSObject: jest.fn(),
        getSObjectInfo: jest.fn(),
        // Limits & diagnostics
        getLimits: jest.fn(),
        getVersions: jest.fn(),
        // Utility methods
        getInstanceUrl: jest.fn(),
        getApiVersion: jest.fn(),
        // Base HTTP methods
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<SalesforceClient>;
}

describe("Salesforce Operation Executors", () => {
    let mockClient: jest.Mocked<SalesforceClient>;

    beforeEach(() => {
        mockClient = createMockSalesforceClient();
    });

    // ========================================
    // CREATE RECORD TESTS
    // ========================================
    describe("executeCreateRecord", () => {
        it("calls client with correct params", async () => {
            mockClient.createRecord.mockResolvedValueOnce({
                id: "001Hn00001ABCDEFGH",
                success: true,
                errors: []
            });

            await executeCreateRecord(mockClient, {
                objectType: "Account",
                data: {
                    Name: "Acme Corporation",
                    Industry: "Technology"
                }
            });

            expect(mockClient.createRecord).toHaveBeenCalledWith("Account", {
                Name: "Acme Corporation",
                Industry: "Technology"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createRecord.mockResolvedValueOnce({
                id: "001Hn00001ABCDEFGH",
                success: true,
                errors: []
            });

            const result = await executeCreateRecord(mockClient, {
                objectType: "Account",
                data: {
                    Name: "Acme Corporation"
                }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "001Hn00001ABCDEFGH",
                success: true
            });
        });

        it("returns validation error when Salesforce returns errors", async () => {
            mockClient.createRecord.mockResolvedValueOnce({
                id: "",
                success: false,
                errors: [
                    {
                        message: "Required fields are missing: [Name]",
                        errorCode: "REQUIRED_FIELD_MISSING",
                        fields: ["Name"]
                    }
                ]
            });

            const result = await executeCreateRecord(mockClient, {
                objectType: "Account",
                data: {
                    Industry: "Technology"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("Required fields are missing");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.createRecord.mockRejectedValueOnce(new Error("API connection failed"));

            const result = await executeCreateRecord(mockClient, {
                objectType: "Account",
                data: {
                    Name: "Test Account"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("API connection failed");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createRecord.mockRejectedValueOnce("string error");

            const result = await executeCreateRecord(mockClient, {
                objectType: "Account",
                data: {
                    Name: "Test"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create record");
        });
    });

    // ========================================
    // DELETE RECORD TESTS
    // ========================================
    describe("executeDeleteRecord", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteRecord.mockResolvedValueOnce(undefined);

            await executeDeleteRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001DELETEABC"
            });

            expect(mockClient.deleteRecord).toHaveBeenCalledWith("Account", "001Hn00001DELETEABC");
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteRecord.mockResolvedValueOnce(undefined);

            const result = await executeDeleteRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001DELETEABC"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "001Hn00001DELETEABC",
                deleted: true
            });
        });

        it("returns not_found error when record does not exist", async () => {
            mockClient.deleteRecord.mockRejectedValueOnce(new Error("Record not found."));

            const result = await executeDeleteRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001NOTFOUND0"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toContain("001Hn00001NOTFOUND0 not found in Account");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns permission error when user lacks access", async () => {
            mockClient.deleteRecord.mockRejectedValueOnce(
                new Error("INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY")
            );

            const result = await executeDeleteRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001NOACCESS0"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("permission");
            expect(result.error?.message).toContain("INSUFFICIENT_ACCESS");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.deleteRecord.mockRejectedValueOnce(new Error("Network error"));

            const result = await executeDeleteRecord(mockClient, {
                objectType: "Contact",
                recordId: "003Hn00001TESTTEST"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ========================================
    // DESCRIBE OBJECT TESTS
    // ========================================
    describe("executeDescribeObject", () => {
        const mockDescribeResult = {
            name: "Account",
            label: "Account",
            labelPlural: "Accounts",
            keyPrefix: "001",
            queryable: true,
            createable: true,
            updateable: true,
            deletable: true,
            searchable: true,
            fields: [
                {
                    name: "Id",
                    label: "Account ID",
                    type: "id",
                    length: 18,
                    nillable: false,
                    createable: false,
                    updateable: false,
                    externalId: false,
                    idLookup: true,
                    unique: true
                },
                {
                    name: "Name",
                    label: "Account Name",
                    type: "string",
                    length: 255,
                    nillable: false,
                    createable: true,
                    updateable: true,
                    externalId: false,
                    idLookup: false,
                    unique: false
                }
            ],
            childRelationships: [
                {
                    childSObject: "Contact",
                    field: "AccountId",
                    relationshipName: "Contacts",
                    cascadeDelete: false
                }
            ],
            recordTypeInfos: [
                {
                    recordTypeId: "012000000000000AAA",
                    name: "Master",
                    developerName: "Master",
                    available: true,
                    defaultRecordTypeMapping: true,
                    master: true
                }
            ]
        };

        it("calls client with correct params", async () => {
            mockClient.describeSObject.mockResolvedValueOnce(mockDescribeResult);

            await executeDescribeObject(mockClient, {
                objectType: "Account"
            });

            expect(mockClient.describeSObject).toHaveBeenCalledWith("Account");
        });

        it("returns normalized output on success", async () => {
            mockClient.describeSObject.mockResolvedValueOnce(mockDescribeResult);

            const result = await executeDescribeObject(mockClient, {
                objectType: "Account"
            });

            expect(result.success).toBe(true);
            expect(result.data?.name).toBe("Account");
            expect(result.data?.label).toBe("Account");
            expect(result.data?.labelPlural).toBe("Accounts");
            expect(result.data?.queryable).toBe(true);
            expect(result.data?.fields).toHaveLength(2);
            expect(result.data?.childRelationships).toHaveLength(1);
        });

        it("returns not_found error for invalid object type", async () => {
            mockClient.describeSObject.mockRejectedValueOnce(
                new Error("INVALID_TYPE: The specified object type does not exist")
            );

            const result = await executeDescribeObject(mockClient, {
                objectType: "InvalidObject__c"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toContain("InvalidObject__c");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.describeSObject.mockRejectedValueOnce(new Error("Server unavailable"));

            const result = await executeDescribeObject(mockClient, {
                objectType: "Account"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Server unavailable");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================
    // GET RECORD TESTS
    // ========================================
    describe("executeGetRecord", () => {
        const mockAccountRecord = {
            attributes: {
                type: "Account",
                url: "/services/data/v65.0/sobjects/Account/001Hn00001ACMEACCT"
            },
            Id: "001Hn00001ACMEACCT",
            Name: "Acme Corporation",
            Industry: "Technology"
        };

        it("calls client with correct params (no fields)", async () => {
            mockClient.getRecord.mockResolvedValueOnce(mockAccountRecord);

            await executeGetRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001ACMEACCT"
            });

            expect(mockClient.getRecord).toHaveBeenCalledWith(
                "Account",
                "001Hn00001ACMEACCT",
                undefined
            );
        });

        it("calls client with specific fields", async () => {
            mockClient.getRecord.mockResolvedValueOnce(mockAccountRecord);

            await executeGetRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001ACMEACCT",
                fields: ["Id", "Name", "Industry"]
            });

            expect(mockClient.getRecord).toHaveBeenCalledWith("Account", "001Hn00001ACMEACCT", [
                "Id",
                "Name",
                "Industry"
            ]);
        });

        it("returns normalized output on success", async () => {
            mockClient.getRecord.mockResolvedValueOnce(mockAccountRecord);

            const result = await executeGetRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001ACMEACCT"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockAccountRecord);
        });

        it("returns not_found error when record does not exist", async () => {
            mockClient.getRecord.mockRejectedValueOnce(new Error("Record not found."));

            const result = await executeGetRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001NOTFOUND0"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toContain("001Hn00001NOTFOUND0 not found in Account");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.getRecord.mockRejectedValueOnce(new Error("Connection timeout"));

            const result = await executeGetRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001ACMEACCT"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Connection timeout");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getRecord.mockRejectedValueOnce("string error");

            const result = await executeGetRecord(mockClient, {
                objectType: "Contact",
                recordId: "003Hn00001TESTTEST"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get record");
        });
    });

    // ========================================
    // LIST OBJECTS TESTS
    // ========================================
    describe("executeListObjects", () => {
        const mockGlobalDescribe = {
            encoding: "UTF-8",
            maxBatchSize: 200,
            sobjects: [
                {
                    name: "Account",
                    label: "Account",
                    labelPlural: "Accounts",
                    keyPrefix: "001",
                    queryable: true,
                    createable: true,
                    updateable: true,
                    deletable: true,
                    searchable: true,
                    custom: false,
                    urls: {
                        sobject: "/services/data/v65.0/sobjects/Account",
                        describe: "/services/data/v65.0/sobjects/Account/describe",
                        rowTemplate: "/services/data/v65.0/sobjects/Account/{ID}"
                    }
                },
                {
                    name: "Contact",
                    label: "Contact",
                    labelPlural: "Contacts",
                    keyPrefix: "003",
                    queryable: true,
                    createable: true,
                    updateable: true,
                    deletable: true,
                    searchable: true,
                    custom: false,
                    urls: {
                        sobject: "/services/data/v65.0/sobjects/Contact",
                        describe: "/services/data/v65.0/sobjects/Contact/describe",
                        rowTemplate: "/services/data/v65.0/sobjects/Contact/{ID}"
                    }
                },
                {
                    name: "Project__c",
                    label: "Project",
                    labelPlural: "Projects",
                    keyPrefix: "a01",
                    queryable: true,
                    createable: true,
                    updateable: true,
                    deletable: true,
                    searchable: true,
                    custom: true,
                    urls: {
                        sobject: "/services/data/v65.0/sobjects/Project__c",
                        describe: "/services/data/v65.0/sobjects/Project__c/describe",
                        rowTemplate: "/services/data/v65.0/sobjects/Project__c/{ID}"
                    }
                },
                {
                    name: "ReadOnlyObject",
                    label: "Read Only",
                    labelPlural: "Read Only Objects",
                    keyPrefix: "ro1",
                    queryable: true,
                    createable: false,
                    updateable: false,
                    deletable: false,
                    searchable: false,
                    custom: false,
                    urls: {
                        sobject: "/services/data/v65.0/sobjects/ReadOnlyObject",
                        describe: "/services/data/v65.0/sobjects/ReadOnlyObject/describe",
                        rowTemplate: "/services/data/v65.0/sobjects/ReadOnlyObject/{ID}"
                    }
                }
            ]
        };

        it("calls client describeGlobal", async () => {
            mockClient.describeGlobal.mockResolvedValueOnce(mockGlobalDescribe);

            await executeListObjects(mockClient, {});

            expect(mockClient.describeGlobal).toHaveBeenCalled();
        });

        it("returns normalized output with all objects", async () => {
            mockClient.describeGlobal.mockResolvedValueOnce(mockGlobalDescribe);

            const result = await executeListObjects(mockClient, {
                includeCustom: true
            });

            expect(result.success).toBe(true);
            expect(result.data?.totalCount).toBe(4);
            expect(result.data?.objects).toHaveLength(4);
            expect(result.data?.objects[0]).toEqual({
                name: "Account",
                label: "Account",
                labelPlural: "Accounts",
                keyPrefix: "001",
                queryable: true,
                createable: true,
                updateable: true,
                deletable: true,
                searchable: true,
                custom: false
            });
        });

        it("filters out custom objects when includeCustom is false", async () => {
            mockClient.describeGlobal.mockResolvedValueOnce(mockGlobalDescribe);

            const result = await executeListObjects(mockClient, {
                includeCustom: false
            });

            expect(result.success).toBe(true);
            expect(result.data?.totalCount).toBe(3);
            expect(
                result.data?.objects.some((obj: { name: string }) => obj.name === "Project__c")
            ).toBe(false);
        });

        it("filters to only queryable objects", async () => {
            mockClient.describeGlobal.mockResolvedValueOnce(mockGlobalDescribe);

            const result = await executeListObjects(mockClient, {
                onlyQueryable: true
            });

            expect(result.success).toBe(true);
            // All objects in our mock are queryable
            expect(result.data?.objects.every((obj: { queryable: boolean }) => obj.queryable)).toBe(
                true
            );
        });

        it("filters to only createable objects", async () => {
            mockClient.describeGlobal.mockResolvedValueOnce(mockGlobalDescribe);

            const result = await executeListObjects(mockClient, {
                includeCustom: false, // Exclude custom objects to test createable filter
                onlyCreateable: true
            });

            expect(result.success).toBe(true);
            // ReadOnlyObject should be filtered out (not createable)
            // Project__c filtered out (custom)
            // Remaining: Account, Contact (both standard and createable)
            expect(result.data?.totalCount).toBe(2);
            expect(
                result.data?.objects.every((obj: { createable: boolean }) => obj.createable)
            ).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.describeGlobal.mockRejectedValueOnce(new Error("API limit exceeded"));

            const result = await executeListObjects(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("API limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.describeGlobal.mockRejectedValueOnce("string error");

            const result = await executeListObjects(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list objects");
        });
    });

    // ========================================
    // QUERY RECORDS TESTS
    // ========================================
    describe("executeQueryRecords", () => {
        const mockQueryResult = {
            totalSize: 3,
            done: true,
            records: [
                {
                    attributes: {
                        type: "Account",
                        url: "/services/data/v65.0/sobjects/Account/001"
                    },
                    Id: "001",
                    Name: "Acme Corp"
                },
                {
                    attributes: {
                        type: "Account",
                        url: "/services/data/v65.0/sobjects/Account/002"
                    },
                    Id: "002",
                    Name: "Tech Inc"
                },
                {
                    attributes: {
                        type: "Account",
                        url: "/services/data/v65.0/sobjects/Account/003"
                    },
                    Id: "003",
                    Name: "Cloud Co"
                }
            ]
        };

        it("calls client with full SOQL query", async () => {
            mockClient.query.mockResolvedValueOnce(mockQueryResult);

            await executeQueryRecords(mockClient, {
                query: "SELECT Id, Name FROM Account WHERE Industry = 'Technology'"
            });

            expect(mockClient.query).toHaveBeenCalledWith(
                "SELECT Id, Name FROM Account WHERE Industry = 'Technology'"
            );
        });

        it("builds SOQL from structured params", async () => {
            mockClient.query.mockResolvedValueOnce(mockQueryResult);

            await executeQueryRecords(mockClient, {
                objectType: "Account",
                fields: ["Id", "Name", "Industry"],
                where: "Industry = 'Technology'",
                orderBy: "Name ASC",
                limit: 10
            });

            expect(mockClient.query).toHaveBeenCalledWith(
                "SELECT Id, Name, Industry FROM Account WHERE Industry = 'Technology' ORDER BY Name ASC LIMIT 10"
            );
        });

        it("uses default fields when not specified", async () => {
            mockClient.query.mockResolvedValueOnce(mockQueryResult);

            await executeQueryRecords(mockClient, {
                objectType: "Account"
            });

            expect(mockClient.query).toHaveBeenCalledWith("SELECT Id, Name FROM Account");
        });

        it("returns normalized output on success", async () => {
            mockClient.query.mockResolvedValueOnce(mockQueryResult);

            const result = await executeQueryRecords(mockClient, {
                query: "SELECT Id, Name FROM Account"
            });

            expect(result.success).toBe(true);
            expect(result.data?.totalSize).toBe(3);
            expect(result.data?.done).toBe(true);
            expect(result.data?.records).toHaveLength(3);
        });

        it("returns nextRecordsUrl for pagination", async () => {
            const paginatedResult = {
                ...mockQueryResult,
                done: false,
                nextRecordsUrl: "/services/data/v65.0/query/01gxx0000004GXxAAM-2000"
            };
            mockClient.query.mockResolvedValueOnce(paginatedResult);

            const result = await executeQueryRecords(mockClient, {
                objectType: "Account",
                limit: 2000
            });

            expect(result.success).toBe(true);
            expect(result.data?.done).toBe(false);
            expect(result.data?.nextRecordsUrl).toBe(
                "/services/data/v65.0/query/01gxx0000004GXxAAM-2000"
            );
        });

        it("uses queryAll when fetchAll is true", async () => {
            const allRecords = mockQueryResult.records;
            mockClient.queryAll.mockResolvedValueOnce(allRecords);

            const result = await executeQueryRecords(mockClient, {
                objectType: "Account",
                fetchAll: true
            });

            expect(mockClient.queryAll).toHaveBeenCalledWith("SELECT Id, Name FROM Account");
            expect(result.success).toBe(true);
            expect(result.data?.totalSize).toBe(3);
            expect(result.data?.done).toBe(true);
        });

        it("throws error when neither query nor objectType provided", async () => {
            const result = await executeQueryRecords(mockClient, {
                fields: ["Id", "Name"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain(
                "Either 'query' or 'objectType' must be provided"
            );
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(
                new Error("MALFORMED_QUERY: unexpected token: FROM")
            );

            const result = await executeQueryRecords(mockClient, {
                query: "SELECT FROM Account"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("MALFORMED_QUERY");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================
    // SEARCH RECORDS TESTS
    // ========================================
    describe("executeSearchRecords", () => {
        const mockSearchResult = {
            searchRecords: [
                {
                    Id: "001Hn00001ACMEACCT",
                    attributes: {
                        type: "Account",
                        url: "/services/data/v65.0/sobjects/Account/001Hn00001ACMEACCT"
                    },
                    Name: "Acme Corporation"
                },
                {
                    Id: "003Hn00001CONTACT1",
                    attributes: {
                        type: "Contact",
                        url: "/services/data/v65.0/sobjects/Contact/003Hn00001CONTACT1"
                    },
                    FirstName: "John",
                    LastName: "Acme"
                }
            ]
        };

        it("calls client with full SOSL query", async () => {
            mockClient.search.mockResolvedValueOnce(mockSearchResult);

            await executeSearchRecords(mockClient, {
                searchQuery: "FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name)"
            });

            expect(mockClient.search).toHaveBeenCalledWith(
                "FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name)"
            );
        });

        it("builds SOSL from searchTerm and objectTypes", async () => {
            mockClient.search.mockResolvedValueOnce(mockSearchResult);

            await executeSearchRecords(mockClient, {
                searchTerm: "Acme",
                objectTypes: ["Account", "Contact"]
            });

            expect(mockClient.search).toHaveBeenCalledWith(
                "FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name)"
            );
        });

        it("uses returningFields when specified", async () => {
            mockClient.search.mockResolvedValueOnce(mockSearchResult);

            await executeSearchRecords(mockClient, {
                searchTerm: "enterprise",
                objectTypes: ["Account"],
                returningFields: {
                    Account: ["Id", "Name", "Industry", "Website"]
                }
            });

            expect(mockClient.search).toHaveBeenCalledWith(
                "FIND {enterprise} IN ALL FIELDS RETURNING Account(Id, Name, Industry, Website)"
            );
        });

        it("returns normalized output with grouped results", async () => {
            mockClient.search.mockResolvedValueOnce(mockSearchResult);

            const result = await executeSearchRecords(mockClient, {
                searchTerm: "Acme",
                objectTypes: ["Account", "Contact"]
            });

            expect(result.success).toBe(true);
            expect(result.data?.totalCount).toBe(2);
            expect(result.data?.records).toHaveLength(2);
            expect(result.data?.groupedByType).toBeDefined();
            expect(result.data?.groupedByType.Account).toHaveLength(1);
            expect(result.data?.groupedByType.Contact).toHaveLength(1);
        });

        it("escapes special characters in search term", async () => {
            mockClient.search.mockResolvedValueOnce({ searchRecords: [] });

            await executeSearchRecords(mockClient, {
                searchTerm: 'O\'Brien "Test"',
                objectTypes: ["Contact"]
            });

            expect(mockClient.search).toHaveBeenCalledWith(
                'FIND {O\\\'Brien \\"Test\\"} IN ALL FIELDS RETURNING Contact(Id, Name)'
            );
        });

        it("throws error when neither searchQuery nor searchTerm provided", async () => {
            const result = await executeSearchRecords(mockClient, {
                objectTypes: ["Account"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain(
                "Either 'searchQuery' or 'searchTerm' must be provided"
            );
        });

        it("returns validation error for malformed search", async () => {
            mockClient.search.mockRejectedValueOnce(new Error("MALFORMED_SEARCH: Invalid syntax"));

            const result = await executeSearchRecords(mockClient, {
                searchQuery: "FIND IN ALL FIELDS"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("Invalid search query");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.search.mockRejectedValueOnce(new Error("Server error"));

            const result = await executeSearchRecords(mockClient, {
                searchTerm: "test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Server error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================
    // UPDATE RECORD TESTS
    // ========================================
    describe("executeUpdateRecord", () => {
        it("calls client with correct params", async () => {
            mockClient.updateRecord.mockResolvedValueOnce(undefined);

            await executeUpdateRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001ACMEACCT",
                data: {
                    Name: "Updated Acme Corp",
                    Industry: "Manufacturing"
                }
            });

            expect(mockClient.updateRecord).toHaveBeenCalledWith("Account", "001Hn00001ACMEACCT", {
                Name: "Updated Acme Corp",
                Industry: "Manufacturing"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.updateRecord.mockResolvedValueOnce(undefined);

            const result = await executeUpdateRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001ACMEACCT",
                data: {
                    AnnualRevenue: 75000000
                }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "001Hn00001ACMEACCT",
                updated: true
            });
        });

        it("returns not_found error when record does not exist", async () => {
            mockClient.updateRecord.mockRejectedValueOnce(new Error("Record not found."));

            const result = await executeUpdateRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001NOTFOUND0",
                data: {
                    Name: "Test"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toContain("001Hn00001NOTFOUND0 not found in Account");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns validation error for invalid field", async () => {
            mockClient.updateRecord.mockRejectedValueOnce(
                new Error("INVALID_FIELD: No such column 'InvalidField__c' on entity 'Account'")
            );

            const result = await executeUpdateRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001ACMEACCT",
                data: {
                    InvalidField__c: "value"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("INVALID_FIELD");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns validation error for required field missing", async () => {
            mockClient.updateRecord.mockRejectedValueOnce(
                new Error("REQUIRED_FIELD_MISSING: Required fields are missing: [Name]")
            );

            const result = await executeUpdateRecord(mockClient, {
                objectType: "Account",
                recordId: "001Hn00001ACMEACCT",
                data: {
                    Name: null
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("REQUIRED_FIELD_MISSING");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.updateRecord.mockRejectedValueOnce(new Error("Network timeout"));

            const result = await executeUpdateRecord(mockClient, {
                objectType: "Contact",
                recordId: "003Hn00001TESTTEST",
                data: {
                    Email: "test@example.com"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network timeout");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================
    // SCHEMA VALIDATION TESTS
    // ========================================
    describe("schema validation", () => {
        describe("createRecordSchema", () => {
            it("validates minimal input", () => {
                const result = createRecordSchema.safeParse({
                    objectType: "Account",
                    data: { Name: "Test" }
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createRecordSchema.safeParse({
                    objectType: "Account",
                    data: {
                        Name: "Acme Corporation",
                        Industry: "Technology",
                        Website: "https://www.acme.com"
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing objectType", () => {
                const result = createRecordSchema.safeParse({
                    data: { Name: "Test" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing data", () => {
                const result = createRecordSchema.safeParse({
                    objectType: "Account"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty objectType", () => {
                const result = createRecordSchema.safeParse({
                    objectType: "",
                    data: { Name: "Test" }
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteRecordSchema", () => {
            it("validates with valid 18-char ID", () => {
                const result = deleteRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001Hn00001ABCDEFGH"
                });
                expect(result.success).toBe(true);
            });

            it("validates with valid 15-char ID", () => {
                const result = deleteRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001Hn00001ABCDE"
                });
                expect(result.success).toBe(true);
            });

            it("rejects ID too short", () => {
                const result = deleteRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001"
                });
                expect(result.success).toBe(false);
            });

            it("rejects ID too long", () => {
                const result = deleteRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001Hn00001ABCDEFGHIJ"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("describeObjectSchema", () => {
            it("validates minimal input", () => {
                const result = describeObjectSchema.safeParse({
                    objectType: "Account"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing objectType", () => {
                const result = describeObjectSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty objectType", () => {
                const result = describeObjectSchema.safeParse({
                    objectType: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getRecordSchema", () => {
            it("validates minimal input", () => {
                const result = getRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001Hn00001ABCDEFGH"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = getRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001Hn00001ABCDEFGH",
                    fields: ["Id", "Name", "Industry"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing objectType", () => {
                const result = getRecordSchema.safeParse({
                    recordId: "001Hn00001ABCDEFGH"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing recordId", () => {
                const result = getRecordSchema.safeParse({
                    objectType: "Account"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listObjectsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listObjectsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with all options", () => {
                const result = listObjectsSchema.safeParse({
                    includeCustom: true,
                    onlyQueryable: true,
                    onlyCreateable: false
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listObjectsSchema.parse({});
                expect(result.includeCustom).toBe(true);
                expect(result.onlyQueryable).toBe(false);
                expect(result.onlyCreateable).toBe(false);
            });
        });

        describe("queryRecordsSchema", () => {
            it("validates with full query", () => {
                const result = queryRecordsSchema.safeParse({
                    query: "SELECT Id, Name FROM Account"
                });
                expect(result.success).toBe(true);
            });

            it("validates with objectType", () => {
                const result = queryRecordsSchema.safeParse({
                    objectType: "Account"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all structured params", () => {
                const result = queryRecordsSchema.safeParse({
                    objectType: "Account",
                    fields: ["Id", "Name", "Industry"],
                    where: "Industry = 'Technology'",
                    orderBy: "Name ASC",
                    limit: 100,
                    fetchAll: false
                });
                expect(result.success).toBe(true);
            });

            it("rejects limit above 2000", () => {
                const result = queryRecordsSchema.safeParse({
                    objectType: "Account",
                    limit: 3000
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative limit", () => {
                const result = queryRecordsSchema.safeParse({
                    objectType: "Account",
                    limit: -1
                });
                expect(result.success).toBe(false);
            });

            it("applies default fields", () => {
                const result = queryRecordsSchema.parse({
                    objectType: "Account"
                });
                expect(result.fields).toEqual(["Id", "Name"]);
            });
        });

        describe("searchRecordsSchema", () => {
            it("validates with full searchQuery", () => {
                const result = searchRecordsSchema.safeParse({
                    searchQuery: "FIND {Acme} IN ALL FIELDS"
                });
                expect(result.success).toBe(true);
            });

            it("validates with searchTerm", () => {
                const result = searchRecordsSchema.safeParse({
                    searchTerm: "Acme"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = searchRecordsSchema.safeParse({
                    searchTerm: "enterprise",
                    objectTypes: ["Account", "Contact"],
                    returningFields: {
                        Account: ["Id", "Name"],
                        Contact: ["Id", "FirstName", "LastName"]
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates empty input (all optional)", () => {
                // Note: validation passes but execution will fail without query or term
                const result = searchRecordsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("updateRecordSchema", () => {
            it("validates minimal input", () => {
                const result = updateRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001Hn00001ABCDEFGH",
                    data: { Name: "Updated Name" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with multiple fields", () => {
                const result = updateRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001Hn00001ABCDEFGH",
                    data: {
                        Name: "Updated Name",
                        Industry: "Technology",
                        AnnualRevenue: 1000000
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing objectType", () => {
                const result = updateRecordSchema.safeParse({
                    recordId: "001Hn00001ABCDEFGH",
                    data: { Name: "Test" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing recordId", () => {
                const result = updateRecordSchema.safeParse({
                    objectType: "Account",
                    data: { Name: "Test" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing data", () => {
                const result = updateRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001Hn00001ABCDEFGH"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid recordId length", () => {
                const result = updateRecordSchema.safeParse({
                    objectType: "Account",
                    recordId: "001",
                    data: { Name: "Test" }
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
