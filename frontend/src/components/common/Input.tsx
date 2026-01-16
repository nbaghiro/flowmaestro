import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ error, className, type, ...props }, ref) => {
        // Range inputs need different styling
        if (type === "range") {
            return (
                <input
                    ref={ref}
                    type="range"
                    className={cn(
                        "w-full h-2 rounded-lg appearance-none cursor-pointer",
                        "bg-border",
                        "[&::-webkit-slider-thumb]:appearance-none",
                        "[&::-webkit-slider-thumb]:w-4",
                        "[&::-webkit-slider-thumb]:h-4",
                        "[&::-webkit-slider-thumb]:rounded-full",
                        "[&::-webkit-slider-thumb]:bg-foreground",
                        "[&::-webkit-slider-thumb]:cursor-pointer",
                        "[&::-webkit-slider-thumb]:transition-transform",
                        "[&::-webkit-slider-thumb]:hover:scale-110",
                        "[&::-moz-range-thumb]:w-4",
                        "[&::-moz-range-thumb]:h-4",
                        "[&::-moz-range-thumb]:rounded-full",
                        "[&::-moz-range-thumb]:bg-foreground",
                        "[&::-moz-range-thumb]:border-0",
                        "[&::-moz-range-thumb]:cursor-pointer",
                        "[&::-moz-range-track]:bg-border",
                        "[&::-moz-range-track]:rounded-lg",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        className
                    )}
                    {...props}
                />
            );
        }

        return (
            <input
                ref={ref}
                type={type}
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
