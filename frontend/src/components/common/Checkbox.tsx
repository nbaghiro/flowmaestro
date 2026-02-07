import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
    label?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
    ({ label, className, id, ...props }, ref) => {
        const checkboxId =
            id || (label ? `checkbox-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);

        return (
            <div className="flex items-center gap-2">
                <CheckboxPrimitive.Root
                    ref={ref}
                    id={checkboxId}
                    className={cn(
                        "w-5 h-5 rounded border-2 shrink-0 transition-colors",
                        "border-muted-foreground/30 bg-muted/50",
                        "hover:border-muted-foreground/50",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                        "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        className
                    )}
                    {...props}
                >
                    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-primary-foreground">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </CheckboxPrimitive.Indicator>
                </CheckboxPrimitive.Root>
                {label && (
                    <label
                        htmlFor={checkboxId}
                        className="text-sm text-foreground select-none cursor-pointer"
                    >
                        {label}
                    </label>
                )}
            </div>
        );
    }
);
Checkbox.displayName = "Checkbox";
