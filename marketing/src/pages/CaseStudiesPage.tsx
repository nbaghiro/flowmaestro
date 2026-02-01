import { motion } from "framer-motion";
import React from "react";
import { CaseStudiesGrid } from "../components/CaseStudiesGrid";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

export const CaseStudiesPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-16"
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                Customer <span className="gradient-text">Success Stories</span>
                            </h1>
                            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                                See how teams across industries are automating their workflows and
                                building intelligent agents with FlowMaestro.
                            </p>
                        </motion.div>

                        <CaseStudiesGrid />
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
