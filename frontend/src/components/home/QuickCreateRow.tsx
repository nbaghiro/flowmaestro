import { BookOpen, Bot, ClipboardList, MessageSquare, Workflow } from "lucide-react";
import { CreateCard } from "../empty-states/CreateCard";

interface QuickCreateRowProps {
    onCreateWorkflow: () => void;
    onCreateAgent: () => void;
    onCreateChat: () => void;
    onCreateForm: () => void;
    onCreateKnowledgeBase: () => void;
}

/**
 * Horizontal row of quick create cards for each resource type.
 * Shown at the top of the home page for easy access to creation.
 */
export function QuickCreateRow({
    onCreateWorkflow,
    onCreateAgent,
    onCreateChat,
    onCreateForm,
    onCreateKnowledgeBase
}: QuickCreateRowProps) {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Create</h2>
            <div className="grid grid-cols-5 gap-4">
                <CreateCard
                    icon={<Workflow className="w-4 h-4 text-blue-500" />}
                    label="Workflow"
                    onClick={onCreateWorkflow}
                />
                <CreateCard
                    icon={<Bot className="w-4 h-4 text-violet-500" />}
                    label="Agent"
                    onClick={onCreateAgent}
                />
                <CreateCard
                    icon={<MessageSquare className="w-4 h-4 text-emerald-500" />}
                    label="Chat"
                    onClick={onCreateChat}
                />
                <CreateCard
                    icon={<ClipboardList className="w-4 h-4 text-amber-500" />}
                    label="Form"
                    onClick={onCreateForm}
                />
                <CreateCard
                    icon={<BookOpen className="w-4 h-4 text-cyan-500" />}
                    label="Knowledge Base"
                    onClick={onCreateKnowledgeBase}
                />
            </div>
        </div>
    );
}
