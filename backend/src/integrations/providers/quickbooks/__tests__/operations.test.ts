/**
 * QuickBooks Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateCustomer, createCustomerSchema } from "../operations/createCustomer";
import { executeCreateInvoice, createInvoiceSchema } from "../operations/createInvoice";
import { executeGetCompanyInfo, getCompanyInfoSchema } from "../operations/getCompanyInfo";
import { executeGetCustomer, getCustomerSchema } from "../operations/getCustomer";
import { executeGetInvoice, getInvoiceSchema } from "../operations/getInvoice";
import { executeListCustomers, listCustomersSchema } from "../operations/listCustomers";
import { executeListInvoices, listInvoicesSchema } from "../operations/listInvoices";
import type { QuickBooksClient } from "../client/QuickBooksClient";

// Mock QuickBooksClient factory
function createMockQuickBooksClient(): jest.Mocked<QuickBooksClient> {
    return {
        listCustomers: jest.fn(),
        getCustomer: jest.fn(),
        createCustomer: jest.fn(),
        listInvoices: jest.fn(),
        getInvoice: jest.fn(),
        createInvoice: jest.fn(),
        getCompanyInfo: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<QuickBooksClient>;
}

describe("QuickBooks Operation Executors", () => {
    let mockClient: jest.Mocked<QuickBooksClient>;

    beforeEach(() => {
        mockClient = createMockQuickBooksClient();
    });

    describe("executeCreateCustomer", () => {
        it("calls client with correct params", async () => {
            mockClient.createCustomer.mockResolvedValueOnce({
                Customer: {
                    Id: "146",
                    DisplayName: "Johnson & Associates LLC",
                    GivenName: "Robert",
                    FamilyName: "Johnson",
                    CompanyName: "Johnson & Associates LLC",
                    PrimaryEmailAddr: { Address: "robert.johnson@johnsonllc.com" },
                    PrimaryPhone: { FreeFormNumber: "(415) 555-0123" },
                    Balance: 0,
                    Active: true,
                    MetaData: {
                        CreateTime: "2024-01-15T10:15:00-08:00",
                        LastUpdatedTime: "2024-01-15T10:15:00-08:00"
                    }
                }
            });

            await executeCreateCustomer(mockClient, {
                displayName: "Johnson & Associates LLC",
                givenName: "Robert",
                familyName: "Johnson",
                email: "robert.johnson@johnsonllc.com",
                phone: "(415) 555-0123",
                companyName: "Johnson & Associates LLC"
            });

            expect(mockClient.createCustomer).toHaveBeenCalledWith({
                DisplayName: "Johnson & Associates LLC",
                GivenName: "Robert",
                FamilyName: "Johnson",
                CompanyName: "Johnson & Associates LLC",
                PrimaryEmailAddr: { Address: "robert.johnson@johnsonllc.com" },
                PrimaryPhone: { FreeFormNumber: "(415) 555-0123" }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createCustomer.mockResolvedValueOnce({
                Customer: {
                    Id: "146",
                    DisplayName: "Johnson & Associates LLC",
                    GivenName: "Robert",
                    FamilyName: "Johnson",
                    CompanyName: "Johnson & Associates LLC",
                    PrimaryEmailAddr: { Address: "robert.johnson@johnsonllc.com" },
                    PrimaryPhone: { FreeFormNumber: "(415) 555-0123" },
                    Balance: 0,
                    Active: true,
                    MetaData: {
                        CreateTime: "2024-01-15T10:15:00-08:00",
                        LastUpdatedTime: "2024-01-15T10:15:00-08:00"
                    }
                }
            });

            const result = await executeCreateCustomer(mockClient, {
                displayName: "Johnson & Associates LLC",
                givenName: "Robert",
                familyName: "Johnson",
                email: "robert.johnson@johnsonllc.com",
                phone: "(415) 555-0123",
                companyName: "Johnson & Associates LLC"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "146",
                displayName: "Johnson & Associates LLC",
                givenName: "Robert",
                familyName: "Johnson",
                companyName: "Johnson & Associates LLC",
                email: "robert.johnson@johnsonllc.com",
                phone: "(415) 555-0123",
                balance: 0,
                active: true,
                createdAt: "2024-01-15T10:15:00-08:00",
                updatedAt: "2024-01-15T10:15:00-08:00"
            });
        });

        it("creates customer with minimal params", async () => {
            mockClient.createCustomer.mockResolvedValueOnce({
                Customer: {
                    Id: "150",
                    DisplayName: "Test Customer",
                    Balance: 0,
                    Active: true,
                    MetaData: {
                        CreateTime: "2024-01-15T10:15:00-08:00",
                        LastUpdatedTime: "2024-01-15T10:15:00-08:00"
                    }
                }
            });

            await executeCreateCustomer(mockClient, {
                displayName: "Test Customer"
            });

            expect(mockClient.createCustomer).toHaveBeenCalledWith({
                DisplayName: "Test Customer"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createCustomer.mockRejectedValueOnce(
                new Error("A customer with this display name already exists")
            );

            const result = await executeCreateCustomer(mockClient, {
                displayName: "Duplicate Customer"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("A customer with this display name already exists");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createCustomer.mockRejectedValueOnce("string error");

            const result = await executeCreateCustomer(mockClient, {
                displayName: "Test Customer"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create customer");
        });
    });

    describe("executeCreateInvoice", () => {
        it("calls client with correct params", async () => {
            mockClient.createInvoice.mockResolvedValueOnce({
                Invoice: {
                    Id: "1099",
                    DocNumber: "INV-2024-001",
                    TxnDate: "2024-01-15",
                    DueDate: "2024-02-15",
                    CustomerRef: { value: "146", name: "Johnson & Associates LLC" },
                    Line: [
                        {
                            Id: "1",
                            LineNum: 1,
                            Description: "Consulting Services",
                            Amount: 2500.0,
                            DetailType: "SalesItemLineDetail",
                            SalesItemLineDetail: { Qty: 1, UnitPrice: 2500.0 }
                        }
                    ],
                    TotalAmt: 2500.0,
                    Balance: 2500.0,
                    EmailStatus: "NotSet",
                    MetaData: {
                        CreateTime: "2024-01-15T15:30:00-08:00",
                        LastUpdatedTime: "2024-01-15T15:30:00-08:00"
                    }
                }
            });

            await executeCreateInvoice(mockClient, {
                customerId: "146",
                lineItems: [{ amount: 2500.0, description: "Consulting Services" }],
                dueDate: "2024-02-15",
                docNumber: "INV-2024-001"
            });

            expect(mockClient.createInvoice).toHaveBeenCalledWith({
                CustomerRef: { value: "146" },
                Line: [
                    {
                        Amount: 2500.0,
                        DetailType: "SalesItemLineDetail",
                        Description: "Consulting Services",
                        SalesItemLineDetail: { Qty: 1, UnitPrice: 2500.0 }
                    }
                ],
                DueDate: "2024-02-15",
                DocNumber: "INV-2024-001"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createInvoice.mockResolvedValueOnce({
                Invoice: {
                    Id: "1099",
                    DocNumber: "INV-2024-001",
                    TxnDate: "2024-01-15",
                    DueDate: "2024-02-15",
                    CustomerRef: { value: "146", name: "Johnson & Associates LLC" },
                    Line: [
                        {
                            Id: "1",
                            LineNum: 1,
                            Description: "Consulting Services",
                            Amount: 2500.0,
                            DetailType: "SalesItemLineDetail",
                            SalesItemLineDetail: { Qty: 1, UnitPrice: 2500.0 }
                        },
                        {
                            Id: "2",
                            LineNum: 2,
                            Description: "Software License Fee",
                            Amount: 750.0,
                            DetailType: "SalesItemLineDetail",
                            SalesItemLineDetail: { Qty: 1, UnitPrice: 750.0 }
                        }
                    ],
                    TotalAmt: 3250.0,
                    Balance: 3250.0,
                    BillEmail: { Address: "robert@test.com" },
                    EmailStatus: "NotSet",
                    MetaData: {
                        CreateTime: "2024-01-15T15:30:00-08:00",
                        LastUpdatedTime: "2024-01-15T15:30:00-08:00"
                    }
                }
            });

            const result = await executeCreateInvoice(mockClient, {
                customerId: "146",
                lineItems: [
                    { amount: 2500.0, description: "Consulting Services" },
                    { amount: 750.0, description: "Software License Fee" }
                ],
                customerEmail: "robert@test.com"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "1099",
                docNumber: "INV-2024-001",
                txnDate: "2024-01-15",
                dueDate: "2024-02-15",
                customer: {
                    id: "146",
                    name: "Johnson & Associates LLC"
                },
                lineItems: [
                    {
                        id: "1",
                        lineNum: 1,
                        description: "Consulting Services",
                        amount: 2500.0,
                        quantity: 1,
                        unitPrice: 2500.0
                    },
                    {
                        id: "2",
                        lineNum: 2,
                        description: "Software License Fee",
                        amount: 750.0,
                        quantity: 1,
                        unitPrice: 750.0
                    }
                ],
                totalAmount: 3250.0,
                balance: 3250.0,
                billEmail: "robert@test.com",
                emailStatus: "NotSet",
                createdAt: "2024-01-15T15:30:00-08:00",
                updatedAt: "2024-01-15T15:30:00-08:00"
            });
        });

        it("filters out SubTotalLineDetail lines", async () => {
            mockClient.createInvoice.mockResolvedValueOnce({
                Invoice: {
                    Id: "1099",
                    CustomerRef: { value: "146" },
                    Line: [
                        {
                            Id: "1",
                            LineNum: 1,
                            Description: "Service",
                            Amount: 100.0,
                            DetailType: "SalesItemLineDetail",
                            SalesItemLineDetail: { Qty: 1, UnitPrice: 100.0 }
                        },
                        {
                            Amount: 100.0,
                            DetailType: "SubTotalLineDetail"
                        }
                    ],
                    TotalAmt: 100.0
                }
            });

            const result = await executeCreateInvoice(mockClient, {
                customerId: "146",
                lineItems: [{ amount: 100.0, description: "Service" }]
            });

            expect(result.success).toBe(true);
            expect(result.data?.lineItems).toHaveLength(1);
        });

        it("returns error on client failure", async () => {
            mockClient.createInvoice.mockRejectedValueOnce(new Error("Customer not found"));

            const result = await executeCreateInvoice(mockClient, {
                customerId: "99999",
                lineItems: [{ amount: 100.0, description: "Test" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Customer not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createInvoice.mockRejectedValueOnce("string error");

            const result = await executeCreateInvoice(mockClient, {
                customerId: "146",
                lineItems: [{ amount: 100.0, description: "Test" }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create invoice");
        });
    });

    describe("executeGetCompanyInfo", () => {
        it("calls client correctly", async () => {
            mockClient.getCompanyInfo.mockResolvedValueOnce({
                CompanyInfo: {
                    Id: "1",
                    CompanyName: "TechStart Solutions Inc",
                    LegalName: "TechStart Solutions Incorporated",
                    CompanyAddr: {
                        Line1: "123 Innovation Drive",
                        City: "San Francisco",
                        CountrySubDivisionCode: "CA",
                        PostalCode: "94105",
                        Country: "US"
                    },
                    PrimaryPhone: { FreeFormNumber: "(415) 555-1234" },
                    Email: { Address: "accounting@techstartsolutions.com" },
                    WebAddr: { URI: "https://www.techstartsolutions.com" },
                    FiscalYearStartMonth: "January",
                    Country: "US"
                }
            });

            await executeGetCompanyInfo(mockClient, {});

            expect(mockClient.getCompanyInfo).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            mockClient.getCompanyInfo.mockResolvedValueOnce({
                CompanyInfo: {
                    Id: "1",
                    CompanyName: "TechStart Solutions Inc",
                    LegalName: "TechStart Solutions Incorporated",
                    CompanyAddr: {
                        Line1: "123 Innovation Drive",
                        City: "San Francisco",
                        CountrySubDivisionCode: "CA",
                        PostalCode: "94105",
                        Country: "US"
                    },
                    PrimaryPhone: { FreeFormNumber: "(415) 555-1234" },
                    Email: { Address: "accounting@techstartsolutions.com" },
                    WebAddr: { URI: "https://www.techstartsolutions.com" },
                    FiscalYearStartMonth: "January",
                    Country: "US"
                }
            });

            const result = await executeGetCompanyInfo(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "1",
                companyName: "TechStart Solutions Inc",
                legalName: "TechStart Solutions Incorporated",
                address: {
                    line1: "123 Innovation Drive",
                    city: "San Francisco",
                    state: "CA",
                    postalCode: "94105",
                    country: "US"
                },
                phone: "(415) 555-1234",
                email: "accounting@techstartsolutions.com",
                website: "https://www.techstartsolutions.com",
                fiscalYearStartMonth: "January",
                country: "US"
            });
        });

        it("handles company without address", async () => {
            mockClient.getCompanyInfo.mockResolvedValueOnce({
                CompanyInfo: {
                    Id: "1",
                    CompanyName: "Simple Company"
                }
            });

            const result = await executeGetCompanyInfo(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.address).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getCompanyInfo.mockRejectedValueOnce(new Error("Authentication failed"));

            const result = await executeGetCompanyInfo(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Authentication failed");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getCompanyInfo.mockRejectedValueOnce("string error");

            const result = await executeGetCompanyInfo(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get company info");
        });
    });

    describe("executeGetCustomer", () => {
        it("calls client with correct params", async () => {
            mockClient.getCustomer.mockResolvedValueOnce({
                Customer: {
                    Id: "145",
                    DisplayName: "Acme Corporation",
                    CompanyName: "Acme Corporation",
                    PrimaryEmailAddr: { Address: "accounts@acmecorp.com" },
                    PrimaryPhone: { FreeFormNumber: "(555) 123-4567" },
                    BillAddr: {
                        Line1: "456 Business Park Blvd",
                        City: "Los Angeles",
                        CountrySubDivisionCode: "CA",
                        PostalCode: "90001"
                    },
                    Balance: 2500.0,
                    Active: true,
                    MetaData: {
                        CreateTime: "2023-06-15T10:00:00-07:00",
                        LastUpdatedTime: "2024-01-10T14:30:00-08:00"
                    }
                }
            });

            await executeGetCustomer(mockClient, { customerId: "145" });

            expect(mockClient.getCustomer).toHaveBeenCalledWith("145");
        });

        it("returns normalized output on success", async () => {
            mockClient.getCustomer.mockResolvedValueOnce({
                Customer: {
                    Id: "145",
                    DisplayName: "Acme Corporation",
                    CompanyName: "Acme Corporation",
                    PrimaryEmailAddr: { Address: "accounts@acmecorp.com" },
                    PrimaryPhone: { FreeFormNumber: "(555) 123-4567" },
                    BillAddr: {
                        Line1: "456 Business Park Blvd",
                        City: "Los Angeles",
                        CountrySubDivisionCode: "CA",
                        PostalCode: "90001"
                    },
                    Balance: 2500.0,
                    Active: true,
                    MetaData: {
                        CreateTime: "2023-06-15T10:00:00-07:00",
                        LastUpdatedTime: "2024-01-10T14:30:00-08:00"
                    }
                }
            });

            const result = await executeGetCustomer(mockClient, { customerId: "145" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "145",
                displayName: "Acme Corporation",
                givenName: undefined,
                familyName: undefined,
                companyName: "Acme Corporation",
                email: "accounts@acmecorp.com",
                phone: "(555) 123-4567",
                billingAddress: {
                    line1: "456 Business Park Blvd",
                    city: "Los Angeles",
                    state: "CA",
                    postalCode: "90001"
                },
                balance: 2500.0,
                active: true,
                createdAt: "2023-06-15T10:00:00-07:00",
                updatedAt: "2024-01-10T14:30:00-08:00"
            });
        });

        it("handles customer without billing address", async () => {
            mockClient.getCustomer.mockResolvedValueOnce({
                Customer: {
                    Id: "150",
                    DisplayName: "Simple Customer"
                }
            });

            const result = await executeGetCustomer(mockClient, { customerId: "150" });

            expect(result.success).toBe(true);
            expect(result.data?.billingAddress).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getCustomer.mockRejectedValueOnce(new Error("Resource not found"));

            const result = await executeGetCustomer(mockClient, { customerId: "99999" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getCustomer.mockRejectedValueOnce("string error");

            const result = await executeGetCustomer(mockClient, { customerId: "145" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get customer");
        });
    });

    describe("executeGetInvoice", () => {
        it("calls client with correct params", async () => {
            mockClient.getInvoice.mockResolvedValueOnce({
                Invoice: {
                    Id: "1098",
                    DocNumber: "INV-2024-001",
                    TxnDate: "2024-01-15",
                    DueDate: "2024-02-15",
                    CustomerRef: { value: "145", name: "Acme Corporation" },
                    Line: [
                        {
                            Id: "1",
                            LineNum: 1,
                            Description: "Website Development - Initial Deposit",
                            Amount: 500.0,
                            DetailType: "SalesItemLineDetail",
                            SalesItemLineDetail: { Qty: 1, UnitPrice: 500.0 }
                        }
                    ],
                    TotalAmt: 500.0,
                    Balance: 500.0,
                    BillEmail: { Address: "accounts@acmecorp.com" },
                    EmailStatus: "EmailSent",
                    MetaData: {
                        CreateTime: "2024-01-15T14:00:00-08:00",
                        LastUpdatedTime: "2024-01-15T14:30:00-08:00"
                    }
                }
            });

            await executeGetInvoice(mockClient, { invoiceId: "1098" });

            expect(mockClient.getInvoice).toHaveBeenCalledWith("1098");
        });

        it("returns normalized output on success", async () => {
            mockClient.getInvoice.mockResolvedValueOnce({
                Invoice: {
                    Id: "1098",
                    DocNumber: "INV-2024-001",
                    TxnDate: "2024-01-15",
                    DueDate: "2024-02-15",
                    CustomerRef: { value: "145", name: "Acme Corporation" },
                    Line: [
                        {
                            Id: "1",
                            LineNum: 1,
                            Description: "Website Development - Initial Deposit",
                            Amount: 500.0,
                            DetailType: "SalesItemLineDetail",
                            SalesItemLineDetail: { Qty: 1, UnitPrice: 500.0 }
                        }
                    ],
                    TotalAmt: 500.0,
                    Balance: 500.0,
                    BillEmail: { Address: "accounts@acmecorp.com" },
                    EmailStatus: "EmailSent",
                    MetaData: {
                        CreateTime: "2024-01-15T14:00:00-08:00",
                        LastUpdatedTime: "2024-01-15T14:30:00-08:00"
                    }
                }
            });

            const result = await executeGetInvoice(mockClient, { invoiceId: "1098" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "1098",
                docNumber: "INV-2024-001",
                txnDate: "2024-01-15",
                dueDate: "2024-02-15",
                customer: {
                    id: "145",
                    name: "Acme Corporation"
                },
                lineItems: [
                    {
                        id: "1",
                        lineNum: 1,
                        description: "Website Development - Initial Deposit",
                        amount: 500.0,
                        quantity: 1,
                        unitPrice: 500.0
                    }
                ],
                totalAmount: 500.0,
                balance: 500.0,
                billEmail: "accounts@acmecorp.com",
                emailStatus: "EmailSent",
                createdAt: "2024-01-15T14:00:00-08:00",
                updatedAt: "2024-01-15T14:30:00-08:00"
            });
        });

        it("filters out SubTotalLineDetail lines", async () => {
            mockClient.getInvoice.mockResolvedValueOnce({
                Invoice: {
                    Id: "1098",
                    CustomerRef: { value: "145" },
                    Line: [
                        {
                            Id: "1",
                            LineNum: 1,
                            Description: "Service",
                            Amount: 100.0,
                            DetailType: "SalesItemLineDetail",
                            SalesItemLineDetail: { Qty: 1, UnitPrice: 100.0 }
                        },
                        {
                            Amount: 100.0,
                            DetailType: "SubTotalLineDetail"
                        }
                    ],
                    TotalAmt: 100.0
                }
            });

            const result = await executeGetInvoice(mockClient, { invoiceId: "1098" });

            expect(result.success).toBe(true);
            expect(result.data?.lineItems).toHaveLength(1);
        });

        it("returns error on client failure", async () => {
            mockClient.getInvoice.mockRejectedValueOnce(new Error("Invoice not found"));

            const result = await executeGetInvoice(mockClient, { invoiceId: "99999" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invoice not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getInvoice.mockRejectedValueOnce("string error");

            const result = await executeGetInvoice(mockClient, { invoiceId: "1098" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get invoice");
        });
    });

    describe("executeListCustomers", () => {
        it("calls client with default params", async () => {
            mockClient.listCustomers.mockResolvedValueOnce({
                QueryResponse: {
                    Customer: [],
                    startPosition: 1,
                    maxResults: 100
                }
            });

            await executeListCustomers(mockClient, { maxResults: 100, startPosition: 1 });

            expect(mockClient.listCustomers).toHaveBeenCalledWith(100, 1);
        });

        it("calls client with custom params", async () => {
            mockClient.listCustomers.mockResolvedValueOnce({
                QueryResponse: {
                    Customer: [],
                    startPosition: 50,
                    maxResults: 25
                }
            });

            await executeListCustomers(mockClient, { maxResults: 25, startPosition: 50 });

            expect(mockClient.listCustomers).toHaveBeenCalledWith(25, 50);
        });

        it("returns normalized customer output", async () => {
            mockClient.listCustomers.mockResolvedValueOnce({
                QueryResponse: {
                    Customer: [
                        {
                            Id: "145",
                            DisplayName: "Acme Corporation",
                            CompanyName: "Acme Corporation",
                            PrimaryEmailAddr: { Address: "accounts@acmecorp.com" },
                            PrimaryPhone: { FreeFormNumber: "(555) 123-4567" },
                            BillAddr: {
                                Line1: "456 Business Park Blvd",
                                City: "Los Angeles",
                                CountrySubDivisionCode: "CA",
                                PostalCode: "90001"
                            },
                            Balance: 2500.0,
                            Active: true,
                            MetaData: {
                                CreateTime: "2023-06-15T10:00:00-07:00",
                                LastUpdatedTime: "2024-01-10T14:30:00-08:00"
                            }
                        },
                        {
                            Id: "146",
                            DisplayName: "Johnson & Associates LLC",
                            GivenName: "Robert",
                            FamilyName: "Johnson",
                            CompanyName: "Johnson & Associates LLC",
                            PrimaryEmailAddr: { Address: "robert.johnson@johnsonllc.com" },
                            PrimaryPhone: { FreeFormNumber: "(415) 555-0123" },
                            Balance: 0,
                            Active: true,
                            MetaData: {
                                CreateTime: "2023-04-20T09:00:00-07:00",
                                LastUpdatedTime: "2024-01-08T11:00:00-08:00"
                            }
                        }
                    ],
                    startPosition: 1,
                    maxResults: 100
                }
            });

            const result = await executeListCustomers(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(true);
            expect(result.data?.customers).toHaveLength(2);
            expect(result.data?.customers[0]).toEqual({
                id: "145",
                displayName: "Acme Corporation",
                givenName: undefined,
                familyName: undefined,
                companyName: "Acme Corporation",
                email: "accounts@acmecorp.com",
                phone: "(555) 123-4567",
                billingAddress: {
                    line1: "456 Business Park Blvd",
                    city: "Los Angeles",
                    state: "CA",
                    postalCode: "90001"
                },
                balance: 2500.0,
                active: true,
                createdAt: "2023-06-15T10:00:00-07:00",
                updatedAt: "2024-01-10T14:30:00-08:00"
            });
            expect(result.data?.count).toBe(2);
            expect(result.data?.startPosition).toBe(1);
            expect(result.data?.maxResults).toBe(100);
        });

        it("handles empty customer list", async () => {
            mockClient.listCustomers.mockResolvedValueOnce({
                QueryResponse: {
                    startPosition: 1,
                    maxResults: 100
                }
            });

            const result = await executeListCustomers(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(true);
            expect(result.data?.customers).toHaveLength(0);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listCustomers.mockRejectedValueOnce(new Error("Authentication failed"));

            const result = await executeListCustomers(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Authentication failed");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listCustomers.mockRejectedValueOnce("string error");

            const result = await executeListCustomers(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list customers");
        });
    });

    describe("executeListInvoices", () => {
        it("calls client with default params", async () => {
            mockClient.listInvoices.mockResolvedValueOnce({
                QueryResponse: {
                    Invoice: [],
                    startPosition: 1,
                    maxResults: 100
                }
            });

            await executeListInvoices(mockClient, { maxResults: 100, startPosition: 1 });

            expect(mockClient.listInvoices).toHaveBeenCalledWith(100, 1);
        });

        it("calls client with custom params", async () => {
            mockClient.listInvoices.mockResolvedValueOnce({
                QueryResponse: {
                    Invoice: [],
                    startPosition: 10,
                    maxResults: 50
                }
            });

            await executeListInvoices(mockClient, { maxResults: 50, startPosition: 10 });

            expect(mockClient.listInvoices).toHaveBeenCalledWith(50, 10);
        });

        it("returns normalized invoice output", async () => {
            mockClient.listInvoices.mockResolvedValueOnce({
                QueryResponse: {
                    Invoice: [
                        {
                            Id: "1098",
                            DocNumber: "INV-2024-001",
                            TxnDate: "2024-01-15",
                            DueDate: "2024-02-15",
                            CustomerRef: { value: "145", name: "Acme Corporation" },
                            Line: [
                                {
                                    Id: "1",
                                    LineNum: 1,
                                    Description: "Website Development",
                                    Amount: 500.0,
                                    DetailType: "SalesItemLineDetail",
                                    SalesItemLineDetail: { Qty: 1, UnitPrice: 500.0 }
                                }
                            ],
                            TotalAmt: 500.0,
                            Balance: 500.0,
                            BillEmail: { Address: "accounts@acmecorp.com" },
                            EmailStatus: "EmailSent",
                            MetaData: {
                                CreateTime: "2024-01-15T14:00:00-08:00",
                                LastUpdatedTime: "2024-01-15T14:30:00-08:00"
                            }
                        },
                        {
                            Id: "1099",
                            DocNumber: "INV-2024-002",
                            TxnDate: "2024-01-15",
                            DueDate: "2024-02-15",
                            CustomerRef: { value: "146", name: "Johnson & Associates LLC" },
                            Line: [
                                {
                                    Id: "1",
                                    LineNum: 1,
                                    Description: "Consulting Services",
                                    Amount: 2500.0,
                                    DetailType: "SalesItemLineDetail",
                                    SalesItemLineDetail: { Qty: 1, UnitPrice: 2500.0 }
                                }
                            ],
                            TotalAmt: 2500.0,
                            Balance: 2500.0,
                            EmailStatus: "NotSet",
                            MetaData: {
                                CreateTime: "2024-01-15T15:30:00-08:00",
                                LastUpdatedTime: "2024-01-15T15:30:00-08:00"
                            }
                        }
                    ],
                    startPosition: 1,
                    maxResults: 100
                }
            });

            const result = await executeListInvoices(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(true);
            expect(result.data?.invoices).toHaveLength(2);
            expect(result.data?.invoices[0]).toEqual({
                id: "1098",
                docNumber: "INV-2024-001",
                txnDate: "2024-01-15",
                dueDate: "2024-02-15",
                customer: {
                    id: "145",
                    name: "Acme Corporation"
                },
                lineItems: [
                    {
                        id: "1",
                        lineNum: 1,
                        description: "Website Development",
                        amount: 500.0,
                        quantity: 1,
                        unitPrice: 500.0
                    }
                ],
                totalAmount: 500.0,
                balance: 500.0,
                billEmail: "accounts@acmecorp.com",
                emailStatus: "EmailSent",
                createdAt: "2024-01-15T14:00:00-08:00",
                updatedAt: "2024-01-15T14:30:00-08:00"
            });
            expect(result.data?.count).toBe(2);
            expect(result.data?.startPosition).toBe(1);
            expect(result.data?.maxResults).toBe(100);
        });

        it("filters out SubTotalLineDetail lines from all invoices", async () => {
            mockClient.listInvoices.mockResolvedValueOnce({
                QueryResponse: {
                    Invoice: [
                        {
                            Id: "1098",
                            CustomerRef: { value: "145" },
                            Line: [
                                {
                                    Id: "1",
                                    LineNum: 1,
                                    Description: "Service",
                                    Amount: 100.0,
                                    DetailType: "SalesItemLineDetail"
                                },
                                {
                                    Amount: 100.0,
                                    DetailType: "SubTotalLineDetail"
                                }
                            ],
                            TotalAmt: 100.0
                        }
                    ],
                    startPosition: 1,
                    maxResults: 100
                }
            });

            const result = await executeListInvoices(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(true);
            expect(result.data?.invoices[0].lineItems).toHaveLength(1);
        });

        it("handles empty invoice list", async () => {
            mockClient.listInvoices.mockResolvedValueOnce({
                QueryResponse: {
                    startPosition: 1,
                    maxResults: 100
                }
            });

            const result = await executeListInvoices(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(true);
            expect(result.data?.invoices).toHaveLength(0);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listInvoices.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeListInvoices(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listInvoices.mockRejectedValueOnce("string error");

            const result = await executeListInvoices(mockClient, {
                maxResults: 100,
                startPosition: 1
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list invoices");
        });
    });

    describe("schema validation", () => {
        describe("createCustomerSchema", () => {
            it("validates minimal input", () => {
                const result = createCustomerSchema.safeParse({
                    displayName: "Test Customer"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createCustomerSchema.safeParse({
                    displayName: "Johnson & Associates LLC",
                    givenName: "Robert",
                    familyName: "Johnson",
                    email: "robert@test.com",
                    phone: "(415) 555-0123",
                    companyName: "Johnson & Associates LLC"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing displayName", () => {
                const result = createCustomerSchema.safeParse({
                    givenName: "Robert"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty displayName", () => {
                const result = createCustomerSchema.safeParse({
                    displayName: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createCustomerSchema.safeParse({
                    displayName: "Test Customer",
                    email: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createInvoiceSchema", () => {
            it("validates minimal input", () => {
                const result = createInvoiceSchema.safeParse({
                    customerId: "146",
                    lineItems: [{ amount: 100.0, description: "Test" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createInvoiceSchema.safeParse({
                    customerId: "146",
                    lineItems: [
                        { amount: 2500.0, description: "Consulting" },
                        { amount: 750.0, description: "License" }
                    ],
                    dueDate: "2024-02-15",
                    docNumber: "INV-2024-001",
                    customerEmail: "robert@test.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing customerId", () => {
                const result = createInvoiceSchema.safeParse({
                    lineItems: [{ amount: 100.0, description: "Test" }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty lineItems array", () => {
                const result = createInvoiceSchema.safeParse({
                    customerId: "146",
                    lineItems: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing lineItems", () => {
                const result = createInvoiceSchema.safeParse({
                    customerId: "146"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createInvoiceSchema.safeParse({
                    customerId: "146",
                    lineItems: [{ amount: 100.0, description: "Test" }],
                    customerEmail: "invalid-email"
                });
                expect(result.success).toBe(false);
            });

            it("allows lineItem without description", () => {
                const result = createInvoiceSchema.safeParse({
                    customerId: "146",
                    lineItems: [{ amount: 100.0 }]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("getCompanyInfoSchema", () => {
            it("validates empty input", () => {
                const result = getCompanyInfoSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("getCustomerSchema", () => {
            it("validates with customerId", () => {
                const result = getCustomerSchema.safeParse({
                    customerId: "145"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing customerId", () => {
                const result = getCustomerSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getInvoiceSchema", () => {
            it("validates with invoiceId", () => {
                const result = getInvoiceSchema.safeParse({
                    invoiceId: "1098"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing invoiceId", () => {
                const result = getInvoiceSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listCustomersSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listCustomersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with maxResults", () => {
                const result = listCustomersSchema.safeParse({
                    maxResults: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates with startPosition", () => {
                const result = listCustomersSchema.safeParse({
                    startPosition: 10
                });
                expect(result.success).toBe(true);
            });

            it("validates with both params", () => {
                const result = listCustomersSchema.safeParse({
                    maxResults: 50,
                    startPosition: 10
                });
                expect(result.success).toBe(true);
            });

            it("rejects maxResults over 1000", () => {
                const result = listCustomersSchema.safeParse({
                    maxResults: 2000
                });
                expect(result.success).toBe(false);
            });

            it("rejects maxResults below 1", () => {
                const result = listCustomersSchema.safeParse({
                    maxResults: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects startPosition below 1", () => {
                const result = listCustomersSchema.safeParse({
                    startPosition: 0
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listCustomersSchema.parse({});
                expect(result.maxResults).toBe(100);
                expect(result.startPosition).toBe(1);
            });
        });

        describe("listInvoicesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listInvoicesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with maxResults", () => {
                const result = listInvoicesSchema.safeParse({
                    maxResults: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates with startPosition", () => {
                const result = listInvoicesSchema.safeParse({
                    startPosition: 10
                });
                expect(result.success).toBe(true);
            });

            it("validates with both params", () => {
                const result = listInvoicesSchema.safeParse({
                    maxResults: 50,
                    startPosition: 10
                });
                expect(result.success).toBe(true);
            });

            it("rejects maxResults over 1000", () => {
                const result = listInvoicesSchema.safeParse({
                    maxResults: 5000
                });
                expect(result.success).toBe(false);
            });

            it("rejects maxResults below 1", () => {
                const result = listInvoicesSchema.safeParse({
                    maxResults: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects startPosition below 1", () => {
                const result = listInvoicesSchema.safeParse({
                    startPosition: 0
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listInvoicesSchema.parse({});
                expect(result.maxResults).toBe(100);
                expect(result.startPosition).toBe(1);
            });
        });
    });
});
