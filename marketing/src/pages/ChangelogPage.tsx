import { motion } from "framer-motion";
import { Sparkles, Bug, Zap, Shield } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { OtherPagesEvents } from "../lib/analytics";

interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: {
        type: "feature" | "improvement" | "fix" | "security";
        description: string;
    }[];
}

const changelog: ChangelogEntry[] = [
    {
        version: "2.4.0",
        date: "December 20, 2024",
        title: "AI Agent Enhancements",
        changes: [
            {
                type: "feature",
                description: "Added support for Claude 3.5 Sonnet and GPT-4 Turbo models"
            },
            {
                type: "feature",
                description: "New agent memory system for persistent context across conversations"
            },
            {
                type: "improvement",
                description: "50% faster agent response times through optimized streaming"
            },
            {
                type: "fix",
                description: "Fixed issue with agent tool calls timing out on slow APIs"
            }
        ]
    },
    {
        version: "2.3.0",
        date: "December 10, 2024",
        title: "Workflow Builder Improvements",
        changes: [
            { type: "feature", description: "Introduced visual diff view for workflow versions" },
            {
                type: "feature",
                description: "New conditional branching node with advanced expression support"
            },
            {
                type: "improvement",
                description: "Improved drag-and-drop performance on large canvases"
            },
            {
                type: "fix",
                description: "Fixed edge case where loops would not terminate correctly"
            },
            {
                type: "security",
                description: "Enhanced credential encryption for stored integration tokens"
            }
        ]
    },
    {
        version: "2.2.0",
        date: "November 28, 2024",
        title: "New Integrations",
        changes: [
            { type: "feature", description: "Added Shopify integration with 15+ operations" },
            { type: "feature", description: "Added Linear integration for project management" },
            { type: "feature", description: "Added Anthropic Claude API direct integration" },
            {
                type: "improvement",
                description: "OAuth flow now supports PKCE for enhanced security"
            },
            { type: "fix", description: "Fixed Google Calendar timezone handling issues" }
        ]
    },
    {
        version: "2.1.0",
        date: "November 15, 2024",
        title: "Execution Monitoring",
        changes: [
            { type: "feature", description: "Real-time execution logs with filtering and search" },
            { type: "feature", description: "Execution replay for debugging failed workflows" },
            {
                type: "improvement",
                description: "Added detailed cost tracking per workflow execution"
            },
            { type: "fix", description: "Fixed memory leak in long-running workflow executions" }
        ]
    },
    {
        version: "2.0.0",
        date: "November 1, 2024",
        title: "FlowMaestro 2.0 - AI Agents",
        changes: [
            {
                type: "feature",
                description:
                    "Introducing AI Agents - autonomous agents that work alongside workflows"
            },
            { type: "feature", description: "MCP server support for extending agent capabilities" },
            { type: "feature", description: "Agent-to-workflow and workflow-to-agent handoffs" },
            { type: "improvement", description: "Completely redesigned workflow canvas" },
            { type: "security", description: "SOC 2 Type II compliance achieved" }
        ]
    }
];

const typeConfig = {
    feature: { icon: Sparkles, color: "text-green-400", bg: "bg-green-400/10", label: "New" },
    improvement: { icon: Zap, color: "text-blue-400", bg: "bg-blue-400/10", label: "Improved" },
    fix: { icon: Bug, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Fixed" },
    security: { icon: Shield, color: "text-purple-400", bg: "bg-purple-400/10", label: "Security" }
};

export const ChangelogPage: React.FC = () => {
    const hasTrackedPageView = useRef(false);

    useEffect(() => {
        if (!hasTrackedPageView.current) {
            OtherPagesEvents.changelogPageViewed();
            hasTrackedPageView.current = true;
        }
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                <span className="gradient-text">Changelog</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Stay up to date with the latest features, improvements, and fixes.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Changelog Entries */}
                <section className="py-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <div className="space-y-12">
                            {changelog.map((entry, index) => (
                                <motion.div
                                    key={entry.version}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="relative pl-8 border-l-2 border-stroke"
                                >
                                    {/* Version dot */}
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-500 border-4 border-background"></div>

                                    {/* Header */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-sm font-mono text-primary-400">
                                                v{entry.version}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {entry.date}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground">
                                            {entry.title}
                                        </h2>
                                    </div>

                                    {/* Changes */}
                                    <ul className="space-y-3">
                                        {entry.changes.map((change, changeIndex) => {
                                            const config = typeConfig[change.type];
                                            return (
                                                <li
                                                    key={changeIndex}
                                                    className="flex items-start gap-3"
                                                >
                                                    <span
                                                        className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}
                                                    >
                                                        {config.label}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {change.description}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
