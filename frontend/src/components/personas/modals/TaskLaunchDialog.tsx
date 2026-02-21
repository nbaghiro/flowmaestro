import {
    X,
    Rocket,
    Clock,
    Coins,
    Bell,
    ChevronDown,
    ChevronUp,
    Zap,
    Globe,
    Database,
    FileText,
    Code,
    BarChart3,
    Mail,
    Search,
    Bot,
    Package,
    CheckCircle2,
    HelpCircle,
    ArrowLeft,
    Loader2,
    Upload,
    File,
    Trash2
} from "lucide-react";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    getPersonaTemplates,
    generateFromTemplate,
    grantPersonaInstanceConnection,
    uploadPersonaFiles
} from "../../../lib/api";
import { logger } from "../../../lib/logger";
import { usePersonaStore } from "../../../stores/personaStore";
import { Select } from "../../common/Select";
import { Tooltip } from "../../common/Tooltip";
import { ConnectionSelector } from "../connections/ConnectionSelector";
import { TemplateSelector } from "../templates/TemplateSelector";
import type {
    PersonaDefinition,
    CreatePersonaInstanceRequest,
    PersonaInputField,
    PersonaStructuredInputs,
    PersonaTaskTemplateSummary,
    PersonaFileUpload
} from "../../../lib/api";

interface TaskLaunchDialogProps {
    persona: PersonaDefinition;
    isOpen: boolean;
    onClose: () => void;
    onBack?: () => void;
}

// Map tool types to icons
const toolIcons: Record<string, React.ReactNode> = {
    web_search: <Globe className="w-4 h-4" />,
    knowledge_base: <Database className="w-4 h-4" />,
    file_create: <FileText className="w-4 h-4" />,
    code_execution: <Code className="w-4 h-4" />,
    data_analysis: <BarChart3 className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    search: <Search className="w-4 h-4" />
};

// Friendly tool names
const toolNames: Record<string, string> = {
    web_search: "Web Research",
    knowledge_base: "Knowledge Bases",
    file_create: "File Creation",
    code_execution: "Code Execution",
    data_analysis: "Data Analysis",
    email: "Email Drafting",
    search: "Search & Discovery"
};

const durationOptions = [
    { value: 0.25, label: "15 minutes" },
    { value: 0.5, label: "30 minutes" },
    { value: 1, label: "1 hour" },
    { value: 2, label: "2 hours" }
];

// Format duration estimate
function formatDuration(duration: { min_minutes: number; max_minutes: number }): string {
    const formatMinutes = (mins: number): string => {
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    };

    return `${formatMinutes(duration.min_minutes)} - ${formatMinutes(duration.max_minutes)}`;
}

