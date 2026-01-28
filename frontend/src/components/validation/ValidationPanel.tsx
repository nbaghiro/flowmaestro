/**
 * ValidationPanel Component
 *
 * Full-height right side panel showing workflow-level validation issues grouped by severity.
 * Displays errors, warnings, and info messages with node links.
 */

import {
    AlertCircle,
    AlertTriangle,
    Info,
    ChevronDown,
    ChevronRight,
    X,
    CheckCircle,
    Eye,
    EyeOff
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import type { WorkflowValidationIssue, WorkflowValidationSeverity } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { useWorkflowStore } from "../../stores/workflowStore";

interface ValidationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNodeClick?: (nodeId: string) => void;
}

const MIN_WIDTH = 360;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 420;

const severityConfig: Record<
    WorkflowValidationSeverity,
    {
        icon: typeof AlertCircle;
        color: string;
        bgColor: string;
        borderColor: string;
        label: string;
    }
> = {
    error: {
        icon: AlertCircle,
        color: "text-red-500 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800",
        label: "Errors"
    },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-500 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        label: "Warnings"
    },
    info: {
        icon: Info,
        color: "text-blue-500 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        label: "Info"
    }
};

interface IssueItemProps {
    issue: WorkflowValidationIssue;
    nodeName?: string;
    onNodeClick?: (nodeId: string) => void;
}

function IssueItem({ issue, nodeName, onNodeClick }: IssueItemProps) {
    const config = severityConfig[issue.severity];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                "flex items-start gap-3 px-4 py-3 text-sm",
                issue.nodeId && onNodeClick && "cursor-pointer hover:bg-muted/50",
                "border-b border-border/50 last:border-b-0"
            )}
            onClick={() => {
                if (issue.nodeId && onNodeClick) {
                    onNodeClick(issue.nodeId);
                }
            }}
        >
            <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.color)} />
            <div className="flex-1 min-w-0">
                <p className="text-foreground">
                    {issue.nodeId && nodeName && (
                        <span className="font-semibold text-foreground">{nodeName}: </span>
                    )}
                    {issue.message}
                </p>
                {issue.suggestion && (
                    <p className="text-xs text-muted-foreground mt-1">{issue.suggestion}</p>
                )}
            </div>
        </div>
    );
}

interface SeveritySectionProps {
    severity: WorkflowValidationSeverity;
    issues: WorkflowValidationIssue[];
    nodeNames: Map<string, string>;
    defaultExpanded?: boolean;
    onNodeClick?: (nodeId: string) => void;
}

