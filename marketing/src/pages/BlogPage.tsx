import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";

interface BlogPost {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    date: string;
    readTime: string;
    image: string;
}

const blogPosts: BlogPost[] = [
    {
        slug: "introducing-ai-agents",
        title: "Introducing AI Agents: The Future of Workflow Automation",
        excerpt:
            "Learn how AI agents can autonomously execute complex tasks while working alongside traditional workflows for maximum reliability.",
        category: "Product",
        date: "Dec 15, 2024",
        readTime: "5 min read",
        image: "https://placehold.co/800x400/27272a/52525b?text=AI+Agents"
    },
    {
        slug: "temporal-deep-dive",
        title: "Why We Built on Temporal: A Deep Dive into Durable Execution",
        excerpt:
            "Discover why we chose Temporal as the foundation for FlowMaestro and how it enables enterprise-grade reliability.",
        category: "Engineering",
        date: "Dec 10, 2024",
        readTime: "8 min read",
        image: "https://placehold.co/800x400/27272a/52525b?text=Temporal"
    },
    {
        slug: "workflow-best-practices",
        title: "10 Best Practices for Building Scalable Workflows",
        excerpt:
            "Tips and tricks from our team on designing workflows that scale from proof-of-concept to production.",
        category: "Tutorial",
        date: "Dec 5, 2024",
        readTime: "6 min read",
        image: "https://placehold.co/800x400/27272a/52525b?text=Best+Practices"
    },
    {
        slug: "mcp-integration",
        title: "Extending AI Agents with MCP Servers",
        excerpt:
            "How to give your AI agents superpowers by connecting them to Model Context Protocol (MCP) servers.",
        category: "Tutorial",
        date: "Nov 28, 2024",
        readTime: "7 min read",
        image: "https://placehold.co/800x400/27272a/52525b?text=MCP+Integration"
    },
    {
        slug: "customer-story-techstyle",
        title: "How TechStyle Automated Their Entire Order Pipeline",
        excerpt:
            "A detailed look at how TechStyle reduced order processing time by 60% using FlowMaestro.",
        category: "Case Study",
        date: "Nov 20, 2024",
        readTime: "4 min read",
        image: "https://placehold.co/800x400/27272a/52525b?text=TechStyle"
    },
    {
        slug: "series-a-announcement",
        title: "FlowMaestro Raises $15M Series A to Expand AI Automation Platform",
        excerpt:
            "We're excited to announce our Series A funding and share our vision for the future of automation.",
        category: "News",
        date: "Nov 15, 2024",
        readTime: "3 min read",
        image: "https://placehold.co/800x400/27272a/52525b?text=Series+A"
    }
];

const categories = ["All", "Product", "Engineering", "Tutorial", "Case Study", "News"];

export const BlogPage: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = React.useState("All");

    const filteredPosts =
        selectedCategory === "All"
            ? blogPosts
            : blogPosts.filter((post) => post.category === selectedCategory);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Full-page background pattern */}
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <div className="relative z-10">
                <Navigation />

                {/* Hero Section */}
                <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                                <span className="gradient-text">Blog</span>
                            </h1>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                                Insights, tutorials, and updates from the FlowMaestro team.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Category Filter */}
                <section className="relative py-8 px-4 sm:px-6 lg:px-8 bg-background-surface">
                    <div className="absolute inset-0 grid-pattern opacity-50" />
                    <div className="relative z-10 max-w-6xl mx-auto">
                        <div className="flex flex-wrap gap-2 justify-center">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        selectedCategory === category
                                            ? "bg-primary-500 text-white"
                                            : "bg-background border border-stroke text-gray-400 hover:text-white"
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Blog Posts Grid */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
                    <div className="relative z-10 max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredPosts.map((post, index) => (
                                <motion.article
                                    key={post.slug}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="group"
                                >
                                    <Link to={`/blog/${post.slug}`} className="block">
                                        <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-background-surface border border-stroke">
                                            <img
                                                src={post.image}
                                                alt={post.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">
                                                {post.category}
                                            </span>
                                            <h2 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors line-clamp-2">
                                                {post.title}
                                            </h2>
                                            <p className="text-sm text-gray-400 line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {post.date}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {post.readTime}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Newsletter CTA */}
                <section className="relative py-16 px-4 sm:px-6 lg:px-8 bg-background-surface">
                    <div className="absolute inset-0 grid-pattern opacity-50" />
                    <div className="relative z-10 max-w-2xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
                            <p className="text-gray-400 mb-6">
                                Subscribe to our newsletter for the latest updates and insights.
                            </p>
                            <form className="flex gap-3 max-w-md mx-auto">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="flex-1 px-4 py-3 rounded-lg bg-background border border-stroke focus:border-primary-500 focus:outline-none transition-colors text-white"
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors flex items-center gap-2"
                                >
                                    Subscribe
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
