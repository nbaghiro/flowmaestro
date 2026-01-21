import {
    X,
    Rocket,
    Zap,
    Globe,
    Database,
    FileText,
    Code,
    BarChart3,
    Bot,
    CheckCircle2,
    Clock,
    Brain,
    Link2,
    MousePointerClick,
    Shield,
    MessageSquare,
    Table,
    PieChart,
    FileSpreadsheet,
    FileCheck,
    BookOpen,
    Presentation,
    Mail,
    ListChecks
} from "lucide-react";
import React from "react";
import type { PersonaDefinition, PersonaCategory } from "../../lib/api";

interface PersonaDetailModalProps {
    persona: PersonaDefinition;
    isOpen: boolean;
    onClose: () => void;
    onLaunch: () => void;
}

const categoryColors: Record<PersonaCategory, string> = {
    research: "bg-blue-500/10 text-blue-500",
    content: "bg-purple-500/10 text-purple-500",
    development: "bg-green-500/10 text-green-500",
    data: "bg-orange-500/10 text-orange-500",
    operations: "bg-slate-500/10 text-slate-500",
    business: "bg-indigo-500/10 text-indigo-500"
};

const categoryLabels: Record<PersonaCategory, string> = {
    research: "Research & Analysis",
    content: "Content Creation",
    development: "Development",
    data: "Data & Analytics",
    operations: "Operations",
    business: "Business Intelligence"
};

// Universal agent capabilities that all personas have
const agentCapabilities = [
    {
        icon: <Globe className="w-4 h-4" />,
        name: "Web Browsing",
        description: "Search and analyze information from across the internet"
    },
    {
        icon: <Brain className="w-4 h-4" />,
        name: "Reasoning",
        description: "Think through complex problems step-by-step"
    },
    {
        icon: <Link2 className="w-4 h-4" />,
        name: "Source Citations",
        description: "Reference and cite sources for all findings"
    },
    {
        icon: <MousePointerClick className="w-4 h-4" />,
        name: "Take Actions",
        description: "Execute tasks and create deliverables on your behalf"
    },
    {
        icon: <Database className="w-4 h-4" />,
        name: "Knowledge Access",
        description: "Query your knowledge bases and documents"
    },
    {
        icon: <MessageSquare className="w-4 h-4" />,
        name: "Clarify & Report",
        description: "Ask clarifying questions and provide progress updates"
    }
];

// Additional capabilities based on persona tools
const toolCapabilities: Record<
    string,
    { icon: React.ReactNode; name: string; description: string }
> = {
    code_execution: {
        icon: <Code className="w-4 h-4" />,
        name: "Code Execution",
        description: "Write and run code in a secure sandbox"
    },
    data_analysis: {
        icon: <BarChart3 className="w-4 h-4" />,
        name: "Data Analysis",
        description: "Analyze datasets and generate visualizations"
    }
};

// Map deliverable types to unique icons
function getDeliverableIcon(deliverable: string): React.ReactNode {
    const lower = deliverable.toLowerCase();
    if (lower.includes("report")) return <FileCheck className="w-3.5 h-3.5" />;
    if (lower.includes("matrix") || lower.includes("comparison"))
        return <Table className="w-3.5 h-3.5" />;
    if (lower.includes("csv") || lower.includes("spreadsheet") || lower.includes("data"))
        return <FileSpreadsheet className="w-3.5 h-3.5" />;
    if (lower.includes("chart") || lower.includes("visual") || lower.includes("graph"))
        return <PieChart className="w-3.5 h-3.5" />;
    if (lower.includes("summary") || lower.includes("executive"))
        return <ListChecks className="w-3.5 h-3.5" />;
    if (lower.includes("document") || lower.includes("documentation"))
        return <BookOpen className="w-3.5 h-3.5" />;
    if (lower.includes("presentation") || lower.includes("slide"))
        return <Presentation className="w-3.5 h-3.5" />;
    if (lower.includes("email") || lower.includes("draft")) return <Mail className="w-3.5 h-3.5" />;
    if (lower.includes("code") || lower.includes("test") || lower.includes("pr"))
        return <Code className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
}

export const PersonaDetailModal: React.FC<PersonaDetailModalProps> = ({
    persona,
    isOpen,
    onClose,
    onLaunch
}) => {
    if (!isOpen) return null;

    // Check for additional specialized capabilities
    const tools = persona.default_tools || [];
    const specializedCapabilities = tools
        .map((t) => toolCapabilities[t.type])
        .filter((c): c is NonNullable<typeof c> => c !== undefined);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-card rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-white/10 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5 text-white/70" />
                </button>

                {/* Hero Section */}
                <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {persona.avatar_url ? (
                                <img
                                    src={persona.avatar_url}
                                    alt={persona.name}
                                    className="w-24 h-24 rounded-2xl border-2 border-primary/30"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center">
                                    <Bot className="w-12 h-12 text-primary" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-card" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-2xl font-bold text-foreground">
                                    {persona.name}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${categoryColors[persona.category]}`}
                                >
                                    {categoryLabels[persona.category]}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                    <Zap className="w-3 h-3" />
                                    Autonomous Agent
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {persona.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Agent Capabilities */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Powered by Autonomous Agent
                            </h3>
                            <Shield className="w-3.5 h-3.5 text-green-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {agentCapabilities.map((capability, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                                >
                                    <span className="text-primary mt-0.5">{capability.icon}</span>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {capability.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {capability.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {specializedCapabilities.map((capability, index) => (
                                <div
                                    key={`special-${index}`}
                                    className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
                                >
                                    <span className="text-primary mt-0.5">{capability.icon}</span>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {capability.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {capability.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* What this specialist does */}
                    <section>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Expertise
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {persona.expertise_areas.map((area, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    {area}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Deliverables */}
                    <section>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            What You'll Receive
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {persona.typical_deliverables.map((deliverable, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground"
                                >
                                    <span className="text-muted-foreground">
                                        {getDeliverableIcon(deliverable)}
                                    </span>
                                    {deliverable.replace(/\s*\([^)]*\)/g, "").trim()}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Example Tasks */}
                    <section>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Example Tasks
                        </h3>
                        <div className="space-y-2">
                            {persona.example_tasks.map((task, index) => (
                                <button
                                    key={index}
                                    onClick={onLaunch}
                                    className="w-full text-left p-3 bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/30 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer group"
                                >
                                    <span className="italic">"{task}"</span>
                                    <span className="ml-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        Try this →
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Typically 5-30 min
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            Works in background
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/30">
                    <button
                        onClick={onLaunch}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Rocket className="w-5 h-5" />
                        Assign a Task
                    </button>
                    <p className="text-xs text-center text-muted-foreground mt-3">
                        {persona.name.split(" - ")[0]} will work autonomously and notify you of
                        progress
                    </p>
                </div>
            </div>
        </div>
    );
};
