import { useEffect, useState } from "react";
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
                            (res.data ?? []).map((wf: WorkflowListItem) => ({
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

    if (!target) {
        return (
            <div className="mx-auto max-w-xl p-6">
                <div className="space-y-4">
                    <TargetCard
                        label="Workflow"
                        description="Trigger a workflow via a public form"
                        onClick={() => onTargetChange("workflow")}
                    />
                    <TargetCard
                        label="Agent"
                        description="Send user input directly to an agent"
                        onClick={() => onTargetChange("agent")}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">
                Select {target === "workflow" ? "Workflow" : "Agent"}
            </label>

            {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
                <select
                    value={
                        target === "workflow" ? (selectedWorkflowId ?? "") : (selectedAgentId ?? "")
                    }
                    onChange={(e) =>
                        target === "workflow"
                            ? onWorkflowSelect(e.target.value)
                            : onAgentSelect(e.target.value)
                    }
                    className="w-full rounded-md border px-3 py-2"
                >
                    <option value="">Select one</option>

                    {target === "workflow" &&
                        workflows.map((wf) => (
                            <option key={wf.id} value={wf.id}>
                                {wf.name}
                            </option>
                        ))}

                    {target === "agent" &&
                        agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                                {agent.name}
                            </option>
                        ))}
                </select>
            )}
        </div>
    );
}

function TargetCard({
    label,
    description,
    onClick
}: {
    label: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full rounded-lg border p-4 text-left transition hover:bg-muted"
        >
            <div className="font-medium">{label}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
        </button>
    );
}
