import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description?: string;
    action?: ReactNode;
    /** Content to show below the header row (e.g., expanded search on mobile) */
    belowContent?: ReactNode;
}

export function PageHeader({ title, description, action, belowContent }: PageHeaderProps) {
    return (
        <div className="mb-6 md:mb-8">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                </div>

                {action && <div className="flex-shrink-0">{action}</div>}
            </div>

            {/* Portal target for mobile expanded search */}
            <div id="mobile-search-portal" className="mt-4 empty:mt-0" />

            {belowContent && <div className="mt-4">{belowContent}</div>}
        </div>
    );
}
