import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded font-medium", {
    variants: {
        variant: {
            default: "bg-muted text-muted-foreground",
            primary: "bg-primary/10 text-primary",
            success: "bg-green-100 text-green-700",
            warning: "bg-yellow-100 text-yellow-700",
            error: "bg-red-100 text-red-700"
        },
        size: {
            sm: "px-1.5 py-0.5 text-xs",
            md: "px-2 py-1 text-sm"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "md"
    }
});

interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {}

export function Badge({ variant, size, className, ...props }: BadgeProps) {
    return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
