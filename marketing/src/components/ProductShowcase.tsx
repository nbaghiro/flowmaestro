import { AnimatePresence, motion, useInView } from "framer-motion";
import { Bot, Sparkles, Workflow } from "lucide-react";
import React, { useState } from "react";
import { useTheme } from "../hooks/useTheme";

interface Tab {
    id: string;
    label: string;
    icon: React.ReactNode;
    screenshotBase: string;
    caption: string;
}

const tabs: Tab[] = [
    {
        id: "workflows",
        label: "Workflows",
        icon: <Workflow className="w-4 h-4" />,
        screenshotBase: "showcase-workflows-list",
        caption: "Build and manage automated workflows with 110+ integrations"
    },
    {
        id: "agents",
        label: "AI Agents",
        icon: <Bot className="w-4 h-4" />,
        screenshotBase: "showcase-agents-list",
        caption: "Deploy specialized AI agents for any task"
    },
    {
        id: "personas",
        label: "Personas",
        icon: <Sparkles className="w-4 h-4" />,
        screenshotBase: "showcase-personas-list",
        caption: "Pre-built AI specialists ready to work"
    }
];

export const ProductShowcase: React.FC = () => {
    const [activeTab, setActiveTab] = useState("workflows");
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const { theme } = useTheme();

    const activeTabData = tabs.find((tab) => tab.id === activeTab);
    const screenshotPath = activeTabData
        ? `/screenshots/${activeTabData.screenshotBase}-${theme}.png`
        : "";

    return (
        <section ref={ref} className="relative py-24 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="absolute inset-0 grid-pattern opacity-50" />
            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-4">
                        Product
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
                        See It In Action
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Build workflows, deploy agents, automate everything
                    </p>
                </motion.div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex justify-center mb-8"
                >
                    <div className="inline-flex bg-secondary border border-border rounded-lg p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-card border border-border rounded-md"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    {tab.icon}
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Screenshot Container */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative"
                >
                    <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${activeTab}-${theme}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Screenshot */}
                                <div className="relative rounded-lg overflow-hidden border border-border">
                                    <img
                                        src={screenshotPath}
                                        alt={`FlowMaestro ${activeTabData?.label}`}
                                        className="w-full"
                                    />

                                    {/* Subtle overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent pointer-events-none" />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Caption */}
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={activeTab}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-center text-muted-foreground mt-6"
                        >
                            {activeTabData?.caption}
                        </motion.p>
                    </AnimatePresence>
                </motion.div>
            </div>
        </section>
    );
};
