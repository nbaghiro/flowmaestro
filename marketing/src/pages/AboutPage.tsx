import { motion } from "framer-motion";
import { Target, Zap, Shield, Users } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { OtherPagesEvents } from "../lib/analytics";

const values = [
    {
        icon: Target,
        title: "Mission-Driven",
        description:
            "We're on a mission to make automation accessible to every team, regardless of technical expertise."
    },
    {
        icon: Zap,
        title: "Innovation First",
        description:
            "We push the boundaries of what's possible with AI and workflow automation every day."
    },
    {
        icon: Shield,
        title: "Reliability Matters",
        description:
            "Built on Temporal, our platform is designed for enterprise-grade durability and fault tolerance."
    },
    {
        icon: Users,
        title: "Customer Obsessed",
        description:
            "Every feature we build starts with understanding our customers' real-world challenges."
    }
];

export const AboutPage: React.FC = () => {
    const hasTrackedPageView = useRef(false);

    useEffect(() => {
        if (!hasTrackedPageView.current) {
            OtherPagesEvents.aboutPageViewed();
            hasTrackedPageView.current = true;
        }
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                Building the Future of{" "}
                                <span className="gradient-text">Automation</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                FlowMaestro was founded with a simple belief: automation should be
                                powerful enough for enterprises yet simple enough for anyone to use.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Values Section */}
                <section className="pb-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12"
                        >
                            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                The principles that guide everything we do.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {values.map((value, index) => (
                                <motion.div
                                    key={value.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="p-6 rounded-xl bg-card border border-stroke"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-background-elevated border border-stroke flex items-center justify-center mb-4">
                                        <value.icon className="w-6 h-6 text-primary-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {value.description}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
