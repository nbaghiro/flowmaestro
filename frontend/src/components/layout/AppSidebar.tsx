import {
    Home,
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
    Sun,
    Moon,
    Zap,
    Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { WORKSPACE_LIMITS } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { usePersonaStore } from "../../stores/personaStore";
import { useThemeStore } from "../../stores/themeStore";
import { useUIPreferencesStore } from "../../stores/uiPreferencesStore";
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

// Base classes for collapsible text that animates with sidebar
const COLLAPSE_TRANSITION = "whitespace-nowrap overflow-hidden transition-all duration-300";
const COLLAPSED_TEXT = "opacity-0 max-w-0";
const EXPANDED_TEXT = "opacity-100 max-w-[150px]";

// Active indicator bar shown on left of active nav items
function ActiveIndicator() {
    return (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
    );
}

// Collapsible text label that fades and shrinks when sidebar collapses
function CollapsibleText({
    children,
    collapsed,
    className
}: {
    children: React.ReactNode;
    collapsed: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn(
                COLLAPSE_TRANSITION,
                collapsed ? COLLAPSED_TEXT : EXPANDED_TEXT,
                className
            )}
        >
            {children}
        </span>
    );
}

function CreditProgressBar({ targetCollapsed }: { targetCollapsed: boolean }) {
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

    // Collapsed view: icon with progress bar below
    if (targetCollapsed) {
        return (
            <div className="px-2 py-2">
                <Tooltip content={tooltipContent} delay={200} position="right">
                    <div className="flex flex-col items-center gap-2.5 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-default">
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

    // Expanded view: full layout with text
    return (
        <div className="px-2 py-2">
            <Tooltip content={tooltipContent} delay={200} position="right">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-default overflow-hidden">
                    <Zap className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2.5 whitespace-nowrap">
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
    { icon: Home, label: "Home", path: "/", section: "primary" },
    { icon: LayoutGrid, label: "Workflows", path: "/workflows", section: "primary" },
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
    const { sidebarCollapsed: targetCollapsed, setSidebarCollapsed: setTargetCollapsed } =
        useUIPreferencesStore();
    const { theme, setTheme } = useThemeStore();
    const { needsAttentionCount, fetchNeedsAttentionCount } = usePersonaStore();

    // isCollapsed state with delayed transition for smooth animations
    // When collapsing: delay until width animation completes
    // When expanding: change immediately so content appears as sidebar expands
    const [isCollapsed, setIsCollapsed] = useState(targetCollapsed);

    useEffect(() => {
        if (targetCollapsed) {
            // Collapsing: wait for animation to complete before switching layout
            const timer = setTimeout(() => setIsCollapsed(true), 300);
            return () => clearTimeout(timer);
        }
        // Expanding: switch layout immediately
        setIsCollapsed(false);
        return undefined;
    }, [targetCollapsed]);

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
                targetCollapsed ? "w-16" : "w-60"
            )}
        >
            {/* Logo & Toggle */}
            <div className="h-16 border-b border-border flex items-center px-4 overflow-hidden">
                <button
                    onClick={() => setTargetCollapsed(!targetCollapsed)}
                    className="flex items-center gap-2 p-1 hover:bg-muted rounded-md transition-colors flex-shrink-0"
                    title={targetCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <Logo size="md" />
                </button>
                <CollapsibleText
                    collapsed={targetCollapsed}
                    className="font-semibold text-foreground ml-2"
                >
                    FlowMaestro
                </CollapsibleText>
                <button
                    onClick={() => setTargetCollapsed(true)}
                    className={cn(
                        "ml-auto hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-all duration-300 flex-shrink-0",
                        targetCollapsed ? "opacity-0 w-0 p-0" : "opacity-100 p-1.5"
                    )}
                    title="Collapse sidebar"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </div>

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
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative overflow-hidden",
                                        active
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {active && <ActiveIndicator />}

                                    <Icon className="w-5 h-5 flex-shrink-0" />

                                    <CollapsibleText collapsed={targetCollapsed}>
                                        {item.label}
                                    </CollapsibleText>
                                    {dynamicBadge && (
                                        <span
                                            className={cn(
                                                "text-xs font-medium rounded flex-shrink-0 transition-all duration-300",
                                                isPersonas && needsAttentionCount > 0
                                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                    : "bg-muted text-muted-foreground",
                                                targetCollapsed
                                                    ? "opacity-0 w-0 px-0 py-0"
                                                    : "opacity-100 px-1.5 py-0.5"
                                            )}
                                        >
                                            {dynamicBadge}
                                        </span>
                                    )}
                                </Link>
                            );

                            return (
                                <Tooltip
                                    key={item.path}
                                    content={tooltipContent}
                                    delay={200}
                                    position="right"
                                    disabled={!isCollapsed}
                                >
                                    {linkContent}
                                </Tooltip>
                            );
                        })}
                    </div>
                </nav>

                {/* Spacer - pushes folders to bottom */}
                <div className="flex-1" />

                {/* Section 2: Folders - constrained height with scrolling */}
                <SidebarFolders isCollapsed={isCollapsed} />

                {/* Section 3: Credit Progress Bar */}
                <div className="border-t border-border">
                    <CreditProgressBar targetCollapsed={targetCollapsed} />
                </div>

                {/* Section 4: Settings Navigation */}
                <div className="border-t border-border py-4 flex-shrink-0">
                    <div className="px-2 space-y-1">
                        {settingsItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            const isAccountItem = item.path === "/account";
                            const ThemeIcon = getThemeIcon();

                            // Account row with theme toggle (expanded) or separate theme item (collapsed)
                            if (isAccountItem) {
                                return (
                                    <div key={item.path} className="space-y-1">
                                        {/* Account link with theme toggle pinned to right when expanded */}
                                        <div className="flex items-center gap-1">
                                            <div className="flex-1">
                                                <Tooltip
                                                    content={item.label}
                                                    delay={200}
                                                    position="right"
                                                    disabled={!isCollapsed}
                                                >
                                                    <Link
                                                        to={item.path}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative overflow-hidden",
                                                            active
                                                                ? "bg-primary/10 text-primary"
                                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        )}
                                                    >
                                                        {active && <ActiveIndicator />}
                                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                                        <CollapsibleText
                                                            collapsed={targetCollapsed}
                                                        >
                                                            {item.label}
                                                        </CollapsibleText>
                                                    </Link>
                                                </Tooltip>
                                            </div>
                                            {/* Theme toggle pinned to right - only visible when expanded */}
                                            {!targetCollapsed && (
                                                <Tooltip
                                                    content={getThemeTooltip()}
                                                    delay={200}
                                                    position="top"
                                                >
                                                    <button
                                                        onClick={toggleTheme}
                                                        className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                    >
                                                        <ThemeIcon className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </div>
                                        {/* Separate theme toggle item when collapsed - always rendered with animation */}
                                        <div
                                            className={cn(
                                                "overflow-hidden transition-all duration-300",
                                                isCollapsed
                                                    ? "max-h-12 opacity-100"
                                                    : "max-h-0 opacity-0"
                                            )}
                                        >
                                            <Tooltip
                                                content={getThemeTooltip()}
                                                delay={200}
                                                position="right"
                                            >
                                                <button
                                                    onClick={toggleTheme}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground w-full"
                                                >
                                                    <ThemeIcon className="w-5 h-5 flex-shrink-0" />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                );
                            }

                            // Regular items (Settings, etc.)
                            const linkContent = (
                                <Link
                                    to={item.path}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative overflow-hidden",
                                        active
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {active && <ActiveIndicator />}
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    <CollapsibleText collapsed={targetCollapsed}>
                                        {item.label}
                                    </CollapsibleText>
                                </Link>
                            );

                            return (
                                <Tooltip
                                    key={item.path}
                                    content={item.label}
                                    delay={200}
                                    position="right"
                                    disabled={!isCollapsed}
                                >
                                    {linkContent}
                                </Tooltip>
                            );
                        })}
                    </div>
                </div>
            </div>
        </aside>
    );
}
