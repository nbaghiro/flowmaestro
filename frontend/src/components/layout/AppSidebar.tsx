import {
    LayoutGrid,
    Plug,
    BookOpen,
    FileText,
    Bot,
    Settings,
    User,
    Building,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Tooltip } from "../common/Tooltip";
import type { LucideIcon } from "lucide-react";

interface NavItem {
    icon: LucideIcon;
    label: string;
    path: string;
    badge?: string;
    section?: "primary" | "settings";
}

const navItems: NavItem[] = [
    // Primary navigation
    { icon: LayoutGrid, label: "Workflows", path: "/", section: "primary" },
    { icon: Bot, label: "Agents", path: "/agents", section: "primary" },
    { icon: Plug, label: "Connections", path: "/connections", section: "primary" },
    { icon: BookOpen, label: "Knowledge Bases", path: "/knowledge-bases", section: "primary" },
    { icon: FileText, label: "Templates", path: "/templates", section: "primary" },

    // Settings navigation
    { icon: Settings, label: "Settings", path: "/settings", section: "settings" },
    { icon: User, label: "Account", path: "/account", section: "settings" },
    { icon: Building, label: "Workspace", path: "/workspace", badge: "Pro", section: "settings" }
];

export function AppSidebar() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isActive = (path: string) => {
        if (path === "/") {
            return location.pathname === "/";
        }
        return location.pathname.startsWith(path);
    };

    const primaryItems = navItems.filter((item) => item.section === "primary");
    const settingsItems = navItems.filter((item) => item.section === "settings");

    return (
        <aside
            className={cn(
                "h-screen bg-background border-r border-border flex flex-col transition-all duration-300 overflow-x-hidden",
                isCollapsed ? "w-16" : "w-60"
            )}
        >
            {/* Logo & Toggle */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            FM
                        </div>
                        <span className="font-semibold text-foreground">FlowMaestro</span>
                    </div>
                )}

                {isCollapsed && (
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto">
                        FM
                    </div>
                )}

                {!isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Collapse sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Expand button when collapsed */}
            {isCollapsed && (
                <div className="px-2 py-3 border-b border-border">
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="w-full p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Expand sidebar"
                    >
                        <ChevronRight className="w-4 h-4 mx-auto" />
                    </button>
                </div>
            )}

            {/* Primary Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-2 space-y-1">
                    {primaryItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        const tooltipContent = item.badge
                            ? `${item.label} (${item.badge})`
                            : item.label;

                        const linkContent = (
                            <Link
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {/* Active indicator */}
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                )}

                                <Icon
                                    className={cn(
                                        "w-5 h-5 flex-shrink-0",
                                        isCollapsed && "mx-auto"
                                    )}
                                />

                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </Link>
                        );

                        return isCollapsed ? (
                            <Tooltip key={item.path} content={tooltipContent} delay={200}>
                                {linkContent}
                            </Tooltip>
                        ) : (
                            <div key={item.path}>{linkContent}</div>
                        );
                    })}
                </div>
            </nav>

            {/* Settings Navigation */}
            <div className="border-t border-border py-4">
                <div className="px-2 space-y-1">
                    {settingsItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        const tooltipContent = item.badge
                            ? `${item.label} (${item.badge})`
                            : item.label;

                        const linkContent = (
                            <Link
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                )}

                                <Icon
                                    className={cn(
                                        "w-5 h-5 flex-shrink-0",
                                        isCollapsed && "mx-auto"
                                    )}
                                />

                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </Link>
                        );

                        return isCollapsed ? (
                            <Tooltip key={item.path} content={tooltipContent} delay={200}>
                                {linkContent}
                            </Tooltip>
                        ) : (
                            <div key={item.path}>{linkContent}</div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}
