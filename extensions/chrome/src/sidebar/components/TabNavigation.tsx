import { clsx } from "clsx";
import { Bot, Workflow, BookOpen } from "lucide-react";
import React from "react";
import { useSidebarStore, TabType } from "../stores/sidebarStore";

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "agents", label: "Agents", icon: Bot },
    { id: "workflows", label: "Workflows", icon: Workflow },
    { id: "kb", label: "KB", icon: BookOpen }
];

export function TabNavigation() {
    const { activeTab, setActiveTab } = useSidebarStore();

    return (
        <div className="flex border-b border-border bg-card">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                            isActive
                                ? "text-foreground border-b-2 border-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
