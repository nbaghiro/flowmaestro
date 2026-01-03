import { useEffect, useState } from "react";
import { Select } from "@/components/common/Select";
import { getWorkflows, getAgents, type Agent } from "@/lib/api";

type TargetType = "workflow" | "agent";

type WorkflowListItem = {
    id: string;
    name: string;
};

interface Props {
    target: TargetType | null;
    onTargetChange: (target: TargetType) => void;

    selectedWorkflowId: string | null;
    onWorkflowSelect: (id: string) => void;

    selectedAgentId: string | null;
    onAgentSelect: (id: string) => void;
}

export function TargetSelectionDialog({
    target,
    onTargetChange,
    selectedWorkflowId,
    onWorkflowSelect,
    selectedAgentId,
    onAgentSelect
}: Props) {
    const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!target) return;

        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                if (target === "workflow") {
                    const res = await getWorkflows();
                    if (!cancelled) {
                        setWorkflows(
                            (res.data?.items ?? []).map((wf: WorkflowListItem) => ({
                                id: wf.id,
                                name: wf.name
                            }))
                        );
                    }
                }

                if (target === "agent") {
                    const res = await getAgents();
                    if (!cancelled) {
                        setAgents(res.data?.agents ?? []);
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [target]);

    return (
        <div className="mx-auto w-full max-w-xl space-y-4 p-6">
            <div className="space-y-4">
                <TargetCard
                    label="Workflow"
                    description="Trigger a workflow via a public form"
                    selected={target === "workflow"}
                    onClick={() => onTargetChange("workflow")}
                />
                <TargetCard
                    label="Agent"
                    description="Send user input directly to an agent"
                    selected={target === "agent"}
                    onClick={() => onTargetChange("agent")}
                />
            </div>

            {target && (
                <div>
                    <label className="mb-2 block text-sm font-medium">
                        Select {target === "workflow" ? "Workflow" : "Agent"}
                    </label>

                    {loading ? (
                        <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : (
                        <Select
                            value={
                                target === "workflow"
                                    ? (selectedWorkflowId ?? "")
                                    : (selectedAgentId ?? "")
                            }
                            onChange={(value) =>
                                target === "workflow"
                                    ? onWorkflowSelect(value)
                                    : onAgentSelect(value)
                            }
                            placeholder="Select one"
                            options={
                                target === "workflow"
                                    ? workflows.map((wf) => ({
                                          value: wf.id,
                                          label: wf.name
                                      }))
                                    : agents.map((agent) => ({
                                          value: agent.id,
                                          label: agent.name
                                      }))
                            }
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function TargetCard({
    label,
    description,
    selected = false,
    onClick
}: {
    label: string;
    description: string;
    selected?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full rounded-lg border p-4 text-left bg-card text-foreground transition-all hover:border-primary hover:shadow-md ${
                selected ? "border-primary shadow-sm" : ""
            }`}
        >
            <div className="font-medium">{label}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
        </button>
    );
}
