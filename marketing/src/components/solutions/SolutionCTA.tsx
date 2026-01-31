import { motion, useInView } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import React from "react";
import type { SolutionCategory } from "../../data/solutions";

interface SolutionCTAProps {
    solution: SolutionCategory;
}

export const SolutionCTA: React.FC<SolutionCTAProps> = ({ solution }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section
            ref={ref}
            className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background-surface to-background"
        >
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="relative rounded-3xl bg-gradient-to-br from-gray-800/80 via-background-elevated to-gray-800/80 p-12 md:p-16 backdrop-blur-sm border border-stroke overflow-hidden"
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 grid-pattern opacity-40" />

                    {/* Content */}
                    <div className="relative z-10 text-center">
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                            {solution.ctaHeadline}
                        </h2>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            {solution.ctaDescription}
                        </p>

                        {/* Features */}
                        <div className="flex flex-wrap justify-center gap-6 mb-10">
                            {["Free 14-day trial", "No credit card required", "Cancel anytime"].map(
                                (feature) => (
                                    <div
                                        key={feature}
                                        className="flex items-center gap-2 text-gray-300"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <span>{feature}</span>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a
                                href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                                className="group px-8 py-4 bg-white text-black hover:bg-gray-100 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg"
                            >
                                Get Started for Free
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                            <a
                                href="https://cal.com/naib-baghirov-o5surn/30min"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-4 bg-background-elevated hover:bg-border border border-stroke rounded-lg font-semibold transition-all duration-200"
                            >
                                Schedule a Demo
                            </a>
                        </div>

                        <p className="text-sm text-gray-400 mt-8">
                            Have questions?{" "}
                            <a
                                href="https://form.typeform.com/to/DF4VPClq"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300 underline"
                            >
                                Talk to our sales team
                            </a>
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
