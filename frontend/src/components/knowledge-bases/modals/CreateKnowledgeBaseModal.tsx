import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { getKBCategoryById } from "@flowmaestro/shared";
import { Button } from "../../common/Button";
import { Dialog } from "../../common/Dialog";
import { Input } from "../../common/Input";
import { Textarea } from "../../common/Textarea";
import { KBCategoryPicker } from "../KBCategoryPicker";
import { KBChunkMosaicPreview } from "../KBChunkMosaicPreview";

interface CreateKnowledgeBaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, description?: string) => Promise<void>;
}

type Step = "category" | "details";

export function CreateKnowledgeBaseModal({
    isOpen,
    onClose,
    onSubmit
}: CreateKnowledgeBaseModalProps) {
    const [step, setStep] = useState<Step>("category");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedCategory = selectedCategoryId ? getKBCategoryById(selectedCategoryId) : undefined;

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep("category");
            setSelectedCategoryId(null);
            setName("");
            setDescription("");
        }
    }, [isOpen]);

    // Pre-fill form when category is selected and moving to details step
    const handleNextStep = () => {
        if (!selectedCategoryId) return;

        const category = getKBCategoryById(selectedCategoryId);
        if (category && category.id !== "blank") {
            setName(category.suggestedName);
            setDescription(category.suggestedDescription);
        } else {
            setName("");
            setDescription("");
        }
        setStep("details");
    };

    const handleBackStep = () => {
        setStep("category");
    };

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(name, description || undefined);
            // Reset handled by useEffect on next open
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep("category");
        setSelectedCategoryId(null);
        setName("");
        setDescription("");
        onClose();
    };

    const renderCategoryStep = () => (
        <>
            <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                    Choose a category to get started with pre-configured settings.
                </p>
            </div>
            <KBCategoryPicker
                selectedCategory={selectedCategoryId}
                onSelect={handleCategorySelect}
            />
        </>
    );

    const renderDetailsStep = () => (
        <div className="space-y-5">
            {/* Category header with back button */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleBackStep}
                    className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {selectedCategory && (
                        <span className="font-medium text-foreground">{selectedCategory.name}</span>
                    )}
                </div>
            </div>

            {/* Larger mosaic preview */}
            {selectedCategory && selectedCategory.id !== "blank" && (
                <KBChunkMosaicPreview
                    categoryId={selectedCategory.id}
                    color={selectedCategory.color}
                    height="h-28"
                    animated
                    className="rounded-lg"
                />
            )}

            {/* Form fields */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Name <span className="text-red-500">*</span>
                </label>
                <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Knowledge Base"
                    autoFocus
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                    Description
                </label>
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this knowledge base for?"
                    rows={3}
                />
            </div>

            {/* Example docs hint */}
            {selectedCategory && selectedCategory.exampleDocs.length > 0 && (
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Example documents: </span>
                    {selectedCategory.exampleDocs.join(", ")}
                </div>
            )}
        </div>
    );

    const renderFooter = () => {
        if (step === "category") {
            return (
                <div className="flex items-center gap-3 justify-end">
                    <Button variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleNextStep}
                        disabled={!selectedCategoryId}
                    >
                        Next
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3 justify-end">
                <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!name.trim() || isSubmitting}
                    loading={isSubmitting}
                >
                    {isSubmitting ? "Creating..." : "Create"}
                </Button>
            </div>
        );
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Create Knowledge Base"
            size="3xl"
            footer={renderFooter()}
        >
            {step === "category" ? renderCategoryStep() : renderDetailsStep()}
        </Dialog>
    );
}
