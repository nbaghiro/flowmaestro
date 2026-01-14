import {
    LayoutGrid,
    Plug,
    BookOpen,
    FileText,
    Bot,
    ClipboardList,
    MessageSquare,
    Settings,
    User,
    X,
    Sun,
    Moon,
    Zap
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { WORKSPACE_LIMITS } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../stores/themeStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { Logo } from "../common/Logo";
import { WorkspaceSwitcher } from "../workspace/WorkspaceSwitcher";
import { SidebarFolders } from "./SidebarFolders";
import type { LucideIcon } from "lucide-react";

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    icon: LucideIcon;
    label: string;
    path: string;
    section: "primary" | "settings";
}

const navItems: NavItem[] = [
    { icon: LayoutGrid, label: "Workflows", path: "/", section: "primary" },
    { icon: Bot, label: "Agents", path: "/agents", section: "primary" },
    { icon: ClipboardList, label: "Form Interfaces", path: "/form-interfaces", section: "primary" },
    { icon: MessageSquare, label: "Chat Interfaces", path: "/chat-interfaces", section: "primary" },
    { icon: Plug, label: "Connections", path: "/connections", section: "primary" },
    { icon: BookOpen, label: "Knowledge Bases", path: "/knowledge-bases", section: "primary" },
    { icon: FileText, label: "Templates", path: "/templates", section: "primary" },
    { icon: Settings, label: "Settings", path: "/settings", section: "settings" },
    { icon: User, label: "Account", path: "/account", section: "settings" }
];

function MobileCreditProgressBar() {
    const { currentWorkspace, creditBalance, fetchCredits } = useWorkspaceStore();

    useEffect(() => {
        if (currentWorkspace && !creditBalance) {
            fetchCredits();
        }
    }, [currentWorkspace, creditBalance, fetchCredits]);

    if (!currentWorkspace || !creditBalance) {
        return null;
    }

    const planLimits = WORKSPACE_LIMITS[currentWorkspace.type];
    const monthlyCredits = planLimits.monthly_credits;
    const availableCredits = creditBalance.available;
    const usedCredits = creditBalance.usedThisMonth;

    const percentageUsed = Math.min((usedCredits / monthlyCredits) * 100, 100);
    const percentageRemaining = 100 - percentageUsed;

    const getProgressColor = () => {
        if (percentageRemaining > 50) return "bg-primary/70";
        if (percentageRemaining > 20) return "bg-amber-500/70";
        return "bg-red-500/70";
    };

    const getProgressBg = () => {
        if (percentageRemaining > 50) return "bg-primary/20";
        if (percentageRemaining > 20) return "bg-amber-500/20";
        return "bg-red-500/20";
    };

    return (
        <div className="px-4 py-3">
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground bg-muted/50">
                <Zap className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Credits</span>
                        <span className="text-xs tabular-nums">
                            {availableCredits.toLocaleString()} / {monthlyCredits.toLocaleString()}
                        </span>
                    </div>
                    <div
                        className={cn("w-full h-1.5 rounded-full overflow-hidden", getProgressBg())}
                    >
                        <div
                            className={cn("h-full rounded-full transition-all", getProgressColor())}
                            style={{ width: `${percentageRemaining}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
    const location = useLocation();
    const { theme, setTheme } = useThemeStore();

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    const ThemeIcon = theme === "light" ? Sun : Moon;
    const themeLabel = theme === "light" ? "Switch to dark mode" : "Switch to light mode";

    const isActive = (path: string) => {
        if (path === "/") {
            return location.pathname === "/";
        }
        return location.pathname.startsWith(path);
    };

    const primaryItems = navItems.filter((item) => item.section === "primary");
    const settingsItems = navItems.filter((item) => item.section === "settings");

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.body.classList.add("mobile-drawer-open");
        } else {
            document.body.style.overflow = "";
            document.body.classList.remove("mobile-drawer-open");
        }
        return () => {
            document.body.style.overflow = "";
            document.body.classList.remove("mobile-drawer-open");
        };
    }, [isOpen]);

    // Close drawer on navigation (only when pathname actually changes)
    const prevPathname = useRef(location.pathname);
    useEffect(() => {
        if (prevPathname.current !== location.pathname) {
            prevPathname.current = location.pathname;
            if (isOpen) {
                onClose();
            }
        }
    }, [location.pathname, isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer Panel */}
            <aside
                className={cn(
                    "absolute left-0 top-0 h-full w-72 bg-card border-r border-border",
                    "flex flex-col animate-slide-in-left",
                    "pb-safe"
                )}
            >
                {/* Header with close button */}
                <div className="h-16 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Logo size="md" />
                        <span className="font-semibold text-foreground">FlowMaestro</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close navigation menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Workspace Switcher */}
                <WorkspaceSwitcher isCollapsed={false} />

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Primary Navigation */}
                    <nav className="py-4">
                        <div className="px-2 space-y-1">
                            {primaryItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all relative",
                                            "min-h-[44px]", // Touch-friendly tap target
                                            active
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
                                        )}
                                    >
                                        {active && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                        )}
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        <span className="flex-1">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Folders Section */}
                    <SidebarFolders isCollapsed={false} />
                </div>

                {/* Credit Progress Bar */}
                <div className="border-t border-border flex-shrink-0">
                    <MobileCreditProgressBar />
                </div>

                {/* Settings Section */}
                <div className="border-t border-border py-4 flex-shrink-0">
                    <div className="px-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            {settingsItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center justify-center p-3 rounded-lg transition-all",
                                            "min-h-[44px] min-w-[44px]",
                                            active
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
                                        )}
                                        title={item.label}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className={cn(
                                "flex items-center justify-center p-3 rounded-lg transition-all",
                                "min-h-[44px] min-w-[44px]",
                                "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
                            )}
                            title={themeLabel}
                        >
                            <ThemeIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
