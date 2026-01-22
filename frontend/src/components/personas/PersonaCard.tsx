import {
    FileText,
    Table,
    FileCode,
    ArrowRight,
    FileCheck,
    PieChart,
    FileSpreadsheet,
    ListChecks,
    BookOpen,
    Presentation,
    Mail,
    ScrollText,
    TrendingUp,
    Radar,
    ShieldCheck,
    Building2,
    DollarSign,
    MessageSquareText,
    ClipboardList
} from "lucide-react";
import React from "react";
import { usePersonaStore } from "../../stores/personaStore";
import type { PersonaDefinitionSummary, PersonaCategory } from "../../lib/api";

interface PersonaCardProps {
    persona: PersonaDefinitionSummary;
    onClick: () => void;
    onLaunch: () => void;
}

const categoryColors: Record<PersonaCategory, string> = {
    research: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    content: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    development: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    data: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    operations: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
    business: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    proposals: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
};

// Map deliverable types to unique icons
function getDeliverableIcon(deliverable: string): React.ReactNode {
    const lower = deliverable.toLowerCase();

    // Specific matches first (more unique)
    if (lower.includes("bibliography") || lower.includes("citation"))
        return <BookOpen className="w-4 h-4" />;
    if (lower.includes("trend") || lower.includes("signal"))
        return <TrendingUp className="w-4 h-4" />;
    if (lower.includes("radar") || lower.includes("technology"))
        return <Radar className="w-4 h-4" />;
    if (lower.includes("scenario") || lower.includes("future"))
        return <ScrollText className="w-4 h-4" />;
    if (lower.includes("due diligence") || lower.includes("risk"))
        return <ShieldCheck className="w-4 h-4" />;
    if (lower.includes("company") || lower.includes("profile"))
        return <Building2 className="w-4 h-4" />;
    if (lower.includes("investment") || lower.includes("memo"))
        return <DollarSign className="w-4 h-4" />;
    if (lower.includes("pricing") || lower.includes("benchmark"))
        return <DollarSign className="w-4 h-4" />;
    if (lower.includes("feedback") || lower.includes("voice") || lower.includes("insight"))
        return <MessageSquareText className="w-4 h-4" />;
    if (lower.includes("checklist") || lower.includes("sop") || lower.includes("procedure"))
        return <ClipboardList className="w-4 h-4" />;
    if (lower.includes("email") || lower.includes("draft") || lower.includes("template"))
        return <Mail className="w-4 h-4" />;
    if (lower.includes("action") || lower.includes("decision") || lower.includes("meeting"))
        return <ListChecks className="w-4 h-4" />;
    if (lower.includes("presentation") || lower.includes("slide"))
        return <Presentation className="w-4 h-4" />;

    // General matches
    if (lower.includes("executive") || lower.includes("summary"))
        return <ListChecks className="w-4 h-4" />;
    if (lower.includes("matrix") || lower.includes("comparison") || lower.includes("methodology"))
        return <Table className="w-4 h-4" />;
    if (
        lower.includes("csv") ||
        lower.includes("spreadsheet") ||
        lower.includes("data") ||
        lower.includes("export")
    )
        return <FileSpreadsheet className="w-4 h-4" />;
    if (
        lower.includes("chart") ||
        lower.includes("visual") ||
        lower.includes("graph") ||
        lower.includes("dashboard")
    )
        return <PieChart className="w-4 h-4" />;
    if (
        lower.includes("code") ||
        lower.includes("test") ||
        lower.includes("pr") ||
        lower.includes("api")
    )
        return <FileCode className="w-4 h-4" />;
    if (lower.includes("report") || lower.includes("analysis"))
        return <FileCheck className="w-4 h-4" />;
    if (lower.includes("document") || lower.includes("guide") || lower.includes("readme"))
        return <BookOpen className="w-4 h-4" />;
    if (lower.includes("literature") || lower.includes("review"))
        return <ScrollText className="w-4 h-4" />;

    return <FileText className="w-4 h-4" />;
}

// Shorten deliverable names for display
function shortenDeliverable(deliverable: string): string {
    // Remove parenthetical content and shorten
    const cleaned = deliverable.replace(/\s*\([^)]*\)/g, "").trim();
    // Take first 2-3 words
    const words = cleaned.split(" ");
    if (words.length <= 2) return cleaned;
    return words.slice(0, 2).join(" ");
}

export const PersonaCard: React.FC<PersonaCardProps> = ({ persona, onClick, onLaunch }) => {
    const { customAvatars } = usePersonaStore();

    const handleLaunchClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLaunch();
    };

    // Get unique deliverables (max 4)
    const deliverables = persona.typical_deliverables.slice(0, 4);

    // Use custom avatar if set, otherwise fall back to persona's avatar
    const displayAvatarUrl = customAvatars[persona.id] || persona.avatar_url;

    return (
        <div
            className="group relative bg-card border border-border rounded-lg p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col h-full"
            onClick={onClick}
        >
            {/* Header: Avatar + Name + Category */}
            <div className="flex items-start gap-3 mb-3">
                {displayAvatarUrl ? (
                    <img
                        src={displayAvatarUrl}
                        alt={persona.name}
                        className="w-11 h-11 rounded-full flex-shrink-0"
                    />
                ) : (
                    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">👤</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground leading-tight">{persona.name}</h3>
                    <span
                        className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[persona.category]}`}
                    >
                        {persona.category}
                    </span>
                </div>
            </div>

            {/* Description - shorter */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{persona.description}</p>

            {/* Deliverables section - Output first */}
            {deliverables.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Delivers
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {deliverables.map((deliverable, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1.5 text-xs text-foreground bg-muted/50 px-2 py-1 rounded"
                            >
                                {getDeliverableIcon(deliverable)}
                                <span>{shortenDeliverable(deliverable)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer - subtle start action */}
            <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Click for details</span>
                <button
                    onClick={handleLaunchClick}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    Start task
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
