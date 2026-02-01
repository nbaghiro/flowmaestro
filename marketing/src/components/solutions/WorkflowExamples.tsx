import { motion, useInView } from "framer-motion";
import React from "react";
import { useTheme } from "../../hooks/useTheme";
import type { SolutionCategory, WorkflowExample } from "../../data/solutions";

interface WorkflowExamplesProps {
    solution: SolutionCategory;
}

interface WorkflowCardProps {
    example: WorkflowExample;
    index: number;
    isInView: boolean;
    solutionSlug: string;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ example, index, isInView, solutionSlug }) => {
    const { theme } = useTheme();

    // Generate screenshot path based on solution and index
    const screenshotBase = example.screenshotBase || `workflow-${solutionSlug}-${index + 1}`;
    const screenshotPath = `/screenshots/${screenshotBase}-${theme}.png`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="rounded-xl overflow-hidden border border-border bg-card hover:border-muted-foreground/30 transition-all duration-300 shadow-lg"
        >
            <img
                src={screenshotPath}
                alt={example.title}
                className="w-full"
                loading="lazy"
                onError={(e) => {
                    // Fallback: hide the image and show a placeholder
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                        const fallback = document.createElement("div");
                        fallback.className =
                            "aspect-[4/3] bg-secondary flex items-center justify-center";
                        fallback.innerHTML = `
                            <div class="text-center p-6">
                                <h3 class="text-lg font-semibold text-foreground mb-2">${example.title}</h3>
                                <p class="text-sm text-muted-foreground">${example.description}</p>
                            </div>
                        `;
                        parent.insertBefore(fallback, target);
                    }
                }}
            />
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
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                        Powerful Templates Your {solution.name} Team Can Leverage
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">Empower Your Team</h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
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
                            solutionSlug={solution.slug}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
