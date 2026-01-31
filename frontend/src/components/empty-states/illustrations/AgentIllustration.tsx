import { Bot, Search, Send, Wrench } from "lucide-react";

interface AgentIllustrationProps {
    className?: string;
}

/**
 * Agent illustration showing a bot with tool icons around it
 */
export function AgentIllustration({ className = "" }: AgentIllustrationProps) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            {/* Central bot */}
            <div className="relative">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/30">
                    <Bot className="w-7 h-7 text-violet-500" />
                </div>

                {/* Tool icons orbiting around */}
                <div className="absolute -top-2 -right-2 flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/30">
                    <Search className="w-3.5 h-3.5 text-blue-500" />
                </div>

                <div className="absolute -bottom-2 -left-2 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                </div>

                <div className="absolute -bottom-2 -right-2 flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30">
                    <Send className="w-3.5 h-3.5 text-amber-500" />
                </div>
            </div>
        </div>
    );
}
