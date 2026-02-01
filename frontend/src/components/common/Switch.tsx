import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
    label?: string;
}

export const Switch = forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
    ({ label, className, id, ...props }, ref) => {
        const switchId =
            id || (label ? `switch-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);

        return (
            <div className="flex items-center gap-2">
                <SwitchPrimitive.Root
                    ref={ref}
                    id={switchId}
                    className={cn(
                        "w-9 h-5 rounded-full relative transition-colors shrink-0",
                        "bg-muted-foreground/30",
                        "hover:bg-muted-foreground/40",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                        "data-[state=checked]:bg-primary",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        className
                    )}
                    {...props}
                >
                    <SwitchPrimitive.Thumb
                        className={cn(
                            "block w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                            "translate-x-0.5 data-[state=checked]:translate-x-[18px]"
                        )}
                    />
                </SwitchPrimitive.Root>
                {label && (
                    <label
                        htmlFor={switchId}
                        className="text-sm text-foreground select-none cursor-pointer"
                    >
                        {label}
                    </label>
                )}
            </div>
        );
    }
);
Switch.displayName = "Switch";
