import { Mic, Keyboard } from "lucide-react";
import { cn } from "../../../lib/utils";

interface VoiceModeToggleProps {
    isVoiceMode: boolean;
    onToggle: () => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Toggle button to switch between text and voice chat modes
 */
export function VoiceModeToggle({
    isVoiceMode,
    onToggle,
    disabled = false,
    className
}: VoiceModeToggleProps) {
    return (
        <button
            onClick={onToggle}
            disabled={disabled}
            className={cn(
                "p-2 rounded-lg transition-colors",
                "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isVoiceMode ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                className
            )}
            title={isVoiceMode ? "Switch to text chat" : "Switch to voice chat"}
        >
            {isVoiceMode ? <Keyboard className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
    );
}
