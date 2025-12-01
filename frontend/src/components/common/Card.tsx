import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva("bg-card border border-border rounded-lg p-5", {
    variants: {
        variant: {
            default: "",
            hover: "hover:shadow-md transition-shadow",
            interactive: "hover:border-primary hover:shadow-md transition-all cursor-pointer"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});

interface CardProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof cardVariants> {}

export function Card({ variant, className, ...props }: CardProps) {
    return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("mb-3", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn(className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("mt-3 pt-3 border-t border-border", className)} {...props} />;
}
