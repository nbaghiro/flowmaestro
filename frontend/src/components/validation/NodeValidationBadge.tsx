/**
 * NodeValidationBadge Component
 *
 * Enhanced validation badge for nodes showing both node-level and workflow-level
 * validation issues with counts and detailed tooltips.
 */

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useMemo } from "react";
import type { ValidationError, WorkflowValidationIssue } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { useWorkflowStore } from "../../stores/workflowStore";
import { Tooltip } from "../common/Tooltip";

interface NodeValidationBadgeProps {
    nodeId: string;
    /** Node-level validation errors from config validation */
    nodeValidationErrors?: ValidationError[];
    className?: string;
}

interface CombinedIssue {
    message: string;
    severity: "error" | "warning" | "info";
    source: "node" | "workflow";
    suggestion?: string;
}

export function NodeValidationBadge({
    nodeId,
    nodeValidationErrors = [],
    className
}: NodeValidationBadgeProps) {
    const workflowValidation = useWorkflowStore((s) => s.workflowValidation);

    // Get workflow-level issues for this node
    const workflowIssues = useMemo<WorkflowValidationIssue[]>(() => {
        if (!workflowValidation) return [];
        return workflowValidation.nodeIssues.get(nodeId) || [];
    }, [workflowValidation, nodeId]);

    // Combine all issues (avoiding duplicates between node-level and workflow-level)
    const combinedIssues = useMemo<CombinedIssue[]>(() => {
        const issues: CombinedIssue[] = [];

        // Add node-level validation errors
        for (const error of nodeValidationErrors) {
            issues.push({
                message: error.message,
                severity: error.severity,
                source: "node"
            });
        }

        // Add workflow-level issues, excluding MISSING_REQUIRED_CONFIG
        // (those are duplicates of node-level errors already shown above)
        for (const issue of workflowIssues) {
            if (issue.code === "MISSING_REQUIRED_CONFIG") continue;

            issues.push({
                message: issue.message,
                severity: issue.severity,
                source: "workflow",
                suggestion: issue.suggestion
            });
        }

        return issues;
    }, [nodeValidationErrors, workflowIssues]);

    // Count by severity
    const counts = useMemo(() => {
        let errors = 0;
        let warnings = 0;
        let info = 0;

        for (const issue of combinedIssues) {
            switch (issue.severity) {
                case "error":
                    errors++;
                    break;
                case "warning":
                    warnings++;
                    break;
                case "info":
                    info++;
                    break;
            }
        }

        return { errors, warnings, info, total: errors + warnings + info };
    }, [combinedIssues]);

    // Don't render if no issues
    if (counts.total === 0) {
        return null;
    }

    // Determine the primary severity for badge color
    const primarySeverity: "error" | "warning" | "info" =
        counts.errors > 0 ? "error" : counts.warnings > 0 ? "warning" : "info";

    // Build tooltip content
    const tooltipContent = combinedIssues
        .map((issue) => {
            const prefix =
                issue.severity === "error"
                    ? "[Error]"
                    : issue.severity === "warning"
                      ? "[Warn]"
                      : "[Info]";
            return `${prefix} ${issue.message}`;
        })
        .join("\n");

    // Icon based on severity
    const IconComponent =
        primarySeverity === "error"
            ? AlertCircle
            : primarySeverity === "warning"
              ? AlertTriangle
              : Info;

    return (
        <Tooltip content={tooltipContent} position="bottom" delay={100}>
            <div
                className={cn(
                    "flex items-center gap-1 cursor-help",
                    primarySeverity === "error" && "text-red-500 dark:text-red-400",
                    primarySeverity === "warning" && "text-amber-500 dark:text-amber-400",
                    primarySeverity === "info" && "text-blue-500 dark:text-blue-400",
                    className
                )}
            >
                <IconComponent className="w-3.5 h-3.5" />
                {counts.total > 1 && <span className="text-xs font-medium">{counts.total}</span>}
            </div>
        </Tooltip>
    );
}

/**
 * Get border style for a node based on its validation state.
 * Returns the appropriate border color class.
 */
export function getNodeValidationBorderStyle(
    nodeId: string,
    nodeValidationErrors: ValidationError[],
    workflowValidation: ReturnType<typeof useWorkflowStore.getState>["workflowValidation"]
): { hasIssues: boolean; borderClass: string; leftBorderColor: string | undefined } {
    // Check node-level errors
    const hasNodeErrors = nodeValidationErrors.some((e) => e.severity === "error");
    const hasNodeWarnings = nodeValidationErrors.some((e) => e.severity === "warning");

    // Check workflow-level issues (excluding MISSING_REQUIRED_CONFIG which duplicates node-level)
    const workflowIssues = (workflowValidation?.nodeIssues.get(nodeId) || []).filter(
        (i) => i.code !== "MISSING_REQUIRED_CONFIG"
    );
    const hasWorkflowErrors = workflowIssues.some((i) => i.severity === "error");
    const hasWorkflowWarnings = workflowIssues.some((i) => i.severity === "warning");

    // Determine overall state
    const hasErrors = hasNodeErrors || hasWorkflowErrors;
    const hasWarnings = hasNodeWarnings || hasWorkflowWarnings;
    const hasIssues = hasErrors || hasWarnings;

    let borderClass = "";
    let leftBorderColor: string | undefined;

    if (hasErrors) {
        borderClass = "border-red-500/70 dark:border-red-400/70";
        leftBorderColor = "rgb(239 68 68 / 0.7)"; // red-500/70
    } else if (hasWarnings) {
        borderClass = "border-amber-500/70 dark:border-amber-400/70";
        leftBorderColor = "rgb(245 158 11 / 0.7)"; // amber-500/70
    }

    return { hasIssues, borderClass, leftBorderColor };
}
