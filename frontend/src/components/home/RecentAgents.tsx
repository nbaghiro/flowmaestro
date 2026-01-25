import { Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AgentSummary } from "@flowmaestro/shared";
import { AgentCard } from "../cards/AgentCard";
import { HorizontalCardRow } from "./HorizontalCardRow";

interface RecentAgentsProps {
    agents: AgentSummary[];
}

export function RecentAgents({ agents }: RecentAgentsProps) {
    const navigate = useNavigate();

    const handleCardClick = (agent: AgentSummary) => {
        navigate(`/agents/${agent.id}`);
    };

    const emptyState = (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
            <Bot className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No agents yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create your first AI agent to start building intelligent assistants.
            </p>
        </div>
    );

    return (
        <HorizontalCardRow
            title="Recent Agents"
            viewAllLink="/agents"
            isEmpty={agents.length === 0}
            emptyState={emptyState}
        >
            {agents.map((agent) => (
                <div key={agent.id} className="flex-shrink-0 w-[300px]">
                    <AgentCard agent={agent} onClick={() => handleCardClick(agent)} />
                </div>
            ))}
        </HorizontalCardRow>
    );
}
