import { motion, useInView } from "framer-motion";
import { Workflow, Zap, Shield, Clock, GitBranch, Database } from "lucide-react";
import React from "react";

interface Feature {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const features: Feature[] = [
    {
        icon: <Workflow className="w-6 h-6" />,
        title: "Visual Workflow Builder",
        description:
            "Design deterministic workflows with drag-and-drop nodes. Perfect for data pipelines, ETL, and business processes."
    },
    {
        icon: <Zap className="w-6 h-6" />,
        title: "AI Agent Orchestration",
        description:
            "Deploy autonomous agents that make decisions, learn from context, and collaborate with workflows seamlessly."
    },
    {
        icon: <Shield className="w-6 h-6" />,
        title: "Unified Orchestration",
        description:
            "Connect workflows and agents together. Let agents trigger workflows, and workflows delegate to agents for intelligent decisions."
    },
    {
        icon: <Clock className="w-6 h-6" />,
        title: "Durable Execution",
        description:
            "Powered by Temporal. Both workflows and agents survive failures, resume on errors, and maintain state across restarts."
    },
    {
        icon: <GitBranch className="w-6 h-6" />,
        title: "Smart Routing",
        description:
            "Route tasks to the right executor - deterministic nodes for predictable steps, agents for complex reasoning."
    },
    {
        icon: <Database className="w-6 h-6" />,
        title: "Rich Integrations",
        description:
            "Connect to 110+ services, databases, APIs, and AI models. Agents can access MCP servers for extended capabilities."
    }
];

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({ feature, index }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="relative group"
        >
            <div className="relative p-8 rounded-lg border border-stroke hover:border-stroke-hover transition-all duration-300 h-full bg-background-surface">
                {/* Animated Icon Container */}
                <motion.div
                    className="inline-flex p-4 rounded-2xl bg-background-elevated border border-stroke mb-6"
                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                    >
                        {React.cloneElement(feature.icon as React.ReactElement, {
                            className: "w-7 h-7 text-white",
                            strokeWidth: 1.5
                        })}
                    </motion.div>
                </motion.div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>

                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 rounded-lg bg-white/0 group-hover:bg-white/[0.02] transition-colors duration-300 pointer-events-none"></div>
            </div>
        </motion.div>
    );
};

export const Features: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="relative py-24 px-4 sm:px-6 lg:px-8 bg-background-surface">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 grid-pattern opacity-30"></div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                        Workflows + Agents Working Together
                    </h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Combine the reliability of structured workflows with the intelligence of
                        autonomous agents.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} feature={feature} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};
