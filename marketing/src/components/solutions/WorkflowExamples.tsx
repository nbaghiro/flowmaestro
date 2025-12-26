import { motion, useInView } from "framer-motion";
import { ArrowRight, Cpu } from "lucide-react";
import React from "react";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import type { SolutionCategory, WorkflowExample } from "../../data/solutions";

interface WorkflowExamplesProps {
    solution: SolutionCategory;
}

// Helper to get provider by slug
const getProviderBySlug = (slug: string) => {
    return ALL_PROVIDERS.find((p) => p.provider === slug);
};

interface IntegrationIconProps {
    slug: string;
}

const IntegrationIcon: React.FC<IntegrationIconProps> = ({ slug }) => {
    const provider = getProviderBySlug(slug);

    if (!provider) {
        // Fallback for unknown providers (like "openai" which might be "openai")
        return (
            <div className="w-10 h-10 rounded-lg bg-background-elevated border border-stroke flex items-center justify-center">
                <Cpu className="w-5 h-5 text-gray-400" />
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-lg bg-background-elevated border border-stroke flex items-center justify-center p-1.5 hover:bg-border transition-colors">
            <img
                src={provider.logoUrl}
                alt={provider.displayName}
                className="w-full h-full object-contain"
                loading="lazy"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                }}
            />
        </div>
    );
};

interface WorkflowCardProps {
    example: WorkflowExample;
    index: number;
    isInView: boolean;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ example, index, isInView }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="p-6 sm:p-8 rounded-2xl bg-background-surface border border-stroke hover:border-stroke-hover transition-all duration-300"
        >
            {/* Card Header */}
            <h3 className="text-xl font-semibold text-white mb-2">{example.title}</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">{example.description}</p>

            {/* Integration Flow */}
            <div className="flex items-center gap-2 flex-wrap">
                {example.integrations.map((slug, i) => (
                    <React.Fragment key={slug}>
                        <IntegrationIcon slug={slug} />
                        {i < example.integrations.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </motion.div>
    );
};

export const WorkflowExamples: React.FC<WorkflowExamplesProps> = ({ solution }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    if (solution.workflowExamples.length === 0) {
        return null;
    }

    return (
        <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <span className="text-sm font-medium text-primary-400 uppercase tracking-wider mb-3 block">
                        Powerful Templates Your {solution.name} Team Can Leverage
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">Empower Your Team</h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Get started quickly with pre-built workflows designed for{" "}
                        {solution.name.toLowerCase()} teams. Customize them to fit your exact needs.
                    </p>
                </motion.div>

                {/* Workflow Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {solution.workflowExamples.map((example, index) => (
                        <WorkflowCard
                            key={example.title}
                            example={example}
                            index={index}
                            isInView={isInView}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
