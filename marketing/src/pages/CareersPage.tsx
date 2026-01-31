import { motion } from "framer-motion";
import { MapPin, Clock, ArrowRight, Briefcase } from "lucide-react";
import React from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

interface JobListing {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
}

const jobs: JobListing[] = [
    {
        id: "1",
        title: "Senior Full-Stack Engineer",
        department: "Engineering",
        location: "Remote",
        type: "Full-time"
    },
    {
        id: "2",
        title: "AI/ML Engineer",
        department: "Engineering",
        location: "Remote",
        type: "Full-time"
    },
    {
        id: "3",
        title: "Product Designer",
        department: "Design",
        location: "Remote",
        type: "Full-time"
    },
    {
        id: "4",
        title: "Developer Advocate",
        department: "Marketing",
        location: "Remote",
        type: "Full-time"
    },
    {
        id: "5",
        title: "Account Executive",
        department: "Sales",
        location: "Remote",
        type: "Full-time"
    }
];

const benefits = [
    "Competitive salary & equity",
    "Remote-first culture",
    "Unlimited PTO",
    "Health, dental & vision",
    "Home office stipend",
    "Learning & development budget",
    "Team retreats",
    "Flexible hours"
];

export const CareersPage: React.FC = () => {
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
                            Join Our <span className="gradient-text">Team</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                            Help us build the future of workflow automation. We're looking for
                            passionate people who want to make a real impact.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background-surface">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-10"
                    >
                        <h2 className="text-3xl font-bold mb-4">Why FlowMaestro?</h2>
                        <p className="text-gray-400">
                            We take care of our team so they can do their best work.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {benefits.map((benefit, index) => (
                            <motion.div
                                key={benefit}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                className="p-4 rounded-lg bg-background border border-stroke text-center"
                            >
                                <span className="text-sm text-gray-300">{benefit}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Open Positions */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
                <div className="absolute inset-0 grid-pattern opacity-50"></div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-10"
                    >
                        <h2 className="text-3xl font-bold mb-4">Open Positions</h2>
                        <p className="text-gray-400">Find your next role at FlowMaestro.</p>
                    </motion.div>

                    <div className="space-y-4">
                        {jobs.map((job, index) => (
                            <motion.a
                                key={job.id}
                                href={`mailto:careers@flowmaestro.ai?subject=Application: ${job.title}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                className="block p-6 rounded-xl bg-background-surface border border-stroke hover:border-primary-500/50 transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Briefcase className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-400">
                                                {job.department}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                                            {job.title}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
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
                                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                                </div>
                            </motion.a>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-center mt-12"
                    >
                        <p className="text-gray-400">
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
    );
};
