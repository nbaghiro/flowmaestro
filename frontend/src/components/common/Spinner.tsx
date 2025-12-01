import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const spinnerVariants = cva("animate-spin text-primary", {
    variants: {
        size: {
            sm: "w-4 h-4",
            md: "w-6 h-6",
            lg: "w-8 h-8"
        }
    },
    defaultVariants: {
        size: "md"
    }
});

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
    className?: string;
}

export function Spinner({ size, className }: SpinnerProps) {
    return <Loader2 className={cn(spinnerVariants({ size }), className)} />;
}

interface LoadingStateProps {
    message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}
