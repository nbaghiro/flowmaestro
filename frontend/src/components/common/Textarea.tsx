import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ error, className, ...props }, ref) => {
        return (
            <textarea
                ref={ref}
                className={cn(
                    "w-full px-3 py-2 text-sm bg-card border rounded-lg text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "disabled:opacity-50 disabled:cursor-not-allowed resize-none",
                    error ? "border-destructive focus:ring-destructive" : "border-border",
                    className
                )}
                {...props}
            />
        );
    }
);
Textarea.displayName = "Textarea";
