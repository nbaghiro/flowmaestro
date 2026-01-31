import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
            className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-secondary overflow-hidden"
        >
            {/* Background grid pattern */}
            <div className="absolute inset-0 grid-pattern opacity-50" />

            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    {/* Headline */}
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight text-foreground">
                        {solution.ctaHeadline}
                    </h2>

                    <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                        {solution.ctaDescription}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <a
                            href={import.meta.env.VITE_APP_URL || "http://localhost:3000"}
                            className="group px-8 py-4 bg-foreground text-background hover:opacity-90 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg"
                        >
                            Get Started Free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                        <a
                            href="https://cal.com/naib-baghirov-o5surn/30min"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-card hover:bg-accent border border-border rounded-lg font-semibold transition-all duration-200 text-foreground"
                        >
                            Schedule a Demo
                        </a>
                    </div>

                    {/* Trust indicators */}
                    <p className="text-sm text-muted-foreground mt-10">
                        No credit card required · Free 14-day trial · Cancel anytime
                    </p>
                </motion.div>
            </div>
        </section>
    );
};
