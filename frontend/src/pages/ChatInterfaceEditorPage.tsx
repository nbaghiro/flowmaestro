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
    MessageSquare,
    Plus,
    X,
    GripVertical,
    Paperclip,
    Send
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { ChatInterfaceSuggestedPrompt } from "@flowmaestro/shared";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Checkbox } from "../components/common/Checkbox";
import { CoverPicker } from "../components/common/CoverPicker";
import { Dialog } from "../components/common/Dialog";
import { FormField } from "../components/common/FormField";
import { IconPicker } from "../components/common/IconPicker";
import { Input } from "../components/common/Input";
import { MobileBuilderGuard } from "../components/common/MobileBuilderGuard";
import { Select, SelectItem } from "../components/common/Select";
import { LoadingState } from "../components/common/Spinner";
import { ThemeToggle } from "../components/common/ThemeToggle";
import { ChatInterfaceEvents } from "../lib/analytics";
import { getChatInterface, uploadChatInterfaceAsset } from "../lib/api";
import { logger } from "../lib/logger";
import { useChatInterfaceBuilderStore } from "../stores/chatInterfaceBuilderStore";

export function ChatInterfaceEditorPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    // Get the folder ID if navigated from a folder page
    const fromFolderId = (location.state as { fromFolderId?: string } | null)?.fromFolderId;

    // Determine where to navigate back to
    const getBackUrl = useCallback(() => {
        if (fromFolderId) {
            return `/folders/${fromFolderId}`;
        }
        return "/chat-interfaces";
    }, [fromFolderId]);

    // Store
    const {
        chatInterface,
        isDirty,
        isSaving,
        isPublishing,
        error,
        setChatInterface,
        updateChatInterface,
        save,
        publish,
        unpublish,
        setError,
        reset,
        addSuggestedPrompt,
        removeSuggestedPrompt,
        updateSuggestedPrompt
    } = useChatInterfaceBuilderStore();

    // Local state
    const [isLoading, setIsLoading] = useState(true);
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [newPromptText, setNewPromptText] = useState("");

    // Refs
    const iconButtonRef = useRef<HTMLDivElement>(null);
    const hasTrackedEditorOpened = useRef(false);

    // Load chat interface on mount
    useEffect(() => {
        if (id) {
            // Track editor opened
            if (!hasTrackedEditorOpened.current) {
                ChatInterfaceEvents.editorOpened({ interfaceId: id });
                hasTrackedEditorOpened.current = true;
            }
            loadChatInterface();
        }

        return () => {
            // Track editor closed
            if (id && hasTrackedEditorOpened.current) {
                ChatInterfaceEvents.editorClosed({ interfaceId: id });
            }
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
            navigate(getBackUrl());
        }
    }, [isDirty, navigate, getBackUrl]);

    const handleDiscardChanges = useCallback(() => {
        setShowUnsavedDialog(false);
        reset();
        navigate(getBackUrl());
    }, [navigate, reset, getBackUrl]);

    const handleSaveAndLeave = useCallback(async () => {
        const success = await save();
        if (success) {
            setShowUnsavedDialog(false);
            navigate(getBackUrl());
        }
    }, [save, navigate, getBackUrl]);

    const loadChatInterface = async () => {
        try {
            const response = await getChatInterface(id!);
            if (response.success && response.data) {
                setChatInterface(response.data);
            } else {
                setError(response.error || "Failed to load chat interface");
            }
        } catch (err) {
            logger.error("Failed to load chat interface", err);
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        const success = await save();
        if (success && id) {
            ChatInterfaceEvents.edited({ interfaceId: id });
        }
    };

    const handlePublish = async () => {
        const success = await publish();
        if (success && id) {
            ChatInterfaceEvents.published({ interfaceId: id });
        }
    };

    const handleUnpublish = async () => {
        const success = await unpublish();
        if (success && id) {
            ChatInterfaceEvents.unpublished({ interfaceId: id });
        }
    };

    const handleAddPrompt = () => {
        if (newPromptText.trim()) {
            addSuggestedPrompt({ text: newPromptText.trim() });
            setNewPromptText("");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <LoadingState message="Loading chat interface..." />
            </div>
        );
    }

    if (!chatInterface) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Chat interface not found</p>
                    <Button variant="primary" onClick={() => navigate("/chat-interfaces")}>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <MobileBuilderGuard
            title="Chat Interface Editor"
            description="The chat interface editor requires a larger screen. Please continue on a desktop or laptop computer to customize your chat interfaces."
            backUrl={getBackUrl()}
        >
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
                            <h1 className="font-semibold text-foreground">{chatInterface.title}</h1>
                            <p className="text-xs text-muted-foreground">/c/{chatInterface.slug}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                navigate(`/chat-interfaces/${id}/preview`, {
                                    state: fromFolderId ? { fromFolderId } : undefined
                                })
                            }
                        >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Preview
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSettingsDialog(true)}
                        >
                            <Settings className="w-4 h-4 mr-1.5" />
                            Settings
                        </Button>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-1.5" />
                            )}
                            Save
                        </Button>

                        {chatInterface.status === "draft" ? (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handlePublish}
                                disabled={isPublishing}
                            >
                                {isPublishing ? (
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Globe className="w-4 h-4 mr-1.5" />
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
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Globe className="w-4 h-4 mr-1.5" />
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

                {/* Main Content - Chat Preview */}
                <div className="max-w-2xl mx-auto px-6 py-8">
                    <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
                        {/* Cover */}
                        <div
                            className="h-32 w-full relative cursor-pointer group"
                            style={{
                                backgroundColor:
                                    chatInterface.coverType === "color"
                                        ? chatInterface.coverValue
                                        : "#6366f1",
                                backgroundImage:
                                    chatInterface.coverType === "image"
                                        ? `url(${chatInterface.coverValue})`
                                        : chatInterface.coverType === "gradient"
                                          ? chatInterface.coverValue
                                          : undefined,
                                backgroundSize: "cover",
                                backgroundPosition: "center"
                            }}
                            onClick={() => setShowCoverPicker(true)}
                        >
                            {/* Cover overlay on hover */}
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
                                    {chatInterface.iconUrl ? (
                                        chatInterface.iconUrl.startsWith("http") ? (
                                            <img
                                                src={chatInterface.iconUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            chatInterface.iconUrl
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
                                            updateChatInterface({ iconUrl: icon });
                                            setShowIconPicker(false);
                                        }}
                                        onFileUpload={async (file) => {
                                            if (!id) return null;
                                            try {
                                                const result = await uploadChatInterfaceAsset(
                                                    id,
                                                    file,
                                                    "icon"
                                                );
                                                return result.data.url;
                                            } catch (err) {
                                                logger.error("Failed to upload icon", err);
                                                setError(
                                                    err instanceof Error
                                                        ? err.message
                                                        : "Failed to upload icon"
                                                );
                                                return null;
                                            }
                                        }}
                                        currentIcon={chatInterface.iconUrl}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Chat Content */}
                        <div className="p-6 pt-12">
                            {/* Title - Editable */}
                            <input
                                type="text"
                                value={chatInterface.title}
                                onChange={(e) => updateChatInterface({ title: e.target.value })}
                                placeholder="Chat interface title"
                                className="text-2xl font-bold text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground"
                            />

                            {/* Description - Editable */}
                            <textarea
                                value={chatInterface.description || ""}
                                onChange={(e) =>
                                    updateChatInterface({
                                        description: e.target.value || undefined
                                    })
                                }
                                placeholder="Add description..."
                                className="mt-2 text-sm text-muted-foreground bg-transparent border-0 focus:outline-none focus:ring-0 w-full resize-none placeholder:text-muted-foreground"
                                rows={2}
                            />

                            {/* Chat Preview Area */}
                            <div className="mt-6 space-y-4">
                                {/* Welcome Message */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Welcome Message
                                    </label>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <MessageSquare className="w-4 h-4 text-primary" />
                                        </div>
                                        <textarea
                                            value={chatInterface.welcomeMessage}
                                            onChange={(e) =>
                                                updateChatInterface({
                                                    welcomeMessage: e.target.value
                                                })
                                            }
                                            placeholder="Hello! How can I help you today?"
                                            className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary/50"
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                {/* Suggested Prompts */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Suggested Prompts
                                    </label>
                                    <div className="space-y-2">
                                        {chatInterface.suggestedPrompts.map(
                                            (
                                                prompt: ChatInterfaceSuggestedPrompt,
                                                index: number
                                            ) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 group"
                                                >
                                                    <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
                                                    <input
                                                        type="text"
                                                        value={prompt.text}
                                                        onChange={(e) =>
                                                            updateSuggestedPrompt(index, {
                                                                ...prompt,
                                                                text: e.target.value
                                                            })
                                                        }
                                                        className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                                                    />
                                                    <button
                                                        onClick={() => removeSuggestedPrompt(index)}
                                                        className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )
                                        )}
                                        {/* Add new prompt */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newPromptText}
                                                onChange={(e) => setNewPromptText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleAddPrompt();
                                                    }
                                                }}
                                                placeholder="Add a suggested prompt..."
                                                className="flex-1 px-3 py-2 bg-transparent border border-dashed border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleAddPrompt}
                                                disabled={!newPromptText.trim()}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Input Placeholder Preview */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Input Placeholder
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        {chatInterface.allowFileUpload && (
                                            <div className="flex-shrink-0 p-2 rounded-lg text-muted-foreground">
                                                <Paperclip className="w-5 h-5" />
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            value={chatInterface.placeholderText}
                                            onChange={(e) =>
                                                updateChatInterface({
                                                    placeholderText: e.target.value
                                                })
                                            }
                                            placeholder="Type a message..."
                                            className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground focus:outline-none focus:border-primary/50"
                                        />
                                        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/50 text-primary-foreground">
                                            <Send className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Public URL */}
                            <div className="mt-6 pt-4 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        Public URL
                                    </span>
                                    {chatInterface.status === "published" ? (
                                        <a
                                            href={`/c/${chatInterface.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            {window.location.origin}/c/{chatInterface.slug}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : (
                                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                                            {window.location.origin}/c/{chatInterface.slug}
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
                        // CoverPicker returns union type, cast to ChatInterfaceCoverType
                        // "stock" maps to "image" for chat interfaces
                        const coverType =
                            type === "stock" ? "image" : (type as "color" | "image" | "gradient");
                        updateChatInterface({
                            coverType,
                            coverValue: value
                        });
                        setShowCoverPicker(false);
                    }}
                    currentType={chatInterface.coverType}
                    currentValue={chatInterface.coverValue}
                />

                {/* Settings Dialog */}
                <Dialog
                    isOpen={showSettingsDialog}
                    onClose={() => setShowSettingsDialog(false)}
                    title="Chat Interface Settings"
                    size="lg"
                >
                    <div className="space-y-6">
                        {/* Session Settings */}
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-3">
                                Session Settings
                            </h4>
                            <div className="space-y-4">
                                <FormField label="Persistence Type">
                                    <Select
                                        value={chatInterface.persistenceType}
                                        onChange={(value) =>
                                            updateChatInterface({
                                                persistenceType: value as
                                                    | "session"
                                                    | "local_storage"
                                            })
                                        }
                                    >
                                        <SelectItem value="session">
                                            Browser Session (expires on close)
                                        </SelectItem>
                                        <SelectItem value="local_storage">
                                            Local Storage (persists across visits)
                                        </SelectItem>
                                    </Select>
                                </FormField>
                                <FormField label="Session Timeout (minutes)">
                                    <Input
                                        type="number"
                                        value={chatInterface.sessionTimeoutMinutes}
                                        onChange={(e) =>
                                            updateChatInterface({
                                                sessionTimeoutMinutes:
                                                    parseInt(e.target.value) || 60
                                            })
                                        }
                                        min={1}
                                        max={1440}
                                    />
                                </FormField>
                            </div>
                        </div>

                        {/* Widget Settings */}
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-3">
                                Widget Settings
                            </h4>
                            <div className="space-y-4">
                                <FormField label="Widget Position">
                                    <Select
                                        value={chatInterface.widgetPosition}
                                        onChange={(value) =>
                                            updateChatInterface({
                                                widgetPosition: value as
                                                    | "bottom-right"
                                                    | "bottom-left"
                                            })
                                        }
                                    >
                                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                    </Select>
                                </FormField>
                                <FormField label="Initial State">
                                    <Select
                                        value={chatInterface.widgetInitialState}
                                        onChange={(value) =>
                                            updateChatInterface({
                                                widgetInitialState: value as
                                                    | "collapsed"
                                                    | "expanded"
                                            })
                                        }
                                    >
                                        <SelectItem value="collapsed">
                                            Collapsed (bubble)
                                        </SelectItem>
                                        <SelectItem value="expanded">Expanded (open)</SelectItem>
                                    </Select>
                                </FormField>
                                <FormField label="Button Text (optional)">
                                    <Input
                                        value={chatInterface.widgetButtonText || ""}
                                        onChange={(e) =>
                                            updateChatInterface({
                                                widgetButtonText: e.target.value || null
                                            })
                                        }
                                        placeholder="Chat with us"
                                    />
                                </FormField>
                            </div>
                        </div>

                        {/* File Upload Settings */}
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-3">
                                File Uploads
                            </h4>
                            <div className="space-y-3">
                                <Checkbox
                                    checked={chatInterface.allowFileUpload}
                                    onCheckedChange={(checked) =>
                                        updateChatInterface({ allowFileUpload: checked === true })
                                    }
                                    label="Allow file uploads"
                                />
                                {chatInterface.allowFileUpload && (
                                    <div className="space-y-4 ml-6">
                                        <FormField label="Max Files">
                                            <Input
                                                type="number"
                                                value={chatInterface.maxFiles}
                                                onChange={(e) =>
                                                    updateChatInterface({
                                                        maxFiles: parseInt(e.target.value) || 5
                                                    })
                                                }
                                                min={1}
                                                max={20}
                                            />
                                        </FormField>
                                        <FormField label="Max File Size (MB)">
                                            <Input
                                                type="number"
                                                value={chatInterface.maxFileSizeMb}
                                                onChange={(e) =>
                                                    updateChatInterface({
                                                        maxFileSizeMb:
                                                            parseInt(e.target.value) || 10
                                                    })
                                                }
                                                min={1}
                                                max={100}
                                            />
                                        </FormField>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rate Limiting */}
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-3">
                                Rate Limiting
                            </h4>
                            <div className="space-y-4">
                                <FormField label="Messages per window">
                                    <Input
                                        type="number"
                                        value={chatInterface.rateLimitMessages}
                                        onChange={(e) =>
                                            updateChatInterface({
                                                rateLimitMessages: parseInt(e.target.value) || 10
                                            })
                                        }
                                        min={1}
                                        max={100}
                                    />
                                </FormField>
                                <FormField label="Window (seconds)">
                                    <Input
                                        type="number"
                                        value={chatInterface.rateLimitWindowSeconds}
                                        onChange={(e) =>
                                            updateChatInterface({
                                                rateLimitWindowSeconds:
                                                    parseInt(e.target.value) || 60
                                            })
                                        }
                                        min={10}
                                        max={3600}
                                    />
                                </FormField>
                            </div>
                        </div>

                        {/* URL Settings */}
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-3">
                                URL Settings
                            </h4>
                            <FormField label="URL Slug">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">/c/</span>
                                    <Input
                                        value={chatInterface.slug}
                                        onChange={(e) =>
                                            updateChatInterface({ slug: e.target.value })
                                        }
                                        placeholder="my-chat"
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
        </MobileBuilderGuard>
    );
}
