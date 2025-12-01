import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
    label?: string;
}

export const Checkbox = forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
    ({ label, className, ...props }, ref) => {
        return (
            <div className="flex items-center gap-2">
                <CheckboxPrimitive.Root
                    ref={ref}
                    className={cn(
                        "w-4 h-4 rounded border border-border shrink-0",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20",
                        "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        className
                    )}
                    {...props}
                >
                    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
                        <Check className="w-3 h-3" />
                    </CheckboxPrimitive.Indicator>
                </CheckboxPrimitive.Root>
                {label && <label className="text-sm text-foreground select-none">{label}</label>}
            </div>
        );
    }
);
Checkbox.displayName = "Checkbox";
