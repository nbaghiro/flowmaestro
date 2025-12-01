import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, Info, CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "../../lib/utils";

const alertVariants = cva("flex items-start gap-2 p-3 border rounded-lg", {
    variants: {
        variant: {
            error: "bg-red-50 border-red-200 text-red-800",
            warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
            info: "bg-blue-50 border-blue-200 text-blue-800",
            success: "bg-green-50 border-green-200 text-green-800"
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
