import { Plus, Sparkles } from "lucide-react";
import { Button } from "../common/Button";
import { ActionCard } from "./ActionCard";
import { GhostCard, type GhostCardVariant } from "./GhostCard";
import {
    AgentIllustration,
    ChatIllustration,
    FormIllustration,
    KnowledgeBaseIllustration,
    WorkflowIllustration
} from "./illustrations";
import type { ReactNode } from "react";

export type EntityType =
    | "workflow"
    | "agent"
    | "chat-interface"
    | "form-interface"
    | "knowledge-base";

interface EntityConfig {
    title: string;
    subtitle: string;
    folderTitle: string;
    folderSubtitle: string;
    createLabel: string;
    folderCreateLabel: string;
    hasAIGenerate: boolean;
    aiGenerateLabel?: string;
    illustration: ReactNode;
    ghostVariant: GhostCardVariant;
}

const ENTITY_CONFIGS: Record<EntityType, EntityConfig> = {
    workflow: {
        title: "Build AI-Powered Workflows",
        subtitle: "Design complex automations with drag-and-drop",
        folderTitle: "No workflows in this folder",
        folderSubtitle: "Move workflows here or create a new one",
        createLabel: "Create Your First Workflow",
        folderCreateLabel: "Create Workflow",
        hasAIGenerate: true,
        aiGenerateLabel: "Generate with AI",
        illustration: <WorkflowIllustration />,
        ghostVariant: "workflow"
    },
    agent: {
        title: "Create Intelligent Agents",
        subtitle: "Build AI assistants that execute tasks",
        folderTitle: "No agents in this folder",
        folderSubtitle: "Move agents here or create a new one",
        createLabel: "Create Your First Agent",
        folderCreateLabel: "Create Agent",
        hasAIGenerate: false,
        illustration: <AgentIllustration />,
        ghostVariant: "agent"
    },
    "chat-interface": {
        title: "Design Chat Experiences",
        subtitle: "Create embeddable chat widgets",
        folderTitle: "No chat interfaces in this folder",
        folderSubtitle: "Move chat interfaces here or create a new one",
        createLabel: "Create Your First Chat Interface",
        folderCreateLabel: "Create Chat Interface",
        hasAIGenerate: false,
        illustration: <ChatIllustration />,
        ghostVariant: "chat"
    },
    "form-interface": {
        title: "Build Smart Forms",
        subtitle: "Collect data powered by workflows",
        folderTitle: "No forms in this folder",
        folderSubtitle: "Move forms here or create a new one",
        createLabel: "Create Your First Form",
        folderCreateLabel: "Create Form",
        hasAIGenerate: false,
        illustration: <FormIllustration />,
        ghostVariant: "form"
    },
    "knowledge-base": {
        title: "Organize Your Knowledge",
        subtitle: "Upload documents for RAG",
        folderTitle: "No knowledge bases in this folder",
        folderSubtitle: "Move knowledge bases here or create a new one",
        createLabel: "Create Your First Knowledge Base",
        folderCreateLabel: "Create Knowledge Base",
        hasAIGenerate: false,
        illustration: <KnowledgeBaseIllustration />,
        ghostVariant: "knowledge-base"
    }
};

interface EmptyStateWithGhostCardsProps {
    entityType: EntityType;
    onCreateClick: () => void;
    onAIGenerateClick?: () => void;
    isInFolder?: boolean;
    className?: string;
}

/**
 * Empty state with ghost cards flanking a center action card.
 * Desktop: 3-column grid with ghost cards on sides
 * Mobile: Just the action card centered
 */
export function EmptyStateWithGhostCards({
    entityType,
    onCreateClick,
    onAIGenerateClick,
    isInFolder = false,
    className
}: EmptyStateWithGhostCardsProps) {
    const config = ENTITY_CONFIGS[entityType];

    const title = isInFolder ? config.folderTitle : config.title;
    const subtitle = isInFolder ? config.folderSubtitle : config.subtitle;
    const createLabel = isInFolder ? config.folderCreateLabel : config.createLabel;

    const primaryAction = (
        <Button variant="primary" onClick={onCreateClick} className="w-full">
            <Plus className="w-4 h-4" />
            {createLabel}
        </Button>
    );

    const secondaryAction =
        config.hasAIGenerate && onAIGenerateClick && !isInFolder ? (
            <Button variant="secondary" onClick={onAIGenerateClick} className="w-full">
                <Sparkles className="w-4 h-4" />
                {config.aiGenerateLabel}
            </Button>
        ) : undefined;

    return (
        <div className={className}>
            {/* Desktop: 3-column grid with ghost cards */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-4 items-stretch">
                {/* Left ghost card - higher opacity */}
                <GhostCard variant={config.ghostVariant} opacity={0.6} className="h-full" />

                {/* Center action card */}
                <ActionCard
                    illustration={config.illustration}
                    title={title}
                    subtitle={subtitle}
                    primaryAction={primaryAction}
                    secondaryAction={secondaryAction}
                    className="h-full min-h-[350px]"
                />

                {/* Right ghost card - lower opacity */}
                <GhostCard variant={config.ghostVariant} opacity={0.4} className="h-full" />
            </div>

            {/* Mobile/Tablet: Just the action card */}
            <div className="lg:hidden flex justify-center">
                <ActionCard
                    illustration={config.illustration}
                    title={title}
                    subtitle={subtitle}
                    primaryAction={primaryAction}
                    secondaryAction={secondaryAction}
                    className="w-full max-w-md"
                />
            </div>
        </div>
    );
}
