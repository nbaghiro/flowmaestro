import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import type { CaseStudy } from "../data/caseStudies";

interface CaseStudyCardProps {
    caseStudy: CaseStudy;
    index: number;
}

export const CaseStudyCard: React.FC<CaseStudyCardProps> = ({ caseStudy, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            <Link
                to={`/case-studies/${caseStudy.slug}`}
                className="group block h-full p-6 rounded-2xl bg-background-surface border border-stroke hover:border-primary-500/50 transition-all duration-300"
            >
                {/* Header with logo and company info */}
                <div className="flex items-start gap-4 mb-4">
                    <img
                        src={caseStudy.company.logo}
                        alt={caseStudy.company.name}
                        className="w-12 h-12 rounded-lg object-cover"
                        loading="lazy"
                    />
                    <div>
                        <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                            {caseStudy.company.name}
                        </h3>
                        <span className="text-sm text-gray-400">{caseStudy.company.industry}</span>
                    </div>
                </div>

                {/* Headline */}
                <p className="text-gray-200 mb-4 line-clamp-2">{caseStudy.headline}</p>

                {/* Key metric highlight */}
                <div className="flex items-center gap-4 mb-4">
                    {caseStudy.results.slice(0, 2).map((result, i) => (
                        <div key={i} className="flex-1">
                            <div className="text-2xl font-bold gradient-text">{result.metric}</div>
                            <div className="text-xs text-gray-400">{result.label}</div>
                        </div>
                    ))}
                </div>

                {/* Read more link */}
                <div className="flex items-center gap-2 text-primary-400 text-sm group-hover:gap-3 transition-all">
                    <span>Read case study</span>
                    <ArrowRight className="w-4 h-4" />
                </div>
            </Link>
        </motion.div>
    );
};
