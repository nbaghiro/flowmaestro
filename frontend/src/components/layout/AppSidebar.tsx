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
    Moon,
    Zap,
    Users
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { WORKSPACE_LIMITS } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { usePersonaStore } from "../../stores/personaStore";
import { useThemeStore } from "../../stores/themeStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
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

function CreditProgressBar({ isCollapsed }: { isCollapsed: boolean }) {
    const { currentWorkspace, creditBalance, fetchCredits } = useWorkspaceStore();

    useEffect(() => {
        if (currentWorkspace && !creditBalance) {
            fetchCredits();
        }
    }, [currentWorkspace, creditBalance, fetchCredits]);

    if (!currentWorkspace || !creditBalance) {
        return null;
    }

    // Total credits = current balances + what's been used (original allocation)
    const totalCredits =
        creditBalance.subscription +
        creditBalance.purchased +
        creditBalance.bonus +
        creditBalance.usedAllTime;
    const availableCredits = creditBalance.available;

    // Calculate percentage remaining based on available vs total
    const percentageRemaining = totalCredits > 0 ? (availableCredits / totalCredits) * 100 : 0;

    // Determine color based on remaining percentage
    const getProgressColor = () => {
        if (percentageRemaining > 50) return "bg-primary";
        if (percentageRemaining > 20) return "bg-amber-500";
        return "bg-red-500";
    };

    const getProgressBg = () => {
        if (percentageRemaining > 50) return "bg-primary/30";
        if (percentageRemaining > 20) return "bg-amber-500/30";
        return "bg-red-500/30";
    };

    // Get plan limits for subscription display
    const planLimits = WORKSPACE_LIMITS[currentWorkspace.type];
    const monthlySubscription = planLimits.monthly_credits;

    // Calculate original bonus (total - subscription - purchased)
    const originalBonus = totalCredits - monthlySubscription - creditBalance.purchased;

    // Build tooltip content with breakdown
    const tooltipContent = (
        <div className="text-xs space-y-1 min-w-[180px]">
            <div className="font-medium border-b border-border pb-1 mb-1">Credit Breakdown</div>
            <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subscription:</span>
                <span>{monthlySubscription.toLocaleString()}</span>
            </div>
            {originalBonus > 0 && (
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Bonus:</span>
                    <span>{originalBonus.toLocaleString()}</span>
                </div>
            )}
            {creditBalance.purchased > 0 && (
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Purchased:</span>
                    <span>{creditBalance.purchased.toLocaleString()}</span>
                </div>
            )}
            {creditBalance.reserved > 0 && (
                <div className="flex justify-between gap-4 text-amber-500">
                    <span>Reserved:</span>
                    <span>-{creditBalance.reserved.toLocaleString()}</span>
                </div>
            )}
            <div className="flex justify-between gap-4 border-t border-border pt-1 mt-1">
                <span className="text-muted-foreground">Used this month:</span>
                <span>{creditBalance.usedThisMonth.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Remaining:</span>
                <span>{availableCredits.toLocaleString()}</span>
            </div>
        </div>
    );

    if (isCollapsed) {
        return (
            <div className="px-2 py-2">
                <Tooltip content={tooltipContent} delay={200} position="right">
                    <div className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-default">
                        <Zap className="w-5 h-5" />
                        <div
                            className={cn("w-6 h-1 rounded-full overflow-hidden", getProgressBg())}
                        >
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    getProgressColor()
                                )}
                                style={{ width: `${Math.min(percentageRemaining, 100)}%` }}
                            />
                        </div>
                    </div>
                </Tooltip>
            </div>
        );
    }

    return (
        <div className="px-2 py-2">
            <Tooltip content={tooltipContent} delay={200} position="right">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-default">
                    <Zap className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Credits</span>
                            <span className="text-xs tabular-nums">
                                {availableCredits.toLocaleString()} /{" "}
                                {totalCredits.toLocaleString()}
                            </span>
                        </div>
                        <div
                            className={cn(
                                "w-full h-1 rounded-full overflow-hidden",
                                getProgressBg()
                            )}
                        >
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    getProgressColor()
                                )}
                                style={{ width: `${Math.min(percentageRemaining, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </Tooltip>
        </div>
    );
}

const navItems: NavItem[] = [
    // Primary navigation
    { icon: LayoutGrid, label: "Workflows", path: "/", section: "primary" },
    { icon: Bot, label: "Agents", path: "/agents", section: "primary" },
    { icon: Users, label: "Personas", path: "/personas", section: "primary" },
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
    const { needsAttentionCount, fetchNeedsAttentionCount } = usePersonaStore();

    // Fetch persona attention count on mount and periodically
    useEffect(() => {
        fetchNeedsAttentionCount();
        const interval = setInterval(fetchNeedsAttentionCount, 60000); // every minute
        return () => clearInterval(interval);
    }, [fetchNeedsAttentionCount]);

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
                            // Dynamic badge for Personas based on needs attention count
                            const isPersonas = item.path === "/personas";
                            const dynamicBadge =
                                isPersonas && needsAttentionCount > 0
                                    ? needsAttentionCount.toString()
                                    : item.badge;
                            const tooltipContent = dynamicBadge
                                ? `${item.label} (${dynamicBadge})`
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
                                            {dynamicBadge && (
                                                <span
                                                    className={cn(
                                                        "px-1.5 py-0.5 text-xs font-medium rounded",
                                                        isPersonas && needsAttentionCount > 0
                                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                            : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    {dynamicBadge}
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

                {/* Section 3: Credit Progress Bar */}
                <div className="border-t border-border">
                    <CreditProgressBar isCollapsed={isCollapsed} />
                </div>

                {/* Section 4: Settings Navigation */}
                <div className="border-t border-border py-4 flex-shrink-0">
                    <div className="px-2 space-y-1">
                        {settingsItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            const isAccountItem = item.path === "/account";
                            const ThemeIcon = getThemeIcon();

                            // Account row with theme toggle
                            if (isAccountItem) {
                                const accountContent = (
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
                                    <div key={item.path}>{accountContent}</div>
                                );
                            }

                            // Regular items (Settings, etc.)
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
