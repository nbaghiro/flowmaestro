import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
            <Icon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">{description}</p>
            {action && <div>{action}</div>}
        </div>
    );
}
