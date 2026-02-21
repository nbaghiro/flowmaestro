/**
 * Persona Input Validator Tests
 *
 * Tests for server-side structured input validation based on field definitions.
 */

import type { PersonaInputField } from "@flowmaestro/shared";
import {
    buildStructuredInputSchema,
    validateStructuredInputs,
    applyInputDefaults
} from "../persona-input-validator";

// ============================================================================
// TEXT FIELD VALIDATION
// ============================================================================

describe("validateStructuredInputs - text fields", () => {
    const textField: PersonaInputField = {
        name: "title",
        type: "text",
        label: "Title",
        required: true,
        validation: {
            min_length: 5,
            max_length: 100
        }
    };

    it("should validate a valid text input", () => {
        const result = validateStructuredInputs([textField], { title: "Valid Title" });
        expect(result.success).toBe(true);
        expect(result.data?.title).toBe("Valid Title");
    });

    it("should reject text below min_length", () => {
        const result = validateStructuredInputs([textField], { title: "Hi" });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("title");
        expect(result.errors?.[0].message).toContain("at least 5");
    });

    it("should reject text above max_length", () => {
        const result = validateStructuredInputs([textField], { title: "x".repeat(101) });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("title");
        expect(result.errors?.[0].message).toContain("at most 100");
    });

    it("should reject empty required text field", () => {
        const result = validateStructuredInputs([textField], { title: "" });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("title");
    });

    it("should validate pattern if provided", () => {
        const fieldWithPattern: PersonaInputField = {
            name: "email",
            type: "text",
            label: "Email",
            required: true,
            validation: {
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            }
        };

        const validResult = validateStructuredInputs([fieldWithPattern], {
            email: "test@example.com"
        });
        expect(validResult.success).toBe(true);

        const invalidResult = validateStructuredInputs([fieldWithPattern], { email: "invalid" });
        expect(invalidResult.success).toBe(false);
    });

    it("should allow optional text field to be undefined", () => {
        const optionalField: PersonaInputField = {
            name: "subtitle",
            type: "text",
            label: "Subtitle",
            required: false
        };

        const result = validateStructuredInputs([optionalField], {});
        expect(result.success).toBe(true);
    });
});

// ============================================================================
// TEXTAREA FIELD VALIDATION
// ============================================================================

describe("validateStructuredInputs - textarea fields", () => {
    const textareaField: PersonaInputField = {
        name: "description",
        type: "textarea",
        label: "Description",
        required: true,
        validation: {
            min_length: 10,
            max_length: 5000
        }
    };

    it("should validate valid textarea input", () => {
        const result = validateStructuredInputs([textareaField], {
            description: "This is a valid description with enough content."
        });
        expect(result.success).toBe(true);
    });

    it("should reject textarea below min_length", () => {
        const result = validateStructuredInputs([textareaField], { description: "Short" });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("description");
    });
});

// ============================================================================
// NUMBER FIELD VALIDATION
// ============================================================================

describe("validateStructuredInputs - number fields", () => {
    const numberField: PersonaInputField = {
        name: "quantity",
        type: "number",
        label: "Quantity",
        required: true,
        validation: {
            min: 1,
            max: 100
        }
    };

    it("should validate valid number input", () => {
        const result = validateStructuredInputs([numberField], { quantity: 50 });
        expect(result.success).toBe(true);
        expect(result.data?.quantity).toBe(50);
    });

    it("should reject number below min", () => {
        const result = validateStructuredInputs([numberField], { quantity: 0 });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("quantity");
        expect(result.errors?.[0].message).toContain("at least 1");
    });

    it("should reject number above max", () => {
        const result = validateStructuredInputs([numberField], { quantity: 150 });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("quantity");
        expect(result.errors?.[0].message).toContain("at most 100");
    });

    it("should allow optional number field to be undefined", () => {
        const optionalField: PersonaInputField = {
            name: "priority",
            type: "number",
            label: "Priority",
            required: false
        };

        const result = validateStructuredInputs([optionalField], {});
        expect(result.success).toBe(true);
    });
});

// ============================================================================
// SELECT FIELD VALIDATION
// ============================================================================

