import { AlertCircle, ChevronDown } from "lucide-react";
import { ReactNode, useState } from "react";

interface FormFieldProps {
    label: string;
    children: ReactNode;
    description?: string | ReactNode;
    error?: string;
}

export function FormField({ label, children, description, error }: FormFieldProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{label}</label>
            {children}
            {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{error}</span>
                </p>
            )}
            {description && !error && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}
        </div>
    );
}

interface FormSectionProps {
    title: string;
    children: ReactNode;
    /** Whether the section can be collapsed. Defaults to true. */
    collapsible?: boolean;
    /** Whether the section is expanded by default. Defaults to true. */
    defaultExpanded?: boolean;
}

export function FormSection({
    title,
    children,
    collapsible = true,
    defaultExpanded = true
}: FormSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const toggleExpanded = () => {
        if (collapsible) {
            setIsExpanded((prev) => !prev);
        }
    };

    return (
        <div className="border-b border-border">
            <button
                type="button"
                onClick={toggleExpanded}
                disabled={!collapsible}
                className={`w-full px-4 py-3 flex items-center justify-between ${
                    collapsible
                        ? "cursor-pointer hover:bg-muted/50 transition-colors"
                        : "cursor-default"
                }`}
            >
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {title}
                </h3>
                {collapsible && (
                    <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? "" : "-rotate-90"
                        }`}
                    />
                )}
            </button>
            <div
                className={`overflow-hidden transition-all duration-200 ${
                    isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                }`}
            >
                <div className="px-4 pt-2 pb-4 space-y-4">{children}</div>
            </div>
        </div>
    );
}
