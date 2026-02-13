import { Settings, ChevronDown, Check, Building2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ExtensionWorkspace } from "@flowmaestro/shared";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { useSidebarStore } from "../stores/sidebarStore";

export function Header() {
    const { workspace, workspaces, switchWorkspace } = useSidebarStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isDropdownOpen]);

    const handleWorkspaceSwitch = async (ws: ExtensionWorkspace) => {
        if (ws.id === workspace?.id || isSwitching) return;

        setIsSwitching(true);
        try {
            await switchWorkspace(ws);
            setIsDropdownOpen(false);
        } finally {
            setIsSwitching(false);
        }
    };

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
                {/* Workspace Switcher */}
                {workspace && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors mr-1 hover:bg-accent cursor-pointer"
                            title="Switch workspace"
                        >
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground truncate max-w-[80px]">
                                {workspace.name}
                            </span>
                            <ChevronDown
                                className={`w-3 h-3 text-muted-foreground transition-transform ${
                                    isDropdownOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
                                <div className="py-1">
                                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Workspaces
                                    </div>
                                    {workspaces.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            Loading workspaces...
                                        </div>
                                    ) : workspaces.length === 1 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            Only one workspace available
                                        </div>
                                    ) : (
                                        workspaces.map((ws) => (
                                            <button
                                                key={ws.id}
                                                onClick={() => handleWorkspaceSwitch(ws)}
                                                disabled={isSwitching}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors ${
                                                    ws.id === workspace.id
                                                        ? "text-primary"
                                                        : "text-foreground"
                                                } ${isSwitching ? "opacity-50" : ""}`}
                                            >
                                                <span className="truncate">{ws.name}</span>
                                                {ws.id === workspace.id && (
                                                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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