describe("validateStructuredInputs - select fields", () => {
    const selectField: PersonaInputField = {
        name: "category",
        type: "select",
        label: "Category",
        required: true,
        options: [
            { value: "tech", label: "Technology" },
            { value: "business", label: "Business" },
            { value: "marketing", label: "Marketing" }
        ]
    };

    it("should validate valid select option", () => {
        const result = validateStructuredInputs([selectField], { category: "tech" });
        expect(result.success).toBe(true);
        expect(result.data?.category).toBe("tech");
    });

    it("should reject invalid select option", () => {
        const result = validateStructuredInputs([selectField], { category: "invalid" });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("category");
    });

    it("should handle select with no options defined", () => {
        const fieldWithoutOptions: PersonaInputField = {
            name: "custom",
            type: "select",
            label: "Custom",
            required: true,
            options: []
        };

        // Should accept any string when no options defined
        const result = validateStructuredInputs([fieldWithoutOptions], { custom: "anything" });
        expect(result.success).toBe(true);
    });
});

// ============================================================================
// MULTISELECT FIELD VALIDATION
// ============================================================================

describe("validateStructuredInputs - multiselect fields", () => {
    const multiselectField: PersonaInputField = {
        name: "tags",
        type: "multiselect",
        label: "Tags",
        required: true,
        options: [
            { value: "urgent", label: "Urgent" },
            { value: "review", label: "Review" },
            { value: "draft", label: "Draft" }
        ],
        validation: {
            min: 1,
            max: 2
        }
    };

    it("should validate valid multiselect options", () => {
        const result = validateStructuredInputs([multiselectField], { tags: ["urgent", "review"] });
        expect(result.success).toBe(true);
        expect(result.data?.tags).toEqual(["urgent", "review"]);
    });

    it("should reject too many selections", () => {
        const result = validateStructuredInputs([multiselectField], {
            tags: ["urgent", "review", "draft"]
        });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("tags");
        expect(result.errors?.[0].message).toContain("at most 2");
    });

    it("should reject invalid multiselect option", () => {
        const result = validateStructuredInputs([multiselectField], {
            tags: ["urgent", "invalid"]
        });
        expect(result.success).toBe(false);
    });

    it("should reject empty array for required multiselect", () => {
        const result = validateStructuredInputs([multiselectField], { tags: [] });
        expect(result.success).toBe(false);
    });
});

// ============================================================================
// TAGS FIELD VALIDATION
// ============================================================================

describe("validateStructuredInputs - tags fields", () => {
    const tagsField: PersonaInputField = {
        name: "keywords",
        type: "tags",
        label: "Keywords",
        required: true,
        validation: {
            min: 2,
            max: 5
        }
    };

    it("should validate valid tags array", () => {
        const result = validateStructuredInputs([tagsField], { keywords: ["AI", "ML", "NLP"] });
        expect(result.success).toBe(true);
        expect(result.data?.keywords).toEqual(["AI", "ML", "NLP"]);
    });

    it("should reject tags below min count", () => {
        const result = validateStructuredInputs([tagsField], { keywords: ["AI"] });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].message).toContain("at least 2");
    });

    it("should reject tags above max count", () => {
        const result = validateStructuredInputs([tagsField], {
            keywords: ["a", "b", "c", "d", "e", "f"]
        });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].message).toContain("at most 5");
    });
});

// ============================================================================
// CHECKBOX FIELD VALIDATION
// ============================================================================

describe("validateStructuredInputs - checkbox fields", () => {
    const checkboxField: PersonaInputField = {
        name: "agree",
        type: "checkbox",
        label: "I agree to terms",
        required: true
    };

    it("should validate checked checkbox", () => {
        const result = validateStructuredInputs([checkboxField], { agree: true });
        expect(result.success).toBe(true);
        expect(result.data?.agree).toBe(true);
    });

    it("should reject unchecked required checkbox", () => {
        const result = validateStructuredInputs([checkboxField], { agree: false });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].path).toBe("agree");
        expect(result.errors?.[0].message).toContain("Must be checked");
    });

    it("should allow optional checkbox to be false", () => {
        const optionalCheckbox: PersonaInputField = {
            name: "newsletter",
            type: "checkbox",
            label: "Subscribe to newsletter",
            required: false
        };

        const result = validateStructuredInputs([optionalCheckbox], { newsletter: false });
        expect(result.success).toBe(true);
    });
});

// ============================================================================
// FILE FIELD VALIDATION
// ============================================================================

