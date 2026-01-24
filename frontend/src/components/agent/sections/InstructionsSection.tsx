import { FileText } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Textarea } from "../../common/Textarea";
import { CollapsibleSection } from "./CollapsibleSection";

interface InstructionsSectionProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function InstructionsSection({
    value,
    onChange,
    placeholder = "Add instructions for the agent..."
}: InstructionsSectionProps) {
    // Generate summary text for collapsed state
    const summaryText = value
        ? value.length > 60
            ? `${value.substring(0, 60)}...`
            : value
        : "No instructions set";

    return (
        <CollapsibleSection
            id="instructionsSection"
            title="Instructions"
            icon={FileText}
            summaryContent={
                <span className="truncate text-xs italic">{summaryText.split("\n")[0]}</span>
            }
        >
            <Textarea
                value={value}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "w-full px-3 py-2 rounded-lg",
                    "bg-muted border border-border",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                    "font-mono text-sm resize-y"
                )}
                style={{ minHeight: "300px" }}
            />
        </CollapsibleSection>
    );
}
