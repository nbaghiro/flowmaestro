import { MessageSquare } from "lucide-react";

interface ChatIllustrationProps {
    className?: string;
}

/**
 * Chat illustration showing stacked message bubbles
 */
export function ChatIllustration({ className = "" }: ChatIllustrationProps) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className="relative">
                {/* Background bubble (user) */}
                <div className="absolute -left-4 -top-3 w-16 h-10 rounded-xl bg-muted-foreground/10 border border-muted-foreground/20" />

                {/* Main bubble (AI response) */}
                <div className="relative flex items-center justify-center w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <MessageSquare className="w-7 h-7 text-blue-500" />
                </div>

                {/* Small response indicator */}
                <div className="absolute -right-2 -bottom-1 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex gap-0.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}