describe("validateStructuredInputs - file fields", () => {
    const fileField: PersonaInputField = {
        name: "documents",
        type: "file",
        label: "Documents",
        required: true,
        validation: {
            max_files: 3
        }
    };

    it("should validate valid file uploads", () => {
        const files = [
            {
                gcs_uri: "gs://bucket/file1.pdf",
                filename: "doc1.pdf",
                file_type: "pdf",
                file_size_bytes: 1024
            },
            {
                gcs_uri: "gs://bucket/file2.pdf",
                filename: "doc2.pdf",
                file_type: "pdf",
                file_size_bytes: 2048
            }
        ];

        const result = validateStructuredInputs([fileField], { documents: files });
        expect(result.success).toBe(true);
    });

    it("should reject too many files", () => {
        const files = [
            { gcs_uri: "gs://bucket/file1.pdf", filename: "doc1.pdf", file_type: "pdf" },
            { gcs_uri: "gs://bucket/file2.pdf", filename: "doc2.pdf", file_type: "pdf" },
            { gcs_uri: "gs://bucket/file3.pdf", filename: "doc3.pdf", file_type: "pdf" },
            { gcs_uri: "gs://bucket/file4.pdf", filename: "doc4.pdf", file_type: "pdf" }
        ];

        const result = validateStructuredInputs([fileField], { documents: files });
        expect(result.success).toBe(false);
        expect(result.errors?.[0].message).toContain("at most 3");
    });

    it("should reject empty array for required file field", () => {
        const result = validateStructuredInputs([fileField], { documents: [] });
        expect(result.success).toBe(false);
    });
});

// ============================================================================
// MULTIPLE FIELDS VALIDATION
// ============================================================================

describe("validateStructuredInputs - multiple fields", () => {
    const fields: PersonaInputField[] = [
        {
            name: "title",
            type: "text",
            label: "Title",
            required: true,
            validation: { min_length: 5 }
        },
        {
            name: "count",
            type: "number",
            label: "Count",
            required: true,
            validation: { min: 1 }
        },
        {
            name: "category",
            type: "select",
            label: "Category",
            required: false,
            options: [{ value: "a", label: "A" }]
        }
    ];

    it("should validate all fields together", () => {
        const result = validateStructuredInputs(fields, {
            title: "Valid Title",
            count: 10
        });
        expect(result.success).toBe(true);
    });

    it("should return multiple errors for multiple invalid fields", () => {
        const result = validateStructuredInputs(fields, {
            title: "Hi", // too short
            count: 0 // below min
        });
        expect(result.success).toBe(false);
        expect(result.errors?.length).toBeGreaterThanOrEqual(2);
    });

    it("should report missing required fields when no inputs provided", () => {
        const result = validateStructuredInputs(fields, undefined);
        expect(result.success).toBe(false);
        expect(result.errors?.length).toBe(2); // title and count are required
    });
});

// ============================================================================
// BUILD SCHEMA
// ============================================================================

describe("buildStructuredInputSchema", () => {
    it("should return optional schema for empty fields", () => {
        const schema = buildStructuredInputSchema([]);
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
    });

    it("should allow passthrough for extra fields", () => {
        const fields: PersonaInputField[] = [
            { name: "title", type: "text", label: "Title", required: true }
        ];

        const schema = buildStructuredInputSchema(fields);
        const result = schema.safeParse({
            title: "Test",
            extraField: "should be allowed"
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.extraField).toBe("should be allowed");
        }
    });
});

// ============================================================================
// APPLY INPUT DEFAULTS
// ============================================================================

describe("applyInputDefaults", () => {
    it("should apply default values for missing fields", () => {
        const fields: PersonaInputField[] = [
            {
                name: "priority",
                type: "number",
                label: "Priority",
                required: false,
                default_value: 5
            },
            {
                name: "status",
                type: "select",
                label: "Status",
                required: false,
                default_value: "draft"
            }
        ];

        const result = applyInputDefaults(fields, {});
        expect(result.priority).toBe(5);
        expect(result.status).toBe("draft");
    });

    it("should not override provided values", () => {
        const fields: PersonaInputField[] = [
            {
                name: "priority",
                type: "number",
                label: "Priority",
                required: false,
                default_value: 5
            }
        ];

        const result = applyInputDefaults(fields, { priority: 10 });
        expect(result.priority).toBe(10);
    });

    it("should handle undefined inputs", () => {
        const fields: PersonaInputField[] = [
            {
                name: "name",
                type: "text",
                label: "Name",
                required: false,
                default_value: "Default Name"
            }
        ];

        const result = applyInputDefaults(fields, undefined);
        expect(result.name).toBe("Default Name");
    });

    it("should preserve fields without defaults", () => {
        const fields: PersonaInputField[] = [
            { name: "title", type: "text", label: "Title", required: true }
        ];

        const result = applyInputDefaults(fields, { title: "My Title" });
        expect(result.title).toBe("My Title");
    });
});
