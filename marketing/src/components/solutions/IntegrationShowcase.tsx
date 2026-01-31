import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import type { Provider } from "@flowmaestro/shared";
import type { SolutionCategory } from "../../data/solutions";

interface IntegrationShowcaseProps {
    providers: Provider[];
    solution: SolutionCategory;
}

const IntegrationLogo: React.FC<{ provider: Provider; index: number }> = ({ provider, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group relative p-4 rounded-xl bg-card backdrop-blur-sm border border-border hover:bg-accent hover:border-muted-foreground/30 transition-all duration-300"
        >
            {provider.comingSoon && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded-full">
                    Soon
                </span>
            )}
            <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-2 group-hover:bg-accent transition-colors">
                    <img
                        src={provider.logoUrl}
                        alt={provider.displayName}
                        className="w-8 h-8 object-contain"
                        loading="lazy"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                </div>
                <h3 className="font-medium text-xs text-foreground truncate w-full">
                    {provider.displayName}
                </h3>
            </div>
        </motion.div>
    );
};

export const IntegrationShowcase: React.FC<IntegrationShowcaseProps> = ({
    providers,
    solution
}) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    // Sort providers: available first, then alphabetically, limit to 18
    const displayProviders = React.useMemo(() => {
        return [...providers]
            .sort((a, b) => {
                if (a.comingSoon && !b.comingSoon) return 1;
                if (!a.comingSoon && b.comingSoon) return -1;
                return a.displayName.localeCompare(b.displayName);
            })
            .slice(0, 18);
    }, [providers]);

    if (displayProviders.length === 0) {
        return null;
    }

    return (
        <section
            ref={ref}
            className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-secondary/50"
        >
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Connect Your {solution.name} Stack
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        FlowMaestro integrates with the tools your {solution.name.toLowerCase()}{" "}
                        team already uses. Build workflows that work with your existing setup.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 mb-8"
                >
                    {displayProviders.map((provider, index) => (
                        <IntegrationLogo
                            key={provider.provider}
                            provider={provider}
                            index={index}
                        />
                    ))}
                </motion.div>

                {providers.length > 18 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="text-center"
                    >
                        <Link
                            to="/integrations"
                            className="inline-flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
                        >
                            View all {providers.length}+ integrations
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </motion.div>
                )}
            </div>
        </section>
    );
};
