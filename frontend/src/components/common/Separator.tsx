import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "../../lib/utils";

export function Separator({
    className,
    orientation = "horizontal",
    decorative = true,
    ...props
}: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
    return (
        <SeparatorPrimitive.Root
            decorative={decorative}
            orientation={orientation}
            className={cn(
                "shrink-0 bg-border",
                orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
                className
            )}
            {...props}
        />
    );
}

// Also export with label variant
interface DividerProps {
    label?: string;
    className?: string;
}

export function Divider({ label, className }: DividerProps) {
    if (label) {
        return (
            <div className={cn("relative my-6", className)}>
                <div className="absolute inset-0 flex items-center">
                    <Separator />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">{label}</span>
                </div>
            </div>
        );
    }

    return <Separator className={className} />;
}