function SeveritySection({
    severity,
    issues,
    nodeNames,
    defaultExpanded = true,
    onNodeClick
}: SeveritySectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const config = severityConfig[severity];
    const Icon = config.icon;

    if (issues.length === 0) return null;

    return (
        <div className="border-b border-border last:border-b-0">
            <button
                className={cn(
                    "w-full flex items-center gap-2 px-4 py-3 text-sm font-medium",
                    config.bgColor,
                    "hover:opacity-90 transition-opacity"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronRight className="w-4 h-4" />
                )}
                <Icon className={cn("w-4 h-4", config.color)} />
                <span className={config.color}>
                    {config.label} ({issues.length})
                </span>
            </button>
            {isExpanded && (
                <div className="bg-background">
                    {issues.map((issue) => (
                        <IssueItem
                            key={issue.id}
                            issue={issue}
                            nodeName={issue.nodeId ? nodeNames.get(issue.nodeId) : undefined}
                            onNodeClick={onNodeClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function ValidationPanel({ isOpen, onClose, onNodeClick }: ValidationPanelProps) {
    const { workflowValidation, nodes } = useWorkflowStore();
    const panelRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(DEFAULT_WIDTH);

    // Build node name lookup map
    const nodeNames = useMemo(() => {
        const map = new Map<string, string>();
        for (const node of nodes) {
            const label = (node.data?.label as string) || node.type || node.id;
            map.set(node.id, label);
        }
        return map;
    }, [nodes]);

    // Group issues by severity
    const groupedIssues = useMemo(() => {
        if (!workflowValidation) {
            return { errors: [], warnings: [], info: [] };
        }

        const errors: WorkflowValidationIssue[] = [];
        const warnings: WorkflowValidationIssue[] = [];
        const info: WorkflowValidationIssue[] = [];

        for (const issue of workflowValidation.allIssues) {
            switch (issue.severity) {
                case "error":
                    errors.push(issue);
                    break;
                case "warning":
                    warnings.push(issue);
                    break;
                case "info":
                    info.push(issue);
                    break;
            }
        }

        return { errors, warnings, info };
    }, [workflowValidation]);

    const totalIssues = workflowValidation?.allIssues.length ?? 0;
    const isValid = workflowValidation?.isValid ?? true;

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = width;
    };

    // Handle resize
    useEffect(() => {
        const handleResize = (e: MouseEvent) => {
            if (!isResizing) return;

            const deltaX = resizeStartX.current - e.clientX;
            const newWidth = Math.max(
                MIN_WIDTH,
                Math.min(MAX_WIDTH, resizeStartWidth.current + deltaX)
            );

            setWidth(newWidth);
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleResize);
            document.addEventListener("mouseup", handleResizeEnd);

            return () => {
                document.removeEventListener("mousemove", handleResize);
                document.removeEventListener("mouseup", handleResizeEnd);
            };
        }

        return undefined;
    }, [isResizing, width]);

    if (!isOpen) return null;

    return (
        <div className="fixed top-0 right-0 bottom-0 z-50" data-right-panel>
            <div
                ref={panelRef}
                className="h-full bg-card border-l border-border shadow-2xl flex flex-col"
                style={{ width }}
            >
                {/* Resize Handle */}
                <div
                    className={cn(
                        "absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors",
                        isResizing && "bg-primary/30"
                    )}
                    onMouseDown={handleResizeStart}
                >
                    <div className="absolute top-0 left-0 bottom-0 w-3 -translate-x-1/2" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <h3 className="text-sm font-semibold">Validation Issues</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {totalIssues === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                            <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                            <p className="text-foreground font-medium">No issues found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Your workflow is ready to run
                            </p>
                        </div>
                    ) : (
                        <>
                            <SeveritySection
                                severity="error"
                                issues={groupedIssues.errors}
                                nodeNames={nodeNames}
                                defaultExpanded={true}
                                onNodeClick={onNodeClick}
                            />
                            <SeveritySection
                                severity="warning"
                                issues={groupedIssues.warnings}
                                nodeNames={nodeNames}
                                defaultExpanded={groupedIssues.errors.length === 0}
                                onNodeClick={onNodeClick}
                            />
                            <SeveritySection
                                severity="info"
                                issues={groupedIssues.info}
                                nodeNames={nodeNames}
                                defaultExpanded={false}
                                onNodeClick={onNodeClick}
                            />
                        </>
                    )}
                </div>

                {/* Footer summary */}
                {totalIssues > 0 && (
                    <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex-shrink-0">
                        {workflowValidation?.summary.errorCount ?? 0} errors,{" "}
                        {workflowValidation?.summary.warningCount ?? 0} warnings,{" "}
                        {workflowValidation?.summary.infoCount ?? 0} info
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * ValidationSummaryBadge
 *
 * Small badge showing validation summary for use in toolbar.
 * Includes a toggle to show/hide validation indicators on nodes.
 */
interface ValidationSummaryBadgeProps {
    onClick: () => void;
    className?: string;
}

export function ValidationSummaryBadge({ onClick, className }: ValidationSummaryBadgeProps) {
    const { workflowValidation, hideNodeValidationIndicators, toggleNodeValidationIndicators } =
        useWorkflowStore();

    const errorCount = workflowValidation?.summary.errorCount ?? 0;
    const warningCount = workflowValidation?.summary.warningCount ?? 0;
    const isValid = workflowValidation?.isValid ?? true;

    // Don't show if no issues
    if (errorCount === 0 && warningCount === 0) {
        return null;
    }

    const hasErrors = errorCount > 0;
    const baseColorClasses = hasErrors
        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
        : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400";
    const hoverColorClasses = hasErrors
        ? "hover:bg-red-100 dark:hover:bg-red-950/50"
        : "hover:bg-amber-100 dark:hover:bg-amber-950/50";

    // When node indicators are hidden, show a compact icon-only badge
    if (hideNodeValidationIndicators) {
        return (
            <button
                onClick={toggleNodeValidationIndicators}
                className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                    "border transition-colors",
                    baseColorClasses,
                    hoverColorClasses,
                    className
                )}
                title="Show validation errors on nodes"
            >
                {hasErrors ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <Eye className="w-3 h-3 opacity-70" />
            </button>
        );
    }

    return (
        <div className={cn("flex items-center gap-0.5", className)}>
            <button
                onClick={onClick}
                className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-l text-xs font-medium",
                    "border border-r-0 transition-colors",
                    baseColorClasses,
                    hoverColorClasses
                )}
                title={isValid ? "Warnings found" : "Errors found"}
            >
                {hasErrors ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>
                    {errorCount > 0 && `${errorCount} error${errorCount !== 1 ? "s" : ""}`}
                    {errorCount > 0 && warningCount > 0 && ", "}
                    {warningCount > 0 && `${warningCount} warning${warningCount !== 1 ? "s" : ""}`}
                </span>
            </button>
            <button
                onClick={toggleNodeValidationIndicators}
                className={cn(
                    "flex items-center px-1.5 py-1 rounded-r text-xs",
                    "border transition-colors",
                    baseColorClasses,
                    hoverColorClasses
                )}
                title="Hide validation errors on nodes"
            >
                <EyeOff className="w-3 h-3" />
            </button>
        </div>
    );
}
