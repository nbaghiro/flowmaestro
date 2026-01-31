import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { KnowledgeBaseSummary } from "@flowmaestro/shared";
import { KnowledgeBaseCard } from "../cards/KnowledgeBaseCard";
import { HorizontalCardRow } from "./HorizontalCardRow";

interface RecentKnowledgeBasesProps {
    knowledgeBases: KnowledgeBaseSummary[];
}

export function RecentKnowledgeBases({ knowledgeBases }: RecentKnowledgeBasesProps) {
    const navigate = useNavigate();

    const handleClick = (kb: KnowledgeBaseSummary) => {
        navigate(`/knowledge-bases/${kb.id}`);
    };

    const emptyState = (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
            <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No knowledge bases yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create knowledge bases to give your agents context from documents and URLs.
            </p>
        </div>
    );

    return (
        <HorizontalCardRow
            title="Recent Knowledge Bases"
            viewAllLink="/knowledge-bases"
            viewAllText="View all"
            isEmpty={knowledgeBases.length === 0}
            emptyState={emptyState}
        >
            {knowledgeBases.map((kb) => (
                <div key={kb.id} className="flex-shrink-0 w-[320px]">
                    <KnowledgeBaseCard knowledgeBase={kb} onClick={() => handleClick(kb)} />
                </div>
            ))}
        </HorizontalCardRow>
    );
}
