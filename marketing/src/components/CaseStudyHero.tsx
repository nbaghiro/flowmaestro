import { motion } from "framer-motion";
import { ArrowLeft, Building2, Users } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import type { CaseStudy } from "../data/caseStudies";

interface CaseStudyHeroProps {
    caseStudy: CaseStudy;
}

export const CaseStudyHero: React.FC<CaseStudyHeroProps> = ({ caseStudy }) => {
    return (
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-4xl mx-auto">
                {/* Back link */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <Link
                        to="/case-studies"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Case Studies</span>
                    </Link>
                </motion.div>

                {/* Company info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex items-center gap-4 mb-6"
                >
                    <img
                        src={caseStudy.company.logo}
                        alt={caseStudy.company.name}
                        className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            {caseStudy.company.name}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {caseStudy.company.industry}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {caseStudy.company.size}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight"
                >
                    {caseStudy.headline}
                </motion.h1>

                {/* Results metrics */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {caseStudy.results.map((result, index) => (
                        <div
                            key={index}
                            className="p-4 rounded-xl bg-background-surface border border-stroke text-center"
                        >
                            <div className="text-2xl sm:text-3xl font-bold gradient-text mb-1">
                                {result.metric}
                            </div>
                            <div className="text-sm text-gray-400">{result.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
