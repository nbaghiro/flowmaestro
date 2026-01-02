import { motion } from "framer-motion";
import { MessageSquare, Github, Twitter, Youtube, Users, BookOpen } from "lucide-react";
import React from "react";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

const communities = [
    {
        icon: MessageSquare,
        title: "Discord",
        description: "Join our Discord server to chat with other users and the FlowMaestro team.",
        action: "Join Discord",
        href: "https://discord.gg/flowmaestro",
        members: "2,500+ members"
    },
    {
        icon: Github,
        title: "GitHub",
        description: "Star our repo, report issues, and contribute to the FlowMaestro ecosystem.",
        action: "View GitHub",
        href: "https://github.com/flowmaestro",
        members: "1,200+ stars"
    },
    {
        icon: Twitter,
        title: "Twitter/X",
        description: "Follow us for the latest updates, tips, and automation inspiration.",
        action: "Follow Us",
        href: "https://twitter.com/flowmaestro",
        members: "5,000+ followers"
    },
    {
        icon: Youtube,
        title: "YouTube",
        description: "Watch tutorials, demos, and deep dives into FlowMaestro features.",
        action: "Subscribe",
        href: "https://youtube.com/@flowmaestro",
        members: "800+ subscribers"
    }
];

const resources = [
    {
        icon: BookOpen,
        title: "Documentation",
        description: "Comprehensive guides to help you get the most out of FlowMaestro.",
        href: "https://docs.flowmaestro.ai"
    },
    {
        icon: Users,
        title: "Community Forum",
        description: "Ask questions, share workflows, and learn from other users.",
        href: "https://community.flowmaestro.ai"
    }
];

export const CommunityPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-gray-50">
            <Navigation />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 grid-pattern opacity-30"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                            Join Our <span className="gradient-text">Community</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Connect with thousands of automation enthusiasts, share ideas, and get
                            help from the FlowMaestro team.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Community Channels */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background-surface">
                <div className="absolute inset-0 grid-pattern opacity-30"></div>
                <div className="relative z-10 max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Find Us Online</h2>
                        <p className="text-gray-400">
                            Choose your favorite platform to connect with us.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {communities.map((community, index) => (
                            <motion.a
                                key={community.title}
                                href={community.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="p-6 rounded-xl bg-background border border-stroke hover:border-primary-500/50 transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-background-elevated border border-stroke flex items-center justify-center flex-shrink-0">
                                        <community.icon className="w-7 h-7 text-primary-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                                                {community.title}
                                            </h3>
                                            <span className="text-xs text-gray-500">
                                                {community.members}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-3">
                                            {community.description}
                                        </p>
                                        <span className="text-sm text-primary-400 group-hover:text-primary-300">
                                            {community.action} →
                                        </span>
                                    </div>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Resources */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
                <div className="absolute inset-0 grid-pattern opacity-30"></div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Resources</h2>
                        <p className="text-gray-400">
                            Everything you need to become a FlowMaestro expert.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {resources.map((resource, index) => (
                            <motion.a
                                key={resource.title}
                                href={resource.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="p-6 rounded-xl bg-background-surface border border-stroke hover:border-primary-500/50 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-background-elevated border border-stroke flex items-center justify-center mb-4">
                                    <resource.icon className="w-6 h-6 text-primary-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors mb-2">
                                    {resource.title}
                                </h3>
                                <p className="text-sm text-gray-400">{resource.description}</p>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-surface">
                <div className="absolute inset-0 grid-pattern opacity-30"></div>
                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
                        <p className="text-gray-400 mb-8">
                            Join the community and start building powerful automations today.
                        </p>
                        <a
                            href="https://discord.gg/flowmaestro"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                        >
                            <MessageSquare className="w-5 h-5" />
                            Join Discord
                        </a>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};
