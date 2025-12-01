import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ error, className, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    "w-full px-3 py-2 text-sm bg-card border rounded-lg text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    error ? "border-destructive focus:ring-destructive" : "border-border",
                    className
                )}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";
