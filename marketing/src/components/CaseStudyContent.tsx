import { motion, useInView } from "framer-motion";
import { AlertCircle, CheckCircle2, Quote, ArrowRight } from "lucide-react";
import React from "react";
import type { CaseStudy } from "../data/caseStudies";

interface CaseStudyContentProps {
    caseStudy: CaseStudy;
}

export const CaseStudyContent: React.FC<CaseStudyContentProps> = ({ caseStudy }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const appUrl = import.meta.env.VITE_APP_URL || "http://localhost:3000";

    return (
        <section ref={ref} className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-4xl mx-auto">
                {/* Challenge Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">The Challenge</h2>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{caseStudy.challenge}</p>
                </motion.div>

                {/* Solution Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">The Solution</h2>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{caseStudy.solution}</p>
                </motion.div>

                {/* Workflow Screenshot Placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-12"
                >
                    <div className="rounded-2xl overflow-hidden border border-stroke bg-background-surface">
                        <div className="p-4 border-b border-stroke">
                            <span className="text-sm text-gray-400">Workflow Preview</span>
                        </div>
                        <div className="aspect-video flex items-center justify-center bg-background-elevated">
                            <img
                                src={caseStudy.workflowImage}
                                alt={`${caseStudy.company.name} workflow`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Customer Quote */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mb-12"
                >
                    <div className="p-8 rounded-2xl bg-background-surface border border-stroke relative">
                        <Quote className="w-10 h-10 text-primary-500/30 absolute top-6 left-6" />
                        <blockquote className="text-xl text-gray-200 leading-relaxed mb-6 pl-8">
                            "{caseStudy.quote.text}"
                        </blockquote>
                        <div className="flex items-center gap-4 pl-8">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500" />
                            <div>
                                <div className="font-semibold text-white">
                                    {caseStudy.quote.author}
                                </div>
                                <div className="text-sm text-gray-400">{caseStudy.quote.role}</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-center p-8 rounded-2xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20"
                >
                    <h3 className="text-2xl font-bold text-white mb-4">
                        Ready to achieve similar results?
                    </h3>
                    <p className="text-muted-foreground mb-6">
                        Start building your own automated workflows and intelligent agents today.
                    </p>
                    <a href={appUrl} className="btn-primary inline-flex items-center gap-2">
                        <span>Get Started Free</span>
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </motion.div>
            </div>
        </section>
    );
};
