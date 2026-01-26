/**
 * Form Interface Builder Store Tests
 *
 * Tests for form interface builder state management including
 * CRUD operations, save/publish/unpublish, and cover/icon helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the API module
vi.mock("../../lib/api", () => ({
    updateFormInterface: vi.fn(),
    publishFormInterface: vi.fn(),
    unpublishFormInterface: vi.fn()
}));

// Mock the logger
vi.mock("../../lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

import { updateFormInterface, publishFormInterface, unpublishFormInterface } from "../../lib/api";
import { useFormInterfaceBuilderStore } from "../formInterfaceBuilderStore";

// Mock data factory
function createMockFormInterface(overrides?: Record<string, unknown>) {
    const defaults = {
        id: "form-123",
        userId: "user-123",
        name: "Test Form",
        slug: "test-form",
        targetType: "workflow" as const,
        workflowId: "workflow-123",
        agentId: null,
        coverType: "color" as const,
        coverValue: "#3B82F6",
        iconUrl: null,
        title: "Test Form Interface",
        description: "A test form interface",
        inputPlaceholder: "Enter your text...",
        inputLabel: "Input",
        fileUploadLabel: "Attach files",
        urlInputLabel: "Add URLs",
        allowFileUpload: false,
        allowUrlInput: false,
        maxFiles: 3,
        maxFileSizeMb: 10,
        allowedFileTypes: [],
        outputLabel: "Output",
        showCopyButton: true,
        showDownloadButton: false,
        allowOutputEdit: false,
        submitButtonText: "Submit",
        submitLoadingText: "Processing...",
        status: "draft" as const,
        publishedAt: null,
        submissionCount: 0,
        lastSubmissionAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    return { ...defaults, ...overrides };
}

// Reset store before each test
function resetStore() {
    useFormInterfaceBuilderStore.setState({
        formInterface: null,
        isDirty: false,
        isSaving: false,
        isPublishing: false,
        activeTab: "design",
        error: null
    });
}

describe("formInterfaceBuilderStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useFormInterfaceBuilderStore.getState();

            expect(state.formInterface).toBeNull();
            expect(state.isDirty).toBe(false);
            expect(state.isSaving).toBe(false);
            expect(state.isPublishing).toBe(false);
            expect(state.activeTab).toBe("design");
            expect(state.error).toBeNull();
        });
    });

    // ===== Set Form Interface =====
    describe("setFormInterface", () => {
        it("sets form interface and clears dirty state", () => {
            const mockInterface = createMockFormInterface();

            useFormInterfaceBuilderStore.setState({ isDirty: true, error: "old error" });
            useFormInterfaceBuilderStore.getState().setFormInterface(mockInterface);

            const state = useFormInterfaceBuilderStore.getState();
            expect(state.formInterface).toEqual(mockInterface);
            expect(state.isDirty).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    // ===== Update Form Interface =====
    describe("updateFormInterface", () => {
        it("updates form interface fields", () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface()
            });

            useFormInterfaceBuilderStore.getState().updateFormInterface({
                name: "Updated Name",
                title: "Updated Title"
            });

            const state = useFormInterfaceBuilderStore.getState();
            expect(state.formInterface?.name).toBe("Updated Name");
            expect(state.formInterface?.title).toBe("Updated Title");
            expect(state.isDirty).toBe(true);
        });

        it("does nothing when no form interface loaded", () => {
            useFormInterfaceBuilderStore.getState().updateFormInterface({
                name: "Test"
            });

            expect(useFormInterfaceBuilderStore.getState().formInterface).toBeNull();
        });

        it("preserves existing fields", () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface({ description: "Original" })
            });

            useFormInterfaceBuilderStore.getState().updateFormInterface({
                name: "Updated"
            });

            expect(useFormInterfaceBuilderStore.getState().formInterface?.description).toBe(
                "Original"
            );
        });
    });

    // ===== Active Tab =====
    describe("setActiveTab", () => {
        it("sets active tab", () => {
            useFormInterfaceBuilderStore.getState().setActiveTab("input");
            expect(useFormInterfaceBuilderStore.getState().activeTab).toBe("input");

            useFormInterfaceBuilderStore.getState().setActiveTab("output");
            expect(useFormInterfaceBuilderStore.getState().activeTab).toBe("output");

            useFormInterfaceBuilderStore.getState().setActiveTab("settings");
            expect(useFormInterfaceBuilderStore.getState().activeTab).toBe("settings");
        });
    });

    // ===== Save =====
    describe("save", () => {
        it("saves form interface successfully", async () => {
            const mockInterface = createMockFormInterface();
            useFormInterfaceBuilderStore.setState({
                formInterface: mockInterface,
                isDirty: true
            });

            vi.mocked(updateFormInterface).mockResolvedValue({
                success: true,
                data: { ...mockInterface, name: "Saved" }
            });

            const result = await useFormInterfaceBuilderStore.getState().save();

            expect(result).toBe(true);
            const state = useFormInterfaceBuilderStore.getState();
            expect(state.formInterface?.name).toBe("Saved");
            expect(state.isDirty).toBe(false);
            expect(state.isSaving).toBe(false);
        });

        it("returns false when no form interface", async () => {
            const result = await useFormInterfaceBuilderStore.getState().save();
            expect(result).toBe(false);
        });

        it("handles save error", async () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface()
            });

            vi.mocked(updateFormInterface).mockRejectedValue(new Error("Save failed"));

            const result = await useFormInterfaceBuilderStore.getState().save();

            expect(result).toBe(false);
            const state = useFormInterfaceBuilderStore.getState();
            expect(state.error).toBe("Save failed");
            expect(state.isSaving).toBe(false);
        });

        it("handles unsuccessful response", async () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface()
            });

            vi.mocked(updateFormInterface).mockResolvedValue({
                success: false,
                data: undefined as never,
                error: "Validation error"
            });

            const result = await useFormInterfaceBuilderStore.getState().save();

            expect(result).toBe(false);
            expect(useFormInterfaceBuilderStore.getState().error).toBe("Validation error");
        });
    });

    // ===== Publish =====
    describe("publish", () => {
        it("publishes form interface successfully", async () => {
            const mockInterface = createMockFormInterface({ status: "draft" });
            useFormInterfaceBuilderStore.setState({
                formInterface: mockInterface,
                isDirty: false
            });

            vi.mocked(publishFormInterface).mockResolvedValue({
                success: true,
                data: { ...mockInterface, status: "published" }
            });

            const result = await useFormInterfaceBuilderStore.getState().publish();

            expect(result).toBe(true);
            expect(useFormInterfaceBuilderStore.getState().formInterface?.status).toBe("published");
        });

        it("saves before publishing if dirty", async () => {
            const mockInterface = createMockFormInterface();
            useFormInterfaceBuilderStore.setState({
                formInterface: mockInterface,
                isDirty: true
            });

            vi.mocked(updateFormInterface).mockResolvedValue({
                success: true,
                data: mockInterface
            });
            vi.mocked(publishFormInterface).mockResolvedValue({
                success: true,
                data: { ...mockInterface, status: "published" }
            });

            await useFormInterfaceBuilderStore.getState().publish();

            expect(updateFormInterface).toHaveBeenCalled();
            expect(publishFormInterface).toHaveBeenCalled();
        });

        it("returns false if save fails", async () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface(),
                isDirty: true
            });

            vi.mocked(updateFormInterface).mockResolvedValue({
                success: false,
                data: undefined as never,
                error: "Save failed"
            });

            const result = await useFormInterfaceBuilderStore.getState().publish();

            expect(result).toBe(false);
            expect(publishFormInterface).not.toHaveBeenCalled();
        });

        it("handles publish error", async () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface(),
                isDirty: false
            });

            vi.mocked(publishFormInterface).mockRejectedValue(new Error("Publish failed"));

            const result = await useFormInterfaceBuilderStore.getState().publish();

            expect(result).toBe(false);
            expect(useFormInterfaceBuilderStore.getState().error).toBe("Publish failed");
        });
    });

    // ===== Unpublish =====
    describe("unpublish", () => {
        it("unpublishes form interface successfully", async () => {
            const mockInterface = createMockFormInterface({ status: "published" });
            useFormInterfaceBuilderStore.setState({
                formInterface: mockInterface
            });

            vi.mocked(unpublishFormInterface).mockResolvedValue({
                success: true,
                data: { ...mockInterface, status: "draft" }
            });

            const result = await useFormInterfaceBuilderStore.getState().unpublish();

            expect(result).toBe(true);
            expect(useFormInterfaceBuilderStore.getState().formInterface?.status).toBe("draft");
        });

        it("handles unpublish error", async () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface()
            });

            vi.mocked(unpublishFormInterface).mockRejectedValue(new Error("Unpublish failed"));

            const result = await useFormInterfaceBuilderStore.getState().unpublish();

            expect(result).toBe(false);
            expect(useFormInterfaceBuilderStore.getState().error).toBe("Unpublish failed");
        });
    });

    // ===== Error Handling =====
    describe("setError", () => {
        it("sets error", () => {
            useFormInterfaceBuilderStore.getState().setError("Some error");
            expect(useFormInterfaceBuilderStore.getState().error).toBe("Some error");
        });

        it("clears error with null", () => {
            useFormInterfaceBuilderStore.setState({ error: "Old error" });
            useFormInterfaceBuilderStore.getState().setError(null);
            expect(useFormInterfaceBuilderStore.getState().error).toBeNull();
        });
    });

    // ===== Reset =====
    describe("reset", () => {
        it("resets all state", () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface(),
                isDirty: true,
                isSaving: true,
                isPublishing: true,
                activeTab: "settings",
                error: "some error"
            });

            useFormInterfaceBuilderStore.getState().reset();

            const state = useFormInterfaceBuilderStore.getState();
            expect(state.formInterface).toBeNull();
            expect(state.isDirty).toBe(false);
            expect(state.isSaving).toBe(false);
            expect(state.isPublishing).toBe(false);
            expect(state.activeTab).toBe("design");
            expect(state.error).toBeNull();
        });
    });

    // ===== Cover Helpers =====
    describe("setCover", () => {
        it("sets cover type and value", () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface()
            });

            useFormInterfaceBuilderStore
                .getState()
                .setCover("image", "https://example.com/cover.jpg");

            const state = useFormInterfaceBuilderStore.getState();
            expect(state.formInterface?.coverType).toBe("image");
            expect(state.formInterface?.coverValue).toBe("https://example.com/cover.jpg");
            expect(state.isDirty).toBe(true);
        });
    });

    describe("setIcon", () => {
        it("sets icon URL", () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface()
            });

            useFormInterfaceBuilderStore.getState().setIcon("https://example.com/icon.png");

            expect(useFormInterfaceBuilderStore.getState().formInterface?.iconUrl).toBe(
                "https://example.com/icon.png"
            );
        });

        it("clears icon with null", () => {
            useFormInterfaceBuilderStore.setState({
                formInterface: createMockFormInterface({ iconUrl: "https://example.com/icon.png" })
            });

            useFormInterfaceBuilderStore.getState().setIcon(null);

            expect(useFormInterfaceBuilderStore.getState().formInterface?.iconUrl).toBeNull();
        });
    });
});
