import { clsx } from "clsx";

interface TypingDotsProps {
    className?: string;
}

export function TypingDots({ className }: TypingDotsProps) {
    return (
        <div className={clsx("flex items-center gap-1", className)}>
            <span
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                style={{ animationDelay: "0ms", animationDuration: "0.6s" }}
            />
            <span
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                style={{ animationDelay: "150ms", animationDuration: "0.6s" }}
            />
            <span
                className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
                style={{ animationDelay: "300ms", animationDuration: "0.6s" }}
            />
        </div>
    );
}
