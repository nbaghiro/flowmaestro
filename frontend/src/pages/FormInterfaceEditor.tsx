import {
    ArrowLeft,
    Save,
    Globe,
    Eye,
    Upload,
    ExternalLink,
    Image,
    Settings,
    Loader2,
    Paperclip,
    Link,
    Plus,
    X
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Checkbox } from "../components/common/Checkbox";
import { Dialog } from "../components/common/Dialog";
import { FormField } from "../components/common/FormField";
import { Input } from "../components/common/Input";
import { LoadingState } from "../components/common/Spinner";
import { CoverPicker } from "../components/form-interface-builder/CoverPicker";
import { IconPicker } from "../components/form-interface-builder/IconPicker";
import { getFormInterface, uploadFormInterfaceAsset } from "../lib/api";
import { logger } from "../lib/logger";
import { useFormInterfaceBuilderStore } from "../stores/formInterfaceBuilderStore";

export function FormInterfaceEditor() {
    const navigate = useNavigate();
    const { id } = useParams();

    // Store
    const {
        formInterface,
        isDirty,
        isSaving,
        isPublishing,
        error,
        setFormInterface,
        updateFormInterface,
        save,
        publish,
        unpublish,
        setError,
        reset
    } = useFormInterfaceBuilderStore();

    // Local state
    const [isLoading, setIsLoading] = useState(true);
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [isUploadingIcon, setIsUploadingIcon] = useState(false);

    // Refs
    const iconButtonRef = useRef<HTMLDivElement>(null);

    // Load form interface on mount
    useEffect(() => {
        if (id) {
            loadFormInterface();
        }

        return () => {
            reset();
        };
    }, [id]);

    // Warn user about unsaved changes when closing/refreshing browser
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const handleBack = useCallback(() => {
        if (isDirty) {
            setShowUnsavedDialog(true);
        } else {
            navigate("/form-interfaces");
        }
    }, [isDirty, navigate]);

    const handleDiscardChanges = useCallback(() => {
        setShowUnsavedDialog(false);
        reset();
        navigate("/form-interfaces");
    }, [navigate, reset]);

    const handleSaveAndLeave = useCallback(async () => {
        const success = await save();
        if (success) {
            setShowUnsavedDialog(false);
            navigate("/form-interfaces");
        }
    }, [save, navigate]);

    const loadFormInterface = async () => {
        try {
            const response = await getFormInterface(id!);
            if (response.success && response.data) {
                setFormInterface(response.data);
            } else {
                setError(response.error || "Failed to load form interface");
            }
        } catch (err) {
            logger.error("Failed to load form interface", err);
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        const success = await save();
        if (success) {
            // Show success feedback
        }
    };

    const handlePublish = async () => {
        const success = await publish();
        if (success) {
            // Show success feedback
        }
    };

    const handleUnpublish = async () => {
        const success = await unpublish();
        if (success) {
            // Show success feedback
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <LoadingState message="Loading form interface..." />
            </div>
        );
    }

    if (!formInterface) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Form interface not found</p>
                    <Button variant="primary" onClick={() => navigate("/form-interfaces")}>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-foreground">{formInterface.title}</h1>
                        <p className="text-xs text-muted-foreground">/i/{formInterface.slug}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {formInterface.status === "published" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/i/${formInterface.slug}`, "_blank")}
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                        </Button>
                    )}

                    <Button variant="ghost" size="sm" onClick={() => setShowSettingsDialog(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                    </Button>

                    {formInterface.status === "draft" ? (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handlePublish}
                            disabled={isPublishing}
                        >
                            {isPublishing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Globe className="w-4 h-4 mr-2" />
                            )}
                            Publish
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleUnpublish}
                            disabled={isPublishing}
                        >
                            {isPublishing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Globe className="w-4 h-4 mr-2" />
                            )}
                            Unpublish
                        </Button>
                    )}
                </div>
            </header>

            {/* Error Alert */}
            {error && (
                <div className="max-w-2xl mx-auto px-6 pt-4">
                    <Alert variant="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </div>
            )}

            {/* Main Content - Form Preview Card */}
            <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
                    {/* Cover */}
                    <div
                        className="h-40 w-full relative cursor-pointer group"
                        style={{
                            backgroundColor:
                                formInterface.coverType === "color"
                                    ? formInterface.coverValue
                                    : "#6366f1",
                            backgroundImage:
                                formInterface.coverType === "image" ||
                                formInterface.coverType === "stock"
                                    ? `url(${formInterface.coverValue})`
                                    : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center"
                        }}
                        onClick={() => setShowCoverPicker(true)}
                    >
                        {/* Cover overlay on hover - hide when icon picker is open */}
                        <div
                            className={`absolute inset-0 bg-black/0 transition-colors flex items-center justify-center ${showIconPicker ? "opacity-0" : "opacity-0 group-hover:opacity-100 group-hover:bg-black/30"}`}
                        >
                            <div className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-lg text-white text-sm">
                                <Image className="w-4 h-4" />
                                Change cover
                            </div>
                        </div>

                        {/* Icon */}
                        <div className="absolute -bottom-8 left-6" ref={iconButtonRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowIconPicker(!showIconPicker);
                                }}
                                className="w-16 h-16 rounded-xl bg-card border-4 border-background flex items-center justify-center text-3xl hover:bg-muted transition-colors overflow-hidden"
                            >
                                {formInterface.iconUrl ? (
                                    formInterface.iconUrl.startsWith("http") ||
                                    formInterface.iconUrl.startsWith("blob:") ? (
                                        <img
                                            src={formInterface.iconUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        formInterface.iconUrl
                                    )
                                ) : (
                                    <Upload className="w-6 h-6 text-muted-foreground" />
                                )}
                            </button>

                            {/* Icon Picker Popover */}
                            {showIconPicker && (
                                <IconPicker
                                    isOpen={showIconPicker}
                                    onClose={() => setShowIconPicker(false)}
                                    onSelect={(icon) => {
                                        updateFormInterface({ iconUrl: icon });
                                        setShowIconPicker(false);
                                    }}
                                    onUpload={async (file) => {
                                        if (!id) throw new Error("Form interface ID not found");
                                        setIsUploadingIcon(true);
                                        try {
                                            const response = await uploadFormInterfaceAsset(
                                                id,
                                                file,
                                                "icon"
                                            );
                                            if (response.success && response.data) {
                                                return response.data.url;
                                            }
                                            throw new Error(response.error || "Upload failed");
                                        } finally {
                                            setIsUploadingIcon(false);
                                        }
                                    }}
                                    currentIcon={formInterface.iconUrl}
                                    isUploading={isUploadingIcon}
                                />
                            )}
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="p-6 pt-12">
                        {/* Title - Editable */}
                        <input
                            type="text"
                            value={formInterface.title}
                            onChange={(e) => updateFormInterface({ title: e.target.value })}
                            placeholder="Interface title"
                            className="text-2xl font-bold text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground"
                        />

                        {/* Description - Editable */}
                        <textarea
                            value={formInterface.description || ""}
                            onChange={(e) =>
                                updateFormInterface({ description: e.target.value || undefined })
                            }
                            placeholder="Add description..."
                            className="mt-2 text-sm text-muted-foreground bg-transparent border-0 focus:outline-none focus:ring-0 w-full resize-none placeholder:text-muted-foreground"
                            rows={2}
                        />

                        {/* Input Preview */}
                        <div className="mt-6 space-y-4">
                            {/* Input Label */}
                            <input
                                type="text"
                                value={formInterface.inputLabel || ""}
                                onChange={(e) =>
                                    updateFormInterface({ inputLabel: e.target.value })
                                }
                                placeholder="Input label..."
                                className="text-sm font-medium text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground"
                            />

                            {/* Message Input Preview */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={
                                        formInterface.inputPlaceholder ||
                                        "Enter placeholder text..."
                                    }
                                    onFocus={(e) => {
                                        // When focused, show the current value for editing
                                        e.target.value = formInterface.inputPlaceholder || "";
                                    }}
                                    onBlur={(e) => {
                                        // On blur, save the value and clear input to show placeholder
                                        if (e.target.value !== formInterface.inputPlaceholder) {
                                            updateFormInterface({
                                                inputPlaceholder: e.target.value
                                            });
                                        }
                                        e.target.value = "";
                                    }}
                                    onChange={(e) =>
                                        updateFormInterface({ inputPlaceholder: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground/50"
                                />
                            </div>

                            {/* File Upload Preview */}
                            {formInterface.allowFileUpload && (
                                <div className="space-y-2">
                                    {/* File Upload Label */}
                                    <input
                                        type="text"
                                        value={formInterface.fileUploadLabel || ""}
                                        onChange={(e) =>
                                            updateFormInterface({ fileUploadLabel: e.target.value })
                                        }
                                        placeholder="Attachments"
                                        className="text-sm font-medium text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground"
                                    />
                                    <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-dashed border-border rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Attach files...
                                        </span>
                                    </div>
                                    {/* Example attached file preview */}
                                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm">
                                        <Paperclip className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-muted-foreground flex-1 truncate">
                                            example-document.pdf
                                        </span>
                                        <button className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* URL Input Preview */}
                            {formInterface.allowUrlInput && (
                                <div className="space-y-2">
                                    {/* URL Input Label */}
                                    <input
                                        type="text"
                                        value={formInterface.urlInputLabel || ""}
                                        onChange={(e) =>
                                            updateFormInterface({ urlInputLabel: e.target.value })
                                        }
                                        placeholder="Web URLs"
                                        className="text-sm font-medium text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground"
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
                                            <Link className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                Paste URL...
                                            </span>
                                        </div>
                                        <button className="p-2 bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors">
                                            <Plus className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                    {/* Example URL preview */}
                                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm">
                                        <Link className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-primary flex-1 truncate">
                                            https://example.com/article
                                        </span>
                                        <button className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button Preview */}
                            <div className="pt-2">
                                <input
                                    type="text"
                                    value={formInterface.submitButtonText || ""}
                                    onChange={(e) =>
                                        updateFormInterface({ submitButtonText: e.target.value })
                                    }
                                    placeholder="Submit"
                                    className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium text-center focus:outline-none focus:ring-0"
                                />
                            </div>
                        </div>

                        {/* Public URL */}
                        <div className="mt-6 pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Public URL</span>
                                {formInterface.status === "published" ? (
                                    <a
                                        href={`/i/${formInterface.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                        {window.location.origin}/i/{formInterface.slug}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                                        {window.location.origin}/i/{formInterface.slug}
                                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">
                                            Draft
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hint */}
                <p className="text-center text-xs text-muted-foreground mt-4">
                    Click on any field to edit. Changes are auto-saved when you click Save.
                </p>
            </div>

            {/* Cover Picker Modal */}
            <CoverPicker
                isOpen={showCoverPicker}
                onClose={() => setShowCoverPicker(false)}
                onSelect={(type, value) => {
                    updateFormInterface({ coverType: type, coverValue: value });
                    setShowCoverPicker(false);
                }}
                currentType={formInterface.coverType}
                currentValue={formInterface.coverValue}
            />

            {/* Settings Dialog */}
            <Dialog
                isOpen={showSettingsDialog}
                onClose={() => setShowSettingsDialog(false)}
                title="Form Settings"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Input Settings */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground mb-3">Input Options</h4>
                        <div className="space-y-3">
                            <Checkbox
                                checked={formInterface.allowFileUpload}
                                onCheckedChange={(checked) =>
                                    updateFormInterface({ allowFileUpload: checked === true })
                                }
                                label="Allow file uploads"
                            />
                            <Checkbox
                                checked={formInterface.allowUrlInput}
                                onCheckedChange={(checked) =>
                                    updateFormInterface({ allowUrlInput: checked === true })
                                }
                                label="Allow URL input"
                            />
                        </div>
                    </div>

                    {/* Output Settings */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground mb-3">Output Options</h4>
                        <div className="space-y-4">
                            <FormField label="Output Label">
                                <Input
                                    value={formInterface.outputLabel || ""}
                                    onChange={(e) =>
                                        updateFormInterface({ outputLabel: e.target.value })
                                    }
                                    placeholder="Output"
                                />
                            </FormField>
                            <div className="space-y-3">
                                <Checkbox
                                    checked={formInterface.showCopyButton}
                                    onCheckedChange={(checked) =>
                                        updateFormInterface({ showCopyButton: checked === true })
                                    }
                                    label="Show copy button"
                                />
                                <Checkbox
                                    checked={formInterface.showDownloadButton}
                                    onCheckedChange={(checked) =>
                                        updateFormInterface({
                                            showDownloadButton: checked === true
                                        })
                                    }
                                    label="Show download button"
                                />
                                <Checkbox
                                    checked={formInterface.allowOutputEdit}
                                    onCheckedChange={(checked) =>
                                        updateFormInterface({ allowOutputEdit: checked === true })
                                    }
                                    label="Allow output editing"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button Settings */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground mb-3">Submit Button</h4>
                        <div className="space-y-4">
                            <FormField label="Loading Text">
                                <Input
                                    value={formInterface.submitLoadingText || ""}
                                    onChange={(e) =>
                                        updateFormInterface({ submitLoadingText: e.target.value })
                                    }
                                    placeholder="Processing..."
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* URL Settings */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground mb-3">URL Settings</h4>
                        <FormField label="URL Slug">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">/i/</span>
                                <Input
                                    value={formInterface.slug}
                                    onChange={(e) => updateFormInterface({ slug: e.target.value })}
                                    placeholder="my-form"
                                    className="flex-1"
                                />
                            </div>
                        </FormField>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-4 border-t border-border">
                        <Button variant="primary" onClick={() => setShowSettingsDialog(false)}>
                            Done
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Unsaved Changes Dialog */}
            <Dialog
                isOpen={showUnsavedDialog}
                onClose={() => setShowUnsavedDialog(false)}
                title="Unsaved Changes"
            >
                <p className="text-muted-foreground mb-6">
                    You have unsaved changes. Would you like to save them before leaving?
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setShowUnsavedDialog(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDiscardChanges}>
                        Discard Changes
                    </Button>
                    <Button variant="primary" onClick={handleSaveAndLeave} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save & Leave
                            </>
                        )}
                    </Button>
                </div>
            </Dialog>
        </div>
    );
}
