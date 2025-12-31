import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { InterfaceEditorLayout } from "@/components/interface-builder/InterfaceEditorLayout";
import { InterfacePreview } from "@/components/interface-builder/InterfacePreview";
import { TargetDisplay } from "@/components/interface-builder/TargetDisplay";
import { TargetSelectionDialog } from "@/components/interface-builder/TargetSelectionDialog";
import { TitleDescriptionEditor } from "@/components/interface-builder/TitleDescriptionEditor";
import { createFormInterface, getFormInterfaceById, getWorkflow, getAgent } from "@/lib/api";

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
    const [isSaving, setIsSaving] = useState(false);

    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

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
            setTarget(iface.targetType);

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

    async function handleCreate() {
        if (!target) return;

        setIsSaving(true);
        try {
            await createFormInterface({
                name,
                slug,
                title,
                targetType: target,
                ...(target === "workflow" && selectedWorkflowId
                    ? { workflowId: selectedWorkflowId }
                    : {}),
                ...(target === "agent" && selectedAgentId ? { agentId: selectedAgentId } : {})
            });

            navigate("/interfaces");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <InterfaceEditorLayout preview={<InterfacePreview title={title} description={undefined} />}>
            <h1 className="mb-2 text-2xl font-semibold">
                {isCreateMode ? "Create Form Interface" : "Edit Form Interface"}
            </h1>

            {isEditMode && (
                <div className="mb-6 text-sm text-muted-foreground">Editing existing interface</div>
            )}

            <div className="space-y-4 max-w-xl">
                {isCreateMode && !target && (
                    <TargetSelectionDialog
                        target={target}
                        onTargetChange={setTarget}
                        selectedWorkflowId={selectedWorkflowId}
                        onWorkflowSelect={setSelectedWorkflowId}
                        selectedAgentId={selectedAgentId}
                        onAgentSelect={setSelectedAgentId}
                    />
                )}

                {target && (
                    <>
                        <TargetDisplay targetType={target} targetName={targetName ?? "—"} />

                        <TitleDescriptionEditor
                            name={name}
                            onNameChange={setName}
                            slug={slug}
                            onSlugChange={setSlug}
                            title={title}
                            onTitleChange={setTitle}
                        />

                        <button
                            onClick={handleCreate}
                            disabled={isSaving || isEditMode}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                            {isEditMode ? "Saved" : isSaving ? "Creating…" : "Create interface"}
                        </button>
                    </>
                )}
            </div>
        </InterfaceEditorLayout>
    );
}
