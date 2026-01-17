import { Settings } from "lucide-react";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { useSidebarStore } from "../stores/sidebarStore";

export function Header() {
    const { workspace } = useSidebarStore();

    return (
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
                <img
                    src="/assets/icons/icon-32.png"
                    alt="FlowMaestro"
                    className="w-6 h-6 rounded"
                />
                <span className="font-semibold text-foreground">FlowMaestro</span>
            </div>
            <div className="flex items-center gap-1">
                {workspace && (
                    <span className="text-xs text-muted-foreground truncate max-w-[100px] mr-1">
                        {workspace.name}
                    </span>
                )}
                <ThemeToggle />
                <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    className="p-1.5 hover:bg-accent rounded-md transition-colors"
                    title="Settings"
                >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>
        </header>
    );
}
