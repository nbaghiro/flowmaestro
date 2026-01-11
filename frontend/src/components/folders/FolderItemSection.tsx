import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
    WorkflowSummary,
    AgentSummary,
    FormInterfaceSummary,
    ChatInterfaceSummary,
    KnowledgeBaseSummary,
    FolderResourceType
} from "@flowmaestro/shared";
import {
    WorkflowCard,
    AgentCard,
    FormInterfaceCard,
    ChatInterfaceCard,
    KnowledgeBaseCard
} from "../cards";

type ItemType =
    | WorkflowSummary
    | AgentSummary
    | FormInterfaceSummary
    | ChatInterfaceSummary
    | KnowledgeBaseSummary;

interface FolderItemSectionProps<T extends ItemType> {
    title: string;
    itemType: FolderResourceType;
    items: T[];
    defaultCollapsed?: boolean;
    folderId: string;
    onRemoveFromFolder?: (itemId: string, itemType: FolderResourceType) => void;
    onMoveToFolder?: (itemId: string, itemType: FolderResourceType) => void;
    onDelete?: (itemId: string, itemType: FolderResourceType) => void;
}

// Type guards
function isWorkflow(item: ItemType): item is WorkflowSummary {
    return "description" in item && !("provider" in item) && !("title" in item);
}

function isAgent(item: ItemType): item is AgentSummary {
    return "provider" in item && "model" in item;
}

function isFormInterface(item: ItemType): item is FormInterfaceSummary {
    return "title" in item && "status" in item && !("sessionCount" in item);
}

function isChatInterface(item: ItemType): item is ChatInterfaceSummary {
    return "title" in item && "status" in item && "sessionCount" in item;
}

function isKnowledgeBase(item: ItemType): item is KnowledgeBaseSummary {
    return "documentCount" in item;
}

// Get navigation path based on item type
function getItemPath(itemType: FolderResourceType, itemId: string): string {
    switch (itemType) {
        case "workflow":
            return `/builder/${itemId}`;
        case "agent":
            return `/agents/${itemId}`;
        case "form-interface":
            return `/form-interfaces/${itemId}/edit`;
        case "chat-interface":
            return `/chat-interfaces/${itemId}/edit`;
        case "knowledge-base":
            return `/knowledge-bases/${itemId}`;
    }
}

export function FolderItemSection<T extends ItemType>({
    title,
    itemType,
    items,
    defaultCollapsed = false,
    folderId,
    onRemoveFromFolder,
    onMoveToFolder,
    onDelete
}: FolderItemSectionProps<T>) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const navigate = useNavigate();

    if (items.length === 0) {
        return null; // Don't render empty sections
    }

    const handleItemClick = (item: T) => {
        navigate(getItemPath(itemType, item.id), { state: { fromFolderId: folderId } });
    };

    const renderCard = (item: T) => {
        const commonProps = {
            key: item.id,
            onClick: () => handleItemClick(item),
            onMoveToFolder: onMoveToFolder ? () => onMoveToFolder(item.id, itemType) : undefined,
            onRemoveFromFolder: onRemoveFromFolder
                ? () => onRemoveFromFolder(item.id, itemType)
                : undefined,
            onDelete: onDelete ? () => onDelete(item.id, itemType) : undefined,
            currentFolderId: folderId
        };

        switch (itemType) {
            case "workflow":
                if (isWorkflow(item)) {
                    return <WorkflowCard {...commonProps} workflow={item} />;
                }
                break;
            case "agent":
                if (isAgent(item)) {
                    return (
                        <AgentCard
                            {...commonProps}
                            agent={item}
                            onEdit={() => handleItemClick(item)}
                        />
                    );
                }
                break;
            case "form-interface":
                if (isFormInterface(item)) {
                    return (
                        <FormInterfaceCard
                            {...commonProps}
                            formInterface={item}
                            onEdit={() => handleItemClick(item)}
                            onViewLive={
                                item.status === "published" && item.slug
                                    ? () => window.open(`/i/${item.slug}`, "_blank")
                                    : undefined
                            }
                            onViewSubmissions={() =>
                                navigate(`/form-interfaces/${item.id}/submissions`)
                            }
                        />
                    );
                }
                break;
            case "chat-interface":
                if (isChatInterface(item)) {
                    return (
                        <ChatInterfaceCard
                            {...commonProps}
                            chatInterface={item}
                            onEdit={() => handleItemClick(item)}
                            onViewLive={
                                item.status === "published" && item.slug
                                    ? () => window.open(`/c/${item.slug}`, "_blank")
                                    : undefined
                            }
                            onViewSessions={() => navigate(`/chat-interfaces/${item.id}/sessions`)}
                        />
                    );
                }
                break;
            case "knowledge-base":
                if (isKnowledgeBase(item)) {
                    return (
                        <KnowledgeBaseCard
                            {...commonProps}
                            knowledgeBase={item}
                            onEdit={() => handleItemClick(item)}
                        />
                    );
                }
                break;
        }
        return null;
    };

    return (
        <div className="mb-6">
            {/* Section Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center gap-2 mb-3 group"
            >
                {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors">
                    {title}
                </h3>
                <span className="text-sm text-muted-foreground">({items.length})</span>
            </button>

            {/* Items Grid */}
            {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => renderCard(item))}
                </div>
            )}
        </div>
    );
}
