import {
    Wrench,
    MessageSquare,
    Slack,
    Settings,
    Menu,
    PanelLeftClose,
    PanelLeft
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAgentBuilderLayoutStore } from "../../../stores/agentBuilderLayoutStore";
import { Tooltip } from "../../common/Tooltip";
import { Panel } from "./Panel";
import type { LucideIcon } from "lucide-react";

export type AgentTab = "build" | "threads" | "slack" | "settings";

interface TabItem {
    id: AgentTab;
    label: string;
    icon: LucideIcon;
    comingSoon?: boolean;
}

const TABS: TabItem[] = [
    { id: "build", label: "Build", icon: Wrench },
    { id: "threads", label: "Threads", icon: MessageSquare },
    { id: "slack", label: "Connect to Slack", icon: Slack, comingSoon: true },
    { id: "settings", label: "Settings", icon: Settings }
];

interface NavigationPanelProps {
    activeTab: AgentTab;
    onTabChange: (tab: AgentTab) => void;
}

export function NavigationPanel({ activeTab, onTabChange }: NavigationPanelProps) {
    const { togglePanel } = useAgentBuilderLayoutStore();

    const renderTabButton = (tab: TabItem, compact = false) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        const button = (
            <button
                key={tab.id}
                onClick={() => !tab.comingSoon && onTabChange(tab.id)}
                disabled={tab.comingSoon}
                className={cn(
                    "w-full flex items-center rounded-lg text-sm font-medium transition-colors",
                    compact ? "justify-center p-2" : "gap-3 px-4 py-3",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    tab.comingSoon && "opacity-50 cursor-not-allowed"
                )}
            >
                <Icon className={cn("flex-shrink-0", compact ? "w-4 h-4" : "w-5 h-5")} />
                {!compact && (
                    <>
                        <span className="flex-1 text-left">{tab.label}</span>
                        {tab.comingSoon && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">Soon</span>
                        )}
                    </>
                )}
            </button>
        );

        // Wrap with tooltip when compact
        if (compact) {
            return (
                <Tooltip key={tab.id} content={tab.label} position="right">
                    {button}
                </Tooltip>
            );
        }

        return button;
    };

    // Collapsed content - compact icon-only navigation with expand button
    const collapsedContent = (
        <div className="flex flex-col h-full">
            {/* Expand button at top */}
            <div className="p-2 border-b border-border">
                <Tooltip content="Expand sidebar" position="right">
                    <button
                        onClick={() => togglePanel("navigation")}
                        className="w-full p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center"
                    >
                        <PanelLeft className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>
            {/* Navigation tabs */}
            <nav className="py-2 px-1 space-y-1 flex-1">
                {TABS.map((tab) => renderTabButton(tab, true))}
            </nav>
        </div>
    );

    // Expanded content - full navigation with collapse button
    const expandedContent = (
        <div className="flex flex-col h-full">
            {/* Header with collapse button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">Navigation</span>
                <Tooltip content="Collapse sidebar" position="right">
                    <button
                        onClick={() => togglePanel("navigation")}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                </Tooltip>
            </div>
            {/* Navigation tabs */}
            <nav className="p-4 space-y-1 flex-1">
                {TABS.map((tab) => renderTabButton(tab, false))}
            </nav>
        </div>
    );

    return (
        <Panel
            id="navigation"
            collapsedContent={collapsedContent}
            collapsedWidth={48}
            minimizedIcon={Menu}
            minimizedLabel="Navigation"
        >
            {expandedContent}
        </Panel>
    );
}
