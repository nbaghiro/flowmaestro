import { CheckSquare, ClipboardList, Square } from "lucide-react";

interface FormIllustrationProps {
    className?: string;
}

/**
 * Form illustration showing a clipboard with checkboxes
 */
export function FormIllustration({ className = "" }: FormIllustrationProps) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className="relative">
                {/* Main clipboard */}
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <ClipboardList className="w-7 h-7 text-amber-500" />
                </div>

                {/* Checkbox indicators */}
                <div className="absolute -right-3 top-0 flex items-center justify-center w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                </div>

                <div className="absolute -right-3 bottom-0 flex items-center justify-center w-6 h-6 rounded bg-muted-foreground/10 border border-muted-foreground/30">
                    <Square className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
            </div>
        </div>
    );
}
