import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { WorkflowSummary } from "@flowmaestro/shared";
import { WorkflowCard } from "../cards/WorkflowCard";
import { HorizontalCardRow } from "./HorizontalCardRow";

interface RecentWorkflowsProps {
    workflows: WorkflowSummary[];
}

export function RecentWorkflows({ workflows }: RecentWorkflowsProps) {
    const navigate = useNavigate();

    const handleCardClick = (workflow: WorkflowSummary) => {
        navigate(`/builder/${workflow.id}`);
    };

    const emptyState = (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
            <FileText className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No workflows yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create your first workflow to get started building AI automations.
            </p>
        </div>
    );

    return (
        <HorizontalCardRow
            title="Recent Workflows"
            viewAllLink="/workflows"
            isEmpty={workflows.length === 0}
            emptyState={emptyState}
        >
            {workflows.map((workflow) => (
                <div key={workflow.id} className="flex-shrink-0 w-[380px]">
                    <WorkflowCard workflow={workflow} onClick={() => handleCardClick(workflow)} />
                </div>
            ))}
        </HorizontalCardRow>
    );
}
