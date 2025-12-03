import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded font-medium", {
    variants: {
        variant: {
            default: "bg-muted text-muted-foreground",
            primary: "bg-primary/10 text-primary",
            success: "bg-green-500/10 dark:bg-green-400/20 text-green-700 dark:text-green-400",
            warning: "bg-amber-500/10 dark:bg-amber-400/20 text-amber-700 dark:text-amber-400",
            error: "bg-red-500/10 dark:bg-red-400/20 text-red-700 dark:text-red-400",
            info: "bg-blue-500/10 dark:bg-blue-400/20 text-blue-700 dark:text-blue-400",
            purple: "bg-purple-500/10 dark:bg-purple-400/20 text-purple-700 dark:text-purple-400",
            pro: "bg-amber-500/10 dark:bg-amber-400/20 text-amber-700 dark:text-amber-400"
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
