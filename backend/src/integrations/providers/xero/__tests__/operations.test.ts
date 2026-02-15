/**
 * Xero Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateContact, createContactSchema } from "../operations/createContact";
import { executeCreateInvoice, createInvoiceSchema } from "../operations/createInvoice";
import { executeGetContact, getContactSchema } from "../operations/getContact";
import { executeGetInvoice, getInvoiceSchema } from "../operations/getInvoice";
import { executeGetOrganisation, getOrganisationSchema } from "../operations/getOrganisation";
import { executeListContacts, listContactsSchema } from "../operations/listContacts";
import { executeListInvoices, listInvoicesSchema } from "../operations/listInvoices";
import type { XeroClient, XeroOrganisation, XeroContact, XeroInvoice } from "../client/XeroClient";

// Mock XeroClient factory
function createMockXeroClient(): jest.Mocked<XeroClient> {
    return {
        getOrganisation: jest.fn(),
        listContacts: jest.fn(),
        getContact: jest.fn(),
        createContact: jest.fn(),
        listInvoices: jest.fn(),
        getInvoice: jest.fn(),
        createInvoice: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<XeroClient>;
}

describe("Xero Operation Executors", () => {
    let mockClient: jest.Mocked<XeroClient>;

    beforeEach(() => {
        mockClient = createMockXeroClient();
    });

    describe("executeGetOrganisation", () => {
        it("calls client getOrganisation method", async () => {
            const mockOrg: XeroOrganisation = {
                OrganisationID: "b2c885a0-4e84-4c9c-a9ce-af3b7c7b8a3a",
                Name: "Northwind Traders Ltd",
                LegalName: "Northwind Traders Limited",
                ShortCode: "NWT",
                Version: "AU",
                OrganisationType: "COMPANY",
                BaseCurrency: "AUD",
                CountryCode: "AU",
                IsDemoCompany: false,
                TaxNumber: "12345678901"
            };

            mockClient.getOrganisation.mockResolvedValueOnce({
                Organisations: [mockOrg]
            });

            await executeGetOrganisation(mockClient, {});

            expect(mockClient.getOrganisation).toHaveBeenCalledTimes(1);
        });

        it("returns normalized output on success", async () => {
            const mockOrg: XeroOrganisation = {
                OrganisationID: "b2c885a0-4e84-4c9c-a9ce-af3b7c7b8a3a",
                Name: "Northwind Traders Ltd",
                LegalName: "Northwind Traders Limited",
                ShortCode: "NWT",
                Version: "AU",
                OrganisationType: "COMPANY",
                BaseCurrency: "AUD",
                CountryCode: "AU",
                IsDemoCompany: false,
                TaxNumber: "12345678901",
                FinancialYearEndDay: 30,
                FinancialYearEndMonth: 6,
                LineOfBusiness: "Wholesale Trade",
                RegistrationNumber: "ACN 123 456 789",
                CreatedDateUTC: "2022-03-15T00:00:00"
            };

            mockClient.getOrganisation.mockResolvedValueOnce({
                Organisations: [mockOrg]
            });

            const result = await executeGetOrganisation(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                organisationId: "b2c885a0-4e84-4c9c-a9ce-af3b7c7b8a3a",
                name: "Northwind Traders Ltd",
                legalName: "Northwind Traders Limited",
                shortCode: "NWT",
                version: "AU",
                organisationType: "COMPANY",
                baseCurrency: "AUD",
                countryCode: "AU",
                isDemoCompany: false,
                taxNumber: "12345678901",
                financialYearEndDay: 30,
                financialYearEndMonth: 6,
                lineOfBusiness: "Wholesale Trade",
                registrationNumber: "ACN 123 456 789",
                createdDateUTC: "2022-03-15T00:00:00"
            });
        });

        it("returns not_found error when no organisation returned", async () => {
            mockClient.getOrganisation.mockResolvedValueOnce({
                Organisations: []
            });

            const result = await executeGetOrganisation(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("No organisation found for this Xero connection");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.getOrganisation.mockRejectedValueOnce(
                new Error("Xero authentication failed")
            );

            const result = await executeGetOrganisation(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Xero authentication failed");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getOrganisation.mockRejectedValueOnce("string error");

            const result = await executeGetOrganisation(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get organisation info");
        });
    });

    describe("executeListContacts", () => {
        it("calls client with default page 1", async () => {
            mockClient.listContacts.mockResolvedValueOnce({
                Contacts: []
            });

            await executeListContacts(mockClient, { page: 1 });

            expect(mockClient.listContacts).toHaveBeenCalledWith(1);
        });

        it("calls client with custom page number", async () => {
            mockClient.listContacts.mockResolvedValueOnce({
                Contacts: []
            });

            await executeListContacts(mockClient, { page: 3 });

            expect(mockClient.listContacts).toHaveBeenCalledWith(3);
        });

        it("returns normalized contact output", async () => {
            const mockContacts: XeroContact[] = [
                {
                    ContactID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    Name: "Melbourne Coffee Roasters",
                    FirstName: "James",
                    LastName: "Wilson",
                    EmailAddress: "james@melbcoffee.com.au",
                    ContactStatus: "ACTIVE",
                    Phones: [
                        {
                            PhoneType: "DEFAULT",
                            PhoneNumber: "9876 5432",
                            PhoneAreaCode: "03",
                            PhoneCountryCode: "61"
                        }
                    ],
                    Addresses: [
                        {
                            AddressType: "STREET",
                            AddressLine1: "42 Collins Street",
                            City: "Melbourne",
                            Region: "VIC",
                            PostalCode: "3000",
                            Country: "Australia"
                        }
                    ],
                    IsSupplier: true,
                    IsCustomer: false,
                    UpdatedDateUTC: "2024-01-10T08:30:00"
                },
                {
                    ContactID: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    Name: "Sydney Design Co",
                    EmailAddress: "accounts@sydneydesign.com.au",
                    ContactStatus: "ACTIVE",
                    IsSupplier: false,
                    IsCustomer: true,
                    UpdatedDateUTC: "2024-01-08T14:15:00"
                }
            ];

            mockClient.listContacts.mockResolvedValueOnce({
                Contacts: mockContacts
            });

            const result = await executeListContacts(mockClient, { page: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(2);
            expect(result.data?.count).toBe(2);
            expect(result.data?.page).toBe(1);
            expect(result.data?.contacts[0]).toEqual({
                contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                name: "Melbourne Coffee Roasters",
                firstName: "James",
                lastName: "Wilson",
                emailAddress: "james@melbcoffee.com.au",
                contactStatus: "ACTIVE",
                phones: [
                    {
                        phoneType: "DEFAULT",
                        phoneNumber: "9876 5432",
                        phoneAreaCode: "03",
                        phoneCountryCode: "61"
                    }
                ],
                addresses: [
                    {
                        addressType: "STREET",
                        addressLine1: "42 Collins Street",
                        city: "Melbourne",
                        region: "VIC",
                        postalCode: "3000",
                        country: "Australia"
                    }
                ],
                isSupplier: true,
                isCustomer: false,
                updatedDateUTC: "2024-01-10T08:30:00"
            });
        });

        it("handles empty contacts list", async () => {
            mockClient.listContacts.mockResolvedValueOnce({
                Contacts: []
            });

            const result = await executeListContacts(mockClient, { page: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.contacts).toHaveLength(0);
            expect(result.data?.count).toBe(0);
        });

        it("handles contacts without optional fields", async () => {
            const mockContacts: XeroContact[] = [
                {
                    ContactID: "minimal-contact-id",
                    Name: "Minimal Contact"
                }
            ];

            mockClient.listContacts.mockResolvedValueOnce({
                Contacts: mockContacts
            });

            const result = await executeListContacts(mockClient, { page: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.contacts[0]).toEqual({
                contactId: "minimal-contact-id",
                name: "Minimal Contact",
                firstName: undefined,
                lastName: undefined,
                emailAddress: undefined,
                contactStatus: undefined,
                phones: undefined,
                addresses: undefined,
                isSupplier: undefined,
                isCustomer: undefined,
                updatedDateUTC: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listContacts.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeListContacts(mockClient, { page: 1 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetContact", () => {
        it("calls client with correct contact ID", async () => {
            const mockContact: XeroContact = {
                ContactID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                Name: "Melbourne Coffee Roasters"
            };

            mockClient.getContact.mockResolvedValueOnce({
                Contacts: [mockContact]
            });

            await executeGetContact(mockClient, {
                contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            });

            expect(mockClient.getContact).toHaveBeenCalledWith(
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            );
        });

        it("returns normalized contact output on success", async () => {
            const mockContact: XeroContact = {
                ContactID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                Name: "Melbourne Coffee Roasters",
                FirstName: "James",
                LastName: "Wilson",
                EmailAddress: "james@melbcoffee.com.au",
                ContactStatus: "ACTIVE",
                Phones: [
                    {
                        PhoneType: "DEFAULT",
                        PhoneNumber: "9876 5432",
                        PhoneAreaCode: "03",
                        PhoneCountryCode: "61"
                    }
                ],
                IsSupplier: true,
                IsCustomer: false,
                UpdatedDateUTC: "2024-01-10T08:30:00"
            };

            mockClient.getContact.mockResolvedValueOnce({
                Contacts: [mockContact]
            });

            const result = await executeGetContact(mockClient, {
                contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                name: "Melbourne Coffee Roasters",
                firstName: "James",
                lastName: "Wilson",
                emailAddress: "james@melbcoffee.com.au",
                contactStatus: "ACTIVE",
                phones: [
                    {
                        phoneType: "DEFAULT",
                        phoneNumber: "9876 5432",
                        phoneAreaCode: "03",
                        phoneCountryCode: "61"
                    }
                ],
                addresses: undefined,
                isSupplier: true,
                isCustomer: false,
                updatedDateUTC: "2024-01-10T08:30:00"
            });
        });

        it("returns not_found error when contact not found", async () => {
            mockClient.getContact.mockResolvedValueOnce({
                Contacts: []
            });

            const result = await executeGetContact(mockClient, {
                contactId: "00000000-0000-0000-0000-000000000000"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe(
                "Contact with ID '00000000-0000-0000-0000-000000000000' not found"
            );
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.getContact.mockRejectedValueOnce(new Error("Network error"));

            const result = await executeGetContact(mockClient, {
                contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getContact.mockRejectedValueOnce("string error");

            const result = await executeGetContact(mockClient, {
                contactId: "test-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get contact");
        });
    });

    describe("executeCreateContact", () => {
        it("calls client with minimal params (name only)", async () => {
            const mockContact: XeroContact = {
                ContactID: "new-contact-id",
                Name: "New Contact",
                ContactStatus: "ACTIVE"
            };

            mockClient.createContact.mockResolvedValueOnce({
                Contacts: [mockContact]
            });

            await executeCreateContact(mockClient, {
                name: "New Contact"
            });

            expect(mockClient.createContact).toHaveBeenCalledWith({
                Name: "New Contact"
            });
        });

        it("calls client with full params", async () => {
            const mockContact: XeroContact = {
                ContactID: "new-contact-id",
                Name: "Brisbane Tech Solutions",
                FirstName: "Emma",
                LastName: "Taylor",
                EmailAddress: "emma@brisbanetech.com.au",
                ContactStatus: "ACTIVE",
                Phones: [{ PhoneType: "DEFAULT", PhoneNumber: "3456 7890" }]
            };

            mockClient.createContact.mockResolvedValueOnce({
                Contacts: [mockContact]
            });

            await executeCreateContact(mockClient, {
                name: "Brisbane Tech Solutions",
                firstName: "Emma",
                lastName: "Taylor",
                emailAddress: "emma@brisbanetech.com.au",
                phone: "3456 7890"
            });

            expect(mockClient.createContact).toHaveBeenCalledWith({
                Name: "Brisbane Tech Solutions",
                FirstName: "Emma",
                LastName: "Taylor",
                EmailAddress: "emma@brisbanetech.com.au",
                Phones: [{ PhoneType: "DEFAULT", PhoneNumber: "3456 7890" }]
            });
        });

        it("returns normalized output on success", async () => {
            const mockContact: XeroContact = {
                ContactID: "d4e5f6a7-b8c9-0123-defg-456789012345",
                Name: "Brisbane Tech Solutions",
                FirstName: "Emma",
                LastName: "Taylor",
                EmailAddress: "emma@brisbanetech.com.au",
                ContactStatus: "ACTIVE",
                Phones: [{ PhoneType: "DEFAULT", PhoneNumber: "3456 7890" }],
                IsSupplier: false,
                IsCustomer: false,
                UpdatedDateUTC: "2024-01-15T11:00:00"
            };

            mockClient.createContact.mockResolvedValueOnce({
                Contacts: [mockContact]
            });

            const result = await executeCreateContact(mockClient, {
                name: "Brisbane Tech Solutions",
                firstName: "Emma",
                lastName: "Taylor",
                emailAddress: "emma@brisbanetech.com.au",
                phone: "3456 7890"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                contactId: "d4e5f6a7-b8c9-0123-defg-456789012345",
                name: "Brisbane Tech Solutions",
                firstName: "Emma",
                lastName: "Taylor",
                emailAddress: "emma@brisbanetech.com.au",
                contactStatus: "ACTIVE",
                phones: [{ phoneType: "DEFAULT", phoneNumber: "3456 7890" }],
                addresses: undefined,
                isSupplier: false,
                isCustomer: false,
                updatedDateUTC: "2024-01-15T11:00:00"
            });
        });

        it("returns error when no contact returned", async () => {
            mockClient.createContact.mockResolvedValueOnce({
                Contacts: []
            });

            const result = await executeCreateContact(mockClient, {
                name: "New Contact"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Failed to create contact - no response data");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.createContact.mockRejectedValueOnce(
                new Error("A contact with this name already exists")
            );

            const result = await executeCreateContact(mockClient, {
                name: "Melbourne Coffee Roasters"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("A contact with this name already exists");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createContact.mockRejectedValueOnce("string error");

            const result = await executeCreateContact(mockClient, {
                name: "Test Contact"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create contact");
        });
    });

    describe("executeListInvoices", () => {
        it("calls client with default page 1", async () => {
            mockClient.listInvoices.mockResolvedValueOnce({
                Invoices: []
            });

            await executeListInvoices(mockClient, { page: 1 });

            expect(mockClient.listInvoices).toHaveBeenCalledWith(1);
        });

        it("calls client with custom page number", async () => {
            mockClient.listInvoices.mockResolvedValueOnce({
                Invoices: []
            });

            await executeListInvoices(mockClient, { page: 5 });

            expect(mockClient.listInvoices).toHaveBeenCalledWith(5);
        });

        it("returns normalized invoice output", async () => {
            const mockInvoices: XeroInvoice[] = [
                {
                    InvoiceID: "e5f6a7b8-c9d0-1234-efgh-567890123456",
                    InvoiceNumber: "INV-0042",
                    Type: "ACCREC",
                    Status: "AUTHORISED",
                    Contact: {
                        ContactID: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                        Name: "Sydney Design Co"
                    },
                    Date: "2024-01-15",
                    DueDate: "2024-02-15",
                    LineItems: [
                        {
                            LineItemID: "li-001",
                            Description: "Web Design Services - January",
                            Quantity: 40,
                            UnitAmount: 150.0,
                            LineAmount: 6000.0,
                            AccountCode: "200",
                            TaxType: "OUTPUT"
                        }
                    ],
                    SubTotal: 6000.0,
                    TotalTax: 600.0,
                    Total: 6600.0,
                    AmountDue: 6600.0,
                    AmountPaid: 0,
                    CurrencyCode: "AUD",
                    UpdatedDateUTC: "2024-01-15T09:00:00"
                }
            ];

            mockClient.listInvoices.mockResolvedValueOnce({
                Invoices: mockInvoices
            });

            const result = await executeListInvoices(mockClient, { page: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.invoices).toHaveLength(1);
            expect(result.data?.count).toBe(1);
            expect(result.data?.page).toBe(1);
            expect(result.data?.invoices[0]).toEqual({
                invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456",
                invoiceNumber: "INV-0042",
                type: "ACCREC",
                status: "AUTHORISED",
                contact: {
                    contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    name: "Sydney Design Co"
                },
                date: "2024-01-15",
                dueDate: "2024-02-15",
                lineItems: [
                    {
                        lineItemId: "li-001",
                        description: "Web Design Services - January",
                        quantity: 40,
                        unitAmount: 150.0,
                        lineAmount: 6000.0,
                        accountCode: "200",
                        taxType: "OUTPUT"
                    }
                ],
                subTotal: 6000.0,
                totalTax: 600.0,
                total: 6600.0,
                amountDue: 6600.0,
                amountPaid: 0,
                currencyCode: "AUD",
                reference: undefined,
                updatedDateUTC: "2024-01-15T09:00:00"
            });
        });

        it("handles empty invoices list", async () => {
            mockClient.listInvoices.mockResolvedValueOnce({
                Invoices: []
            });

            const result = await executeListInvoices(mockClient, { page: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.invoices).toHaveLength(0);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listInvoices.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeListInvoices(mockClient, { page: 1 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listInvoices.mockRejectedValueOnce("string error");

            const result = await executeListInvoices(mockClient, { page: 1 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list invoices");
        });
    });

    describe("executeGetInvoice", () => {
        it("calls client with correct invoice ID", async () => {
            const mockInvoice: XeroInvoice = {
                InvoiceID: "e5f6a7b8-c9d0-1234-efgh-567890123456",
                Type: "ACCREC",
                Status: "AUTHORISED",
                Contact: { ContactID: "contact-id" },
                LineItems: []
            };

            mockClient.getInvoice.mockResolvedValueOnce({
                Invoices: [mockInvoice]
            });

            await executeGetInvoice(mockClient, {
                invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456"
            });

            expect(mockClient.getInvoice).toHaveBeenCalledWith(
                "e5f6a7b8-c9d0-1234-efgh-567890123456"
            );
        });

        it("returns normalized invoice output on success", async () => {
            const mockInvoice: XeroInvoice = {
                InvoiceID: "e5f6a7b8-c9d0-1234-efgh-567890123456",
                InvoiceNumber: "INV-0042",
                Type: "ACCREC",
                Status: "AUTHORISED",
                Contact: {
                    ContactID: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    Name: "Sydney Design Co"
                },
                Date: "2024-01-15",
                DueDate: "2024-02-15",
                LineItems: [
                    {
                        LineItemID: "li-001",
                        Description: "Web Design Services",
                        Quantity: 40,
                        UnitAmount: 150.0,
                        LineAmount: 6000.0,
                        AccountCode: "200",
                        TaxType: "OUTPUT"
                    }
                ],
                SubTotal: 6000.0,
                TotalTax: 600.0,
                Total: 6600.0,
                AmountDue: 6600.0,
                AmountPaid: 0,
                CurrencyCode: "AUD",
                Reference: "PO-2024-001",
                UpdatedDateUTC: "2024-01-15T09:00:00"
            };

            mockClient.getInvoice.mockResolvedValueOnce({
                Invoices: [mockInvoice]
            });

            const result = await executeGetInvoice(mockClient, {
                invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456",
                invoiceNumber: "INV-0042",
                type: "ACCREC",
                status: "AUTHORISED",
                contact: {
                    contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    name: "Sydney Design Co"
                },
                date: "2024-01-15",
                dueDate: "2024-02-15",
                lineItems: [
                    {
                        lineItemId: "li-001",
                        description: "Web Design Services",
                        quantity: 40,
                        unitAmount: 150.0,
                        lineAmount: 6000.0,
                        accountCode: "200",
                        taxType: "OUTPUT"
                    }
                ],
                subTotal: 6000.0,
                totalTax: 600.0,
                total: 6600.0,
                amountDue: 6600.0,
                amountPaid: 0,
                currencyCode: "AUD",
                reference: "PO-2024-001",
                updatedDateUTC: "2024-01-15T09:00:00"
            });
        });

        it("returns not_found error when invoice not found", async () => {
            mockClient.getInvoice.mockResolvedValueOnce({
                Invoices: []
            });

            const result = await executeGetInvoice(mockClient, {
                invoiceId: "00000000-0000-0000-0000-000000000000"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe(
                "Invoice with ID '00000000-0000-0000-0000-000000000000' not found"
            );
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.getInvoice.mockRejectedValueOnce(new Error("Network timeout"));

            const result = await executeGetInvoice(mockClient, {
                invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network timeout");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getInvoice.mockRejectedValueOnce("string error");

            const result = await executeGetInvoice(mockClient, {
                invoiceId: "test-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get invoice");
        });
    });

    describe("executeCreateInvoice", () => {
        it("calls client with minimal params", async () => {
            const mockInvoice: XeroInvoice = {
                InvoiceID: "new-invoice-id",
                Type: "ACCREC",
                Status: "DRAFT",
                Contact: { ContactID: "contact-id", Name: "Test Contact" },
                LineItems: [{ Description: "Test Service" }]
            };

            mockClient.createInvoice.mockResolvedValueOnce({
                Invoices: [mockInvoice]
            });

            // Parse through schema to apply defaults (quantity: 1, status: DRAFT)
            const params = createInvoiceSchema.parse({
                type: "ACCREC",
                contactId: "contact-id",
                lineItems: [{ description: "Test Service", unitAmount: 100 }]
            });

            await executeCreateInvoice(mockClient, params);

            expect(mockClient.createInvoice).toHaveBeenCalledWith({
                Type: "ACCREC",
                Contact: { ContactID: "contact-id" },
                LineItems: [
                    {
                        Description: "Test Service",
                        Quantity: 1,
                        UnitAmount: 100,
                        AccountCode: undefined
                    }
                ],
                Date: undefined,
                DueDate: undefined,
                Reference: undefined,
                Status: "DRAFT"
            });
        });

        it("calls client with full params including multiple line items", async () => {
            const mockInvoice: XeroInvoice = {
                InvoiceID: "g7h8i9j0-k1l2-3456-mnop-789012345678",
                InvoiceNumber: "INV-0043",
                Type: "ACCREC",
                Status: "DRAFT",
                Contact: {
                    ContactID: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    Name: "Sydney Design Co"
                },
                DueDate: "2024-03-15",
                Reference: "PO-2024-015",
                LineItems: [
                    {
                        LineItemID: "li-003",
                        Description: "Consulting Services - February",
                        Quantity: 20,
                        UnitAmount: 200.0,
                        LineAmount: 4000.0,
                        AccountCode: "200",
                        TaxType: "OUTPUT"
                    },
                    {
                        LineItemID: "li-004",
                        Description: "Software License",
                        Quantity: 1,
                        UnitAmount: 500.0,
                        LineAmount: 500.0,
                        AccountCode: "200",
                        TaxType: "OUTPUT"
                    }
                ],
                SubTotal: 4500.0,
                TotalTax: 450.0,
                Total: 4950.0,
                AmountDue: 4950.0,
                AmountPaid: 0,
                CurrencyCode: "AUD",
                UpdatedDateUTC: "2024-02-01T10:00:00"
            };

            mockClient.createInvoice.mockResolvedValueOnce({
                Invoices: [mockInvoice]
            });

            await executeCreateInvoice(mockClient, {
                type: "ACCREC",
                contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                lineItems: [
                    {
                        description: "Consulting Services - February",
                        quantity: 20,
                        unitAmount: 200.0,
                        accountCode: "200"
                    },
                    {
                        description: "Software License",
                        quantity: 1,
                        unitAmount: 500.0,
                        accountCode: "200"
                    }
                ],
                date: "2024-02-01",
                dueDate: "2024-03-15",
                reference: "PO-2024-015",
                status: "DRAFT"
            });

            expect(mockClient.createInvoice).toHaveBeenCalledWith({
                Type: "ACCREC",
                Contact: { ContactID: "b2c3d4e5-f6a7-8901-bcde-f23456789012" },
                LineItems: [
                    {
                        Description: "Consulting Services - February",
                        Quantity: 20,
                        UnitAmount: 200.0,
                        AccountCode: "200"
                    },
                    {
                        Description: "Software License",
                        Quantity: 1,
                        UnitAmount: 500.0,
                        AccountCode: "200"
                    }
                ],
                Date: "2024-02-01",
                DueDate: "2024-03-15",
                Reference: "PO-2024-015",
                Status: "DRAFT"
            });
        });

        it("returns normalized output on success", async () => {
            const mockInvoice: XeroInvoice = {
                InvoiceID: "g7h8i9j0-k1l2-3456-mnop-789012345678",
                InvoiceNumber: "INV-0043",
                Type: "ACCREC",
                Status: "DRAFT",
                Contact: {
                    ContactID: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    Name: "Sydney Design Co"
                },
                Date: "2024-02-01",
                DueDate: "2024-03-15",
                LineItems: [
                    {
                        LineItemID: "li-003",
                        Description: "Consulting Services",
                        Quantity: 20,
                        UnitAmount: 200.0,
                        LineAmount: 4000.0,
                        AccountCode: "200",
                        TaxType: "OUTPUT"
                    }
                ],
                SubTotal: 4000.0,
                TotalTax: 400.0,
                Total: 4400.0,
                AmountDue: 4400.0,
                AmountPaid: 0,
                CurrencyCode: "AUD",
                Reference: "PO-2024-015",
                UpdatedDateUTC: "2024-02-01T10:00:00"
            };

            mockClient.createInvoice.mockResolvedValueOnce({
                Invoices: [mockInvoice]
            });

            const result = await executeCreateInvoice(mockClient, {
                type: "ACCREC",
                contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                lineItems: [
                    {
                        description: "Consulting Services",
                        quantity: 20,
                        unitAmount: 200.0,
                        accountCode: "200"
                    }
                ],
                dueDate: "2024-03-15",
                reference: "PO-2024-015",
                status: "DRAFT"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                invoiceId: "g7h8i9j0-k1l2-3456-mnop-789012345678",
                invoiceNumber: "INV-0043",
                type: "ACCREC",
                status: "DRAFT",
                contact: {
                    contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    name: "Sydney Design Co"
                },
                date: "2024-02-01",
                dueDate: "2024-03-15",
                lineItems: [
                    {
                        lineItemId: "li-003",
                        description: "Consulting Services",
                        quantity: 20,
                        unitAmount: 200.0,
                        lineAmount: 4000.0,
                        accountCode: "200",
                        taxType: "OUTPUT"
                    }
                ],
                subTotal: 4000.0,
                totalTax: 400.0,
                total: 4400.0,
                amountDue: 4400.0,
                amountPaid: 0,
                currencyCode: "AUD",
                reference: "PO-2024-015",
                updatedDateUTC: "2024-02-01T10:00:00"
            });
        });

        it("returns error when no invoice returned", async () => {
            mockClient.createInvoice.mockResolvedValueOnce({
                Invoices: []
            });

            const result = await executeCreateInvoice(mockClient, {
                type: "ACCREC",
                contactId: "contact-id",
                lineItems: [{ description: "Test", unitAmount: 100 }],
                status: "DRAFT"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Failed to create invoice - no response data");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure with contact not found", async () => {
            mockClient.createInvoice.mockRejectedValueOnce(
                new Error("Contact with ID '00000000-0000-0000-0000-000000000000' not found")
            );

            const result = await executeCreateInvoice(mockClient, {
                type: "ACCREC",
                contactId: "00000000-0000-0000-0000-000000000000",
                lineItems: [{ description: "Test Service", unitAmount: 100 }],
                status: "DRAFT"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Contact with ID '00000000-0000-0000-0000-000000000000' not found"
            );
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure with invalid account code", async () => {
            mockClient.createInvoice.mockRejectedValueOnce(
                new Error("Account code '99999' is not valid")
            );

            const result = await executeCreateInvoice(mockClient, {
                type: "ACCREC",
                contactId: "contact-id",
                lineItems: [{ description: "Test Service", unitAmount: 100, accountCode: "99999" }],
                status: "DRAFT"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Account code '99999' is not valid");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createInvoice.mockRejectedValueOnce("string error");

            const result = await executeCreateInvoice(mockClient, {
                type: "ACCREC",
                contactId: "contact-id",
                lineItems: [{ description: "Test", unitAmount: 100 }],
                status: "DRAFT"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create invoice");
        });

        it("supports ACCPAY invoice type", async () => {
            const mockInvoice: XeroInvoice = {
                InvoiceID: "accpay-invoice-id",
                Type: "ACCPAY",
                Status: "DRAFT",
                Contact: { ContactID: "supplier-id", Name: "Supplier" },
                LineItems: [{ Description: "Purchase" }]
            };

            mockClient.createInvoice.mockResolvedValueOnce({
                Invoices: [mockInvoice]
            });

            await executeCreateInvoice(mockClient, {
                type: "ACCPAY",
                contactId: "supplier-id",
                lineItems: [{ description: "Purchase", unitAmount: 500 }],
                status: "DRAFT"
            });

            expect(mockClient.createInvoice).toHaveBeenCalledWith(
                expect.objectContaining({
                    Type: "ACCPAY"
                })
            );
        });
    });

    describe("schema validation", () => {
        describe("getOrganisationSchema", () => {
            it("validates empty input (no params required)", () => {
                const result = getOrganisationSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("ignores extra fields", () => {
                const result = getOrganisationSchema.safeParse({ extraField: "value" });
                expect(result.success).toBe(true);
            });
        });

        describe("listContactsSchema", () => {
            it("validates empty input (uses default page)", () => {
                const result = listContactsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("applies default page of 1", () => {
                const result = listContactsSchema.parse({});
                expect(result.page).toBe(1);
            });

            it("validates with custom page", () => {
                const result = listContactsSchema.safeParse({ page: 5 });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.page).toBe(5);
                }
            });

            it("rejects page less than 1", () => {
                const result = listContactsSchema.safeParse({ page: 0 });
                expect(result.success).toBe(false);
            });

            it("rejects negative page", () => {
                const result = listContactsSchema.safeParse({ page: -1 });
                expect(result.success).toBe(false);
            });
        });

        describe("getContactSchema", () => {
            it("validates with contactId", () => {
                const result = getContactSchema.safeParse({
                    contactId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing contactId", () => {
                const result = getContactSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty contactId", () => {
                const result = getContactSchema.safeParse({ contactId: "" });
                expect(result.success).toBe(false);
            });
        });

        describe("createContactSchema", () => {
            it("validates minimal input (name only)", () => {
                const result = createContactSchema.safeParse({
                    name: "Test Contact"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createContactSchema.safeParse({
                    name: "Brisbane Tech Solutions",
                    firstName: "Emma",
                    lastName: "Taylor",
                    emailAddress: "emma@brisbanetech.com.au",
                    phone: "3456 7890"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing name", () => {
                const result = createContactSchema.safeParse({
                    firstName: "Emma"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty name", () => {
                const result = createContactSchema.safeParse({
                    name: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createContactSchema.safeParse({
                    name: "Test Contact",
                    emailAddress: "not-an-email"
                });
                expect(result.success).toBe(false);
            });

            it("allows contact without email", () => {
                const result = createContactSchema.safeParse({
                    name: "Test Contact"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listInvoicesSchema", () => {
            it("validates empty input (uses default page)", () => {
                const result = listInvoicesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("applies default page of 1", () => {
                const result = listInvoicesSchema.parse({});
                expect(result.page).toBe(1);
            });

            it("validates with custom page", () => {
                const result = listInvoicesSchema.safeParse({ page: 3 });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.page).toBe(3);
                }
            });

            it("rejects page less than 1", () => {
                const result = listInvoicesSchema.safeParse({ page: 0 });
                expect(result.success).toBe(false);
            });
        });

        describe("getInvoiceSchema", () => {
            it("validates with invoiceId", () => {
                const result = getInvoiceSchema.safeParse({
                    invoiceId: "e5f6a7b8-c9d0-1234-efgh-567890123456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing invoiceId", () => {
                const result = getInvoiceSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty invoiceId", () => {
                const result = getInvoiceSchema.safeParse({ invoiceId: "" });
                expect(result.success).toBe(false);
            });
        });

        describe("createInvoiceSchema", () => {
            it("validates minimal input", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test Service", unitAmount: 100 }]
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with multiple line items", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                    lineItems: [
                        {
                            description: "Consulting Services",
                            quantity: 20,
                            unitAmount: 200.0,
                            accountCode: "200"
                        },
                        {
                            description: "Software License",
                            quantity: 1,
                            unitAmount: 500.0,
                            accountCode: "200"
                        }
                    ],
                    date: "2024-02-01",
                    dueDate: "2024-03-15",
                    reference: "PO-2024-015",
                    status: "AUTHORISED"
                });
                expect(result.success).toBe(true);
            });

            it("applies default quantity of 1", () => {
                const result = createInvoiceSchema.parse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test", unitAmount: 100 }]
                });
                expect(result.lineItems[0].quantity).toBe(1);
            });

            it("applies default status of DRAFT", () => {
                const result = createInvoiceSchema.parse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test", unitAmount: 100 }]
                });
                expect(result.status).toBe("DRAFT");
            });

            it("rejects invalid type", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "INVALID",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test", unitAmount: 100 }]
                });
                expect(result.success).toBe(false);
            });

            it("accepts ACCPAY type", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCPAY",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test", unitAmount: 100 }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing type", () => {
                const result = createInvoiceSchema.safeParse({
                    contactId: "contact-id",
                    lineItems: [{ description: "Test", unitAmount: 100 }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing contactId", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    lineItems: [{ description: "Test", unitAmount: 100 }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty lineItems array", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing lineItems", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id"
                });
                expect(result.success).toBe(false);
            });

            it("rejects line item without description", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ unitAmount: 100 }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects line item with empty description", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ description: "", unitAmount: 100 }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects line item without unitAmount", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test" }]
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid status", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test", unitAmount: 100 }],
                    status: "INVALID"
                });
                expect(result.success).toBe(false);
            });

            it("accepts SUBMITTED status", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test", unitAmount: 100 }],
                    status: "SUBMITTED"
                });
                expect(result.success).toBe(true);
            });

            it("accepts AUTHORISED status", () => {
                const result = createInvoiceSchema.safeParse({
                    type: "ACCREC",
                    contactId: "contact-id",
                    lineItems: [{ description: "Test", unitAmount: 100 }],
                    status: "AUTHORISED"
                });
                expect(result.success).toBe(true);
            });
        });
    });
});
