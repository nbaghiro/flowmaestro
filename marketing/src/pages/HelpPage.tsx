import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    ChevronDown,
    BookOpen,
    MessageSquare,
    Mail,
    Rocket,
    Workflow,
    Plug,
    Bot,
    CreditCard,
    Shield
} from "lucide-react";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navigation } from "../components/Navigation";
import { faqCategories, type FAQItem } from "../data/faq";
import { OtherPagesEvents } from "../lib/analytics";

const categoryIcons: Record<string, React.ElementType> = {
    "getting-started": Rocket,
    workflows: Workflow,
    integrations: Plug,
    "ai-agents": Bot,
    billing: CreditCard,
    "account-security": Shield
};

interface FAQAccordionProps {
    item: FAQItem;
    isOpen: boolean;
    onToggle: () => void;
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({ item, isOpen, onToggle }) => {
    return (
        <div className="border-b border-stroke last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full py-4 flex items-center justify-between text-left hover:text-primary-400 transition-colors"
            >
                <span className="font-medium text-foreground pr-8">{item.question}</span>
                <ChevronDown
                    className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-4 text-muted-foreground leading-relaxed">{item.answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const HelpPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());
    const hasTrackedPageView = useRef(false);

    // Track page view
    useEffect(() => {
        if (!hasTrackedPageView.current) {
            OtherPagesEvents.helpPageViewed();
            hasTrackedPageView.current = true;
        }
    }, []);

    // Track search (debounced)
    useEffect(() => {
        if (!searchQuery) return;
        const timer = setTimeout(() => {
            const resultsCount = faqCategories
                .flatMap((c) => c.items)
                .filter(
                    (item) =>
                        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
                ).length;
            OtherPagesEvents.helpSearched({ query: searchQuery, resultsCount });
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) {
            return faqCategories;
        }

        const query = searchQuery.toLowerCase();
        return faqCategories
            .map((category) => ({
                ...category,
                items: category.items.filter(
                    (item) =>
                        item.question.toLowerCase().includes(query) ||
                        item.answer.toLowerCase().includes(query)
                )
            }))
            .filter((category) => category.items.length > 0);
    }, [searchQuery]);

    const toggleQuestion = (categoryId: string, questionIndex: number, _question: string) => {
        const key = `${categoryId}-${questionIndex}`;
        setOpenQuestions((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
                // Track article/question click when expanding
                OtherPagesEvents.helpArticleClicked({
                    articleId: key,
                    category: categoryId
                });
            }
            return next;
        });
    };

    const isQuestionOpen = (categoryId: string, questionIndex: number) => {
        return openQuestions.has(`${categoryId}-${questionIndex}`);
    };

    const handleDocsClick = () => {
        OtherPagesEvents.docsLinkClicked({
            referringPage: "/help",
            docSection: undefined
        });
    };

    const handleCommunityClick = () => {
        OtherPagesEvents.communityLinkClicked({ platform: "discord" });
    };

    return (
        <div className="min-h-screen bg-background text-foreground relative">
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
                                Help <span className="gradient-text">Center</span>
                            </h1>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                                Find answers to common questions and learn how to get the most out
                                of FlowMaestro.
                            </p>

                            {/* Search */}
                            <div className="relative max-w-xl mx-auto">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search for answers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-card border border-stroke rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary-500/50 transition-colors"
                                />
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Quick Links */}
                <section className="py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-4">
                            <motion.a
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                href={
                                    import.meta.env.VITE_DOCS_URL || "https://docs.flowmaestro.ai"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleDocsClick}
                                className="p-6 rounded-xl bg-card border border-stroke hover:border-primary-500/50 transition-colors group"
                            >
                                <BookOpen className="w-8 h-8 text-primary-400 mb-3" />
                                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary-400 transition-colors">
                                    Documentation
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Comprehensive guides and API reference
                                </p>
                            </motion.a>

                            <motion.a
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                href="https://discord.gg/zHCkfBeP"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleCommunityClick}
                                className="p-6 rounded-xl bg-card border border-stroke hover:border-primary-500/50 transition-colors group"
                            >
                                <MessageSquare className="w-8 h-8 text-primary-400 mb-3" />
                                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary-400 transition-colors">
                                    Community
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Join discussions and get help from others
                                </p>
                            </motion.a>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                            >
                                <Link
                                    to="/contact"
                                    className="block p-6 rounded-xl bg-card border border-stroke hover:border-primary-500/50 transition-colors group"
                                >
                                    <Mail className="w-8 h-8 text-primary-400 mb-3" />
                                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary-400 transition-colors">
                                        Contact Support
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Reach out to our support team directly
                                    </p>
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Category Tabs */}
                <section className="py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-wrap gap-2 justify-center mb-8">
                            <button
                                onClick={() => setActiveCategory(null)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    activeCategory === null
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card border border-stroke text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                All Topics
                            </button>
                            {faqCategories.map((category) => {
                                const Icon = categoryIcons[category.id] || BookOpen;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => setActiveCategory(category.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                            activeCategory === category.id
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-card border border-stroke text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {category.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* FAQ Content */}
                <section className="py-8 pb-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        {filteredCategories.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <p className="text-muted-foreground mb-4">
                                    No results found for "{searchQuery}"
                                </p>
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="text-primary-400 hover:text-primary-300"
                                >
                                    Clear search
                                </button>
                            </motion.div>
                        ) : (
                            <div className="space-y-8">
                                {filteredCategories
                                    .filter(
                                        (category) =>
                                            !activeCategory || category.id === activeCategory
                                    )
                                    .map((category, categoryIndex) => {
                                        const Icon = categoryIcons[category.id] || BookOpen;
                                        return (
                                            <motion.div
                                                key={category.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.4,
                                                    delay: categoryIndex * 0.1
                                                }}
                                                className="rounded-xl bg-card border border-stroke overflow-hidden"
                                            >
                                                <div className="p-6 border-b border-stroke flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                                                        <Icon className="w-5 h-5 text-primary-400" />
                                                    </div>
                                                    <h2 className="text-xl font-semibold text-foreground">
                                                        {category.name}
                                                    </h2>
                                                </div>
                                                <div className="px-6">
                                                    {category.items.map((item, itemIndex) => (
                                                        <FAQAccordion
                                                            key={itemIndex}
                                                            item={item}
                                                            isOpen={isQuestionOpen(
                                                                category.id,
                                                                itemIndex
                                                            )}
                                                            onToggle={() =>
                                                                toggleQuestion(
                                                                    category.id,
                                                                    itemIndex,
                                                                    item.question
                                                                )
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Still Need Help CTA */}
                <section className="py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
                            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                Can't find what you're looking for? Our support team is here to help
                                you with any questions.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href="mailto:support@flowmaestro.ai"
                                    className="btn-primary inline-flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email Support
                                </a>
                                <Link
                                    to="/contact"
                                    className="btn-secondary inline-flex items-center justify-center"
                                >
                                    Contact Us
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <Footer />
            </div>
        </div>
    );
};
