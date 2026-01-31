import { motion } from "framer-motion";
import React from "react";
import type { SolutionCategory } from "../../data/solutions";

interface SolutionHeroProps {
    solution: SolutionCategory;
}

export const SolutionHero: React.FC<SolutionHeroProps> = ({ solution }) => {
    const Icon = solution.icon;

    return (
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
            {/* Grid pattern */}
            <div className="absolute inset-0 grid-pattern opacity-50" />

            <div className="relative max-w-5xl mx-auto text-center">
                {/* Category Icon & Tagline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-center gap-3 mb-6"
                >
                    <div className="p-3 rounded-xl bg-background-elevated border border-stroke">
                        <Icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <span className="text-sm font-medium text-primary-400 uppercase tracking-wider">
                        {solution.tagline}
                    </span>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight"
                >
                    <span className="gradient-text">{solution.headline}</span>
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
                >
                    {solution.description}
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <a
                        href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                        className="px-8 py-4 bg-white text-black hover:bg-gray-100 rounded-lg font-semibold transition-all duration-200 shadow-lg"
                    >
                        Start Building Free
                    </a>
                    <a
                        href="https://cal.com/naib-baghirov-o5surn/30min"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-4 bg-background-elevated hover:bg-border border border-stroke rounded-lg font-semibold transition-all duration-200"
                    >
                        Schedule a Demo
                    </a>
                </motion.div>
            </div>
        </section>
    );
};
