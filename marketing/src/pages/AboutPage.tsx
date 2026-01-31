import { motion } from "framer-motion";
import { Target, Zap, Shield, Users } from "lucide-react";
import React from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

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

const team = [
    {
        name: "Alex Chen",
        role: "CEO & Co-founder",
        image: "https://ui-avatars.com/api/?name=Alex+Chen&background=3b82f6&color=fff&size=200"
    },
    {
        name: "Sarah Johnson",
        role: "CTO & Co-founder",
        image: "https://ui-avatars.com/api/?name=Sarah+Johnson&background=22d3ee&color=fff&size=200"
    },
    {
        name: "Michael Park",
        role: "Head of Product",
        image: "https://ui-avatars.com/api/?name=Michael+Park&background=10b981&color=fff&size=200"
    },
    {
        name: "Emily Davis",
        role: "Head of Engineering",
        image: "https://ui-avatars.com/api/?name=Emily+Davis&background=f59e0b&color=fff&size=200"
    }
];

export const AboutPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navigation />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                            Building the Future of <span className="gradient-text">Automation</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                            FlowMaestro was founded with a simple belief: automation should be
                            powerful enough for enterprises yet simple enough for anyone to use.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Story Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-surface">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                        <div className="space-y-4 text-gray-300 leading-relaxed">
                            <p>
                                FlowMaestro started in 2023 when our founders experienced firsthand
                                the challenges of building reliable automation at scale. Traditional
                                workflow tools were either too simple for complex use cases or
                                required extensive engineering resources.
                            </p>
                            <p>
                                We saw an opportunity to combine the reliability of durable
                                execution (powered by Temporal) with the flexibility of AI agents,
                                creating a platform where workflows and intelligent agents work
                                together seamlessly.
                            </p>
                            <p>
                                Today, FlowMaestro powers automation for teams across industries —
                                from startups automating their first processes to enterprises
                                orchestrating complex multi-system workflows.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Our Values</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
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
                                className="p-6 rounded-xl bg-background-surface border border-stroke"
                            >
                                <div className="w-12 h-12 rounded-lg bg-background-elevated border border-stroke flex items-center justify-center mb-4">
                                    <value.icon className="w-6 h-6 text-primary-400" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                                <p className="text-sm text-gray-400">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-surface">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Leadership Team</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Meet the people building FlowMaestro.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {team.map((member, index) => (
                            <motion.div
                                key={member.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="text-center"
                            >
                                <img
                                    src={member.image}
                                    alt={member.name}
                                    className="w-32 h-32 rounded-full mx-auto mb-4 border-2 border-stroke"
                                />
                                <h3 className="font-semibold text-white">{member.name}</h3>
                                <p className="text-sm text-gray-400">{member.role}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};
