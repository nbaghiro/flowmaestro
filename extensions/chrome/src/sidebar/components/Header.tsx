import { Settings } from "lucide-react";
import { useSidebarStore } from "../stores/sidebarStore";

export function Header() {
    const { workspace } = useSidebarStore();

    return (
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
                <img
                    src="/assets/icons/icon-32.png"
                    alt="FlowMaestro"
                    className="w-6 h-6 rounded"
                />
                <span className="font-semibold text-gray-900">FlowMaestro</span>
            </div>
            <div className="flex items-center gap-2">
                {workspace && (
                    <span className="text-xs text-gray-500 truncate max-w-[100px]">
                        {workspace.name}
                    </span>
                )}
                <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    title="Settings"
                >
                    <Settings className="w-4 h-4 text-gray-500" />
                </button>
            </div>
        </header>
    );
}
