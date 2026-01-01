import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { ContextConfigEditor } from "@/components/interface-builder/ContextConfigEditor";
import { CoverEditor, type CoverType } from "@/components/interface-builder/CoverEditor";
import { IconUploader } from "@/components/interface-builder/IconUploader";
import { InputConfigEditor } from "@/components/interface-builder/InputConfigEditor";
import { InterfaceEditorLayout } from "@/components/interface-builder/InterfaceEditorLayout";
import { InterfacePreview } from "@/components/interface-builder/InterfacePreview";
import { OutputConfigEditor } from "@/components/interface-builder/OutputConfigEditor";
import { SubmitButtonEditor } from "@/components/interface-builder/SubmitButtonEditor";
import { TargetDisplay } from "@/components/interface-builder/TargetDisplay";
import { TargetSelectionDialog } from "@/components/interface-builder/TargetSelectionDialog";
import { TitleDescriptionEditor } from "@/components/interface-builder/TitleDescriptionEditor";
import {
    createFormInterface,
    getFormInterfaceById,
    getWorkflow,
    getAgent,
    updateFormInterface,
    publishFormInterface,
    unpublishFormInterface,
    uploadFormInterfaceAsset
} from "@/lib/api";

type TargetType = "workflow" | "agent";

export function InterfaceEditorPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const isCreateMode = location.pathname.endsWith("/new");
    const isEditMode = !isCreateMode;
    const editId = isEditMode ? id : undefined;

    const [target, setTarget] = useState<TargetType | null>(null);
    const [targetName, setTargetName] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [submitButton, setSubmitButton] = useState("Submit");
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [status, setStatus] = useState<"draft" | "published">("draft");
    const [createError, setCreateError] = useState<string | null>(null);
    const [inputLabel, setInputLabel] = useState("Message");
    const [inputPlaceholder, setInputPlaceholder] = useState("Type your message…");
    const [allowFileUpload, setAllowFileUpload] = useState(true);
    const [allowUrlInput, setAllowUrlInput] = useState(true);
    const [maxFiles, setMaxFiles] = useState(5);
    const [outputLabel, setOutputLabel] = useState("Output");
    const [showCopyButton, setShowCopyButton] = useState(true);
    const [showDownloadButton, setShowDownloadButton] = useState(true);
    const [allowOutputEdit, setAllowOutputEdit] = useState(false);
    const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
    const [iconPreviewUrl, setIconPreviewUrl] = useState<string | undefined>(undefined);
    const [pendingIconFile, setPendingIconFile] = useState<File | null>(null);
    const [coverType, setCoverType] = useState<"color" | "image" | "stock">("color");
    const [coverValue, setCoverValue] = useState("#000000");
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
    const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const isTargetReady =
        target === "workflow"
            ? Boolean(selectedWorkflowId)
            : target === "agent"
              ? Boolean(selectedAgentId)
              : false;

    function resetCreateFlow() {
        setTarget(null);
        setTargetName(null);
        setSelectedWorkflowId(null);
        setSelectedAgentId(null);
        setName("");
        setSlug("");
        setTitle("");
        setDescription("");
        setSubmitButton("Submit");
        setInputLabel("Message");
        setInputPlaceholder("Type your message…");
        setAllowFileUpload(true);
        setAllowUrlInput(true);
        setMaxFiles(5);
        setOutputLabel("Output");
        setShowCopyButton(true);
        setShowDownloadButton(true);
        setAllowOutputEdit(false);
        setIconUrl(undefined);
        setIconPreviewUrl(undefined);
        setPendingIconFile(null);
        setCoverType("color");
        setCoverValue("#000000");
        setCoverPreviewUrl(null);
        setPendingCoverFile(null);
    }

    useEffect(() => {
        if (!editId) return;

        let cancelled = false;

        async function load(interfaceId: string) {
            const res = await getFormInterfaceById(interfaceId);
            if (cancelled) return;

            const iface = res.data;

            setName(iface.name);
            setSlug(iface.slug);
            setTitle(iface.title);
            setDescription(iface.description ?? "");
            setTarget(iface.targetType);
            setSubmitButton(iface.submitButtonText);
            setIconUrl(iface.iconUrl ?? undefined);
            setIconPreviewUrl(
                iface.iconUrl && iface.iconUrl.startsWith("http") ? iface.iconUrl : undefined
            );
            setCoverType(iface.coverType);
            setCoverValue(iface.coverValue);
            setCoverPreviewUrl(
                iface.coverValue && iface.coverValue.startsWith("http") ? iface.coverValue : null
            );
            setInputLabel(iface.inputLabel);
            setInputPlaceholder(iface.inputPlaceholder);
            setAllowFileUpload(iface.allowFileUpload);
            setAllowUrlInput(iface.allowUrlInput);
            setMaxFiles(iface.maxFiles);
            setOutputLabel(iface.outputLabel);
            setShowCopyButton(iface.showCopyButton);
            setShowDownloadButton(iface.showDownloadButton);
            setAllowOutputEdit(iface.allowOutputEdit);
            setStatus(iface.status);

            if (iface.targetType === "workflow" && iface.workflowId) {
                setSelectedWorkflowId(iface.workflowId);

                const wfRes = await getWorkflow(iface.workflowId);
                if (!cancelled) setTargetName(wfRes.data.name);
            }

            if (iface.targetType === "agent" && iface.agentId) {
                setSelectedAgentId(iface.agentId);

                const agentRes = await getAgent(iface.agentId);
                if (!cancelled) setTargetName(agentRes.data.name);
            }
        }

        load(editId);

        return () => {
            cancelled = true;
        };
    }, [editId]);

    useEffect(() => {
        if (!isCreateMode) return;
        if (!target) return;

        let cancelled = false;

        async function loadTargetName() {
            if (target === "workflow" && selectedWorkflowId) {
                const res = await getWorkflow(selectedWorkflowId);
                if (!cancelled) setTargetName(res.data.name);
            }

            if (target === "agent" && selectedAgentId) {
                const res = await getAgent(selectedAgentId);
                if (!cancelled) setTargetName(res.data.name);
            }
        }

        loadTargetName();

        return () => {
            cancelled = true;
        };
    }, [isCreateMode, target, selectedWorkflowId, selectedAgentId]);

    async function handleCreate() {
        setCreateError(null);
        if (!target) {
            setCreateError("Select a target type first.");
            return;
        }
        if (target === "workflow" && !selectedWorkflowId) {
            setCreateError("Select a workflow to continue.");
            return;
        }
        if (target === "agent" && !selectedAgentId) {
            setCreateError("Select an agent to continue.");
            return;
        }
        if (!name.trim() || !slug.trim() || !title.trim()) {
            setCreateError("Name, slug, and title are required.");
            return;
        }

        setIsSaving(true);
        try {
            const shouldSendCover =
                coverType !== "image" || (coverValue && !coverValue.startsWith("blob:"));
            const res = await createFormInterface({
                name,
                slug,
                title,
                description: description || undefined,
                targetType: target,
                ...(target === "workflow" && selectedWorkflowId
                    ? { workflowId: selectedWorkflowId }
                    : {}),
                ...(target === "agent" && selectedAgentId ? { agentId: selectedAgentId } : {}),
                ...(shouldSendCover
                    ? {
                          coverType,
                          coverValue
                      }
                    : {})
            });

            const createdId = res.data.id;

            if (pendingCoverFile) {
                const coverRes = await uploadFormInterfaceAsset(createdId, {
                    type: "cover",
                    file: pendingCoverFile
                });
                setCoverType("image");
                setCoverValue(coverRes.asset.gcsUri);
                setPendingCoverFile(null);
            }

            if (pendingIconFile) {
                const iconRes = await uploadFormInterfaceAsset(createdId, {
                    type: "icon",
                    file: pendingIconFile
                });
                setIconUrl(iconRes.asset.gcsUri);
                setPendingIconFile(null);
            }

            navigate("/interfaces");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSave() {
        if (!editId) return;

        setIsSaving(true);
        try {
            const coverUpdate =
                coverType === "image" && !coverValue ? {} : { coverType, coverValue };
            const updated = await updateFormInterface(editId, {
                name,
                slug,
                title,
                description: description || undefined,
                iconUrl,
                ...coverUpdate,
                inputPlaceholder,
                inputLabel,
                allowFileUpload,
                allowUrlInput,
                maxFiles,
                outputLabel,
                showCopyButton,
                showDownloadButton,
                allowOutputEdit,
                submitButtonText: submitButton
            });
            setStatus(updated.status);
            navigate("/interfaces");
        } finally {
            setIsSaving(false);
        }
    }

    async function handlePublishToggle() {
        if (!editId) return;

        setIsPublishing(true);
        try {
            const updated =
                status === "published"
                    ? await unpublishFormInterface(editId)
                    : await publishFormInterface(editId);
            setStatus(updated.status);
        } finally {
            setIsPublishing(false);
        }
    }

    function handleCoverChange(next: {
        coverType: CoverType;
        coverColor?: string;
        coverImageUrl?: string;
    }) {
        if (next.coverType === "color" || next.coverType === "palette") {
            setCoverType("color");
            setCoverValue(next.coverColor || "#6366f1");
            setCoverPreviewUrl(null);
            setPendingCoverFile(null);
            return;
        }

        if (next.coverType === "stock") {
            setCoverType("stock");
            setCoverValue(next.coverImageUrl || "");
            setCoverPreviewUrl(next.coverImageUrl || null);
            setPendingCoverFile(null);
            return;
        }

        setCoverType("image");
        if (next.coverImageUrl) {
            setCoverPreviewUrl(next.coverImageUrl);
            if (!next.coverImageUrl.startsWith("blob:")) {
                setCoverValue(next.coverImageUrl);
            }
        } else {
            setCoverValue("");
            setCoverPreviewUrl(null);
        }
    }

    async function handleCoverUpload(file: File) {
        const previewUrl = URL.createObjectURL(file);
        setCoverPreviewUrl(previewUrl);
        setCoverType("image");
        setCoverValue("");

        if (!editId) {
            setPendingCoverFile(file);
            return;
        }

        try {
            const res = await uploadFormInterfaceAsset(editId, {
                type: "cover",
                file
            });
            setCoverType("image");
            setCoverValue(res.asset.gcsUri);
        } catch {
            setCoverPreviewUrl(null);
        }
    }

    async function handleIconUpload(file: File) {
        const previewUrl = URL.createObjectURL(file);
        setIconPreviewUrl(previewUrl);

        if (!editId) {
            setPendingIconFile(file);
            return;
        }

        try {
            const res = await uploadFormInterfaceAsset(editId, {
                type: "icon",
                file
            });
            setIconUrl(res.asset.gcsUri);
        } catch {
            setIconPreviewUrl(undefined);
        }
    }

    function handleIconUrlChange(value: string) {
        setIconUrl(value);
        setPendingIconFile(null);
        if (!value) {
            setIconPreviewUrl(undefined);
            return;
        }
        if (value.startsWith("http")) {
            setIconPreviewUrl(value);
        }
    }

    return (
        <InterfaceEditorLayout
            preview={
                <InterfacePreview
                    title={title}
                    description={description}
                    submitButtonText={submitButton}
                    inputPlaceholder={inputPlaceholder}
                    inputLabel={inputLabel}
                    allowFileUpload={allowFileUpload}
                    allowUrlInput={allowUrlInput}
                    coverType={coverType}
                    coverValue={
                        coverType === "color"
                            ? coverValue
                            : coverPreviewUrl || coverValue || undefined
                    }
                    iconUrl={iconPreviewUrl || iconUrl}
                />
            }
        >
            <h1 className="mb-2 text-2xl font-semibold">
                {isCreateMode ? "Create Form Interface" : "Edit Form Interface"}
            </h1>

            {isEditMode && (
                <div className="mb-6 text-sm text-muted-foreground">Editing existing interface</div>
            )}

            <div className="space-y-4 max-w-xl">
                {isCreateMode && !isTargetReady && (
                    <TargetSelectionDialog
                        target={target}
                        onTargetChange={setTarget}
                        selectedWorkflowId={selectedWorkflowId}
                        onWorkflowSelect={setSelectedWorkflowId}
                        selectedAgentId={selectedAgentId}
                        onAgentSelect={setSelectedAgentId}
                    />
                )}

                {target && isTargetReady && (
                    <>
                        {isCreateMode && (
                            <button
                                type="button"
                                onClick={resetCreateFlow}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                ← Back
                            </button>
                        )}
                        <TargetDisplay targetType={target} targetName={targetName ?? "—"} />

                        <CoverEditor
                            coverType={coverType}
                            coverColor={coverType === "color" ? coverValue : undefined}
                            coverImageUrl={
                                coverType === "image" || coverType === "stock"
                                    ? coverPreviewUrl || coverValue
                                    : undefined
                            }
                            onChange={handleCoverChange}
                            onImageFileSelect={handleCoverUpload}
                        />

                        <IconUploader
                            value={iconUrl}
                            previewUrl={iconPreviewUrl}
                            onChange={handleIconUrlChange}
                            onFileSelect={handleIconUpload}
                        />

                        <TitleDescriptionEditor
                            name={name}
                            onNameChange={setName}
                            slug={slug}
                            onSlugChange={setSlug}
                            title={title}
                            onTitleChange={setTitle}
                            description={description}
                            onDescriptionChange={setDescription}
                        />

                        <InputConfigEditor
                            inputLabel={inputLabel}
                            onInputLabelChange={setInputLabel}
                            inputPlaceholder={inputPlaceholder}
                            onInputPlaceholderChange={setInputPlaceholder}
                        />

                        <ContextConfigEditor
                            allowFileUpload={allowFileUpload}
                            onAllowFileUploadChange={setAllowFileUpload}
                            allowUrlInput={allowUrlInput}
                            onAllowUrlInputChange={setAllowUrlInput}
                            maxFiles={maxFiles}
                            onMaxFilesChange={setMaxFiles}
                        />

                        <OutputConfigEditor
                            outputLabel={outputLabel}
                            onOutputLabelChange={setOutputLabel}
                            showCopyButton={showCopyButton}
                            onShowCopyButtonChange={setShowCopyButton}
                            showDownloadButton={showDownloadButton}
                            onShowDownloadButtonChange={setShowDownloadButton}
                            allowOutputEdit={allowOutputEdit}
                            onAllowOutputEditChange={setAllowOutputEdit}
                        />

                        <SubmitButtonEditor value={submitButton} onChange={setSubmitButton} />

                        <div className="flex flex-wrap gap-3">
                            {isCreateMode ? (
                                <button
                                    onClick={handleCreate}
                                    disabled={isSaving}
                                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                                >
                                    {isSaving ? "Creating…" : "Create interface"}
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                                    >
                                        {isSaving ? "Saving…" : "Save changes"}
                                    </button>
                                    <button
                                        onClick={handlePublishToggle}
                                        disabled={isPublishing}
                                        className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
                                    >
                                        {isPublishing
                                            ? "Updating…"
                                            : status === "published"
                                              ? "Unpublish"
                                              : "Publish"}
                                    </button>
                                </>
                            )}
                        </div>
                        {createError && <div className="text-sm text-red-600">{createError}</div>}
                    </>
                )}
            </div>
        </InterfaceEditorLayout>
    );
}
