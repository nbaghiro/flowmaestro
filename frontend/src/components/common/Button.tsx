import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:pointer-events-none",
    {
        variants: {
            variant: {
                primary: "bg-primary text-white hover:bg-primary/90",
                secondary: "bg-card border border-border text-foreground hover:bg-muted",
                destructive: "bg-destructive text-white hover:bg-destructive/90",
                ghost: "hover:bg-muted text-foreground",
                icon: "p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
            },
            size: {
                sm: "px-3 py-1.5 text-sm",
                md: "px-4 py-2 text-sm",
                lg: "px-6 py-3 text-base"
            }
        },
        defaultVariants: {
            variant: "primary",
            size: "md"
        }
    }
);

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant, size, asChild, loading, className, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";

        // Don't apply size styles to icon variant
        const computedSize = variant === "icon" ? undefined : size;

        return (
            <Comp
                ref={ref}
                className={cn(buttonVariants({ variant, size: computedSize }), className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {children}
            </Comp>
        );
    }
);
Button.displayName = "Button";
