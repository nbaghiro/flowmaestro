import { motion, useInView } from "framer-motion";
import { X, Check } from "lucide-react";
import React from "react";
import type { SolutionCategory } from "../../data/solutions";

interface PainPointsComparisonProps {
    solution: SolutionCategory;
}

export const PainPointsComparison: React.FC<PainPointsComparisonProps> = ({ solution }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="relative py-24 px-4 sm:px-6 lg:px-8 bg-secondary">
            <div className="absolute inset-0 grid-pattern opacity-50" />
            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Stop the Pain, Start Automating
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        See how FlowMaestro transforms your {solution.name.toLowerCase()} workflows
                        from frustrating to effortless.
                    </p>
                </motion.div>

                {/* Two-column Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {/* Left Column - Pain Points */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="p-6 sm:p-8 rounded-2xl bg-red-500/5 border border-red-500/20"
                    >
                        <h3 className="text-lg font-semibold text-red-400 mb-6 flex items-center gap-2">
                            <X className="w-5 h-5" />
                            What hurts today
                        </h3>
                        <ul className="space-y-4">
                            {solution.painPoints.map((pain, index) => (
                                <motion.li
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                                    className="flex items-start gap-3"
                                >
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                                            <X className="w-3 h-3 text-red-500" />
                                        </div>
                                    </div>
                                    <span className="text-muted-foreground leading-relaxed">
                                        {pain.text}
                                    </span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Right Column - Solutions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="p-6 sm:p-8 rounded-2xl bg-green-500/5 border border-green-500/20"
                    >
                        <h3 className="text-lg font-semibold text-green-400 mb-6 flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            How FlowMaestro fixes it
                        </h3>
                        <ul className="space-y-4">
                            {solution.solutions.map((sol, index) => (
                                <motion.li
                                    key={index}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                                    className="flex items-start gap-3"
                                >
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-green-500" />
                                        </div>
                                    </div>
                                    <span className="text-muted-foreground leading-relaxed">
                                        {sol.text}
                                    </span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
