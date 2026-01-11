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
    ChevronLeft,
    ChevronRight,
    Sun,
    Moon
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../stores/themeStore";
import { Logo } from "../common/Logo";
import { Tooltip } from "../common/Tooltip";
import { WorkspaceSwitcher } from "../workspace/WorkspaceSwitcher";
import { SidebarFolders } from "./SidebarFolders";
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
    { icon: ClipboardList, label: "Form Interfaces", path: "/form-interfaces", section: "primary" },
    { icon: MessageSquare, label: "Chat Interfaces", path: "/chat-interfaces", section: "primary" },
    { icon: Plug, label: "Connections", path: "/connections", section: "primary" },
    { icon: BookOpen, label: "Knowledge Bases", path: "/knowledge-bases", section: "primary" },
    { icon: FileText, label: "Templates", path: "/templates", section: "primary" },

    // Settings navigation
    { icon: Settings, label: "Settings", path: "/settings", section: "settings" },
    { icon: User, label: "Account", path: "/account", section: "settings" }
];

export function AppSidebar() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { theme, setTheme } = useThemeStore();

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    const getThemeIcon = () => {
        return theme === "light" ? Sun : Moon;
    };

    const getThemeTooltip = () => {
        return theme === "light" ? "Switch to dark mode" : "Switch to light mode";
    };

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
                "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 overflow-x-hidden",
                isCollapsed ? "w-16" : "w-60"
            )}
        >
            {/* Logo & Toggle */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <Logo size="md" />
                        <span className="font-semibold text-foreground">FlowMaestro</span>
                    </div>
                )}

                {isCollapsed && (
                    <div className="mx-auto">
                        <Logo size="md" />
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
                <div className="px-2 py-2">
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="w-full p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title="Expand sidebar"
                    >
                        <ChevronRight className="w-4 h-4 mx-auto" />
                    </button>
                </div>
            )}

            {/* Workspace Switcher */}
            <WorkspaceSwitcher isCollapsed={isCollapsed} />

            {/* Main Content - 3 sections with space-between */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Section 1: Primary Navigation */}
                <nav className="py-4 flex-shrink-0">
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
                                <Tooltip
                                    key={item.path}
                                    content={tooltipContent}
                                    delay={200}
                                    position="right"
                                >
                                    {linkContent}
                                </Tooltip>
                            ) : (
                                <div key={item.path}>{linkContent}</div>
                            );
                        })}
                    </div>
                </nav>

                {/* Section 2: Folders - anchored to bottom, expands upward */}
                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-end">
                    <SidebarFolders isCollapsed={isCollapsed} />
                </div>

                {/* Section 3: Settings Navigation */}
                <div className="border-t border-border py-4 flex-shrink-0">
                    <div className="px-2 space-y-1">
                        {settingsItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            const isSettingsItem = item.path === "/settings";
                            const ThemeIcon = getThemeIcon();

                            // Settings row with theme toggle
                            if (isSettingsItem) {
                                const settingsContent = (
                                    <div className="flex items-center gap-1">
                                        <Link
                                            to={item.path}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative flex-1",
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
                                                <span className="flex-1">{item.label}</span>
                                            )}
                                        </Link>
                                        {!isCollapsed && (
                                            <Tooltip
                                                content={getThemeTooltip()}
                                                delay={200}
                                                position="top"
                                            >
                                                <button
                                                    onClick={toggleTheme}
                                                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                >
                                                    <ThemeIcon className="w-4 h-4" />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                );

                                return isCollapsed ? (
                                    <div key={item.path} className="flex flex-col gap-1">
                                        <Tooltip content={item.label} delay={200} position="right">
                                            <Link
                                                to={item.path}
                                                className={cn(
                                                    "flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                                                    active
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                            >
                                                {active && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                                )}
                                                <Icon className="w-5 h-5" />
                                            </Link>
                                        </Tooltip>
                                        <Tooltip
                                            content={getThemeTooltip()}
                                            delay={200}
                                            position="right"
                                        >
                                            <button
                                                onClick={toggleTheme}
                                                className="flex items-center justify-center px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                            >
                                                <ThemeIcon className="w-5 h-5" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                ) : (
                                    <div key={item.path}>{settingsContent}</div>
                                );
                            }

                            // Regular items (Account, etc.)
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
                                    {!isCollapsed && <span className="flex-1">{item.label}</span>}
                                </Link>
                            );

                            return isCollapsed ? (
                                <Tooltip
                                    key={item.path}
                                    content={item.label}
                                    delay={200}
                                    position="right"
                                >
                                    {linkContent}
                                </Tooltip>
                            ) : (
                                <div key={item.path}>{linkContent}</div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </aside>
    );
}
