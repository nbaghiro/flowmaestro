import { ReactNode } from "react";

interface FormFieldProps {
    label: string;
    children: ReactNode;
    description?: string | ReactNode;
}

export function FormField({ label, children, description }: FormFieldProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{label}</label>
            {children}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
    );
}

interface FormSectionProps {
    title: string;
    children: ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
    return (
        <div className="px-4 py-3 space-y-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {title}
            </h3>
            {children}
        </div>
    );
}
