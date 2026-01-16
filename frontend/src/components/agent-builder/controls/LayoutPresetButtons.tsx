import { LayoutDashboard, MessageSquare, Settings } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
    useAgentBuilderLayoutStore,
    type LayoutPreset
} from "../../../stores/agentBuilderLayoutStore";
import { Tooltip } from "../../common/Tooltip";

import type { LucideIcon } from "lucide-react";

interface PresetConfig {
    id: LayoutPreset;
    icon: LucideIcon;
    label: string;
    tooltip: string;
}

const PRESETS: PresetConfig[] = [
    {
        id: "default",
        icon: LayoutDashboard,
        label: "Default",
        tooltip: "All panels expanded"
    },
    {
        id: "chat-focused",
        icon: MessageSquare,
        label: "Chat",
        tooltip: "Focus on chat, collapse config"
    },
    {
        id: "config-focused",
        icon: Settings,
        label: "Config",
        tooltip: "Focus on config, collapse chat"
    }
];

interface LayoutPresetButtonsProps {
    className?: string;
    /** Called after a preset is applied - use to navigate to build tab */
    onPresetApply?: () => void;
}

export function LayoutPresetButtons({ className, onPresetApply }: LayoutPresetButtonsProps) {
    const { activePreset, applyPreset } = useAgentBuilderLayoutStore();

    const handlePresetClick = (presetId: LayoutPreset) => {
        applyPreset(presetId);
        onPresetApply?.();
    };

    return (
        <div className={cn("flex items-center gap-1 p-1 rounded-lg bg-muted/50", className)}>
            {PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isActive = activePreset === preset.id;

                return (
                    <Tooltip key={preset.id} content={preset.tooltip}>
                        <button
                            onClick={() => handlePresetClick(preset.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                                isActive
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{preset.label}</span>
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}
