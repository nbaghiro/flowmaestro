import { BookOpen, FileText, Layers } from "lucide-react";

interface KnowledgeBaseIllustrationProps {
    className?: string;
}

/**
 * Knowledge base illustration showing a book with document icons
 */
export function KnowledgeBaseIllustration({ className = "" }: KnowledgeBaseIllustrationProps) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className="relative">
                {/* Main book */}
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <BookOpen className="w-7 h-7 text-emerald-500" />
                </div>

                {/* Document stack indicator */}
                <div className="absolute -left-3 -top-1 flex items-center justify-center w-6 h-6 rounded bg-blue-500/10 border border-blue-500/30">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                </div>

                {/* Layers indicator */}
                <div className="absolute -right-2 -bottom-1 flex items-center justify-center w-6 h-6 rounded bg-violet-500/10 border border-violet-500/30">
                    <Layers className="w-3.5 h-3.5 text-violet-500" />
                </div>
            </div>
        </div>
    );
}
