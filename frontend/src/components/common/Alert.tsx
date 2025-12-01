import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, Info, CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "../../lib/utils";

const alertVariants = cva("flex items-start gap-2 p-3 border rounded-lg", {
    variants: {
        variant: {
            error: "bg-red-500/10 dark:bg-red-400/20 border-red-500/30 dark:border-red-400/30 text-red-800 dark:text-red-400",
            warning:
                "bg-amber-500/10 dark:bg-amber-400/20 border-amber-500/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-400",
            info: "bg-blue-500/10 dark:bg-blue-400/20 border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400",
            success:
                "bg-green-500/10 dark:bg-green-400/20 border-green-500/30 dark:border-green-400/30 text-green-800 dark:text-green-400"
        }
    },
    defaultVariants: {
        variant: "info"
    }
});

const iconMap = {
    error: XCircle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle
};

interface AlertProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof alertVariants> {
    title?: string;
    onClose?: () => void;
}

export function Alert({
    variant = "info",
    title,
    children,
    onClose,
    className,
    ...props
}: AlertProps) {
    const actualVariant = variant ?? "info";
    const Icon = iconMap[actualVariant];

    return (
        <div className={cn(alertVariants({ variant }), className)} {...props}>
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
                {title && <p className="font-medium mb-1">{title}</p>}
                <div className="text-sm">{children}</div>
            </div>
            {onClose && (
                <button onClick={onClose} className="p-1 hover:opacity-70 transition-opacity">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
