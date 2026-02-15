/**
 * Typeform Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeGetForm, getFormSchema } from "../operations/getForm";
import { executeListForms, listFormsSchema } from "../operations/listForms";
import { executeListResponses, listResponsesSchema } from "../operations/listResponses";
import { executeListWorkspaces, listWorkspacesSchema } from "../operations/listWorkspaces";
import type { TypeformClient } from "../client/TypeformClient";
import type {
    TypeformFormDetail,
    TypeformFormsResponse,
    TypeformResponsesResponse,
    TypeformWorkspacesResponse
} from "../types";

// Mock TypeformClient factory
function createMockTypeformClient(): jest.Mocked<TypeformClient> {
    return {
        getForm: jest.fn(),
        listForms: jest.fn(),
        listResponses: jest.fn(),
        listWorkspaces: jest.fn(),
        getMe: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<TypeformClient>;
}

describe("Typeform Operation Executors", () => {
    let mockClient: jest.Mocked<TypeformClient>;

    beforeEach(() => {
        mockClient = createMockTypeformClient();
    });

    describe("executeGetForm", () => {
        const mockFormDetail: TypeformFormDetail = {
            id: "abc123xyz",
            title: "Customer Feedback Survey",
            type: "form",
            last_updated_at: "2024-01-20T15:30:00.000Z",
            created_at: "2024-01-10T09:00:00.000Z",
            workspace: {
                href: "https://api.typeform.com/workspaces/ws_abc123"
            },
            _links: {
                display: "https://demo.typeform.com/to/abc123xyz"
            },
            settings: {
                language: "en",
                progress_bar: "percentage",
                is_public: true,
                show_progress_bar: true
            },
            welcome_screens: [
                {
                    ref: "welcome_screen_1",
                    title: "Welcome to our feedback survey!",
                    properties: {
                        button_text: "Start",
                        description: "This survey takes about 3 minutes."
                    }
                }
            ],
            thankyou_screens: [
                {
                    ref: "thankyou_screen_1",
                    title: "Thank you for your feedback!",
                    properties: {
                        button_text: "Visit our website",
                        redirect_url: "https://example.com/thank-you"
                    }
                }
            ],
            fields: [
                {
                    id: "field_rating_01",
                    ref: "overall_satisfaction",
                    title: "How satisfied are you with our service?",
                    type: "opinion_scale",
                    validations: {
                        required: true
                    },
                    properties: {
                        steps: 10
                    }
                },
                {
                    id: "field_text_02",
                    ref: "feedback_comments",
                    title: "Any additional comments?",
                    type: "long_text",
                    validations: {
                        required: false
                    },
                    properties: {}
                }
            ],
            logic: [
                {
                    type: "field",
                    ref: "overall_satisfaction"
                }
            ],
            variables: [
                {
                    type: "number",
                    name: "score",
                    value: 0
                }
            ]
        };

        it("calls client with correct params", async () => {
            mockClient.getForm.mockResolvedValueOnce(mockFormDetail);

            await executeGetForm(mockClient, { formId: "abc123xyz" });

            expect(mockClient.getForm).toHaveBeenCalledWith("abc123xyz");
        });

        it("returns normalized output on success", async () => {
            mockClient.getForm.mockResolvedValueOnce(mockFormDetail);

            const result = await executeGetForm(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "abc123xyz",
                title: "Customer Feedback Survey",
                type: "form",
                lastUpdatedAt: "2024-01-20T15:30:00.000Z",
                createdAt: "2024-01-10T09:00:00.000Z",
                workspaceHref: "https://api.typeform.com/workspaces/ws_abc123",
                displayLink: "https://demo.typeform.com/to/abc123xyz",
                settings: {
                    language: "en",
                    progress_bar: "percentage",
                    is_public: true,
                    show_progress_bar: true
                },
                welcomeScreens: [
                    {
                        ref: "welcome_screen_1",
                        title: "Welcome to our feedback survey!",
                        buttonText: "Start",
                        description: "This survey takes about 3 minutes."
                    }
                ],
                thankYouScreens: [
                    {
                        ref: "thankyou_screen_1",
                        title: "Thank you for your feedback!",
                        buttonText: "Visit our website",
                        redirectUrl: "https://example.com/thank-you"
                    }
                ],
                fields: [
                    {
                        id: "field_rating_01",
                        ref: "overall_satisfaction",
                        title: "How satisfied are you with our service?",
                        type: "opinion_scale",
                        required: true,
                        properties: {
                            steps: 10
                        }
                    },
                    {
                        id: "field_text_02",
                        ref: "feedback_comments",
                        title: "Any additional comments?",
                        type: "long_text",
                        required: false,
                        properties: {}
                    }
                ],
                fieldCount: 2,
                hasLogic: true,
                variables: [
                    {
                        type: "number",
                        name: "score",
                        value: 0
                    }
                ]
            });
        });

        it("handles form with no fields", async () => {
            const formWithNoFields: TypeformFormDetail = {
                id: "empty123",
                title: "Empty Form",
                type: "form"
            };
            mockClient.getForm.mockResolvedValueOnce(formWithNoFields);

            const result = await executeGetForm(mockClient, { formId: "empty123" });

            expect(result.success).toBe(true);
            expect(result.data?.fieldCount).toBe(0);
            expect(result.data?.hasLogic).toBe(false);
        });

        it("handles form with no welcome or thank you screens", async () => {
            const minimalForm: TypeformFormDetail = {
                id: "minimal123",
                title: "Minimal Form",
                fields: [
                    {
                        id: "field_1",
                        title: "Name",
                        type: "short_text"
                    }
                ]
            };
            mockClient.getForm.mockResolvedValueOnce(minimalForm);

            const result = await executeGetForm(mockClient, { formId: "minimal123" });

            expect(result.success).toBe(true);
            expect(result.data?.welcomeScreens).toBeUndefined();
            expect(result.data?.thankYouScreens).toBeUndefined();
        });

        it("returns not_found error when form does not exist", async () => {
            mockClient.getForm.mockRejectedValueOnce(new Error("Typeform resource not found."));

            const result = await executeGetForm(mockClient, { formId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toContain('Form with ID "nonexistent" not found');
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server_error on client failure", async () => {
            mockClient.getForm.mockRejectedValueOnce(new Error("Internal server error"));

            const result = await executeGetForm(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Internal server error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getForm.mockRejectedValueOnce("string error");

            const result = await executeGetForm(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get form");
        });
    });

    describe("executeListForms", () => {
        const mockFormsResponse: TypeformFormsResponse = {
            total_items: 3,
            page_count: 1,
            items: [
                {
                    id: "form_001",
                    title: "Customer Feedback Survey",
                    last_updated_at: "2024-01-20T15:30:00.000Z",
                    created_at: "2024-01-10T09:00:00.000Z",
                    workspace: {
                        href: "https://api.typeform.com/workspaces/ws_marketing"
                    },
                    _links: {
                        display: "https://demo.typeform.com/to/form_001"
                    }
                },
                {
                    id: "form_002",
                    title: "Job Application",
                    last_updated_at: "2024-01-18T12:00:00.000Z",
                    created_at: "2024-01-05T10:30:00.000Z",
                    workspace: {
                        href: "https://api.typeform.com/workspaces/ws_hr"
                    },
                    _links: {
                        display: "https://careers.typeform.com/to/form_002"
                    }
                },
                {
                    id: "form_003",
                    title: "Event Registration",
                    last_updated_at: "2024-01-15T08:45:00.000Z",
                    created_at: "2024-01-01T14:00:00.000Z",
                    workspace: {
                        href: "https://api.typeform.com/workspaces/ws_events"
                    },
                    _links: {
                        display: "https://events.typeform.com/to/form_003"
                    }
                }
            ]
        };

        it("calls client with default params", async () => {
            mockClient.listForms.mockResolvedValueOnce(mockFormsResponse);

            await executeListForms(mockClient, {});

            expect(mockClient.listForms).toHaveBeenCalledWith({
                page: undefined,
                pageSize: undefined,
                search: undefined,
                workspaceId: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listForms.mockResolvedValueOnce(mockFormsResponse);

            await executeListForms(mockClient, {
                page: 2,
                pageSize: 50,
                search: "feedback",
                workspaceId: "ws_marketing"
            });

            expect(mockClient.listForms).toHaveBeenCalledWith({
                page: 2,
                pageSize: 50,
                search: "feedback",
                workspaceId: "ws_marketing"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listForms.mockResolvedValueOnce(mockFormsResponse);

            const result = await executeListForms(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                totalItems: 3,
                pageCount: 1,
                forms: [
                    {
                        id: "form_001",
                        title: "Customer Feedback Survey",
                        lastUpdatedAt: "2024-01-20T15:30:00.000Z",
                        createdAt: "2024-01-10T09:00:00.000Z",
                        workspaceHref: "https://api.typeform.com/workspaces/ws_marketing",
                        displayLink: "https://demo.typeform.com/to/form_001"
                    },
                    {
                        id: "form_002",
                        title: "Job Application",
                        lastUpdatedAt: "2024-01-18T12:00:00.000Z",
                        createdAt: "2024-01-05T10:30:00.000Z",
                        workspaceHref: "https://api.typeform.com/workspaces/ws_hr",
                        displayLink: "https://careers.typeform.com/to/form_002"
                    },
                    {
                        id: "form_003",
                        title: "Event Registration",
                        lastUpdatedAt: "2024-01-15T08:45:00.000Z",
                        createdAt: "2024-01-01T14:00:00.000Z",
                        workspaceHref: "https://api.typeform.com/workspaces/ws_events",
                        displayLink: "https://events.typeform.com/to/form_003"
                    }
                ]
            });
        });

        it("handles empty form list", async () => {
            const emptyResponse: TypeformFormsResponse = {
                total_items: 0,
                page_count: 0,
                items: []
            };
            mockClient.listForms.mockResolvedValueOnce(emptyResponse);

            const result = await executeListForms(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.totalItems).toBe(0);
            expect(result.data?.forms).toHaveLength(0);
        });

        it("handles forms with missing optional fields", async () => {
            const minimalResponse: TypeformFormsResponse = {
                total_items: 1,
                page_count: 1,
                items: [
                    {
                        id: "form_minimal",
                        title: "Minimal Form"
                    }
                ]
            };
            mockClient.listForms.mockResolvedValueOnce(minimalResponse);

            const result = await executeListForms(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.forms[0]).toEqual({
                id: "form_minimal",
                title: "Minimal Form",
                lastUpdatedAt: undefined,
                createdAt: undefined,
                workspaceHref: undefined,
                displayLink: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listForms.mockRejectedValueOnce(
                new Error("Typeform rate limit exceeded. Retry after 30 seconds.")
            );

            const result = await executeListForms(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listForms.mockRejectedValueOnce({ unexpected: "error" });

            const result = await executeListForms(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list forms");
        });
    });

    describe("executeListResponses", () => {
        const mockResponsesResponse: TypeformResponsesResponse = {
            total_items: 2,
            page_count: 1,
            items: [
                {
                    landing_id: "landing_001",
                    token: "resp_token_abc123",
                    response_id: "response_001",
                    landed_at: "2024-01-20T10:00:00.000Z",
                    submitted_at: "2024-01-20T10:05:32.000Z",
                    metadata: {
                        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                        platform: "other",
                        referer: "https://example.com/feedback",
                        browser: "default"
                    },
                    hidden: {
                        customer_id: "cust_12345",
                        utm_source: "email"
                    },
                    calculated: {
                        score: 85
                    },
                    answers: [
                        {
                            field: {
                                id: "field_rating_01",
                                type: "opinion_scale",
                                ref: "overall_satisfaction"
                            },
                            type: "number",
                            number: 9
                        },
                        {
                            field: {
                                id: "field_email_02",
                                type: "email",
                                ref: "contact_email"
                            },
                            type: "email",
                            email: "john@example.com"
                        },
                        {
                            field: {
                                id: "field_text_03",
                                type: "long_text",
                                ref: "comments"
                            },
                            type: "text",
                            text: "Great service!"
                        }
                    ]
                },
                {
                    landing_id: "landing_002",
                    token: "resp_token_def456",
                    response_id: "response_002",
                    landed_at: "2024-01-19T14:30:00.000Z",
                    submitted_at: "2024-01-19T14:38:15.000Z",
                    metadata: {
                        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
                        platform: "mobile",
                        referer: "https://example.com/app",
                        browser: "default"
                    },
                    answers: [
                        {
                            field: {
                                id: "field_choice_01",
                                type: "multiple_choice",
                                ref: "product_used"
                            },
                            type: "choice",
                            choice: {
                                id: "choice_1",
                                label: "Product A",
                                ref: "prod_a"
                            }
                        },
                        {
                            field: {
                                id: "field_choices_02",
                                type: "multiple_choice",
                                ref: "features"
                            },
                            type: "choices",
                            choices: {
                                ids: ["f1", "f2"],
                                labels: ["Feature 1", "Feature 2"],
                                refs: ["feat_1", "feat_2"]
                            }
                        }
                    ]
                }
            ]
        };

        it("calls client with required formId only", async () => {
            mockClient.listResponses.mockResolvedValueOnce(mockResponsesResponse);

            await executeListResponses(mockClient, { formId: "abc123xyz" });

            expect(mockClient.listResponses).toHaveBeenCalledWith("abc123xyz", {
                pageSize: undefined,
                since: undefined,
                until: undefined,
                after: undefined,
                before: undefined,
                includedResponseIds: undefined,
                completed: undefined,
                sort: undefined,
                query: undefined,
                fields: undefined
            });
        });

        it("calls client with all optional params", async () => {
            mockClient.listResponses.mockResolvedValueOnce(mockResponsesResponse);

            await executeListResponses(mockClient, {
                formId: "abc123xyz",
                pageSize: 100,
                since: "2024-01-01T00:00:00.000Z",
                until: "2024-01-31T23:59:59.999Z",
                after: "token_abc",
                before: "token_xyz",
                includedResponseIds: "resp1,resp2",
                completed: true,
                sort: "submitted_at,desc",
                query: "excellent",
                fields: ["field_01", "field_02"]
            });

            expect(mockClient.listResponses).toHaveBeenCalledWith("abc123xyz", {
                pageSize: 100,
                since: "2024-01-01T00:00:00.000Z",
                until: "2024-01-31T23:59:59.999Z",
                after: "token_abc",
                before: "token_xyz",
                includedResponseIds: "resp1,resp2",
                completed: true,
                sort: "submitted_at,desc",
                query: "excellent",
                fields: ["field_01", "field_02"]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listResponses.mockResolvedValueOnce(mockResponsesResponse);

            const result = await executeListResponses(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(true);
            expect(result.data?.totalItems).toBe(2);
            expect(result.data?.pageCount).toBe(1);
            expect(result.data?.responses).toHaveLength(2);

            // Check first response
            const firstResponse = result.data?.responses[0];
            expect(firstResponse).toEqual({
                landingId: "landing_001",
                token: "resp_token_abc123",
                responseId: "response_001",
                landedAt: "2024-01-20T10:00:00.000Z",
                submittedAt: "2024-01-20T10:05:32.000Z",
                isCompleted: true,
                metadata: {
                    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                    platform: "other",
                    referer: "https://example.com/feedback",
                    browser: "default"
                },
                hiddenFields: {
                    customer_id: "cust_12345",
                    utm_source: "email"
                },
                calculatedScore: 85,
                answers: [
                    {
                        fieldId: "field_rating_01",
                        fieldType: "opinion_scale",
                        fieldRef: "overall_satisfaction",
                        answerType: "number",
                        value: 9
                    },
                    {
                        fieldId: "field_email_02",
                        fieldType: "email",
                        fieldRef: "contact_email",
                        answerType: "email",
                        value: "john@example.com"
                    },
                    {
                        fieldId: "field_text_03",
                        fieldType: "long_text",
                        fieldRef: "comments",
                        answerType: "text",
                        value: "Great service!"
                    }
                ]
            });
        });

        it("correctly extracts choice answer values", async () => {
            mockClient.listResponses.mockResolvedValueOnce(mockResponsesResponse);

            const result = await executeListResponses(mockClient, { formId: "abc123xyz" });

            const secondResponse = result.data?.responses[1];
            expect(secondResponse?.answers?.[0].value).toBe("Product A");
            expect(secondResponse?.answers?.[1].value).toEqual(["Feature 1", "Feature 2"]);
        });

        it("handles incomplete responses (no submitted_at)", async () => {
            const incompleteResponse: TypeformResponsesResponse = {
                total_items: 1,
                page_count: 1,
                items: [
                    {
                        landing_id: "landing_incomplete",
                        token: "resp_token_incomplete",
                        landed_at: "2024-01-20T10:00:00.000Z"
                        // No submitted_at
                    }
                ]
            };
            mockClient.listResponses.mockResolvedValueOnce(incompleteResponse);

            const result = await executeListResponses(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(true);
            expect(result.data?.responses[0].isCompleted).toBe(false);
            expect(result.data?.responses[0].submittedAt).toBeUndefined();
        });

        it("handles responses with no metadata", async () => {
            const noMetadataResponse: TypeformResponsesResponse = {
                total_items: 1,
                page_count: 1,
                items: [
                    {
                        landing_id: "landing_no_meta",
                        token: "resp_token_no_meta",
                        landed_at: "2024-01-20T10:00:00.000Z",
                        submitted_at: "2024-01-20T10:05:00.000Z"
                    }
                ]
            };
            mockClient.listResponses.mockResolvedValueOnce(noMetadataResponse);

            const result = await executeListResponses(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(true);
            expect(result.data?.responses[0].metadata).toBeUndefined();
        });

        it("handles responses with various answer types", async () => {
            const variedAnswersResponse: TypeformResponsesResponse = {
                total_items: 1,
                page_count: 1,
                items: [
                    {
                        landing_id: "landing_varied",
                        token: "resp_token_varied",
                        landed_at: "2024-01-20T10:00:00.000Z",
                        submitted_at: "2024-01-20T10:05:00.000Z",
                        answers: [
                            {
                                field: { id: "f1", type: "short_text" },
                                type: "text",
                                text: "Short text answer"
                            },
                            {
                                field: { id: "f2", type: "phone_number" },
                                type: "phone_number",
                                phone_number: "+1234567890"
                            },
                            {
                                field: { id: "f3", type: "yes_no" },
                                type: "boolean",
                                boolean: true
                            },
                            {
                                field: { id: "f4", type: "date" },
                                type: "date",
                                date: "2024-01-15"
                            },
                            {
                                field: { id: "f5", type: "website" },
                                type: "url",
                                url: "https://example.com"
                            },
                            {
                                field: { id: "f6", type: "file_upload" },
                                type: "file_url",
                                file_url: "https://files.typeform.com/abc123"
                            },
                            {
                                field: { id: "f7", type: "payment" },
                                type: "payment",
                                payment: {
                                    amount: "99.99",
                                    last4: "4242",
                                    name: "John Doe",
                                    success: true
                                }
                            }
                        ]
                    }
                ]
            };
            mockClient.listResponses.mockResolvedValueOnce(variedAnswersResponse);

            const result = await executeListResponses(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(true);
            const answers = result.data?.responses[0].answers;
            expect(answers?.[0].value).toBe("Short text answer");
            expect(answers?.[1].value).toBe("+1234567890");
            expect(answers?.[2].value).toBe(true);
            expect(answers?.[3].value).toBe("2024-01-15");
            expect(answers?.[4].value).toBe("https://example.com");
            expect(answers?.[5].value).toBe("https://files.typeform.com/abc123");
            expect(answers?.[6].value).toEqual({
                amount: "99.99",
                last4: "4242",
                name: "John Doe",
                success: true
            });
        });

        it("handles empty responses list", async () => {
            const emptyResponse: TypeformResponsesResponse = {
                total_items: 0,
                page_count: 0,
                items: []
            };
            mockClient.listResponses.mockResolvedValueOnce(emptyResponse);

            const result = await executeListResponses(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(true);
            expect(result.data?.totalItems).toBe(0);
            expect(result.data?.responses).toHaveLength(0);
        });

        it("returns not_found error when form does not exist", async () => {
            mockClient.listResponses.mockRejectedValueOnce(
                new Error("Typeform resource not found.")
            );

            const result = await executeListResponses(mockClient, { formId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toContain('Form with ID "nonexistent" not found');
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server_error on client failure", async () => {
            mockClient.listResponses.mockRejectedValueOnce(new Error("Internal server error"));

            const result = await executeListResponses(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Internal server error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listResponses.mockRejectedValueOnce(null);

            const result = await executeListResponses(mockClient, { formId: "abc123xyz" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list responses");
        });
    });

    describe("executeListWorkspaces", () => {
        const mockWorkspacesResponse: TypeformWorkspacesResponse = {
            total_items: 3,
            page_count: 1,
            items: [
                {
                    id: "ws_default_001",
                    name: "My Workspace",
                    default: true,
                    shared: false,
                    forms: {
                        count: 12,
                        href: "https://api.typeform.com/workspaces/ws_default_001/forms"
                    },
                    self: {
                        href: "https://api.typeform.com/workspaces/ws_default_001"
                    },
                    members: [
                        {
                            email: "owner@example.com",
                            name: "Account Owner",
                            role: "owner"
                        }
                    ]
                },
                {
                    id: "ws_marketing",
                    name: "Marketing Team",
                    default: false,
                    shared: true,
                    forms: {
                        count: 8,
                        href: "https://api.typeform.com/workspaces/ws_marketing/forms"
                    },
                    self: {
                        href: "https://api.typeform.com/workspaces/ws_marketing"
                    },
                    members: [
                        {
                            email: "owner@example.com",
                            name: "Account Owner",
                            role: "owner"
                        },
                        {
                            email: "marketing.lead@example.com",
                            name: "Marketing Lead",
                            role: "admin"
                        }
                    ]
                },
                {
                    id: "ws_hr",
                    name: "Human Resources",
                    default: false,
                    shared: true,
                    forms: {
                        count: 15,
                        href: "https://api.typeform.com/workspaces/ws_hr/forms"
                    },
                    self: {
                        href: "https://api.typeform.com/workspaces/ws_hr"
                    }
                }
            ]
        };

        it("calls client with default params", async () => {
            mockClient.listWorkspaces.mockResolvedValueOnce(mockWorkspacesResponse);

            await executeListWorkspaces(mockClient, {});

            expect(mockClient.listWorkspaces).toHaveBeenCalledWith({
                page: undefined,
                pageSize: undefined,
                search: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listWorkspaces.mockResolvedValueOnce(mockWorkspacesResponse);

            await executeListWorkspaces(mockClient, {
                page: 2,
                pageSize: 50,
                search: "marketing"
            });

            expect(mockClient.listWorkspaces).toHaveBeenCalledWith({
                page: 2,
                pageSize: 50,
                search: "marketing"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listWorkspaces.mockResolvedValueOnce(mockWorkspacesResponse);

            const result = await executeListWorkspaces(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                totalItems: 3,
                pageCount: 1,
                workspaces: [
                    {
                        id: "ws_default_001",
                        name: "My Workspace",
                        isDefault: true,
                        isShared: false,
                        formCount: 12,
                        formsHref: "https://api.typeform.com/workspaces/ws_default_001/forms",
                        selfHref: "https://api.typeform.com/workspaces/ws_default_001",
                        members: [
                            {
                                email: "owner@example.com",
                                name: "Account Owner",
                                role: "owner"
                            }
                        ]
                    },
                    {
                        id: "ws_marketing",
                        name: "Marketing Team",
                        isDefault: false,
                        isShared: true,
                        formCount: 8,
                        formsHref: "https://api.typeform.com/workspaces/ws_marketing/forms",
                        selfHref: "https://api.typeform.com/workspaces/ws_marketing",
                        members: [
                            {
                                email: "owner@example.com",
                                name: "Account Owner",
                                role: "owner"
                            },
                            {
                                email: "marketing.lead@example.com",
                                name: "Marketing Lead",
                                role: "admin"
                            }
                        ]
                    },
                    {
                        id: "ws_hr",
                        name: "Human Resources",
                        isDefault: false,
                        isShared: true,
                        formCount: 15,
                        formsHref: "https://api.typeform.com/workspaces/ws_hr/forms",
                        selfHref: "https://api.typeform.com/workspaces/ws_hr",
                        members: undefined
                    }
                ]
            });
        });

        it("handles empty workspaces list", async () => {
            const emptyResponse: TypeformWorkspacesResponse = {
                total_items: 0,
                page_count: 0,
                items: []
            };
            mockClient.listWorkspaces.mockResolvedValueOnce(emptyResponse);

            const result = await executeListWorkspaces(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.totalItems).toBe(0);
            expect(result.data?.workspaces).toHaveLength(0);
        });

        it("handles workspace with minimal data", async () => {
            const minimalResponse: TypeformWorkspacesResponse = {
                total_items: 1,
                page_count: 1,
                items: [
                    {
                        id: "ws_minimal",
                        name: "Minimal Workspace"
                    }
                ]
            };
            mockClient.listWorkspaces.mockResolvedValueOnce(minimalResponse);

            const result = await executeListWorkspaces(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.workspaces[0]).toEqual({
                id: "ws_minimal",
                name: "Minimal Workspace",
                isDefault: undefined,
                isShared: undefined,
                formCount: undefined,
                formsHref: undefined,
                selfHref: undefined,
                members: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listWorkspaces.mockRejectedValueOnce(
                new Error("Typeform authentication failed. Please reconnect.")
            );

            const result = await executeListWorkspaces(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("authentication failed");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listWorkspaces.mockRejectedValueOnce(undefined);

            const result = await executeListWorkspaces(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list workspaces");
        });
    });

    describe("schema validation", () => {
        describe("getFormSchema", () => {
            it("validates valid input", () => {
                const result = getFormSchema.safeParse({
                    formId: "abc123xyz"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing formId", () => {
                const result = getFormSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty formId", () => {
                const result = getFormSchema.safeParse({
                    formId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listFormsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listFormsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with page param", () => {
                const result = listFormsSchema.safeParse({
                    page: 1
                });
                expect(result.success).toBe(true);
            });

            it("validates with pageSize param", () => {
                const result = listFormsSchema.safeParse({
                    pageSize: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates with search param", () => {
                const result = listFormsSchema.safeParse({
                    search: "feedback"
                });
                expect(result.success).toBe(true);
            });

            it("validates with workspaceId param", () => {
                const result = listFormsSchema.safeParse({
                    workspaceId: "ws_123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = listFormsSchema.safeParse({
                    page: 2,
                    pageSize: 100,
                    search: "survey",
                    workspaceId: "ws_abc"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid page (less than 1)", () => {
                const result = listFormsSchema.safeParse({
                    page: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid pageSize (greater than 200)", () => {
                const result = listFormsSchema.safeParse({
                    pageSize: 201
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative pageSize", () => {
                const result = listFormsSchema.safeParse({
                    pageSize: -1
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listResponsesSchema", () => {
            it("validates minimal input (formId only)", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz"
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination params", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    pageSize: 100
                });
                expect(result.success).toBe(true);
            });

            it("validates with date range params", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    since: "2024-01-01T00:00:00.000Z",
                    until: "2024-01-31T23:59:59.999Z"
                });
                expect(result.success).toBe(true);
            });

            it("validates with cursor params", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    after: "token_abc",
                    before: "token_xyz"
                });
                expect(result.success).toBe(true);
            });

            it("validates with completed filter", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    completed: true
                });
                expect(result.success).toBe(true);
            });

            it("validates with sort param ascending", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    sort: "submitted_at,asc"
                });
                expect(result.success).toBe(true);
            });

            it("validates with sort param descending", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    sort: "submitted_at,desc"
                });
                expect(result.success).toBe(true);
            });

            it("validates with query param", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    query: "excellent service"
                });
                expect(result.success).toBe(true);
            });

            it("validates with fields param", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    fields: ["field_01", "field_02", "field_03"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    pageSize: 500,
                    since: "2024-01-01T00:00:00.000Z",
                    until: "2024-01-31T23:59:59.999Z",
                    after: "token_abc",
                    before: "token_xyz",
                    includedResponseIds: "resp1,resp2,resp3",
                    completed: true,
                    sort: "submitted_at,desc",
                    query: "great",
                    fields: ["field_01"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing formId", () => {
                const result = listResponsesSchema.safeParse({
                    pageSize: 100
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty formId", () => {
                const result = listResponsesSchema.safeParse({
                    formId: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid pageSize (greater than 1000)", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    pageSize: 1001
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid sort value", () => {
                const result = listResponsesSchema.safeParse({
                    formId: "abc123xyz",
                    sort: "invalid_sort"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listWorkspacesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listWorkspacesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with page param", () => {
                const result = listWorkspacesSchema.safeParse({
                    page: 1
                });
                expect(result.success).toBe(true);
            });

            it("validates with pageSize param", () => {
                const result = listWorkspacesSchema.safeParse({
                    pageSize: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates with search param", () => {
                const result = listWorkspacesSchema.safeParse({
                    search: "marketing"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = listWorkspacesSchema.safeParse({
                    page: 1,
                    pageSize: 100,
                    search: "team"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid page (less than 1)", () => {
                const result = listWorkspacesSchema.safeParse({
                    page: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid pageSize (greater than 200)", () => {
                const result = listWorkspacesSchema.safeParse({
                    pageSize: 250
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative pageSize", () => {
                const result = listWorkspacesSchema.safeParse({
                    pageSize: -10
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