// Tags input component
const TagsInput: React.FC<{
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}> = ({ value, onChange, placeholder, disabled }) => {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed && !value.includes(trimmed)) {
                onChange([...value, trimmed]);
                setInputValue("");
            }
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter((t) => t !== tagToRemove));
    };

    return (
        <div className="flex flex-wrap gap-1.5 p-2 min-h-[42px] bg-background border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary/50">
            {value.map((tag) => (
                <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-sm rounded"
                >
                    {tag}
                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-primary/70"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </span>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={value.length === 0 ? placeholder : ""}
                className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                disabled={disabled}
            />
        </div>
    );
};

// File upload field component
const FileField: React.FC<{
    field: PersonaInputField;
    value: PersonaFileUpload[] | undefined;
    onChange: (value: PersonaFileUpload[]) => void;
    disabled?: boolean;
}> = ({ field, value, onChange, disabled }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const files = value || [];

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const result = await uploadPersonaFiles(Array.from(selectedFiles), {
                fieldName: field.name,
                allowedExtensions: field.validation?.allowed_extensions,
                maxFileSizeBytes: field.validation?.max_file_size_bytes
            });

            if (result.success && result.data) {
                // Convert PersonaFileUploadResult to PersonaFileUpload for storage
                const uploadedFiles: PersonaFileUpload[] = result.data.files.map((f) => ({
                    gcs_uri: f.gcs_uri,
                    filename: f.filename,
                    file_type: f.file_type,
                    file_size_bytes: f.file_size_bytes
                }));

                const newFiles = [...files, ...uploadedFiles];

                // Check max files limit
                const maxFiles = field.validation?.max_files;
                if (maxFiles && newFiles.length > maxFiles) {
                    setUploadError(`Maximum ${maxFiles} files allowed`);
                    return;
                }

                onChange(newFiles);
            } else {
                setUploadError(result.error || "Upload failed");
            }
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        onChange(newFiles);
    };

    const maxFiles = field.validation?.max_files;
    const canAddMore = !maxFiles || files.length < maxFiles;

    return (
        <div className="space-y-2">
            {/* Uploaded files list */}
            {files.length > 0 && (
                <div className="space-y-1.5">
                    {files.map((file, index) => (
                        <div
                            key={`${file.gcs_uri}-${index}`}
                            className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm"
                        >
                            <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 truncate text-foreground">{file.filename}</span>
                            <span className="text-xs text-muted-foreground">
                                {formatFileSize(file.file_size_bytes || 0)}
                            </span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Upload button */}
            {canAddMore && (
                <label
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors ${
                        disabled || isUploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                    <input
                        type="file"
                        multiple={!maxFiles || maxFiles > 1}
                        accept={
                            field.validation?.allowed_extensions
                                ?.map((ext) => `.${ext}`)
                                .join(",") || undefined
                        }
                        onChange={handleFileSelect}
                        disabled={disabled || isUploading}
                        className="hidden"
                    />
                    {isUploading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Uploading...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                {files.length === 0
                                    ? field.placeholder || "Click to upload files"
                                    : "Add more files"}
                            </span>
                        </>
                    )}
                </label>
            )}

            {/* Error message */}
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

            {/* File count indicator */}
            {maxFiles && (
                <p className="text-xs text-muted-foreground">
                    {files.length} / {maxFiles} files
                </p>
            )}
        </div>
    );
};

// Format file size
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Dynamic form field renderer
const FormField: React.FC<{
    field: PersonaInputField;
    value: string | number | boolean | string[] | PersonaFileUpload[] | undefined;
    onChange: (value: string | number | boolean | string[] | PersonaFileUpload[]) => void;
    disabled?: boolean;
}> = ({ field, value, onChange, disabled }) => {
    const baseInputStyles =
        "w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50";

    switch (field.type) {
        case "text":
            return (
                <input
                    type="text"
                    value={(value as string) || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className={baseInputStyles}
                    disabled={disabled}
                    minLength={field.validation?.min_length}
                    maxLength={field.validation?.max_length}
                />
            );

        case "textarea":
            return (
                <textarea
                    value={(value as string) || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className={`${baseInputStyles} min-h-[100px] resize-y`}
                    disabled={disabled}
                    maxLength={field.validation?.max_length}
                />
            );

        case "number":
            return (
                <input
                    type="number"
                    value={value as number | ""}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
                    placeholder={field.placeholder}
                    className={baseInputStyles}
                    disabled={disabled}
                    min={field.validation?.min}
                    max={field.validation?.max}
                />
            );

        case "select":
            return (
                <Select
                    value={(value as string) || ""}
                    onChange={(v) => onChange(v)}
                    options={field.options?.map((opt) => ({
                        value: opt.value,
                        label: opt.label
                    }))}
                    placeholder="Select..."
                    disabled={disabled}
                />
            );

        case "multiselect": {
            const selectedValues = Array.isArray(value) ? (value as string[]) : [];
            return (
                <div className="space-y-1.5">
                    {field.options?.map((opt) => (
                        <label
                            key={opt.value}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(opt.value)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        onChange([...selectedValues, opt.value]);
                                    } else {
                                        onChange(selectedValues.filter((v) => v !== opt.value));
                                    }
                                }}
                                className="rounded border-border"
                                disabled={disabled}
                            />
                            <span className="text-foreground">{opt.label}</span>
                        </label>
                    ))}
                </div>
            );
        }

        case "tags":
            return (
                <TagsInput
                    value={Array.isArray(value) ? (value as string[]) : []}
                    onChange={(v) => onChange(v)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                />
            );

        case "checkbox":
            return (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                        className="rounded border-border"
                        disabled={disabled}
                    />
                    <span className="text-foreground">{field.label}</span>
                </label>
            );

        case "file":
            return (
                <FileField
                    field={field}
                    value={value as PersonaFileUpload[] | undefined}
                    onChange={(v) => onChange(v)}
                    disabled={disabled}
                />
            );

        default:
            return null;
    }
};

export const TaskLaunchDialog: React.FC<TaskLaunchDialogProps> = ({
    persona,
    isOpen,
    onClose,
    onBack
}) => {
    const navigate = useNavigate();
    const { createInstance } = usePersonaStore();

    // Template state
    const [templates, setTemplates] = useState<PersonaTaskTemplateSummary[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<PersonaTaskTemplateSummary | null>(
        null
    );
    const [templateVariables, setTemplateVariables] = useState<
        Record<string, string | number | boolean | string[] | PersonaFileUpload[]>
    >({});

    // Fetch templates when dialog opens
    useEffect(() => {
        if (isOpen && persona.slug) {
            setTemplatesLoading(true);
            getPersonaTemplates(persona.slug)
                .then((response) => {
                    setTemplates(response.data.templates || []);
                })
                .catch((err) => {
                    logger.error("Failed to fetch templates", err);
                    setTemplates([]);
                })
                .finally(() => {
                    setTemplatesLoading(false);
                });
        }
    }, [isOpen, persona.slug]);

    // Handle template selection
    const handleTemplateSelect = useCallback(
        (template: PersonaTaskTemplateSummary | null) => {
            setSelectedTemplate(template);
            if (template) {
                // Initialize template variables from defaults
                const initialVars: Record<string, string | number | boolean | string[]> = {};
                for (const variable of template.variables) {
                    if (variable.default_value !== undefined) {
                        initialVars[variable.name] = variable.default_value;
                    }
                }
                setTemplateVariables(initialVars);
                // Update duration/cost suggestions from template
                setMaxDurationHours(template.suggested_duration_hours);
                setMaxCostCredits(template.suggested_max_cost);
            } else {
                setTemplateVariables({});
                // Reset to persona defaults
                setMaxDurationHours(persona.default_max_duration_hours);
                setMaxCostCredits(persona.default_max_cost_credits);
            }
        },
        [persona.default_max_duration_hours, persona.default_max_cost_credits]
    );

    // Update template variable
    const updateTemplateVariable = useCallback(
        (name: string, value: string | number | boolean | string[] | PersonaFileUpload[]) => {
            setTemplateVariables((prev) => ({
                ...prev,
                [name]: value
            }));
        },
        []
    );

    // Initialize form values from field defaults
    const initialInputs = useMemo(() => {
        const inputs: PersonaStructuredInputs = {};
        if (persona.input_fields) {
            for (const field of persona.input_fields) {
                if (field.default_value !== undefined) {
                    inputs[field.name] = field.default_value;
                }
            }
        }
        return inputs;
    }, [persona.input_fields]);

    const [structuredInputs, setStructuredInputs] =
        useState<PersonaStructuredInputs>(initialInputs);

    const updateField = useCallback(
        (fieldName: string, value: string | number | boolean | string[] | PersonaFileUpload[]) => {
            setStructuredInputs((prev) => ({
                ...prev,
                [fieldName]: value
            }));
        },
        []
    );

    // Determine which fields to show
    const activeFields = useMemo(() => {
        if (selectedTemplate) {
            return selectedTemplate.variables;
        }
        return persona.input_fields || [];
    }, [selectedTemplate, persona.input_fields]);

    // Get current input values based on whether template is selected
    const currentInputs = selectedTemplate ? templateVariables : structuredInputs;
    const updateCurrentField = selectedTemplate ? updateTemplateVariable : updateField;
    const [maxDurationHours, setMaxDurationHours] = useState<number>(
        persona.default_max_duration_hours
    );
    const [maxCostCredits, setMaxCostCredits] = useState<number | undefined>(
        persona.default_max_cost_credits
    );
    const [notifyOnApproval, setNotifyOnApproval] = useState(true);
    const [notifyOnCompletion, setNotifyOnCompletion] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Connection state
    const [selectedConnections, setSelectedConnections] = useState<
        { connection_id: string; scopes?: string[] }[]
    >([]);

    // Check if form is valid (all required fields and connections have values)
    const isFormValid = useMemo(() => {
        const fields = activeFields;
        const inputs = currentInputs;

        // Check required input fields
        if (fields && fields.length > 0) {
            for (const field of fields) {
                if (!field.required) continue;

                const value = inputs[field.name];
                if (value === undefined || value === "" || value === null) {
                    return false;
                }
                if (Array.isArray(value) && value.length === 0) {
                    return false;
                }
            }
        }

        // Check required connections
        const requirements = persona.connection_requirements || [];
        for (const req of requirements) {
            if (req.required) {
                // Check if any selected connection matches this provider
                // We don't have provider info on selectedConnections, so we'll skip this check
                // and let the backend validate
            }
        }

        return true;
    }, [activeFields, currentInputs, persona.connection_requirements]);

    const handleSubmit = useCallback(
        async (e?: React.FormEvent | React.MouseEvent) => {
            e?.preventDefault();

            if (!isFormValid) {
                setError("Please fill in all required fields");
                return;
            }

            setIsSubmitting(true);
            setError(null);

            try {
                let taskDescription: string;

                // If using a template, generate task description from template
                if (selectedTemplate) {
                    const generateResponse = await generateFromTemplate(
                        persona.slug,
                        selectedTemplate.id,
                        templateVariables
                    );
                    taskDescription = generateResponse.data.task_description;
                } else {
                    // Build task description from structured inputs for backwards compatibility
                    taskDescription = buildTaskDescription(
                        persona.input_fields || [],
                        structuredInputs
                    );
                }

                // Extract file uploads from inputs and build additional_context
                const inputs = selectedTemplate ? templateVariables : structuredInputs;
                const fileUploads: Record<
                    string,
                    Array<{
                        gcs_uri: string;
                        filename: string;
                        file_type: string;
                        file_size_bytes?: number;
                    }>
                > = {};

                // Find file fields and extract uploads
                const fieldsToCheck = activeFields || [];
                for (const field of fieldsToCheck) {
                    if (field.type === "file") {
                        const fieldValue = inputs[field.name] as PersonaFileUpload[] | undefined;
                        if (Array.isArray(fieldValue) && fieldValue.length > 0) {
                            fileUploads[field.name] = fieldValue.map((f) => ({
                                gcs_uri: f.gcs_uri,
                                filename: f.filename,
                                file_type: f.file_type,
                                file_size_bytes: f.file_size_bytes
                            }));
                        }
                    }
                }

                // Build additional_context with file_uploads if present
                const additionalContext =
                    Object.keys(fileUploads).length > 0 ? { file_uploads: fileUploads } : undefined;

                const request: CreatePersonaInstanceRequest = {
                    persona_slug: persona.slug,
                    structured_inputs: inputs,
                    task_description: taskDescription,
                    max_duration_hours: maxDurationHours,
                    max_cost_credits: maxCostCredits,
                    notification_config: {
                        on_approval_needed: notifyOnApproval,
                        on_completion: notifyOnCompletion
                    },
                    // Include file uploads in additional context
                    ...(additionalContext && { additional_context: additionalContext }),
                    // Include template info if using a template
                    ...(selectedTemplate && {
                        template_id: selectedTemplate.id,
                        template_variables: templateVariables
                    })
                };

                const instance = await createInstance(request);

                // Grant selected connections to the instance
                for (const conn of selectedConnections) {
                    try {
                        await grantPersonaInstanceConnection(
                            instance.id,
                            conn.connection_id,
                            conn.scopes
                        );
                    } catch (connErr) {
                        logger.error("Failed to grant connection", connErr as Error);
                        // Continue with other connections even if one fails
                    }
                }

                // Navigate to the instance view
                navigate(`/persona-instances/${instance.id}`);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to launch task");
            } finally {
                setIsSubmitting(false);
            }
        },
        [
            isFormValid,
            structuredInputs,
            templateVariables,
            selectedTemplate,
            selectedConnections,
            maxDurationHours,
            maxCostCredits,
            notifyOnApproval,
            notifyOnCompletion,
            persona.slug,
            persona.input_fields,
            createInstance,
            navigate,
            onClose
        ]
    );

    if (!isOpen) return null;

    // Get unique tool types for display
    const tools = persona.default_tools || [];
    const uniqueToolTypes = [...new Set(tools.map((t) => t.type))].slice(0, 5);

    // Use deliverables if available, otherwise fall back to typical_deliverables
    const deliverables =
        persona.deliverables && persona.deliverables.length > 0 ? persona.deliverables : null;
    const guaranteedDeliverables = deliverables?.filter((d) => d.guaranteed) || [];

    // Check if we have fields to show (either from template or persona)
    const hasInputFields = activeFields && activeFields.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-card rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Fixed Header */}
                <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 pb-6 border-b border-border">
                    <div className="flex items-start gap-5">
                        {/* Avatar */}
                        <div className="relative">
                            {persona.avatar_url ? (
                                <img
                                    src={persona.avatar_url}
                                    alt={persona.name}
                                    className="w-20 h-20 rounded-2xl border-2 border-primary/20"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
                                    <Bot className="w-10 h-10 text-primary" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-card" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-bold text-foreground">
                                    {persona.name}
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                    <Zap className="w-3 h-3" />
                                    Autonomous
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {persona.specialty || persona.description}
                            </p>

                            {/* Estimates */}
                            {(persona.estimated_duration || persona.estimated_cost_credits > 0) && (
                                <div className="flex items-center gap-4 mt-3">
                                    {persona.estimated_duration && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                                {formatDuration(persona.estimated_duration)}
                                            </span>
                                        </div>
                                    )}
                                    {persona.estimated_cost_credits > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Coins className="w-3.5 h-3.5" />
                                            <span>~{persona.estimated_cost_credits} credits</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Capabilities Pills */}
                    {uniqueToolTypes.length > 0 && (
                        <div className="mt-5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                Capabilities
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {uniqueToolTypes.map((toolType) => (
                                    <div
                                        key={toolType}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border rounded-full text-xs text-foreground"
                                    >
                                        {toolIcons[toolType] || <Zap className="w-4 h-4" />}
                                        <span>{toolNames[toolType] || toolType}</span>
                                    </div>
                                ))}
                                {tools.length > 5 && (
                                    <div className="px-2.5 py-1 bg-muted text-xs text-muted-foreground rounded-full">
                                        +{tools.length - 5} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Error message */}
                        {error && (
                            <div className="p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Template Selector */}
                        {templatesLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading templates...
                            </div>
                        ) : templates.length > 0 ? (
                            <TemplateSelector
                                templates={templates}
                                selectedTemplateId={selectedTemplate?.id || null}
                                onSelect={handleTemplateSelect}
                                disabled={isSubmitting}
                            />
                        ) : null}

                        {/* Divider when template is selected */}
                        {selectedTemplate && (
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground">
                                    Fill in the details
                                </span>
                                <div className="flex-1 h-px bg-border" />
                            </div>
                        )}

                        {/* Dynamic Input Fields */}
                        {hasInputFields ? (
                            <div className="space-y-5">
                                {activeFields?.map((field) => (
                                    <div key={field.name}>
                                        {field.type !== "checkbox" && (
                                            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                                                {field.label}
                                                {field.required && (
                                                    <span className="text-red-500">*</span>
                                                )}
                                                {field.help_text && (
                                                    <Tooltip
                                                        content={field.help_text}
                                                        position="top"
                                                    >
                                                        <span className="text-muted-foreground cursor-help">
                                                            <HelpCircle className="w-3.5 h-3.5" />
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </label>
                                        )}
                                        <FormField
                                            field={field}
                                            value={currentInputs[field.name]}
                                            onChange={(v) => updateCurrentField(field.name, v)}
                                            disabled={isSubmitting}
                                        />
                                        {field.help_text && field.type !== "checkbox" && (
                                            <p className="text-xs text-muted-foreground mt-1.5">
                                                {field.help_text}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : !selectedTemplate ? (
                            /* Legacy: Single task description field (only if no template selected) */
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Brief your specialist
                                </label>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Describe what you need. Be specific about goals, scope, and any
                                    constraints. {persona.name.split(" - ")[0]} will work
                                    autonomously and deliver results.
                                </p>
                                <textarea
                                    value={(structuredInputs["task_description"] as string) || ""}
                                    onChange={(e) =>
                                        updateField("task_description", e.target.value)
                                    }
                                    placeholder={persona.example_tasks[0] || "Describe the task..."}
                                    className="w-full min-h-[120px] px-4 py-3 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                                    disabled={isSubmitting}
                                />
                            </div>
                        ) : null}

                        {/* Guaranteed Deliverables (v2) */}
                        {guaranteedDeliverables.length > 0 && (
                            <div className="bg-muted/30 rounded-lg p-4">
                                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                                    <Package className="w-3.5 h-3.5" />
                                    Guaranteed Deliverables
                                </p>
                                <div className="space-y-2">
                                    {guaranteedDeliverables.map((deliverable) => (
                                        <div
                                            key={deliverable.name}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="text-foreground font-medium">
                                                    {deliverable.name.replace(/_/g, " ")}
                                                </span>
                                                <span className="text-muted-foreground ml-1">
                                                    ({deliverable.type})
                                                </span>
                                                {deliverable.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {deliverable.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Legacy Deliverables fallback */}
                        {!deliverables && persona.typical_deliverables?.length > 0 && (
                            <div className="bg-muted/30 rounded-lg p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                    What you'll receive
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {persona.typical_deliverables
                                        .slice(0, 4)
                                        .map((deliverable, idx) => (
                                            <span
                                                key={idx}
                                                className="text-sm text-foreground bg-card px-3 py-1 rounded border border-border"
                                            >
                                                {deliverable.replace(/\s*\([^)]*\)/g, "").trim()}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Connection Selector - only shows if persona has connection requirements */}
                        <ConnectionSelector
                            requirements={persona.connection_requirements || []}
                            selectedConnections={selectedConnections}
                            onConnectionsChange={setSelectedConnections}
                            disabled={isSubmitting}
                        />

                        {/* Advanced Options Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showAdvanced ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                            Advanced options
                        </button>

                        {/* Advanced Options */}
                        {showAdvanced && (
                            <div className="space-y-4 pl-4 border-l-2 border-border">
                                {/* Execution Limits */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            Time limit
                                        </label>
                                        <select
                                            value={maxDurationHours}
                                            onChange={(e) =>
                                                setMaxDurationHours(Number(e.target.value))
                                            }
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            disabled={isSubmitting}
                                        >
                                            {durationOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                                            <Coins className="w-4 h-4 text-muted-foreground" />
                                            Budget limit
                                        </label>
                                        <input
                                            type="number"
                                            value={maxCostCredits || ""}
                                            onChange={(e) =>
                                                setMaxCostCredits(
                                                    e.target.value
                                                        ? Number(e.target.value)
                                                        : undefined
                                                )
                                            }
                                            placeholder="100 credits"
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            disabled={isSubmitting}
                                            min={1}
                                            max={10000}
                                        />
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-3">
                                        <Bell className="w-4 h-4 text-muted-foreground" />
                                        Notifications
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notifyOnApproval}
                                                onChange={(e) =>
                                                    setNotifyOnApproval(e.target.checked)
                                                }
                                                className="rounded border-border"
                                                disabled={isSubmitting}
                                            />
                                            When approval is needed
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notifyOnCompletion}
                                                onChange={(e) =>
                                                    setNotifyOnCompletion(e.target.checked)
                                                }
                                                className="rounded border-border"
                                                disabled={isSubmitting}
                                            />
                                            When task completes
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Fixed Footer */}
                <div className="border-t border-border bg-card p-6 space-y-4">
                    {/* Actions */}
                    <div className="flex gap-3">
                        {onBack ? (
                            <button
                                type="button"
                                onClick={onBack}
                                className="p-2.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                disabled={isSubmitting}
                                title="Back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors ${!isFormValid && !isSubmitting ? "cursor-not-allowed" : ""}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-4 h-4" />
                                    Assign Task
                                </>
                            )}
                        </button>
                    </div>

                    {/* Trust indicator */}
                    <p className="text-xs text-center text-muted-foreground">
                        {persona.name.split(" - ")[0]} will work in the background. You'll be
                        notified of progress and can intervene anytime.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Helper to build task description from structured inputs
function buildTaskDescription(
    fields: PersonaInputField[],
    inputs: PersonaStructuredInputs
): string {
    const parts: string[] = [];

    for (const field of fields) {
        const value = inputs[field.name];
        if (value === undefined || value === "" || value === null) continue;

        if (Array.isArray(value)) {
            if (value.length > 0) {
                parts.push(`${field.label}: ${value.join(", ")}`);
            }
        } else if (typeof value === "boolean") {
            if (value) {
                parts.push(field.label);
            }
        } else {
            parts.push(`${field.label}: ${value}`);
        }
    }

    return parts.join("\n");
}
