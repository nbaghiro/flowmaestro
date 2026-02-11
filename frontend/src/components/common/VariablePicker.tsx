/**
 * Variable Picker Component
 * Popover-based browser for selecting available variables in workflow configurations.
 * Shows variables grouped by source node with search/filter capability.
 */

import * as Popover from "@radix-ui/react-popover";
import { Search, ChevronDown, ChevronRight, Variable, Braces } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "../../lib/utils";
import {
    getAvailableVariables,
    filterVariables,
    groupVariablesBySource,
    type VariableGroup
} from "../../lib/variableRegistry";
import { useWorkflowStore } from "../../stores/workflowStore";
import { Input } from "./Input";

interface VariablePickerProps {
    /** ID of the node being configured (to determine available variables) */
    nodeId: string;
    /** Callback when a variable is selected */
    onSelect: (variablePath: string) => void;
    /** Custom trigger element (optional) */
    trigger?: React.ReactNode;
    /** Whether the picker is disabled */
    disabled?: boolean;
}

/**
 * Get icon for node type
 */
function getNodeTypeIcon(nodeType: string | null): React.ReactNode {
    switch (nodeType) {
        case "llm":
            return <span className="text-purple-500">AI</span>;
        case "http":
            return <span className="text-blue-500">HTTP</span>;
        case "code":
            return <span className="text-green-500">{"</>"}</span>;
        case "transform":
            return <span className="text-orange-500">T</span>;
        case "conditional":
            return <span className="text-yellow-500">?</span>;
        case "integration":
            return <span className="text-pink-500">INT</span>;
        case "input":
            return <span className="text-cyan-500">IN</span>;
        case "loop":
            return <span className="text-indigo-500">LOOP</span>;
        default:
            return <Braces className="w-3 h-3 text-muted-foreground" />;
    }
}

interface VariableGroupSectionProps {
    group: VariableGroup;
    expanded: boolean;
    onToggle: () => void;
    onSelect: (path: string) => void;
}

function VariableGroupSection({ group, expanded, onToggle, onSelect }: VariableGroupSectionProps) {
    return (
        <div className="border-b border-border/50 last:border-b-0">
            {/* Group Header */}
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left",
                    "hover:bg-muted/50 transition-colors",
                    "text-sm font-medium"
                )}
            >
                {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="flex items-center gap-1.5">
                    {getNodeTypeIcon(group.sourceNodeType)}
                    <span className="truncate">{group.sourceNodeName}</span>
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                    {group.variables.length}
                </span>
            </button>

            {/* Variables List */}
            {expanded && (
                <div className="pb-1">
                    {group.variables.map((variable) => (
                        <button
                            key={variable.path}
                            type="button"
                            onClick={() => onSelect(variable.path)}
                            className={cn(
                                "w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left",
                                "hover:bg-primary/10 transition-colors",
                                "text-sm"
                            )}
                        >
                            <Variable className="w-3 h-3 text-primary flex-shrink-0" />
                            <span className="font-mono text-xs truncate">{variable.path}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                                {variable.type}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function VariablePicker({
    nodeId,
    onSelect,
    trigger,
    disabled = false
}: VariablePickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const { nodes, edges } = useWorkflowStore();

    // Get available variables for this node
    const allVariables = useMemo(() => {
        return getAvailableVariables(nodeId, nodes, edges);
    }, [nodeId, nodes, edges]);

    // Filter by search
    const filteredVariables = useMemo(() => {
        return filterVariables(allVariables, search);
    }, [allVariables, search]);

    // Group by source
    const groups = useMemo(() => {
        return groupVariablesBySource(filteredVariables);
    }, [filteredVariables]);

    // Auto-expand all groups when searching
    const effectiveExpandedGroups = useMemo(() => {
        if (search.trim()) {
            return new Set(groups.map((g) => g.sourceNodeId || g.sourceNodeName));
        }
        return expandedGroups;
    }, [search, groups, expandedGroups]);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const handleSelect = (path: string) => {
        onSelect(path);
        setOpen(false);
        setSearch("");
    };

    const defaultTrigger = (
        <button
            type="button"
            disabled={disabled}
            className={cn(
                "px-2 border border-border rounded-lg",
                "flex items-center justify-center",
                "hover:bg-muted/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Browse variables"
        >
            <Variable className="w-4 h-4 text-muted-foreground" />
        </button>
    );

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>{trigger || defaultTrigger}</Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    side="bottom"
                    align="end"
                    sideOffset={4}
                    collisionPadding={16}
                    avoidCollisions={true}
                    className={cn(
                        "z-50 w-80 max-h-96 rounded-lg border border-border bg-card shadow-lg",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "data-[side=bottom]:slide-in-from-top-2",
                        "data-[side=top]:slide-in-from-bottom-2",
                        "flex flex-col"
                    )}
                >
                    {/* Search Header */}
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search variables..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 h-8 text-sm"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Variable Groups */}
                    <div
                        className="flex-1 overflow-y-auto"
                        style={{
                            scrollbarWidth: "thin",
                            scrollbarColor: "hsl(var(--border)) transparent"
                        }}
                    >
                        {groups.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                {allVariables.length === 0 ? (
                                    <>
                                        <Variable className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No variables available</p>
                                        <p className="text-xs mt-1">
                                            Connect upstream nodes to access their outputs
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No matching variables</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            groups.map((group) => (
                                <VariableGroupSection
                                    key={group.sourceNodeId || group.sourceNodeName}
                                    group={group}
                                    expanded={effectiveExpandedGroups.has(
                                        group.sourceNodeId || group.sourceNodeName
                                    )}
                                    onToggle={() =>
                                        toggleGroup(group.sourceNodeId || group.sourceNodeName)
                                    }
                                    onSelect={handleSelect}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer Help */}
                    <div className="p-2 border-t border-border bg-muted/30">
                        <p className="text-xs text-muted-foreground text-center">
                            Click to insert{" "}
                            <code className="px-1 bg-muted rounded">{"{{var}}"}</code>
                        </p>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
