import { motion } from "framer-motion";
import {
    MapPin,
    Clock,
    ArrowRight,
    Briefcase,
    Code,
    Cpu,
    Globe,
    Zap,
    Terminal,
    Layers
} from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

interface JobListing {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    description: string;
    highlights: string[];
}

const jobs: JobListing[] = [
    {
        id: "senior-software-engineer",
        title: "Senior Software Engineer",
        department: "Engineering",
        location: "Remote",
        type: "Full-time",
        description:
            "Build and extend our workflow engine, AI agent system, and 100+ integrations. Work across the full stack on meaningful problems at the intersection of AI and developer tools.",
        highlights: [
            "Workflow engine with 20+ node types",
            "AI agents with memory and tools",
            "Real-time systems with WebSockets",
            "100+ third-party integrations"
        ]
    }
];

const techStack = [
    { icon: Code, label: "React, TypeScript, Fastify" },
    { icon: Cpu, label: "PostgreSQL, Redis, Temporal" },
    { icon: Globe, label: "OpenAI, Anthropic & more" },
    { icon: Zap, label: "Kubernetes, GCP, Pulumi" },
    { icon: Terminal, label: "CLI & SDKs" },
    { icon: Layers, label: "Vite, Tailwind, Zustand" }
];

export const CareersPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                Join Our <span className="gradient-text">Team</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                                We're building the platform that makes AI automation accessible to
                                everyone. Looking for passionate engineers who want to own features
                                end-to-end.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Tech Stack */}
                <section className="py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-wrap justify-center gap-4">
                            {techStack.map((item, index) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-stroke"
                                >
                                    <item.icon className="w-4 h-4 text-primary-400" />
                                    <span className="text-sm text-muted-foreground">
                                        {item.label}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Open Positions */}
                <section className="py-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-10"
                        >
                            <h2 className="text-3xl font-bold mb-4">Open Positions</h2>
                            <p className="text-muted-foreground">
                                Small team, outsized impact. Remote-first with early-stage equity.
                            </p>
                        </motion.div>

                        <div className="space-y-6">
                            {jobs.map((job, index) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.05 }}
                                >
                                    <Link
                                        to={`/careers/${job.id}`}
                                        className="block p-6 rounded-xl bg-card border border-stroke hover:border-primary-500/50 transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {job.department}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary-400 transition-colors mb-2">
                                                    {job.title}
                                                </h3>
                                                <p className="text-muted-foreground mb-4">
                                                    {job.description}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {job.highlights.map((highlight) => (
                                                        <span
                                                            key={highlight}
                                                            className="px-2 py-1 text-xs rounded bg-primary-500/10 text-primary-400"
                                                        >
                                                            {highlight}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {job.location}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {job.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-center mt-12"
                        >
                            <p className="text-muted-foreground">
                                Don't see a role that fits?{" "}
                                <a
                                    href="mailto:careers@flowmaestro.ai"
                                    className="text-primary-400 hover:text-primary-300"
                                >
                                    Send us your resume anyway
                                </a>
                            </p>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
