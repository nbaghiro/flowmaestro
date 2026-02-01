import { Circle, FileText, Sparkles } from "lucide-react";

interface WorkflowIllustrationProps {
    className?: string;
}

/**
 * Workflow illustration showing a flow diagram concept:
 * Circle (trigger) -> Sparkles (AI) -> FileText (output)
 */
export function WorkflowIllustration({ className = "" }: WorkflowIllustrationProps) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            {/* Container with subtle background */}
            <div className="relative flex items-center gap-3">
                {/* Trigger node */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <Circle className="w-5 h-5 text-blue-500" />
                </div>

                {/* Connection line */}
                <div className="w-6 h-0.5 bg-gradient-to-r from-blue-500/50 to-violet-500/50" />

                {/* AI node (center, larger) */}
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/30">
                    <Sparkles className="w-6 h-6 text-violet-500" />
                </div>

                {/* Connection line */}
                <div className="w-6 h-0.5 bg-gradient-to-r from-violet-500/50 to-emerald-500/50" />

                {/* Output node */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <FileText className="w-5 h-5 text-emerald-500" />
                </div>
            </div>
        </div>
    );
}
